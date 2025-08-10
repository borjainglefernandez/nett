from datetime import datetime
from decimal import Decimal
from typing import Optional
from models import db
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype


class Account(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    name = db.Column(db.String(120), nullable=True, unique=True)
    original_name = db.Column(db.String(120), nullable=True, unique=True)
    balance = db.Column(db.Numeric(10, 2), nullable=True)
    limit = db.Column(db.Numeric(10, 2), nullable=True)
    last_updated = db.Column(db.DateTime, nullable=True)

    # Transactions
    transactions = db.relationship(
        "Txn", backref="account", lazy=True, cascade="all, delete-orphan"
    )

    # Institution foreign key
    institution_id = db.Column(
        db.String, db.ForeignKey("institution.id"), nullable=False
    )

    # Item foreign key
    item_id = db.Column(db.String, db.ForeignKey("item.id"), nullable=False)

    account_type = db.Column(db.Enum(AccountType))
    account_subtype = db.Column(db.Enum(AccountSubtype))

    def __init__(
        self,
        id: str,
        name: Optional[str] = None,
        original_name: Optional[str] = None,
        balance: Optional[Decimal] = None,
        limit: Optional[Decimal] = None,
        last_updated: Optional[datetime] = None,
        institution_id: Optional[str] = None,
        item_id: Optional[str] = None,
        account_type: Optional[AccountType] = None,
        account_subtype: Optional[AccountSubtype] = None,
    ):
        self.id = id
        self.name = name
        self.original_name = original_name
        self.balance = balance
        self.limit = limit
        self.last_updated = last_updated
        self.institution_id = institution_id
        self.item_id = item_id
        self.account_type = account_type
        self.account_subtype = account_subtype

    def __repr__(self):
        return (
            f"<Account(id={self.id}, "
            f"name={self.name if self.name else 'Unnamed'}, "
            f"original_name={self.original_name if self.original_name else 'Unnamed'}, "
            f"balance={self.balance if self.balance is not None else 'N/A'}, "
            f"last_updated={self.last_updated if self.last_updated else 'Never'}, "
            f"institution={self.institution}, "
            f"item={self.item}, "
            f"account_type={self.account_type.name if self.account_type else 'Unknown'}, "
            f"account_subtype={self.account_subtype.name if self.account_subtype else 'Unknown'}, "
            f"transactions={len(self.transactions)})>"
        )

    def to_dict(self):
        """Convert Account object to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "balance": float(self.balance) if self.balance is not None else None,
            "last_updated": (
                self.last_updated.strftime("%Y-%m-%d %H:%M:%S")
                if self.last_updated
                else None
            ),
            "institution_name": self.institution.name,
            "account_type": self.account_type.value if self.account_type else None,
            "account_subtype": (
                self.account_subtype.value if self.account_subtype else None
            ),
            "transaction_count": len(self.transactions),
            "logo": self.institution.logo if self.institution else None,
        }

    def get_transactions(self):
        """Get Transaction List for an account."""
        return [transaction.to_dict() for transaction in self.transactions]
