from server import db

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)

    # Transactions
    transactions = db.relationship('Transaction', backref='account', lazy=True)

    # Institution foreign key
    institution = db.Column(db.Integer, db.ForeignKey('institution.id'), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'