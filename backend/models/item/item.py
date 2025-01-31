from models import db

class Item(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    access_token = db.Column(db.String(120), nullable=False, unique=True)
    cursor = db.column(db.String(500))

    # Institution foreign key
    institution = db.Column(db.Integer, db.ForeignKey('institution.id'), nullable=False)

    accounts = db.relationship('Account', backref='item', lazy=True)

    def __repr__(self):
        return (
            f"<Item(id={self.id}, "
            f"access_token={self.access_token[:6]}..., "  # Truncated for security
            f"cursor={'SET' if self.cursor else 'None'}, "
            f"institution={self.institution}, "
            f"accounts={len(self.accounts)})>"
        )