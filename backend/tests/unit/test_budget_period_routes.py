import pytest
import json
from decimal import Decimal
from models.budget.budget import Budget
from models.budget.budget_frequency import BudgetFrequency
from models.transaction.txn import Txn
from models.transaction.txn_category import TxnCategory
from models import db


@pytest.mark.unit
class TestBudgetPeriodRoutes:
    """Test budget period route endpoints."""

    @pytest.fixture
    def sample_category(self, test_app):
        """Create a sample category for testing."""
        with test_app.app_context():
            category = TxnCategory.query.filter_by(name="Test Budget Category").first()
            if not category:
                category = TxnCategory(name="Test Budget Category")
                db.session.add(category)
                db.session.commit()
            return category.id

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

    def test_get_budget_period(self, client, sample_budget):
        """Test GET /api/budget_period returns budget periods."""
        response = client.get("/api/budget_period?frequency=Monthly")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)

    def test_get_budget_period_with_different_frequencies(self, client, sample_budget):
        """Test GET /api/budget_period with different frequencies."""
        frequencies = ["Weekly", "Monthly", "Yearly"]

        for freq in frequencies:
            response = client.get(f"/api/budget_period?frequency={freq}")
            assert response.status_code == 200
            data = json.loads(response.data)
            assert isinstance(data, list)

    def test_get_budget_period_no_transactions(self, client):
        """Test GET /api/budget_period when no transactions exist."""
        with client.application.app_context():
            # Clear transactions
            Txn.query.delete()
            db.session.commit()

        response = client.get("/api/budget_period?frequency=Monthly")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_get_budget_period_invalid_frequency(self, client):
        """Test GET /api/budget_period with invalid frequency."""
        response = client.get("/api/budget_period?frequency=Invalid")
        assert response.status_code in [400, 500]  # May return 400 or 500
        data = json.loads(response.data)
        assert "error" in data or "display_message" in data

    def test_get_budget_period_no_frequency(self, client):
        """Test GET /api/budget_period without frequency parameter."""
        response = client.get("/api/budget_period")
        # Should return an error without frequency
        assert response.status_code in [400, 500]

    def test_get_total(self, client):
        """Test GET /api/budget_period/total returns total periods."""
        response = client.get("/api/budget_period/total?frequency=Monthly")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, list)

    def test_get_total_with_different_frequencies(self, client):
        """Test GET /api/budget_period/total with different frequencies."""
        frequencies = ["Weekly", "Monthly", "Yearly"]

        for freq in frequencies:
            response = client.get(f"/api/budget_period/total?frequency={freq}")
            assert response.status_code == 200
            data = json.loads(response.data)
            assert isinstance(data, list)

    def test_get_total_invalid_frequency(self, client):
        """Test GET /api/budget_period/total with invalid frequency."""
        response = client.get("/api/budget_period/total?frequency=Invalid")
        assert response.status_code in [400, 500]  # May return 400 or 500
        data = json.loads(response.data)
        assert "error" in data or "display_message" in data

    def test_get_total_no_frequency(self, client):
        """Test GET /api/budget_period/total without frequency parameter."""
        response = client.get("/api/budget_period/total")
        # Should return an error without frequency
        assert response.status_code in [400, 500]
