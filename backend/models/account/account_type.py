from enum import Enum

class AccountType(Enum):
    """
    Enumeration for account subtypes.
    """
    INVESTMENT = "investment"  # Investment account (called brokerage in API versions <= 2018-05-22)
    CREDIT = "credit"          # Credit card
    DEPOSITORY = "depository"  # Depository account
    LOAN = "loan"              # Loan account
    OTHER = "other"            # Non-specified account type
