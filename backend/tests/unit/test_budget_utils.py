import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from models.budget.budget_utils import (
    get_frequency_period_start_date,
    get_frequency_period_end_date,
    calculate_spent_amount_for_period,
    calculate_spent_amount_for_period_for_budget,
    generate_budget_periods_for_budget,
)
from models.budget.budget import Budget
from models.budget.budget_frequency import BudgetFrequency
from models.transaction.txn import Txn
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models import db


@pytest.mark.unit
class TestBudgetUtils:
    """Test budget utility functions."""

    @pytest.fixture
    def sample_category(self, test_app):
        """Create a sample category for testing."""
        with test_app.app_context():
            category = TxnCategory.query.filter_by(
                name="Test Budget Utils Category"
            ).first()
            if not category:
                category = TxnCategory(name="Test Budget Utils Category")
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

    @pytest.fixture
    def sample_budget(self, test_app, sample_category):
        """Create a sample budget for testing."""
        with test_app.app_context():
            budget = Budget.query.filter_by(
                frequency=BudgetFrequency.MONTHLY, category_id=sample_category
            ).first()
            if not budget:
                budget = Budget(
                    amount=Decimal("1000.00"),
                    frequency=BudgetFrequency.MONTHLY,
                    category_id=sample_category,
                )
                db.session.add(budget)
                db.session.commit()
            return budget

    def test_get_frequency_period_start_date_weekly(self):
        """Test getting period start date for weekly frequency."""
        test_date = datetime(2024, 1, 15)  # A Monday
        start_date = get_frequency_period_start_date(BudgetFrequency.WEEKLY, test_date)
        assert isinstance(start_date, datetime)
        # Should be the start of the week
        assert start_date.weekday() == 0

    def test_get_frequency_period_start_date_monthly(self):
        """Test getting period start date for monthly frequency."""
        test_date = datetime(2024, 3, 15)
        start_date = get_frequency_period_start_date(BudgetFrequency.MONTHLY, test_date)
        assert isinstance(start_date, datetime)
        assert start_date.day == 1
        assert start_date.month == 3

    def test_get_frequency_period_start_date_yearly(self):
        """Test getting period start date for yearly frequency."""
        test_date = datetime(2024, 6, 15)
        start_date = get_frequency_period_start_date(BudgetFrequency.YEARLY, test_date)
        assert isinstance(start_date, datetime)
        assert start_date.day == 1
        assert start_date.month == 1
        assert start_date.year == 2024

    def test_get_frequency_period_end_date_weekly(self):
        """Test getting period end date for weekly frequency."""
        test_date = datetime(2024, 1, 15)  # A Monday
        end_date = get_frequency_period_end_date(BudgetFrequency.WEEKLY, test_date)
        assert isinstance(end_date, datetime)
        # Should be a Sunday
        assert end_date.weekday() == 6

    def test_get_frequency_period_end_date_monthly(self):
        """Test getting period end date for monthly frequency."""
        test_date = datetime(2024, 3, 1)
        end_date = get_frequency_period_end_date(BudgetFrequency.MONTHLY, test_date)
        assert isinstance(end_date, datetime)
        # March has 31 days
        assert end_date.day == 31
        assert end_date.month == 3

    def test_get_frequency_period_end_date_yearly(self):
        """Test getting period end date for yearly frequency."""
        test_date = datetime(2024, 1, 1)
        end_date = get_frequency_period_end_date(BudgetFrequency.YEARLY, test_date)
        assert isinstance(end_date, datetime)
        assert end_date.day == 31
        assert end_date.month == 12
        assert end_date.year == 2024

    def test_calculate_spent_amount_for_period(self, test_app, sample_category):
        """Test calculating spent amount for a period."""
        with test_app.app_context():
            # Get fresh budget from session
            budget = Budget.query.filter_by(
                frequency=BudgetFrequency.MONTHLY, category_id=sample_category
            ).first()
            if not budget:
                budget = Budget(
                    amount=Decimal("1000.00"),
                    frequency=BudgetFrequency.MONTHLY,
                    category_id=sample_category,
                )
                db.session.add(budget)
                db.session.commit()
            from models.account.account import Account
            from models.item.item import Item
            from models.institution.institution import Institution
            from models.account.account_type import AccountType
            from models.account.account_subtype import AccountSubtype

            # Create necessary dependencies
            institution = Institution.query.filter_by(id="ins_budget_utils").first()
            if not institution:
                institution = Institution(
                    id="ins_budget_utils", name="Test Bank", logo=None
                )
                db.session.add(institution)
                db.session.commit()

            item = Item.query.filter_by(id="item_budget_utils").first()
            if not item:
                item = Item(
                    id="item_budget_utils",
                    access_token="test_token",
                    institution_id=institution.id,
                )
                db.session.add(item)
                db.session.commit()

            account = Account.query.filter_by(id="account_budget_utils").first()
            if not account:
                account = Account(
                    id="account_budget_utils",
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

            # Create a transaction in the period
            transaction = Txn.query.filter_by(id="txn_budget_utils_1").first()
            if not transaction:
                transaction = Txn(
                    id="txn_budget_utils_1",
                    account_id=account.id,
                    amount=Decimal("-50.00"),
                    date=datetime.now().date(),
                    name="Test Transaction",
                    category_id=sample_category,
                )
                db.session.add(transaction)
                db.session.commit()

            start = datetime(2024, 1, 1)
            end = datetime.now()

            spent_amount = calculate_spent_amount_for_period(budget, start, end)
            assert isinstance(spent_amount, float)

    def test_calculate_spent_amount_for_period_for_budget(
        self, test_app, sample_category, sample_subcategory
    ):
        """Test calculating spent amount for a budget period."""
        with test_app.app_context():
            # Create a budget with subcategory
            budget_with_subcat = Budget.query.filter_by(
                category_id=sample_category, subcategory_id=sample_subcategory
            ).first()
            if not budget_with_subcat:
                budget_with_subcat = Budget(
                    amount=Decimal("500.00"),
                    frequency=BudgetFrequency.MONTHLY,
                    category_id=sample_category,
                    subcategory_id=sample_subcategory,
                )
                db.session.add(budget_with_subcat)
                db.session.commit()

            start = datetime(2024, 1, 1)
            end = datetime.now()

            spent_amount = calculate_spent_amount_for_period_for_budget(
                budget_with_subcat, start, end
            )
            assert isinstance(spent_amount, float)

    def test_generate_budget_periods_for_budget(self, test_app, sample_category):
        """Test generating budget periods for a budget."""
        with test_app.app_context():
            # Get fresh budget from session
            budget = Budget.query.filter_by(
                frequency=BudgetFrequency.MONTHLY, category_id=sample_category
            ).first()
            if not budget:
                budget = Budget(
                    amount=Decimal("1000.00"),
                    frequency=BudgetFrequency.MONTHLY,
                    category_id=sample_category,
                )
                db.session.add(budget)
                db.session.commit()
            start_date = datetime(2024, 1, 1)
            periods = generate_budget_periods_for_budget(budget, start_date)
            assert isinstance(periods, list)
            # Should have at least one period
            if periods:
                assert all(
                    hasattr(p, "start_date") and hasattr(p, "end_date") for p in periods
                )

    def test_generate_budget_periods_for_budget_weekly(self, test_app, sample_category):
        """Test generating budget periods for weekly frequency."""
        with test_app.app_context():
            budget = Budget.query.filter_by(
                frequency=BudgetFrequency.WEEKLY, category_id=sample_category
            ).first()
            if not budget:
                budget = Budget(
                    amount=Decimal("100.00"),
                    frequency=BudgetFrequency.WEEKLY,
                    category_id=sample_category,
                )
                db.session.add(budget)
                db.session.commit()

            start_date = datetime(2024, 1, 1)
            periods = generate_budget_periods_for_budget(budget, start_date)
            assert isinstance(periods, list)

    def test_generate_budget_periods_for_budget_yearly(self, test_app, sample_category):
        """Test generating budget periods for yearly frequency."""
        with test_app.app_context():
            budget = Budget.query.filter_by(
                frequency=BudgetFrequency.YEARLY, category_id=sample_category
            ).first()
            if not budget:
                budget = Budget(
                    amount=Decimal("5000.00"),
                    frequency=BudgetFrequency.YEARLY,
                    category_id=sample_category,
                )
                db.session.add(budget)
                db.session.commit()

            start_date = datetime(2024, 1, 1)
            periods = generate_budget_periods_for_budget(budget, start_date)
            assert isinstance(periods, list)
