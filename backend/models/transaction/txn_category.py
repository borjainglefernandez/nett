from models import db


class TxnCategory(db.Model):
    __tablename__ = "txn_category"

    id = db.Column(db.String(120), primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    # Relationships
    txns = db.relationship("Txn", back_populates="category", lazy=True)
    subcategories = db.relationship(
        "TxnSubcategory",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __init__(self, id: str, name: str):
        self.id = id
        self.name = name

    def __repr__(self):
        return f"<TxnCategory(id={self.id}, name={self.name})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "subcategories": [sub.to_dict() for sub in self.subcategories.all()],
        }
