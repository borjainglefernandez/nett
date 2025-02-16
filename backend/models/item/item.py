from typing import List
from models.account.account import Account
from models import db


class Item(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    access_token = db.Column(db.String(120), nullable=False, unique=True)
    cursor = db.Column(db.String(500), nullable=False, default="")

    # Institution foreign key
    institution_id = db.Column(
        db.String, db.ForeignKey("institution.id"), nullable=False
    )

    accounts = db.relationship("Account", backref="item", lazy=True)

    def __init__(
        self,
        id: str,
        access_token: str,
        institution_id: str,
        cursor: str = "",
        accounts: List[Account] = None,
    ):
        if accounts is None:
            accounts = []
        self.id = id
        self.access_token = access_token
        self.institution_id = institution_id
        self.cursor = cursor
        self.accounts = accounts

    def __repr__(self):
        return (
            f"<Item(id={self.id}, "
            f"access_token={self.access_token[:6]}..., "  # Truncated for security
            f"cursor={'SET' if self.cursor else 'None'}, "
            f"institution={self.institution}, "
            f"accounts={len(self.accounts)})>"
        )
