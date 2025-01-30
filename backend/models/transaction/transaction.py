from server import db
from backend.models.transaction.transaction_categories import TransactionCategories
from backend.models.transaction.payment_channel import PaymentChannel

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.Enum(TransactionCategories), nullable=False)  

    merchant = db.Column(db.String(120))
    logo_url = db.Column(db.String(2000))
    category = db.Column(db.Enum(TransactionCategories))
    channel = db.Column(db.Enum(PaymentChannel))

    # Account foreign key
    account = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    
    def to_dict(self):
        """Convert Transaction object to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "amount": float(self.amount),  # Convert Decimal to float
            "category": self.category.value if self.category else None,  # Convert Enum to string
            "merchant": self.merchant,
            "logo_url": self.logo_url,
            "channel": self.channel.value if self.channel else None,  # Convert Enum to string
            "account": self.account  # Account ID (foreign key reference)
        }