import pytest
import json
from models.transaction.txn_category import TxnCategory
from models.transaction.txn import Txn
from models import db
from http import HTTPStatus


@pytest.mark.unit
class TestTxnCategoryRoutes:
    """Test transaction category route endpoints."""

    @pytest.fixture
    def sample_category_id(self, test_app):
        """Create a sample category for testing."""
        with test_app.app_context():
            category = TxnCategory.query.filter_by(name="Test Category").first()
            if not category:
                category = TxnCategory(name="Test Category")
                db.session.add(category)
                db.session.commit()
            return category.id

    def test_create_category(self, client):
        """Test POST /api/category creates a category."""
        data = {"name": "New Category Test"}
        response = client.post("/api/category", json=data)
        assert response.status_code in [200, 201]

        # Verify the category was created by querying the database
        from models.transaction.txn_category import TxnCategory

        with client.application.app_context():
            category = TxnCategory.query.filter_by(name="New Category Test").first()
            assert category is not None

    def test_create_category_duplicate(self, client):
        """Test POST /api/category with duplicate name fails."""
        data = {"name": "Duplicate Category"}
        # Create first category
        response1 = client.post("/api/category", json=data)
        assert response1.status_code in [200, 201]

        # Try to create duplicate
        response2 = client.post("/api/category", json=data)
        assert response2.status_code in [400, 500]
        data_json = json.loads(response2.data)
        assert (
            "error" in data_json
            or "duplicate" in data_json.get("display_message", "").lower()
        )

    def test_update_category(self, client, sample_category_id):
        """Test PUT /api/category updates a category."""
        data = {"id": sample_category_id, "name": "Updated Category Name"}
        response = client.put("/api/category", json=data)
        assert response.status_code in [200, 201]

        # Verify the category was updated by querying the database
        with client.application.app_context():
            updated_category = TxnCategory.query.get(sample_category_id)
            assert updated_category.name == "Updated Category Name"

    def test_update_category_not_found(self, client):
        """Test PUT /api/category with non-existent ID fails."""
        data = {"id": "non-existent-id", "name": "Updated Name"}
        response = client.put("/api/category", json=data)
        assert response.status_code in [400, 404, 500]
        data_json = json.loads(response.data)
        assert (
            "error" in data_json
            or "not found" in data_json.get("display_message", "").lower()
        )

    def test_delete_category(self, client, test_app):
        """Test DELETE /api/category/<id> deletes a category."""
        with test_app.app_context():
            # Create a category for deletion
            category = TxnCategory.query.filter_by(name="Category To Delete").first()
            if not category:
                category = TxnCategory(name="Category To Delete")
                db.session.add(category)
                db.session.commit()

            category_id = category.id
            response = client.delete(f"/api/category/{category_id}")

            # Verify the category was deleted
            deleted_category = TxnCategory.query.get(category_id)
            assert deleted_category is None
            assert response.status_code in [200, 204]

    def test_delete_category_not_found(self, client):
        """Test DELETE /api/category/<id> with non-existent ID returns 404."""
        response = client.delete("/api/category/non-existent-id")
        assert response.status_code == 404
        data = json.loads(response.data)
        assert "not found" in data.get("display_message", "").lower()

    def test_delete_category_with_transactions(self, client, test_app):
        """Test DELETE /api/category/<id> with associated transactions fails."""
        with test_app.app_context():
            from models.account.account import Account
            from models.item.item import Item
            from models.institution.institution import Institution
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype
            from decimal import Decimal
            from datetime import datetime

            # Create category
            category = TxnCategory.query.filter_by(
                name="Category With Transactions"
            ).first()
            if not category:
                category = TxnCategory(name="Category With Transactions")
                db.session.add(category)
                db.session.commit()

            # Create necessary dependencies for transaction
            institution = Institution.query.filter_by(id="ins_cat_test").first()
            if not institution:
                institution = Institution(
                    id="ins_cat_test", name="Test Bank", logo=None
                )
                db.session.add(institution)
                db.session.commit()

            item = Item.query.filter_by(id="item_cat_test").first()
            if not item:
                item = Item(
                    id="item_cat_test",
                    access_token="test_token",
                    institution_id=institution.id,
                )
                db.session.add(item)
                db.session.commit()

            account = Account.query.filter_by(id="account_cat_test").first()
            if not account:
                account = Account(
                    id="account_cat_test",
                    name="Test Account",
                    original_name="Test Account",
                    balance=Decimal("1000.00"),
                    limit=Decimal("0.00"),
                    last_updated=datetime.now(),
                    institution_id=institution.id,
                    item_id=item.id,
                    account_type=AccountType.DEPOSITORY,
                    account_subtype=AccountSubtype.CHECKING,
                    active=True,
                )
                db.session.add(account)
                db.session.commit()

            # Create transaction
            transaction = Txn.query.filter_by(id="txn_cat_test").first()
            if not transaction:
                transaction = Txn(
                    id="txn_cat_test",
                    account_id=account.id,
                    amount=Decimal("-50.00"),
                    date=datetime.now().date(),
                    name="Test Transaction",
                    category_id=category.id,
                )
                db.session.add(transaction)
                db.session.commit()

            # Try to delete category with transactions
            response = client.delete(f"/api/category/{category.id}")
            assert response.status_code == 400
            data = json.loads(response.data)
            assert "Cannot delete" in data.get("display_message", "")
            assert "associated transactions" in data.get("display_message", "")

            # Verify category still exists
            assert TxnCategory.query.get(category.id) is not None

    def test_get_categories(self, client):
        """Test GET /api/category returns all categories."""
        response = client.get("/api/category")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)

    def test_get_categories_empty(self, client):
        """Test GET /api/category returns empty list when no categories."""
        with client.application.app_context():
            # Clear all categories
            TxnCategory.query.delete()
            db.session.commit()

        response = client.get("/api/category")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_create_category_with_invalid_data(self, client):
        """Test POST /api/category with invalid data fails."""
        # Missing required field
        response = client.post("/api/category", json={})
        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        assert "error" in data or "display_message" in data
