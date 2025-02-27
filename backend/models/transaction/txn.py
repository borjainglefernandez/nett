from datetime import datetime
from decimal import Decimal
from typing import Optional, Type
from models import db
from models.transaction.transaction_categories import TransactionCategories
from models.transaction.payment_channel import PaymentChannel


class Txn(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.Enum(TransactionCategories), nullable=False)
    date = db.Column(db.DateTime, nullable=True)
    date_time = db.Column(db.DateTime, nullable=True)

    merchant = db.Column(db.String(120))
    logo_url = db.Column(db.String(2000))
    channel = db.Column(db.Enum(PaymentChannel))

    # Account foreign key
    account_id = db.Column(db.String, db.ForeignKey(
        'account.id'), nullable=False)

    def __init__(
        self,
        id: str,
        name: str,
        amount: Decimal,
        category: Type[TransactionCategories],  # type: ignore
        date: Optional[datetime] = None,
        date_time: Optional[datetime] = None,
        merchant: Optional[str] = None,
        logo_url: Optional[str] = None,
        channel: Optional[PaymentChannel] = None,
        account_id: str = None
    ):
        self.id = id
        self.name = name
        self.amount = amount
        self.category = category
        self.date = date
        self.date_time = date_time
        self.merchant = merchant
        self.logo_url = logo_url
        self.channel = channel
        self.account_id = account_id

    def to_dict(self):
        """Convert Transaction object to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "amount": float(self.amount),  # Convert Decimal to float
            "date": str(self.date),
            "date_time": str(self.date_time),
            "category": self.category.value if self.category else None,  # Convert Enum to string
            "merchant": self.merchant,
            "logo_url": self.logo_url,
            "channel": self.channel.value if self.channel else None,  # Convert Enum to string
            "account": self.account.name  # Account ID (foreign key reference)
        }

    def __repr__(self):
        return (
            f"<Transaction(id={self.id}, "
            f"name={self.name}, "
            f"amount={float(self.amount)}, "
            f"date={str(self.date)}, "
            f"date_time={str(self.date_time)}, "
            f"category={self.category.name if self.category else 'Unknown'}, "
            f"merchant={self.merchant if self.merchant else 'N/A'}, "
            f"logo_url={'Set' if self.logo_url else 'None'}, "
            f"channel={self.channel.name if self.channel else 'Unknown'}, "
            f"account={self.account})>"
        )
