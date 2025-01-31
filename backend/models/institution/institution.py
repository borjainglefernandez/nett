from models import db

class Institution(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)

    # Accounts
    accounts = db.relationship('Account', backref='institution', lazy=True)
    items = db.relationship('Item', backref='institution', lazy=True)

    def __repr__(self):
        return (
            f"<Institution(id={self.id}, "
            f"name={self.name}, "
            f"accounts={len(self.accounts)}, "
            f"items={len(self.items)})>"
        )