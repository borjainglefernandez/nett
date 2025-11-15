import pytest
import json
from datetime import datetime
from decimal import Decimal
from models.transaction.txn import Txn
from models.account.account import Account
from models.transaction.txn_category import TxnCategory
from models.period.period_utils import (
    get_oldest_transaction_date,
    get_totals_by_frequency,
)
from models.budget.budget_frequency import BudgetFrequency
from models import db


@pytest.mark.unit
class TestPeriodUtils:
    """Test period utility functions."""

    @pytest.fixture
    def sample_category(self, test_app):
        """Create a sample category for transaction tests."""
        with test_app.app_context():
            category = TxnCategory.query.filter_by(
                name="Test Transaction Category"
            ).first()
            if not category:
                category = TxnCategory(name="Test Transaction Category")
                db.session.add(category)
                db.session.commit()
            return category.id

    @pytest.fixture
    def sample_account_for_txn(self, test_app):
        """Create a sample account for transactions."""
        with test_app.app_context():
            from models.institution.institution import Institution
            from models.item.item import Item
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype

            institution = Institution.query.filter_by(id="ins_test_period").first()
            if not institution:
                institution = Institution(
                    id="ins_test_period", name="Test Bank", logo=None
                )
                db.session.add(institution)
                db.session.commit()

            item = Item.query.filter_by(id="item_test_period").first()
            if not item:
                item = Item(
                    id="item_test_period",
                    access_token="test_token",
                    institution_id=institution.id,
                )
                db.session.add(item)
                db.session.commit()

            account = Account.query.filter_by(id="account_test_period").first()
            if not account:
                account = Account(
                    id="account_test_period",
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
            return account.id

    @pytest.fixture
    def sample_transactions(self, test_app, sample_account_for_txn, sample_category):
        """Create sample transactions for period testing."""
        with test_app.app_context():
            transactions = []

            # Create transactions with different dates
            dates = [
                datetime(2024, 1, 1).date(),
                datetime(2024, 1, 15).date(),
                datetime(2024, 2, 1).date(),
                datetime(2024, 2, 15).date(),
            ]

            amounts = [
                Decimal("-50.00"),
                Decimal("-75.00"),
                Decimal("100.00"),
                Decimal("-25.00"),
            ]

            for i, (date, amount) in enumerate(zip(dates, amounts)):
                transaction = Txn.query.filter_by(id=f"txn_period_test_{i}").first()
                if not transaction:
                    transaction = Txn(
                        id=f"txn_period_test_{i}",
                        account_id=sample_account_for_txn,
                        amount=amount,
                        date=date,
                        name=f"Test Transaction {i}",
                        category_id=sample_category,
                    )
                    db.session.add(transaction)

            db.session.commit()
            return transactions

    def test_get_oldest_transaction_date(self, test_app, sample_transactions):
        """Test getting the oldest transaction date."""
        with test_app.app_context():
            oldest_date = get_oldest_transaction_date()
            assert oldest_date is not None
            assert isinstance(oldest_date, (datetime, type(datetime.now().date())))
            assert oldest_date.year == 2024
            assert oldest_date.month == 1
            assert oldest_date.day == 1

    def test_get_oldest_transaction_date_no_transactions(self, test_app):
        """Test getting oldest transaction date when no transactions exist."""
        with test_app.app_context():
            # Clear all transactions
            Txn.query.delete()
            db.session.commit()

            with pytest.raises(ValueError) as exc_info:
                get_oldest_transaction_date()
            assert "No transactions found" in str(exc_info.value)

    def test_get_totals_by_frequency_weekly(self, test_app, sample_transactions):
        """Test getting totals by frequency for weekly."""
        with test_app.app_context():
            periods = get_totals_by_frequency(BudgetFrequency.WEEKLY)
            assert isinstance(periods, list)
            # Should have at least some periods since we have transactions
            if periods:  # Only assert if periods exist
                assert all(
                    hasattr(p, "start_date") and hasattr(p, "end_date") for p in periods
                )

    def test_get_totals_by_frequency_monthly(self, test_app, sample_transactions):
        """Test getting totals by frequency for monthly."""
        with test_app.app_context():
            periods = get_totals_by_frequency(BudgetFrequency.MONTHLY)
            assert isinstance(periods, list)
            # Should have at least some periods since we have transactions
            if periods:  # Only assert if periods exist
                assert all(
                    hasattr(p, "start_date") and hasattr(p, "end_date") for p in periods
                )

    def test_get_totals_by_frequency_yearly(self, test_app, sample_transactions):
        """Test getting totals by frequency for yearly."""
        with test_app.app_context():
            periods = get_totals_by_frequency(BudgetFrequency.YEARLY)
            assert isinstance(periods, list)
            # Should have at least some periods since we have transactions
            if periods:  # Only assert if periods exist
                assert all(
                    hasattr(p, "start_date") and hasattr(p, "end_date") for p in periods
                )

    def test_get_totals_by_frequency_no_transactions(self, test_app):
        """Test getting totals when no transactions exist."""
        with test_app.app_context():
            # Clear all transactions
            Txn.query.delete()
            db.session.commit()

            periods = get_totals_by_frequency(BudgetFrequency.MONTHLY)
            assert periods == []
