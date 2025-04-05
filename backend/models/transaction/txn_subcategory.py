from models.transaction.txn_category import TxnCategory
from models import db
import uuid


class TxnSubcategory(db.Model):
    __tablename__ = "txn_subcategory"

    id = db.Column(db.String(120), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(4000))

    # Foreign key
    category_id = db.Column(db.String, db.ForeignKey("txn_category.id"), nullable=False)

    # Relationships
    category = db.relationship("TxnCategory", back_populates="subcategories")
    txns = db.relationship("Txn", back_populates="subcategory", lazy=True)

    def __init__(self, name: str, description: str, category: TxnCategory):
        self.name = name
        self.description = description
        self.category = category

    def __repr__(self):
        return f"<TxnSubcategory(id={self.id}, name={self.name}, description={self.description}, category={self.category.name})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category_id": self.category.id,
        }
