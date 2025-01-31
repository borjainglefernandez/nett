from models import db
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype

class Account(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    access_token = db.Column(db.String(120), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=True, unique=True)
    balance = db.Column(db.Numeric(10, 2), nullable=True)
    last_updated = db.Column(db.DateTime, nullable=True)

    # Transactions
    transactions = db.relationship('Transaction', backref='account', lazy=True)

    # Institution foreign key
    institution = db.Column(db.Integer, db.ForeignKey('institution.id'), nullable=False)

    # Item foreign key
    item = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)

    account_type = db.Column(db.Enum(AccountType))
    account_subtype = db.Column(db.Enum(AccountSubtype))

    __mapper_args__ = {
        'polymorphic_on': account_type,
        'polymorphic_identity': 'account'
    }

    def __repr__(self):
        return (
            f"<Account(id={self.id}, "
            f"name={self.name if self.name else 'Unnamed'}, "
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
            "access_token": self.access_token,
            "name": self.name,
            "balance": float(self.balance) if self.balance is not None else None,
            "last_updated": self.last_updated.strftime("%Y-%m-%d %H:%M:%S") if self.last_updated else None,
            "institution": self.institution,
            "account_type": self.account_type.value if self.account_type else None,
            "account_subtype": self.account_subtype.value if self.account_subtype else None,
        }

    def get_transactions(self):
        """Get Transaction List for an account."""
        return [transaction.to_dict() for transaction in self.transactions]
