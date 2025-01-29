from server import db
from account_type import AccountType
from account_subtype import AccountSubtype

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    access_token = db.Column(db.String(120), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=True, unique=True)
    plaid_account_id = db.Column(db.String(120), nullable=False, unique=True)
    balance = db.Column(db.Numeric(10, 2), nullable=True)
    last_updated = db.Column(db.DateTime, nullable=True)

    # Transactions
    transactions = db.relationship('Transaction', backref='account', lazy=True)

    # Institution foreign key
    institution = db.Column(db.Integer, db.ForeignKey('institution.id'), nullable=False)

    account_type = db.Column(db.Enum(AccountType))
    account_subtype = db.Column(db.Enum(AccountSubtype))

    __mapper_args__ = {
        'polymorphic_on': account_type,
        'polymorphic_identity': 'account'
    }
