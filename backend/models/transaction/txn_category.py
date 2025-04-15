from models import db
import uuid


class TxnCategory(db.Model):
    __tablename__ = "txn_category"

    id = db.Column(db.String(120), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(120), nullable=False, unique=True)

    # Relationships
    txns = db.relationship("Txn", back_populates="category", lazy=True)
    subcategories = db.relationship(
        "TxnSubcategory",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __init__(self, name: str):
        self.name = name

    def __repr__(self):
        return f"<TxnCategory(id={self.id}, name={self.name})>"

    def to_incl_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "subcategories": [sub.to_dict() for sub in self.subcategories.all()],
        }
