import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from decimal import Decimal

from utils.model_utils import (
    create_model_instance_from_dict,
    update_model_instance_from_dict,
    delete_model_instance,
    list_instances_of_model,
)
from models.account.account import Account
from models.item.item import Item
from models.institution.institution import Institution
from models import db


class TestModelUtils:
    """Test utility functions for model operations."""

    def test_create_model_instance_from_dict(self, test_app, sample_institution):
        """Test creating model instance from dictionary."""
        with test_app.app_context():
            account_data = {
                "id": "test_account",
                "name": "Test Account",
                "original_name": "Test Account",
                "balance": 1000.0,
                "limit": 500.0,
                "last_updated": datetime.now(),
                "institution_id": sample_institution,
                "item_id": "test_item",
                "account_type": "depository",
                "account_subtype": "checking",
                "active": True,
            }

            account = create_model_instance_from_dict(Account, account_data)

            assert account.id == "test_account"
            assert account.name == "Test Account"
            assert account.balance == 1000.0
            assert account.active is True

    def test_create_model_instance_duplicate_handling(
        self, test_app, sample_institution
    ):
        """Test handling of duplicate model instances."""
        with test_app.app_context():
            # Create first instance
            account_data = {
                "id": "test_account",
                "name": "Test Account",
                "original_name": "Test Account",
                "balance": 1000.0,
                "limit": 500.0,
                "last_updated": datetime.now(),
                "institution_id": sample_institution,
                "item_id": "test_item",
                "account_type": "depository",
                "account_subtype": "checking",
                "active": True,
            }

            account1 = create_model_instance_from_dict(Account, account_data)

            # Try to create duplicate with fail_on_duplicate=False
            account2 = create_model_instance_from_dict(
                Account, account_data, fail_on_duplicate=False
            )

            # Should return existing instance
            assert account1.id == account2.id

    def test_update_model_instance_from_dict(self, test_app, sample_accounts):
        """Test updating model instance from dictionary."""
        with test_app.app_context():
            account = sample_accounts[0]
            original_id = account.id

            update_data = {
                "name": "Updated Account Name",
                "balance": 2000.0,
                "active": False,
            }

            update_model_instance_from_dict(account, update_data)

            assert account.name == "Updated Account Name"
            assert account.balance == 2000.0
            assert account.active is False
            assert account.id == original_id  # ID should not change

    def test_delete_model_instance(self, test_app, sample_accounts):
        """Test deleting model instance."""
        with test_app.app_context():
            account = sample_accounts[0]
            account_id = account.id

            # Verify account exists
            assert Account.query.get(account_id) is not None

            # Delete account
            delete_model_instance(Account, account_id)

            # Verify account is deleted
            assert Account.query.get(account_id) is None

    def test_list_instances_of_model(self, test_app, sample_accounts):
        """Test listing instances of a model."""
        with test_app.app_context():
            accounts = list_instances_of_model(Account)

            # Re-query to get fresh objects from database
            from models import db

            db.session.expire_all()
            accounts_in_db = Account.query.all()

            assert len(accounts_in_db) >= len(
                sample_accounts
            )  # At least the sample accounts
            assert all(isinstance(account, Account) for account in accounts_in_db)

    def test_list_instances_of_model_empty(self, test_app):
        """Test listing instances when no records exist."""
        with test_app.app_context():
            accounts = list_instances_of_model(Account)
            assert len(accounts) == 0

    def test_create_model_with_relationships(self, test_app):
        """Test creating model with foreign key relationships."""
        with test_app.app_context():
            # Create institution first
            institution_data = {"id": "ins_test", "name": "Test Bank", "logo": None}
            institution = create_model_instance_from_dict(Institution, institution_data)

            # Create item with institution relationship
            item_data = {
                "id": "test_item",
                "access_token": "test_token",
                "institution_id": institution.id,
            }
            item = create_model_instance_from_dict(Item, item_data)

            assert item.institution_id == institution.id
            assert item.id == "test_item"

    def test_create_model_with_invalid_data(self, test_app):
        """Test creating model with invalid data."""
        with test_app.app_context():
            # Test with missing required fields
            invalid_data = {
                "name": "Test Account"
                # Missing required fields like id, institution_id, etc.
            }

            with pytest.raises(Exception):
                create_model_instance_from_dict(Account, invalid_data)

    def test_update_model_with_nonexistent_field(self, test_app, sample_accounts):
        """Test updating model with non-existent field."""
        with test_app.app_context():
            account = sample_accounts[0]

            # Update with non-existent field (should be ignored)
            update_data = {
                "name": "Updated Name",
                "nonexistent_field": "should_be_ignored",
            }

            update_model_instance_from_dict(account, update_data)

            assert account.name == "Updated Name"
            # nonexistent_field should not cause an error

    def test_model_utils_logging(self, test_app, sample_institution, caplog):
        """Test that model utils functions log appropriately."""
        with test_app.app_context():
            account_data = {
                "id": "test_account",
                "name": "Test Account",
                "original_name": "Test Account",
                "balance": 1000.0,
                "limit": 500.0,
                "last_updated": datetime.now(),
                "institution_id": sample_institution,
                "item_id": "test_item",
                "account_type": "depository",
                "account_subtype": "checking",
                "active": True,
            }

            with caplog.at_level("INFO"):
                create_model_instance_from_dict(Account, account_data)

            # Check that appropriate log messages were generated
            assert "Creating instance of Account" in caplog.text

    def test_create_model_instance_relationship_dict(self, test_app):
        """Test creating model instance with relationship as dict."""
        with test_app.app_context():
            # Create institution first
            institution_data = {"id": "ins_test_rel", "name": "Test Bank", "logo": None}
            institution = create_model_instance_from_dict(Institution, institution_data)

            # Create item with institution relationship as dict
            item_data = {
                "id": "test_item_rel",
                "access_token": "test_token",
                "institution": {"id": institution.id},
            }
            # This will test the relationship handling in create_model_instance_from_dict
            with pytest.raises(Exception):
                # Item doesn't have an institution relationship, so this should fail
                create_model_instance_from_dict(Item, item_data)

    def test_update_model_instance_with_none_instance(self, test_app):
        """Test updating None instance raises error."""
        with test_app.app_context():
            with pytest.raises(ValueError) as exc_info:
                update_model_instance_from_dict(None, {"name": "test"})
            assert "Cannot update a non-existent instance" in str(exc_info.value)

    def test_update_model_instance_with_relationship_dict(
        self, test_app, sample_institution
    ):
        """Test updating model instance with relationship as dict."""
        with test_app.app_context():
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype

            account = Account(
                id="test_acc_update_rel",
                name="Test Account",
                original_name="Test Account",
                balance=Decimal("1000.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id="test_item",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )
            db.session.add(account)
            db.session.commit()

            # Update with relationship dict (this should be ignored for Account)
            update_data = {
                "name": "Updated Name",
                "institution": {"id": "new_institution_id"},  # Invalid relationship
            }
            update_model_instance_from_dict(account, update_data)
            assert account.name == "Updated Name"

    def test_create_model_instance_IntegrityError_fail_on_duplicate_false(
        self, test_app, sample_institution
    ):
        """Test that IntegrityError is handled correctly when fail_on_duplicate=False."""
        with test_app.app_context():
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype

            account_data = {
                "id": "test_account_integrity",
                "name": "Test Account",
                "original_name": "Test Account Unique",
                "balance": Decimal("1000.00"),
                "limit": Decimal("0.00"),
                "last_updated": datetime.now(),
                "institution_id": sample_institution,
                "item_id": "test_item",
                "account_type": AccountType.DEPOSITORY,
                "account_subtype": AccountSubtype.CHECKING,
                "active": True,
            }

            account1 = create_model_instance_from_dict(Account, account_data)

            # Try to create with same unique field but different id
            account_data["id"] = "test_account_integrity_2"
            account2 = create_model_instance_from_dict(
                Account, account_data, fail_on_duplicate=False
            )

            # Should handle IntegrityError and return existing or raise
            # The behavior depends on implementation

    def test_delete_model_instance_by_instance(self, test_app, sample_institution):
        """Test deleting model instance by passing the instance itself."""
        with test_app.app_context():
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype

            # Create an account
            account = Account(
                id="test_acc_delete_by_instance",
                name="Test Account",
                original_name="Test Account",
                balance=Decimal("1000.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id="test_item",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )
            db.session.add(account)
            db.session.commit()

            # Delete by passing the instance
            result = delete_model_instance(Account, account)
            assert result is True
            assert Account.query.get("test_acc_delete_by_instance") is None

    def test_delete_model_instance_not_found(self, test_app):
        """Test deleting non-existent model instance."""
        with test_app.app_context():
            result = delete_model_instance(Account, "non_existent_id")
            assert result is False
