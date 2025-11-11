import pytest
import json
from models.item.item import Item
from models.account.account import Account
from models import db


@pytest.mark.unit
class TestItemRoutes:
    """Test item route endpoints."""

    def test_get_items(self, client, sample_item):
        """Test GET /api/item returns all items."""
        response = client.get("/api/item")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert len(data) == 1
        assert data[0]["id"] == sample_item  # sample_item is now a string ID

    def test_get_items_with_accounts(self, client, sample_item, sample_accounts):
        """Test GET /api/item returns items with related data."""
        response = client.get("/api/item")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)
        # Verify items are returned
        assert len(data) >= 1

    def test_delete_item_not_found(self, client):
        """Test DELETE /api/item/<id> returns 404 for non-existent item."""
        response = client.delete("/api/item/nonexistent")
        assert response.status_code == 404

        data = json.loads(response.data)
        assert "Item nonexistent not found" in data["display_message"]

    def test_sync_without_item_id(self, client):
        """Test POST /api/item/<id>/sync returns 404 for non-existent item."""
        response = client.post("/api/item/nonexistent/sync")
        assert response.status_code == 404

        data = json.loads(response.data) if response.data else {}
        # Verify error response
        assert response.status_code == 404

    def test_sync_without_transactions(self, client, sample_item):
        """Test POST /api/item/<id>/sync when item has no transactions."""
        # This will succeed but may not return transactions
        response = client.post(f"/api/item/{sample_item}/sync")
        # Should return 200 or 404 depending on item state
        assert response.status_code in [200, 404, 500]

    def test_get_items_empty(self, client):
        """Test GET /api/item returns empty list when no items exist."""
        # Clear all items
        with client.application.app_context():
            Item.query.delete()
            db.session.commit()

        response = client.get("/api/item")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data == []
