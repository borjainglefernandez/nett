import uuid
from models.budget.budget_frequency import BudgetFrequency
from models import db
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


class Budget(db.Model):
    id = db.Column(db.String(120), primary_key=True, default=lambda: str(uuid.uuid4()))
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    frequency = db.Column(db.Enum(BudgetFrequency), nullable=False)

    category_id = db.Column(db.String, db.ForeignKey("txn_category.id"), nullable=False)
    subcategory_id = db.Column(
        db.String, db.ForeignKey("txn_subcategory.id"), nullable=True
    )

    # Relationships (unidirectional)
    category = db.relationship("TxnCategory", lazy="joined", uselist=False)
    subcategory = db.relationship("TxnSubcategory", lazy="joined", uselist=False)

    def get_budget_start_date(self, date: datetime) -> datetime:
        if self.frequency == BudgetFrequency.WEEKLY:
            # Start of the week (Monday)
            return date - timedelta(days=date.weekday())

        elif self.frequency == BudgetFrequency.BIWEEKLY:
            # Align to start of the biweek (every 2 Mondays)
            start_of_week = date - timedelta(days=date.weekday())
            biweek_start = start_of_week - timedelta(
                weeks=(start_of_week.isocalendar().week % 2)
            )
            return biweek_start

        elif self.frequency == BudgetFrequency.MONTHLY:
            return date.replace(day=1)

        elif self.frequency == BudgetFrequency.QUARTERLY:
            month = (date.month - 1) // 3 * 3 + 1
            return date.replace(month=month, day=1)

        elif self.frequency == BudgetFrequency.YEARLY:
            return date.replace(month=1, day=1)

        else:
            raise ValueError(f"Unsupported frequency: {self.frequency}")

    def to_dict(self):
        return {
            "id": self.id,
            "amount": str(self.amount),
            "frequency": self.frequency.value,
            "category_id": self.category_id,
            "subcategory_id": self.subcategory_id,
        }
