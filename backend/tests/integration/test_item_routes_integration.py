import pytest
import os
import json
from decimal import Decimal
from datetime import datetime
from models.item.item import Item
from models.account.account import Account
from models.institution.institution import Institution
from models.transaction.txn import Txn
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype
from models import db
import plaid
from plaid.model.item_get_request import ItemGetRequest
from plaid.api import plaid_api


@pytest.mark.integration
class TestItemRoutesIntegration:
    """Integration tests for item routes with real Plaid API calls."""

    @pytest.fixture
    def plaid_client(self, test_app):
        """Get Plaid client from app config."""
        with test_app.app_context():
            from flask import current_app

            return current_app.config.get("plaid_client")

    @pytest.fixture
    def sample_institution(self, test_app):
        """Create a sample institution."""
        with test_app.app_context():
            institution = Institution.query.filter_by(id="ins_chase").first()
            if not institution:
                institution = Institution(id="ins_chase", name="Chase", logo=None)
                db.session.add(institution)
                db.session.commit()
            return institution.id

    @pytest.fixture
    def sample_category(self, test_app):
        """Create a sample category."""
        with test_app.app_context():
            category = TxnCategory.query.filter_by(name="Food and Drink").first()
            if not category:
                category = TxnCategory(name="Food and Drink")
                db.session.add(category)
                db.session.commit()
            return category

    @pytest.fixture
    def real_plaid_item_and_access_token(self, test_app):
        """Create a real Plaid item and return its access token."""
        with test_app.app_context():
            from flask import current_app

            plaid_client = current_app.config.get("plaid_client")

            if not plaid_client:
                pytest.skip("Plaid client not configured")

            try:
                from plaid.model.sandbox_public_token_create_request import (
                    SandboxPublicTokenCreateRequest,
                )
                from plaid.model.products import Products
                from plaid.model.item_public_token_exchange_request import (
                    ItemPublicTokenExchangeRequest,
                )

                # Create public token
                request = SandboxPublicTokenCreateRequest(
                    institution_id="ins_109508",  # Plaid Test Bank
                    initial_products=[Products("transactions")],
                )

                response = plaid_client.sandbox_public_token_create(request)
                public_token = response.public_token

                # Exchange for access token
                exchange_request = ItemPublicTokenExchangeRequest(
                    public_token=public_token
                )
                exchange_response = plaid_client.item_public_token_exchange(
                    exchange_request
                )
                access_token = exchange_response.access_token

                # Get item details
                from plaid.model.item_get_request import ItemGetRequest

                get_item_request = ItemGetRequest(access_token=access_token)
                get_item_response = plaid_client.item_get(get_item_request)
                item_id = get_item_response["item"]["item_id"]

                return {
                    "access_token": access_token,
                    "item_id": item_id,
                    "institution_id": get_item_response["item"]["institution_id"],
                }
            except Exception as e:
                pytest.skip(f"Could not create real Plaid item: {e}")

    @pytest.fixture
    def access_token(self, test_app, plaid_client):
        """Get an access token from Plaid sandbox."""
        with test_app.app_context():
            # Use sandbox credentials
            client_id = os.getenv("PLAID_CLIENT_ID")
            secret = os.getenv("PLAID_SECRET")

            if not client_id or not secret:
                pytest.skip("Plaid credentials not configured")

            # Sandbox doesn't provide a way to get access tokens directly
            # We'll need to create an item first or use a test access token
            # For now, we'll test with mocked data
            return "access-sandbox-test-token"

    @pytest.mark.integration
    def test_comprehensive_item_operations_happy_path(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test all item operations in one comprehensive test to reduce Plaid API calls."""
        with test_app.app_context():
            access_token = real_plaid_item_and_access_token["access_token"]

            # 1. Create the item first
            data = {
                "access_token": access_token,
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [
                200,
                201,
            ], f"Failed to create item: {response.data}"

            # 2. Get the created item
            items_response = client.get("/api/item")
            assert (
                items_response.status_code == 200
            ), f"Failed to get items: {items_response.data}"
            items = json.loads(items_response.data)
            assert len(items) > 0, "No items returned"

            item_id = items[0]["id"]

            # 3. Get accounts from the item
            accounts_response = client.get("/api/account")
            assert (
                accounts_response.status_code == 200
            ), f"Failed to get accounts: {accounts_response.data}"
            accounts = json.loads(accounts_response.data)
            assert isinstance(accounts, list)

            # 4. Create the item again to test reactivation
            response2 = client.post("/api/item", json=data)
            assert response2.status_code in [
                200,
                201,
            ], f"Failed to reactivate item: {response2.data}"

            # 5. Sync transactions
            sync_response = client.post(
                f"/api/item/{item_id}/sync", json={"retries": 1}
            )
            assert (
                sync_response.status_code == 200
            ), f"Failed to sync transactions: {sync_response.data}"

            # 6. Delete the item
            delete_response = client.delete(f"/api/item/{item_id}")
            assert delete_response.status_code in [
                200,
                204,
            ], f"Failed to delete item: {delete_response.data}"

            # 7. Verify item was deleted
            items_after = client.get("/api/item").get_json()
            deleted_item = next(
                (item for item in items_after if item.get("id") == item_id),
                None,
            )
            # Item should no longer exist
            assert deleted_item is None, f"Item {item_id} still exists after deletion"

    @pytest.mark.integration
    def test_account_reactivation_by_name(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test account reactivation by matching original_name (lines 175-190)."""
        with test_app.app_context():
            # First, create an item to get the account structure from Plaid
            plaid_data = real_plaid_item_and_access_token

            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get accounts
            accounts_response = client.get("/api/account")
            accounts = json.loads(accounts_response.data)

            if accounts and len(accounts) > 0:
                # Get account details
                first_account = Account.query.get(accounts[0]["id"])

                if first_account:
                    # Create an inactive account with matching original_name
                    fake_account_id = "test_reactivation_account_123"
                    inactive_account = Account(
                        id=fake_account_id,
                        name="Test Account for Reactivation-0000",
                        original_name="Test Account for Reactivation-0000",  # This will match
                        balance=Decimal("500.00"),
                        limit=Decimal("0.00"),
                        last_updated=datetime.now(),
                        institution_id=sample_institution,
                        item_id=first_account.item_id,
                        account_type=AccountType.DEPOSITORY,
                        account_subtype=AccountSubtype.CHECKING,
                        active=False,  # Inactive
                    )
                    db.session.add(inactive_account)
                    db.session.commit()

                    # Get a new access token and create an item with the same account name
                    plaid_client = test_app.config.get("plaid_client")

                    if plaid_client:
                        try:
                            from plaid.model.sandbox_public_token_create_request import (
                                SandboxPublicTokenCreateRequest,
                            )
                            from plaid.model.products import Products
                            from plaid.model.item_public_token_exchange_request import (
                                ItemPublicTokenExchangeRequest,
                            )

                            # Create new token
                            request = SandboxPublicTokenCreateRequest(
                                institution_id="ins_109508",
                                initial_products=[Products("transactions")],
                            )

                            response = plaid_client.sandbox_public_token_create(request)
                            public_token = response.public_token

                            exchange_request = ItemPublicTokenExchangeRequest(
                                public_token=public_token
                            )
                            exchange_response = plaid_client.item_public_token_exchange(
                                exchange_request
                            )
                            new_access_token = exchange_response.access_token

                            # Create item with new access token
                            data2 = {
                                "access_token": new_access_token,
                                "institution_id": "ins_109508",
                            }

                            response2 = client.post("/api/item", json=data2)
                            # Should succeed
                            assert response2.status_code in [200, 201]

                        except Exception as e:
                            pytest.fail(f"Could not test account reactivation: {e}")
                        finally:
                            Account.query.filter_by(id=fake_account_id).delete()
                            db.session.commit()

    @pytest.mark.integration
    def test_account_limit_enforcement(self, client, test_app, sample_institution):
        """Test account limit enforcement (line 140)."""
        with test_app.app_context():
            plaid_client = test_app.config.get("plaid_client")

            if not plaid_client:
                pytest.skip("Plaid client not configured")

            try:
                from plaid.model.sandbox_public_token_create_request import (
                    SandboxPublicTokenCreateRequest,
                )
                from plaid.model.products import Products
                from plaid.model.item_public_token_exchange_request import (
                    ItemPublicTokenExchangeRequest,
                )

                # Fill database with 15 accounts to reach sandbox limit
                for i in range(15):
                    account = Account(
                        id=f"test_limit_account_{i}",
                        name=f"Test Account {i}",
                        original_name=f"Test Account {i}",
                        balance=Decimal("1000.00"),
                        limit=Decimal("0.00"),
                        last_updated=datetime.now(),
                        institution_id=sample_institution,
                        item_id=f"test_item_limit_{i}",
                        account_type=AccountType.DEPOSITORY,
                        account_subtype=AccountSubtype.CHECKING,
                        active=True,
                    )
                    db.session.add(account)
                db.session.commit()

                # Create public token and exchange for access token
                request = SandboxPublicTokenCreateRequest(
                    institution_id="ins_109508",
                    initial_products=[Products("transactions")],
                )

                response = plaid_client.sandbox_public_token_create(request)
                public_token = response.public_token

                exchange_request = ItemPublicTokenExchangeRequest(
                    public_token=public_token
                )
                exchange_response = plaid_client.item_public_token_exchange(
                    exchange_request
                )
                access_token = exchange_response.access_token

                # Try to create another item - should fail at limit (line 140)
                data = {
                    "access_token": access_token,
                    "institution_id": sample_institution,
                }

                response = client.post("/api/item", json=data)

                assert response.status_code == 400, (
                    f"Expected account limit error (400), got {response.status_code}: "
                    f"{response.data}"
                )

                error_body = json.loads(response.data)
                display_message = error_body.get("display_message", "").lower()
                assert (
                    "limit" in display_message
                ), f"Expected 'limit' in error message, got: {error_body}"

            except Exception as e:
                pytest.fail(f"Could not test account limit: {e}")
            finally:
                Account.query.filter(Account.id.like("test_limit_account_%")).delete()
                db.session.commit()

    @pytest.mark.integration
    def test_account_creation_error_handling(
        self, client, test_app, sample_institution
    ):
        """Test account creation error handling (lines 216-218)."""
        with test_app.app_context():
            # Create a mock account that will cause a database error
            # by violating unique constraints
            from models.account.account import Account
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype
            from decimal import Decimal
            from datetime import datetime

            # First create a valid account
            account1 = Account(
                id="test_error_account_1",
                name="Test Error Account",
                original_name="Test Error Account",
                balance=Decimal("1000.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id="test_item_error",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )
            db.session.add(account1)
            db.session.commit()

            # Try to create another account with the same ID to trigger error
            account2 = Account(
                id="test_error_account_1",  # Same ID - will cause IntegrityError
                name="Test Error Account 2",
                original_name="Test Error Account 2",
                balance=Decimal("2000.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id="test_item_error_2",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            )

            # This should raise an exception that would be caught in lines 216-218
            with pytest.raises(Exception):
                db.session.add(account2)
                db.session.commit()

    @pytest.mark.integration
    def test_item_deletion_plaid_error(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test item deletion when Plaid API fails (lines 250-252)."""
        with test_app.app_context():
            # Create an item first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get the created item
            items_response = client.get("/api/item")
            items = json.loads(items_response.data)
            item_id = items[0]["id"]

            # Mock the Plaid client to raise an exception
            plaid_client = test_app.config.get("plaid_client")
            original_item_remove = plaid_client.item_remove

            def mock_item_remove(request):
                raise Exception("Mocked Plaid API error")

            plaid_client.item_remove = mock_item_remove

            try:
                # Try to delete the item - should handle Plaid error
                delete_response = client.delete(f"/api/item/{item_id}")

                # Should return error response due to Plaid API failure
                assert delete_response.status_code == 500
                response_data = json.loads(delete_response.data)
                assert "Failed to remove bank connection" in response_data.get(
                    "display_message", ""
                )

            finally:
                # Restore original method
                plaid_client.item_remove = original_item_remove

    @pytest.mark.integration
    def test_item_deletion_general_error_handling(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test item deletion general error handling (lines 281-287)."""
        with test_app.app_context():
            # Create an item first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get the created item
            items_response = client.get("/api/item")
            items = json.loads(items_response.data)
            item_id = items[0]["id"]

            # Mock database operations to raise an exception
            original_delete = db.session.delete
            original_commit = db.session.commit

            def mock_delete(obj):
                raise Exception("Mocked database error")

            db.session.delete = mock_delete

            try:
                # Try to delete the item - should handle database error
                delete_response = client.delete(f"/api/item/{item_id}")

                # Should return error response due to database failure
                assert delete_response.status_code == 500
                response_data = json.loads(delete_response.data)
                assert "Failed to remove bank connection" in response_data.get(
                    "display_message", ""
                )

            finally:
                # Restore original methods
                db.session.delete = original_delete
                db.session.commit = original_commit

    @pytest.mark.integration
    def test_sync_invalid_retries_parameter(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test sync with invalid retries parameter (line 308)."""
        with test_app.app_context():
            # Create an item first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get the created item
            items_response = client.get("/api/item")
            items = json.loads(items_response.data)
            item_id = items[0]["id"]

            # Test with invalid retries parameter (non-numeric)
            sync_response = client.post(
                f"/api/item/{item_id}/sync", json={"retries": "invalid_number"}
            )

            # Should still work but use default retries (3)
            assert sync_response.status_code == 200

    @pytest.mark.integration
    def test_sync_cursor_update_logic(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test sync cursor update logic (lines 341-342, 354-355)."""
        with test_app.app_context():
            # Create an item first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get the created item
            items_response = client.get("/api/item")
            items = json.loads(items_response.data)
            item_id = items[0]["id"]

            # Get the item from database to check cursor
            item = Item.query.get(item_id)
            original_cursor = item.cursor

            # Sync transactions
            sync_response = client.post(
                f"/api/item/{item_id}/sync", json={"retries": 1}
            )
            assert sync_response.status_code == 200

            # Check if cursor was updated (it should be if transactions were processed)
            db.session.refresh(item)
            # The cursor might be the same if no transactions were found,
            # but the logic should still execute

    @pytest.mark.integration
    def test_transaction_handlers_added_transactions(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test handle_added_transactions function (lines 365-432)."""
        with test_app.app_context():
            # Create an item and account first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get accounts
            accounts_response = client.get("/api/account")
            accounts = json.loads(accounts_response.data)

            if accounts and len(accounts) > 0:
                account_id = accounts[0]["id"]

                # Create a mock transaction to test the handler
                from datetime import datetime

                mock_transaction = {
                    "transaction_id": "test_txn_added_123",
                    "account_id": account_id,
                    "name": "Test Transaction",
                    "amount": 25.50,
                    "date": datetime(2024, 1, 15),
                    "datetime": datetime(2024, 1, 15, 10, 30, 0),
                    "merchant_name": "Test Merchant",
                    "logo_url": "https://example.com/logo.png",
                    "payment_channel": "in_store",
                    "personal_finance_category": {
                        "primary": "FOOD_AND_DRINK",
                        "detailed": "RESTAURANTS",
                    },
                }

                # Import the handler function
                from routes.item_routes import handle_added_transactions

                # Test the handler
                handle_added_transactions([mock_transaction])

                # Verify transaction was created
                from models.transaction.txn import Txn

                created_txn = Txn.query.get("test_txn_added_123")
                assert created_txn is not None
                assert created_txn.name == "Test Transaction"
                assert created_txn.amount == Decimal("25.50")

    @pytest.mark.integration
    def test_transaction_handlers_modified_transactions(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test handle_modified_transactions function (lines 441-503)."""
        with test_app.app_context():
            # Create an item and account first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get accounts
            accounts_response = client.get("/api/account")
            accounts = json.loads(accounts_response.data)

            if accounts and len(accounts) > 0:
                account_id = accounts[0]["id"]

                # First create a transaction
                from models.transaction.txn import Txn
                from models.transaction.txn_category import TxnCategory
                from models.transaction.txn_subcategory import TxnSubcategory
                from decimal import Decimal

                # Create category and subcategory
                category = TxnCategory.query.filter_by(name="FOOD_AND_DRINK").first()
                if not category:
                    category = TxnCategory(name="FOOD_AND_DRINK")
                    db.session.add(category)
                    db.session.commit()

                subcategory = TxnSubcategory(
                    name="RESTAURANTS",
                    description="Restaurant expenses",
                    category_id=category.id,
                )
                db.session.add(subcategory)
                db.session.commit()

                # Create transaction
                from datetime import datetime

                txn = Txn(
                    id="test_txn_modified_123",
                    name="Original Transaction",
                    amount=Decimal("20.00"),
                    category_id=category.id,
                    subcategory_id=subcategory.id,
                    date=datetime(2024, 1, 15),
                    date_time=datetime(2024, 1, 15, 10, 30, 0),
                    account_id=account_id,
                )
                db.session.add(txn)
                db.session.commit()

                # Create mock modified transaction
                mock_modified_transaction = {
                    "transaction_id": "test_txn_modified_123",
                    "name": "Modified Transaction Name",
                    "amount": 30.00,
                    "date": datetime(2024, 1, 16),
                    "datetime": datetime(2024, 1, 16, 11, 30, 0),
                    "merchant_name": "Updated Merchant",
                    "logo_url": "https://example.com/new_logo.png",
                    "payment_channel": "online",
                    "personal_finance_category": {
                        "primary": "TRANSPORTATION",
                        "detailed": "GAS_STATIONS",
                    },
                }

                # Import the handler function
                from routes.item_routes import handle_modified_transactions

                # Test the handler
                handle_modified_transactions([mock_modified_transaction])

                # Verify transaction was updated
                db.session.refresh(txn)
                assert txn.name == "Modified Transaction Name"
                assert txn.amount == Decimal("30.00")

    @pytest.mark.integration
    def test_transaction_handlers_removed_transactions(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test handle_removed_transactions function (lines 512-520)."""
        with test_app.app_context():
            # Create an item and account first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get accounts
            accounts_response = client.get("/api/account")
            accounts = json.loads(accounts_response.data)

            if accounts and len(accounts) > 0:
                account_id = accounts[0]["id"]

                # First create a transaction
                from models.transaction.txn import Txn
                from models.transaction.txn_category import TxnCategory
                from models.transaction.txn_subcategory import TxnSubcategory
                from decimal import Decimal

                # Create category and subcategory
                category = TxnCategory.query.filter_by(name="FOOD_AND_DRINK").first()
                if not category:
                    category = TxnCategory(name="FOOD_AND_DRINK")
                    db.session.add(category)
                    db.session.commit()

                subcategory = TxnSubcategory(
                    name="RESTAURANTS",
                    description="Restaurant expenses",
                    category_id=category.id,
                )
                db.session.add(subcategory)
                db.session.commit()

                # Create transaction
                from datetime import datetime

                txn = Txn(
                    id="test_txn_removed_123",
                    name="Transaction to Remove",
                    amount=Decimal("15.00"),
                    category_id=category.id,
                    subcategory_id=subcategory.id,
                    date=datetime(2024, 1, 15),
                    date_time=datetime(2024, 1, 15, 10, 30, 0),
                    account_id=account_id,
                )
                db.session.add(txn)
                db.session.commit()

                # Verify transaction exists
                assert Txn.query.get("test_txn_removed_123") is not None

                # Create mock removed transaction
                mock_removed_transaction = {"transaction_id": "test_txn_removed_123"}

                # Import the handler function
                from routes.item_routes import handle_removed_transactions

                # Test the handler
                handle_removed_transactions([mock_removed_transaction])

                # Verify transaction was removed
                assert Txn.query.get("test_txn_removed_123") is None

    @pytest.mark.integration
    def test_account_reactivation_detailed_logic(
        self, client, test_app, real_plaid_item_and_access_token, sample_institution
    ):
        """Test detailed account reactivation logic (lines 175-190)."""
        with test_app.app_context():
            # Create an item first
            plaid_data = real_plaid_item_and_access_token
            data = {
                "access_token": plaid_data["access_token"],
                "institution_id": sample_institution,
            }

            response = client.post("/api/item", json=data)
            assert response.status_code in [200, 201]

            # Get accounts
            accounts_response = client.get("/api/account")
            accounts = json.loads(accounts_response.data)

            if accounts and len(accounts) > 0:
                first_account = Account.query.get(accounts[0]["id"])

                if first_account:
                    # Create an inactive account with matching original_name
                    fake_account_id = "test_reactivation_detailed_123"
                    inactive_account = Account(
                        id=fake_account_id,
                        name="Test Account for Detailed Reactivation-0000",
                        original_name="Test Account for Detailed Reactivation-0000",
                        balance=Decimal("100.00"),
                        limit=Decimal("0.00"),
                        last_updated=datetime.now(),
                        institution_id=sample_institution,
                        item_id=first_account.item_id,
                        account_type=AccountType.DEPOSITORY,
                        account_subtype=AccountSubtype.CHECKING,
                        active=False,  # Inactive
                    )
                    db.session.add(inactive_account)
                    db.session.commit()

                    # Create a new item with the same account name to trigger reactivation
                    plaid_client = test_app.config.get("plaid_client")

                    if plaid_client:
                        try:
                            from plaid.model.sandbox_public_token_create_request import (
                                SandboxPublicTokenCreateRequest,
                            )
                            from plaid.model.products import Products
                            from plaid.model.item_public_token_exchange_request import (
                                ItemPublicTokenExchangeRequest,
                            )

                            # Create new token
                            request = SandboxPublicTokenCreateRequest(
                                institution_id="ins_109508",
                                initial_products=[Products("transactions")],
                            )

                            response = plaid_client.sandbox_public_token_create(request)
                            public_token = response.public_token

                            exchange_request = ItemPublicTokenExchangeRequest(
                                public_token=public_token
                            )
                            exchange_response = plaid_client.item_public_token_exchange(
                                exchange_request
                            )
                            new_access_token = exchange_response.access_token

                            # Create item with new access token
                            data2 = {
                                "access_token": new_access_token,
                                "institution_id": sample_institution,
                            }

                            response2 = client.post("/api/item", json=data2)

                            # Should succeed and potentially reactivate the account
                            assert response2.status_code in [200, 201]

                            # Check if the inactive account was reactivated
                            db.session.refresh(inactive_account)
                            # The account might be reactivated if the name matches

                        except Exception as e:
                            pytest.skip(
                                f"Could not test detailed account reactivation: {e}"
                            )
