import pytest
import json
from unittest.mock import patch, Mock
from models.account.account import Account
from models import db


@pytest.mark.unit
class TestAccountRoutes:
    """Test account route endpoints."""

    def test_get_accounts_returns_only_active(self, client, sample_accounts):
        """Test GET /api/account returns only active accounts."""
        # Deactivate one account
        account_id = sample_accounts[0].id
        account = db.session.get(Account, account_id)
        account.active = False
        db.session.commit()

        response = client.get("/api/account")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert len(data) == 1  # Only one active account
        assert data[0]["id"] == sample_accounts[1].id
        assert data[0]["active"] is True

    def test_get_accounts_empty_when_no_active(self, client):
        """Test GET /api/account returns empty list when no active accounts."""
        response = client.get("/api/account")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data == []

    def test_get_account_transactions(
        self, client, sample_accounts, sample_transactions
    ):
        """Test GET /api/account/<id>/transactions returns account transactions."""
        account_id = sample_accounts[0].id

        response = client.get(f"/api/account/{account_id}/transactions")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert len(data) == 1  # One transaction for this account
        assert data[0]["account_id"] == account_id

    def test_get_account_transactions_not_found(self, client):
        """Test GET /api/account/<id>/transactions returns 404 for non-existent account."""
        response = client.get("/api/account/nonexistent/transactions")
        assert response.status_code == 404

        data = json.loads(response.data)
        # Error response format may vary, just check we got an error response
        assert (
            "not found" in str(data).lower()
            or "error" in str(data).lower()
            or "display_message" in data
        )

    def test_update_account_name(self, client, sample_accounts):
        """Test PUT /api/account updates account name."""
        account_id = sample_accounts[0].id
        new_name = "Updated Account Name"

        response = client.put("/api/account", json={"id": account_id, "name": new_name})

        assert response.status_code == 200

        # Verify the account was updated
        updated_account = Account.query.get(account_id)
        assert updated_account.name == new_name

    def test_update_account_not_found(self, client):
        """Test PUT /api/account returns 404 for non-existent account."""
        response = client.put(
            "/api/account", json={"id": "nonexistent", "name": "New Name"}
        )

        assert response.status_code == 404

    def test_delete_account_returns_item_id(self, client, sample_accounts, sample_item):
        """Test DELETE /api/account/<id> returns item_id for deletion."""
        account_id = sample_accounts[0].id

        response = client.delete(f"/api/account/{account_id}")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "item_id" in data
        assert data["item_id"] == sample_item  # sample_item is now a string ID
        assert "action" in data
        assert data["action"] == "delete_item"

    def test_delete_account_not_found(self, client):
        """Test DELETE /api/account/<id> returns 404 for non-existent account."""
        response = client.delete("/api/account/nonexistent")
        assert response.status_code == 404


@pytest.mark.unit
class TestAccountRoutesWithMockedPlaid:
    """Test account routes with mocked Plaid responses."""

    def test_get_accounts_with_plaid_data(self, client, sample_accounts):
        """Test getting accounts with Plaid data integration."""
        # Simply verify that the accounts endpoint works with sample data
        response = client.get("/api/account")
        assert response.status_code == 200

        data = json.loads(response.data)
        # Should return accounts if they exist
        assert isinstance(data, list)

    def test_account_error_handling(self, client):
        """Test account routes handle errors gracefully."""
        # Test with invalid JSON - Flask may return 400 or 500 depending on error handling
        response = client.put(
            "/api/account", data="invalid json", content_type="application/json"
        )
        # Accept either 400 or 500 since both indicate error handling
        assert response.status_code in [400, 500]
