from models.budget.budget_frequency import BudgetFrequency
from models import db


class Budget(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    frequency = db.Column(db.Enum(BudgetFrequency), nullable=False)

    category_id = db.Column(db.String, db.ForeignKey("txn_category.id"), nullable=False)
    subcategory_id = db.Column(
        db.String, db.ForeignKey("txn_subcategory.id"), nullable=True
    )

    # Relationships (unidirectional)
    category = db.relationship("TxnCategory", lazy="joined", uselist=False)
    subcategory = db.relationship("TxnSubcategory", lazy="joined", uselist=False)
