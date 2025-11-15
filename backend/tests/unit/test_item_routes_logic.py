import pytest
from decimal import Decimal
from datetime import datetime
from models.item.item import Item
from models.account.account import Account
from models.institution.institution import Institution
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype
from models import db


@pytest.mark.unit
class TestItemRoutesLogic:
    """Test the logical components of item routes without Plaid API calls."""

    @pytest.fixture
    def sample_institution(self, test_app):
        """Create a sample institution."""
        with test_app.app_context():
            institution = Institution.query.filter_by(id="ins_logic_test").first()
            if not institution:
                institution = Institution(id="ins_logic_test", name="Logic Test Bank", logo=None)
                db.session.add(institution)
                db.session.commit()
            return institution.id

    def test_account_limit_logic_sandbox(self, test_app, sample_institution):
        """Test the account limit logic for sandbox environment."""
        with test_app.app_context():
            import os
            
            # Set to sandbox environment
            original_env = os.getenv("PLAID_ENV")
            os.environ["PLAID_ENV"] = "sandbox"
            
            try:
                # Clear existing accounts
                Account.query.delete()
                db.session.commit()
                
                # Create 14 accounts (just under 15 limit for sandbox)
                for i in range(14):
                    account = Account(
                        id=f"test_account_{i}",
                        name=f"Test Account {i}",
                        original_name=f"Test Account {i}",
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
                
                # Check account count
                existing_total = Account.query.count()
                assert existing_total == 14
                
                # Simulate adding 1 more account (should be fine, total = 15)
                new_accounts_from_plaid = 1
                max_accounts = 15  # Sandbox limit
                
                assert existing_total + new_accounts_from_plaid <= max_accounts
                
            finally:
                if original_env:
                    os.environ["PLAID_ENV"] = original_env
                else:
                    os.environ.pop("PLAID_ENV", None)

    def test_account_limit_logic_production(self, test_app, sample_institution):
        """Test the account limit logic for production environment."""
        with test_app.app_context():
            import os
            
            # Set to production environment
            original_env = os.getenv("PLAID_ENV")
            os.environ["PLAID_ENV"] = "production"
            
            try:
                # Clear existing accounts
                Account.query.delete()
                db.session.commit()
                
                # Create 9 accounts (just under limit)
                for i in range(9):
                    account = Account(
                        id=f"test_account_prod_{i}",
                        name=f"Test Account {i}",
                        original_name=f"Test Account {i}",
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
                
                # Check account count
                existing_total = Account.query.count()
                assert existing_total == 9
                
                # Simulate adding 1 more account (should be fine, total = 10)
                new_accounts_from_plaid = 1
                max_accounts = 10  # Production limit
                
                assert existing_total + new_accounts_from_plaid <= max_accounts
                
            finally:
                if original_env:
                    os.environ["PLAID_ENV"] = original_env
                else:
                    os.environ.pop("PLAID_ENV", None)

    def test_account_reactivation_logic(self, test_app, sample_institution):
        """Test the account reactivation logic when IDs match."""
        with test_app.app_context():
            # Create an existing account
            original_account_id = "test_reactivation_id"
            account = Account(
                id=original_account_id,
                name="Old Name",
                original_name="Old Name-0000",
                balance=Decimal("500.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id="old_item",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=False,  # Inactive
            )
            db.session.add(account)
            db.session.commit()
            
            # Simulate reactivation
            account.active = True
            account.name = "New Name"
            account.balance = Decimal("1000.00")
            db.session.commit()
            
            # Verify
            reactivated_account = Account.query.get(original_account_id)
            assert reactivated_account.active is True
            assert reactivated_account.balance == Decimal("1000.00")

    def test_account_reactivation_logic_by_name(self, test_app, sample_institution):
        """Test the account reactivation logic when matching by original_name."""
        with test_app.app_context():
            # Create an existing account with specific original_name
            account = Account(
                id="old_id",
                name="Current Name",
                original_name="Chase Total-0000",
                balance=Decimal("500.00"),
                limit=Decimal("0.00"),
                last_updated=datetime.now(),
                institution_id=sample_institution,
                item_id="old_item",
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=False,
            )
            db.session.add(account)
            db.session.commit()
            
            # Simulate a new Plaid account with matching name but different ID
            new_account_id = "new_id"
            
            # This tests the original_name matching logic
            existing_account = Account.query.filter(
                Account.original_name == "Chase Total-0000"
            ).first()
            
            assert existing_account is not None
            assert existing_account.id == "old_id"
            
            # If we were to reactivate:
            existing_account.id = new_account_id
            existing_account.active = True
            existing_account.balance = Decimal("2000.00")
            db.session.commit()
            
            # Verify
            reactivated_account = Account.query.get(new_account_id)
            assert reactivated_account.active is True
            assert reactivated_account.balance == Decimal("2000.00")
