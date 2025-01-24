from server import db
from transaction_categories import TransactionCategories

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.Enum(TransactionCategories), nullable=False)  

    logo_url = db.Column(db.String(2000), nullable=True)

    # Account foreign key
    account = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    
    def __repr__(self):
        return f'<User {self.username}>'
