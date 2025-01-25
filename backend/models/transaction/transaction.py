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
    