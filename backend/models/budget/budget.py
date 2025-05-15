import uuid
from models.budget.budget_frequency import BudgetFrequency
from models import db


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

    def to_dict(self):
        return {
            "id": self.id,
            "amount": str(self.amount),
            "frequency": self.frequency.value,
            "category_id": self.category_id,
            "subcategory_id": self.subcategory_id,
        }
