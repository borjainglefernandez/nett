from models import db
from models.account.account import Account
from models.account.account_type import AccountType

class CreditCardAccount(Account):
    __mapper_args__ = {
        'polymorphic_identity': AccountType.CREDIT.value
    }

    credit_limit = db.Column(db.Float)

    def __repr__(self):
        return f"<CreditCardAccount(name={self.name}, balance={self.balance}, credit_limit={self.credit_limit})>"

    def to_dict(self):
        """Convert CreditCardAccount object to a dictionary, extending Account's attributes."""
        base_dict = super().to_dict()  # Get dictionary from parent class
        base_dict["credit_limit"] = self.credit_limit  # Add credit_limit
        return base_dict
    
    def __repr__(self):
        """Extend Account's __repr__ with credit_limit."""
        base_repr = super().__repr__().rstrip(">")  # Remove closing '>' to append fields
        return f"{base_repr}, credit_limit={self.credit_limit if self.credit_limit is not None else 'N/A'})>"
