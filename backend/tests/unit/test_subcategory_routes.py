import pytest
import json
from datetime import datetime
from decimal import Decimal
from models.transaction.txn_subcategory import TxnSubcategory
from models.transaction.txn_category import TxnCategory
from models.transaction.txn import Txn
from models.account.account import Account
from models.item.item import Item
from models.institution.institution import Institution
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype
from models import db


@pytest.mark.unit
class TestSubcategoryRoutes:
    """Test subcategory route endpoints."""

    @pytest.fixture
    def sample_category(self, test_app):
        """Create a sample category for subcategory tests."""
        with test_app.app_context():
            category = TxnCategory.query.filter_by(name="Test Category").first()
            if not category:
                category = TxnCategory(name="Test Category")
                db.session.add(category)
                db.session.commit()
            return category.id

    @pytest.fixture
    def sample_subcategory(self, test_app, sample_category):
        """Create a sample subcategory for testing."""
        with test_app.app_context():
            subcategory = TxnSubcategory.query.filter_by(
                name="Test Subcategory", category_id=sample_category
            ).first()
            if not subcategory:
                subcategory = TxnSubcategory(
                    name="Test Subcategory",
                    description="Test Description",
                    category_id=sample_category,
                )
                db.session.add(subcategory)
                db.session.commit()
            return subcategory.id

    def test_create_subcategory(self, client, sample_category):
        """Test POST /api/subcategory creates a subcategory."""
        response = client.post(
            "/api/subcategory",
            json={
                "name": "New Subcategory",
                "description": "New Description",
                "category_id": sample_category,
            },
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        # The route may return the created object or a message
        assert response.status_code == 200
        # Just verify we got a successful response

        # Verify subcategory exists in database
        subcategory = TxnSubcategory.query.filter_by(name="New Subcategory").first()
        assert subcategory is not None
        assert subcategory.name == "New Subcategory"
        assert subcategory.category_id == sample_category

    def test_update_subcategory(self, client, sample_subcategory):
        """Test PUT /api/subcategory updates a subcategory."""
        response = client.put(
            "/api/subcategory",
            json={
                "id": sample_subcategory,
                "name": "Updated Subcategory",
                "description": "Updated Description",
            },
        )
        assert response.status_code == 200

        # Verify subcategory was updated
        updated_subcategory = db.session.get(TxnSubcategory, sample_subcategory)
        assert updated_subcategory.name == "Updated Subcategory"

    def test_get_subcategory(self, client, sample_subcategory):
        """Test GET /api/subcategory/<id> returns a subcategory."""
        response = client.get(f"/api/subcategory/{sample_subcategory}")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data["id"] == sample_subcategory
        assert data["name"] == "Test Subcategory"

    def test_get_subcategory_not_found(self, client):
        """Test GET /api/subcategory/<id> returns 404 for non-existent subcategory."""
        response = client.get("/api/subcategory/nonexistent")
        assert response.status_code == 404

        data = json.loads(response.data)
        assert "Subcategory nonexistent not found" in data["display_message"]

    def test_delete_subcategory(self, client, sample_subcategory):
        """Test DELETE /api/subcategory/<id> deletes a subcategory."""
        response = client.delete(f"/api/subcategory/{sample_subcategory}")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "message" in data
        assert data["message"] == "Subcategory deleted successfully"

        # Verify subcategory was deleted
        deleted_subcategory = db.session.get(TxnSubcategory, sample_subcategory)
        assert deleted_subcategory is None

    def test_delete_subcategory_not_found(self, client):
        """Test DELETE /api/subcategory/<id> returns 404 for non-existent subcategory."""
        response = client.delete("/api/subcategory/nonexistent")
        assert response.status_code == 404

        data = json.loads(response.data)
        assert "Subcategory nonexistent not found" in data["display_message"]

    def test_delete_subcategory_with_transactions(
        self, client, test_app, sample_subcategory, sample_category
    ):
        """Test DELETE /api/subcategory/<id> returns error when subcategory has transactions."""
        # Create a transaction with this subcategory
        with test_app.app_context():
            from models.transaction.txn import Txn
            from models.account.account import Account
            from models.item.item import Item
            from models.institution.institution import Institution
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype
            from decimal import Decimal
            from datetime import datetime

            # Create necessary dependencies for a transaction
            institution = Institution.query.filter_by(id="ins_test").first()
            if not institution:
                institution = Institution(id="ins_test", name="Test Bank", logo=None)
                db.session.add(institution)
                db.session.commit()

            item = Item.query.filter_by(id="test_item_for_txn").first()
            if not item:
                item = Item(
                    id="test_item_for_txn",
                    access_token="test_token",
                    institution_id=institution.id,
                )
                db.session.add(item)
                db.session.commit()

            account = Account.query.filter_by(id="test_account_for_txn").first()
            if not account:
                account = Account(
                    id="test_account_for_txn",
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

            # Create subcategory for transaction
            subcategory_obj = TxnSubcategory.query.get(sample_subcategory)

            # Create transaction
            transaction = Txn.query.filter_by(id="test_txn_1").first()
            if not transaction:
                transaction = Txn(
                    id="test_txn_1",
                    account_id=account.id,
                    amount=Decimal("-50.00"),
                    date=datetime.now().date(),
                    name="Test Transaction",
                    category_id=sample_category,
                    subcategory_id=sample_subcategory if subcategory_obj else None,
                )
                db.session.add(transaction)
                db.session.commit()

        # Now try to delete the subcategory
        response = client.delete(f"/api/subcategory/{sample_subcategory}")
        assert response.status_code == 400

        data = json.loads(response.data)
        assert (
            "Cannot delete subcategory with associated transactions"
            in data["display_message"]
        )

    def test_create_subcategory_with_invalid_data(self, client):
        """Test POST /api/subcategory handles invalid data."""
        response = client.post("/api/subcategory", json={})
        assert response.status_code in [400, 500]  # May return different errors
