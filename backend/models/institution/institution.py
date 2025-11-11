from typing import List
from models.account.account import Account
from models.item.item import Item
from models import db


class Institution(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    logo = db.Column(db.Text, nullable=True)  # Base64-encoded image string

    # Accounts
    accounts = db.relationship("Account", backref="institution", lazy=True)
    items = db.relationship("Item", backref="institution", lazy=True)

    def __init__(
        self,
        id: str,
        name: str,
        logo: str = None,
        accounts: List[Account] = None,
        items: List[Item] = None,
    ):
        if accounts is None:
            accounts = []
        if items is None:
            items = []
        self.id = id
        self.name = name
        self.logo = logo
        self.accounts = accounts
        self.items = items

    def to_dict(self):
        """Convert Institution object to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "logo": self.logo,
        }

    def __repr__(self):
        return (
            f"<Institution(id={self.id}, "
            f"name={self.name}, "
            f"logo={'set' if self.logo else 'none'}, "
            f"accounts={len(self.accounts)}, "
            f"items={len(self.items)})>"
        )
