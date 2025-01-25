from server import db
from account import Account
from account_type import AccountType

class CreditCardAccount(Account):
    __mapper_args__ = {
        'polymorphic_identity': AccountType.CREDIT.value
    }

    credit_limit = db.Column(db.Float)

    def __repr__(self):
        return f"<CreditCardAccount(name={self.name}, balance={self.balance}, credit_limit={self.credit_limit})>"
