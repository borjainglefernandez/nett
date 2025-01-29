from server import db

class Institution(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    plaid_institution_id = db.Column(db.String(120), nullable=False, unique=True)

    # Accounts
    accounts = db.relationship('Account', backref='institution', lazy=True)
