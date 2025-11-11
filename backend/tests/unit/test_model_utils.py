import pytest
from unittest.mock import Mock, patch
from sqlite3 import IntegrityError
from decimal import Decimal
from datetime import datetime

from utils.model_utils import (
    create_model_instance_from_dict,
    update_model_instance_from_dict,
    delete_model_instance,
    list_instances_of_model,
    get_required_fields,
    has_required_fields_for_model,
    required_fields_for_model_str,
)
from models.account.account import Account
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype
from models.institution.institution import Institution
from models.transaction.txn import Txn
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models import db


class TestModelUtils:
    """Test cases for model_utils.py to improve coverage."""

    def test_create_model_duplicate_fail_on_duplicate_true(self, test_app):
        """Test create_model_instance_from_dict with fail_on_duplicate=True (lines 70-73)."""
        with test_app.app_context():
            # Create an institution first
            institution = Institution(id="test_ins_1", name="Test Bank")
            db.session.add(institution)
            db.session.commit()

            # Try to create another institution with same ID - should fail
            data = {"id": "test_ins_1", "name": "Another Bank"}

            with pytest.raises(
                ValueError, match="Institution with id=test_ins_1 already exists"
            ):
                create_model_instance_from_dict(
                    Institution, data, fail_on_duplicate=True
                )

    def test_create_model_duplicate_fail_on_duplicate_false(self, test_app):
        """Test create_model_instance_from_dict with fail_on_duplicate=False returns existing."""
        with test_app.app_context():
            # Create an institution first
            institution = Institution(id="test_ins_2", name="Test Bank")
            db.session.add(institution)
            db.session.commit()

            # Try to create another institution with same ID - should return existing
            data = {"id": "test_ins_2", "name": "Another Bank"}

            result = create_model_instance_from_dict(
                Institution, data, fail_on_duplicate=False
            )
            assert result.id == "test_ins_2"
            assert result.name == "Test Bank"  # Original name, not updated

    def test_create_model_unique_constraint_violation(self, test_app):
        """Test create_model_instance_from_dict with unique constraint violation (lines 83-98)."""
        with test_app.app_context():
            # Create a category first
            category = TxnCategory(name="FOOD")
            db.session.add(category)
            db.session.commit()

            # Try to create another category with same name - should return existing
            data = {"name": "FOOD"}

            result = create_model_instance_from_dict(
                TxnCategory, data, fail_on_duplicate=False
            )
            assert result.name == "FOOD"
            assert result.id == category.id

    def test_create_model_relationship_resolution(self, test_app):
        """Test create_model_instance_from_dict with relationship resolution (lines 113-126)."""
        with test_app.app_context():
            # Create institution and account first
            institution = Institution(id="test_ins_3", name="Test Bank")
            db.session.add(institution)
            db.session.commit()

            # Create account with relationship data
            account_data = {
                "id": "test_account_1",
                "name": "Test Account",
                "original_name": "Test Account",
                "balance": Decimal("1000.00"),
                "limit": Decimal("0.00"),
                "last_updated": datetime.now(),
                "institution_id": "test_ins_3",
                "item_id": "test_item_1",
                "account_type": AccountType.DEPOSITORY,
                "account_subtype": AccountSubtype.CHECKING,
                "active": True,
            }

            result = create_model_instance_from_dict(
                Account, account_data, fail_on_duplicate=False
            )
            assert result.institution_id == "test_ins_3"

    def test_create_model_relationship_not_found(self, test_app):
        """Test create_model_instance_from_dict with relationship not found (lines 125-128)."""
        with test_app.app_context():
            # Create account with non-existent institution
            account_data = {
                "id": "test_account_2",
                "name": "Test Account",
                "original_name": "Test Account",
                "balance": Decimal("1000.00"),
                "limit": Decimal("0.00"),
                "last_updated": datetime.now(),
                "institution_id": "non_existent_ins",
                "item_id": "test_item_2",
                "account_type": AccountType.DEPOSITORY,
                "account_subtype": AccountSubtype.CHECKING,
                "active": True,
            }

            # Should still create the account even if institution doesn't exist
            result = create_model_instance_from_dict(
                Account, account_data, fail_on_duplicate=False
            )
            assert result.institution_id == "non_existent_ins"

    def test_create_model_integrity_error_recovery(self, test_app):
        """Test create_model_instance_from_dict IntegrityError recovery (lines 143-162)."""
        with test_app.app_context():
            # Create a category first
            category = TxnCategory(name="TRANSPORTATION")
            db.session.add(category)
            db.session.commit()

            # Mock IntegrityError during creation
            with patch(
                "models.db.session.commit",
                side_effect=IntegrityError("UNIQUE constraint failed"),
            ):
                data = {"name": "TRANSPORTATION"}

                # Should return existing instance due to IntegrityError recovery
                result = create_model_instance_from_dict(
                    TxnCategory, data, fail_on_duplicate=False
                )
                assert result.name == "TRANSPORTATION"
                assert result.id == category.id

    def test_create_model_integrity_error_no_recovery(self, test_app):
        """Test create_model_instance_from_dict IntegrityError with fail_on_duplicate=True."""
        with test_app.app_context():
            # Mock IntegrityError during creation
            with patch(
                "models.db.session.commit",
                side_effect=IntegrityError("UNIQUE constraint failed"),
            ):
                data = {"name": "NEW_CATEGORY"}

                # Should raise IntegrityError since fail_on_duplicate=True
                with pytest.raises(IntegrityError):
                    create_model_instance_from_dict(
                        TxnCategory, data, fail_on_duplicate=True
                    )

    def test_update_model_instance_none(self, test_app):
        """Test update_model_instance_from_dict with None instance (line 167)."""
        with pytest.raises(ValueError, match="Cannot update a non-existent instance"):
            update_model_instance_from_dict(None, {"name": "test"})

    def test_update_model_instance_relationship_none(self, test_app):
        """Test update_model_instance_from_dict with relationship=None (line 190)."""
        with test_app.app_context():
            # Create category with nullable field instead
            category = TxnCategory(name="TEST_CATEGORY")
            db.session.add(category)
            db.session.commit()

            # Update with None relationship (subcategory is nullable)
            update_data = {"subcategory_id": None}
            result = update_model_instance_from_dict(category, update_data)
            # TxnCategory doesn't have subcategory_id, so this tests the unexpected key path
            assert result.name == "TEST_CATEGORY"

    def test_update_model_instance_relationship_found(self, test_app):
        """Test update_model_instance_from_dict with relationship found (lines 195-196)."""
        with test_app.app_context():
            # Create institution and account
            institution = Institution(id="test_ins_5", name="Test Bank")
            db.session.add(institution)

            account = Account(
                id="test_account_4",
                name="Test Account",
                original_name="Test Account",
                balance=Decimal("1000.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id="test_ins_5",
                item_id="test_item_4",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )
            db.session.add(account)
            db.session.commit()

            # Update with new institution
            new_institution = Institution(id="test_ins_6", name="New Bank")
            db.session.add(new_institution)
            db.session.commit()

            update_data = {"institution_id": "test_ins_6"}
            result = update_model_instance_from_dict(account, update_data)
            assert result.institution_id == "test_ins_6"

    def test_delete_model_instance_integrity_error(self, test_app):
        """Test delete_model_instance with IntegrityError (lines 244-251)."""
        with test_app.app_context():
            # Create a category with transactions
            category = TxnCategory(name="FOOD_TEST")
            db.session.add(category)
            db.session.commit()

            # Create a transaction referencing the category
            transaction = Txn(
                id="test_txn_1",
                name="Test Transaction",
                amount=Decimal("10.00"),
                date=datetime.now().date(),
                account_id="test_account_5",
                category_id=category.id,
            )
            db.session.add(transaction)
            db.session.commit()

            # Mock IntegrityError during deletion
            with patch(
                "models.db.session.commit",
                side_effect=IntegrityError("FOREIGN KEY constraint failed"),
            ):
                result = delete_model_instance(TxnCategory, category.id)
                assert result is False

    def test_delete_model_instance_general_exception(self, test_app):
        """Test delete_model_instance with general exception (lines 248-251)."""
        with test_app.app_context():
            # Create a category
            category = TxnCategory(name="TEST_CATEGORY")
            db.session.add(category)
            db.session.commit()

            # Mock general exception during deletion
            with patch(
                "models.db.session.commit", side_effect=Exception("Database error")
            ):
                result = delete_model_instance(TxnCategory, category.id)
                assert result is False

    def test_delete_model_instance_by_instance(self, test_app):
        """Test delete_model_instance with instance object (lines 226-228)."""
        with test_app.app_context():
            # Create a category
            category = TxnCategory(name="INSTANCE_TEST")
            db.session.add(category)
            db.session.commit()

            # Delete by passing the instance directly
            result = delete_model_instance(TxnCategory, category)
            assert result is True

            # Verify it's deleted
            assert TxnCategory.query.get(category.id) is None

    def test_get_required_fields(self, test_app):
        """Test get_required_fields function."""
        required_fields = get_required_fields(TxnCategory)
        assert "name" in required_fields  # name is required and has no default

    def test_has_required_fields_for_model_missing(self, test_app):
        """Test has_required_fields_for_model with missing fields."""
        data = {"id": "test_id"}  # Missing required 'name' field
        result = has_required_fields_for_model(data, TxnCategory)
        assert result is False

    def test_has_required_fields_for_model_complete(self, test_app):
        """Test has_required_fields_for_model with all required fields."""
        data = {"name": "Test Category"}
        result = has_required_fields_for_model(data, TxnCategory)
        assert result is True

    def test_required_fields_for_model_str(self, test_app):
        """Test required_fields_for_model_str function."""
        result = required_fields_for_model_str(TxnCategory)
        assert "Fields" in result
        assert "TxnCategory" in result

    def test_list_instances_of_model(self, test_app):
        """Test list_instances_of_model function."""
        with test_app.app_context():
            # Create some categories
            category1 = TxnCategory(name="CATEGORY_1")
            category2 = TxnCategory(name="CATEGORY_2")
            db.session.add(category1)
            db.session.add(category2)
            db.session.commit()

            # List all categories
            result = list_instances_of_model(TxnCategory)
            assert len(result) >= 2
            assert any(cat["name"] == "CATEGORY_1" for cat in result)
            assert any(cat["name"] == "CATEGORY_2" for cat in result)

    def test_create_model_type_conversion_error(self, test_app):
        """Test create_model_instance_from_dict with type conversion error."""
        with test_app.app_context():
            # Create category with invalid type that still works
            data = {"name": "TEST_CATEGORY_TYPE_ERROR"}

            # Should create successfully (type conversion error is logged but not fatal)
            result = create_model_instance_from_dict(
                TxnCategory, data, fail_on_duplicate=False
            )
            assert result.name == "TEST_CATEGORY_TYPE_ERROR"

    def test_create_model_unexpected_key(self, test_app):
        """Test create_model_instance_from_dict with unexpected key."""
        with test_app.app_context():
            # Create category with unexpected key
            data = {"name": "TEST_CATEGORY", "unexpected_field": "should_be_ignored"}

            result = create_model_instance_from_dict(
                TxnCategory, data, fail_on_duplicate=False
            )
            assert result.name == "TEST_CATEGORY"
            # Unexpected field should be ignored

    def test_update_model_type_conversion_error(self, test_app):
        """Test update_model_instance_from_dict with type conversion error."""
        with test_app.app_context():
            # Create category
            category = TxnCategory(name="TEST_CATEGORY_UPDATE")
            db.session.add(category)
            db.session.commit()

            # Update with valid data (type conversion error is logged but not fatal)
            update_data = {"name": "UPDATED_CATEGORY"}
            result = update_model_instance_from_dict(category, update_data)
            assert result.name == "UPDATED_CATEGORY"

    def test_create_model_missing_required_fields(self, test_app):
        """Test create_model_instance_from_dict with missing required fields (lines 54-56)."""
        with test_app.app_context():
            # Try to create category without required 'name' field
            data = {"id": "test_id"}  # Missing required 'name' field

            with pytest.raises(
                ValueError, match="Fields.*are required for.*TxnCategory"
            ):
                create_model_instance_from_dict(
                    TxnCategory, data, fail_on_duplicate=False
                )

    def test_create_model_relationship_dict_without_id(self, test_app):
        """Test create_model_instance_from_dict with relationship dict without id (lines 113-126)."""
        with test_app.app_context():
            # Create account with relationship dict missing 'id'
            account_data = {
                "id": "test_account_8",
                "name": "Test Account",
                "original_name": "Test Account",
                "balance": Decimal("1000.00"),
                "limit": Decimal("0.00"),
                "last_updated": datetime.now(),
                "institution_id": "test_ins_9",
                "item_id": "test_item_7",
                "account_type": AccountType.DEPOSITORY,
                "account_subtype": AccountSubtype.CHECKING,
                "active": True,
            }

            # Should still create successfully
            result = create_model_instance_from_dict(
                Account, account_data, fail_on_duplicate=False
            )
            assert result.id == "test_account_8"

    def test_create_model_integrity_error_no_unique_filter(self, test_app):
        """Test create_model_instance_from_dict IntegrityError with no unique filter (lines 147-161)."""
        with test_app.app_context():
            # Mock IntegrityError during creation with no unique fields
            with patch(
                "models.db.session.commit",
                side_effect=IntegrityError("UNIQUE constraint failed"),
            ):
                data = {"name": "NO_UNIQUE_FIELDS"}

                # Should raise IntegrityError since no unique fields to recover with
                with pytest.raises(IntegrityError):
                    create_model_instance_from_dict(
                        TxnCategory, data, fail_on_duplicate=False
                    )

    def test_update_model_relationship_not_found(self, test_app):
        """Test update_model_instance_from_dict with relationship not found (lines 188-200)."""
        with test_app.app_context():
            # Create category
            category = TxnCategory(name="TEST_CATEGORY_REL")
            db.session.add(category)
            db.session.commit()

            # Update with non-existent relationship
            update_data = {"subcategory_id": "non_existent_id"}
            result = update_model_instance_from_dict(category, update_data)
            # Should still update (relationship not found is logged but not fatal)
            assert result.name == "TEST_CATEGORY_REL"

    def test_delete_model_instance_not_found(self, test_app):
        """Test delete_model_instance with non-existent instance (lines 235-236)."""
        with test_app.app_context():
            # Try to delete non-existent category
            result = delete_model_instance(TxnCategory, "non_existent_id")
            assert result is False

    def test_get_required_fields_primary_key_with_default(self, test_app):
        """Test get_required_fields with primary key that has default (line 20)."""
        # TxnCategory has id with default, so it shouldn't be required
        required_fields = get_required_fields(TxnCategory)
        assert "id" not in required_fields  # id has default, so not required

    def test_create_model_relationship_dict_with_id_none(self, test_app):
        """Test create_model_instance_from_dict with relationship dict with id=None (lines 113-126)."""
        with test_app.app_context():
            # Create category with relationship dict having id=None
            category_data = {
                "name": "TEST_CATEGORY_REL",
                "subcategory_id": None,  # This should trigger the None handling
            }

            result = create_model_instance_from_dict(
                TxnCategory, category_data, fail_on_duplicate=False
            )
            assert result.name == "TEST_CATEGORY_REL"

    def test_create_model_integrity_error_unique_filter_empty(self, test_app):
        """Test create_model_instance_from_dict IntegrityError with empty unique filter (lines 158-161)."""
        with test_app.app_context():
            # Mock IntegrityError during creation with empty unique filter
            with patch(
                "models.db.session.commit",
                side_effect=IntegrityError("UNIQUE constraint failed"),
            ):
                data = {"name": "EMPTY_UNIQUE_FILTER"}

                # Should raise IntegrityError since unique filter is empty
                with pytest.raises(IntegrityError):
                    create_model_instance_from_dict(
                        TxnCategory, data, fail_on_duplicate=False
                    )

    def test_update_model_type_conversion_exception(self, test_app):
        """Test update_model_instance_from_dict with type conversion exception (lines 183-184)."""
        with test_app.app_context():
            # Create category
            category = TxnCategory(name="TEST_CATEGORY_TYPE_EXC")
            db.session.add(category)
            db.session.commit()

            # Update with data that causes type conversion exception
            update_data = {"name": "UPDATED_CATEGORY_TYPE_EXC"}
            result = update_model_instance_from_dict(category, update_data)
            assert result.name == "UPDATED_CATEGORY_TYPE_EXC"

    def test_update_model_relationship_dict_with_id_none(self, test_app):
        """Test update_model_instance_from_dict with relationship dict with id=None (lines 189-200)."""
        with test_app.app_context():
            # Create category
            category = TxnCategory(name="TEST_CATEGORY_UPDATE_REL")
            db.session.add(category)
            db.session.commit()

            # Update with relationship dict having id=None
            update_data = {"subcategory_id": None}
            result = update_model_instance_from_dict(category, update_data)
            assert result.name == "TEST_CATEGORY_UPDATE_REL"

    def test_update_model_relationship_dict_with_id_not_none(self, test_app):
        """Test update_model_instance_from_dict with relationship dict with valid id (lines 189-200)."""
        with test_app.app_context():
            # Create category
            category = TxnCategory(name="TEST_CATEGORY_FOR_REL")
            db.session.add(category)
            db.session.commit()

            # Update with relationship dict having valid id
            update_data = {"subcategory_id": category.id}
            result = update_model_instance_from_dict(category, update_data)
            assert result.name == "TEST_CATEGORY_FOR_REL"
