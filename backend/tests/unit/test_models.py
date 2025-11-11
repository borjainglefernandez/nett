import pytest
from datetime import datetime
from decimal import Decimal
from models.account.account import Account
from models.item.item import Item
from models.institution.institution import Institution
from models.transaction.txn import Txn
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype


class TestAccountModel:
    """Test Account model functionality."""

    def test_account_creation(self, test_app, sample_institution, sample_item):
        """Test account creation with all required fields."""
        with test_app.app_context():
            account = Account(
                id="test_account",
                name="Test Account",
                original_name="Test Account",
                balance=1000.0,
                limit=500.0,
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id=sample_item,
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )

            assert account.id == "test_account"
            assert account.name == "Test Account"
            assert account.balance == 1000.0
            assert account.active is True
            assert account.institution_id == sample_institution
            assert account.item_id == sample_item

    def test_account_to_dict(self, test_app, sample_institution, sample_item):
        """Test account to_dict includes all required fields."""
        with test_app.app_context():
            account = Account(
                id="test_account",
                name="Test Account",
                original_name="Test Account",
                balance=1000.0,
                limit=500.0,
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id=sample_item,
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )

            # Add to database so relationships work
            from models import db

            db.session.add(account)
            db.session.commit()
            db.session.refresh(account)

            account_dict = account.to_dict()

            # Check all required fields are present
            required_fields = [
                "id",
                "name",
                "balance",
                "last_updated",
                "institution_name",
                "account_type",
                "account_subtype",
                "transaction_count",
                "logo",
                "active",
                "item_id",
                "institution_id",
            ]

            for field in required_fields:
                assert field in account_dict, f"Field {field} missing from to_dict()"

            # Check specific values
            assert account_dict["id"] == "test_account"
            assert account_dict["name"] == "Test Account"
            assert account_dict["balance"] == 1000.0
            assert account_dict["active"] is True
            assert account_dict["item_id"] == sample_item
            assert account_dict["institution_id"] == sample_institution

    def test_account_soft_deletion(self, test_app, sample_accounts):
        """Test account soft deletion by setting active=False."""
        with test_app.app_context():
            from models import db

            account_id = sample_accounts[0].id
            account = db.session.get(Account, account_id)
            assert account.active is True

            # Soft delete
            account.active = False
            db.session.commit()
            assert account.active is False

    def test_account_relationships(
        self, test_app, sample_accounts, sample_item, sample_institution
    ):
        """Test account relationships with Item and Institution."""
        with test_app.app_context():
            from models import db

            account_id = sample_accounts[0].id
            account = db.session.get(Account, account_id)

            # Test relationship with Item
            assert account.item_id == sample_item

            # Test relationship with Institution
            assert account.institution_id == sample_institution


class TestItemModel:
    """Test Item model functionality."""

    def test_item_creation(self, test_app, sample_institution):
        """Test item creation with required fields."""
        with test_app.app_context():
            item = Item(
                id="test_item",
                access_token="test_token",
                institution_id=sample_institution,
            )

            assert item.id == "test_item"
            assert item.access_token == "test_token"
            assert item.institution_id == sample_institution

    def test_item_to_dict(self, test_app, sample_institution):
        """Test item to_dict includes required fields."""
        with test_app.app_context():
            item = Item(
                id="test_item",
                access_token="test_token",
                institution_id=sample_institution,
            )

            item_dict = item.to_dict()

            required_fields = ["id", "access_token", "institution_id"]
            for field in required_fields:
                assert field in item_dict, f"Field {field} missing from to_dict()"

            assert item_dict["id"] == "test_item"
            assert (
                item_dict["access_token"] == "test_t..."
            )  # Access token is truncated in to_dict
            assert item_dict["institution_id"] == sample_institution


class TestInstitutionModel:
    """Test Institution model functionality."""

    def test_institution_creation(self, test_app):
        """Test institution creation."""
        with test_app.app_context():
            institution = Institution(
                id="ins_test", name="Test Bank", logo="test_logo.png"
            )

            assert institution.id == "ins_test"
            assert institution.name == "Test Bank"
            assert institution.logo == "test_logo.png"

    def test_institution_to_dict(self, test_app):
        """Test institution to_dict includes required fields."""
        with test_app.app_context():
            institution = Institution(
                id="ins_test", name="Test Bank", logo="test_logo.png"
            )

            institution_dict = institution.to_dict()

            required_fields = ["id", "name", "logo"]
            for field in required_fields:
                assert (
                    field in institution_dict
                ), f"Field {field} missing from to_dict()"

            assert institution_dict["id"] == "ins_test"
            assert institution_dict["name"] == "Test Bank"
            assert institution_dict["logo"] == "test_logo.png"


class TestTxnModel:
    """Test Txn model functionality."""

    def test_transaction_creation(self, test_app, sample_accounts):
        """Test transaction creation with required fields."""
        with test_app.app_context():
            from models import db

            account_id = sample_accounts[0].id
            transaction = Txn(
                id="txn_test",
                account_id=account_id,
                amount=Decimal("-25.50"),
                date=datetime.now().date(),
                name="Test Transaction",
                category_id="1",
            )

            assert transaction.id == "txn_test"
            assert transaction.account_id == account_id
            assert transaction.amount == Decimal("-25.50")
            assert transaction.name == "Test Transaction"

    def test_transaction_to_dict(self, test_app, sample_accounts):
        """Test transaction to_dict includes required fields."""
        with test_app.app_context():
            from models import db

            account_id = sample_accounts[0].id
            transaction = Txn(
                id="txn_test",
                account_id=account_id,
                amount=Decimal("-25.50"),
                date=datetime.now().date(),
                name="Test Transaction",
                category_id="1",
            )

            transaction_dict = transaction.to_dict()

            required_fields = ["id", "account_id", "amount", "date", "name"]
            for field in required_fields:
                assert (
                    field in transaction_dict
                ), f"Field {field} missing from to_dict()"

            assert transaction_dict["id"] == "txn_test"
            assert transaction_dict["amount"] == -25.50
            assert transaction_dict["name"] == "Test Transaction"
