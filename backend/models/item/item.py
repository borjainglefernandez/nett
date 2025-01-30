from server import db

class Item(db.Model):
    id = db.Column(db.String(120), primary_key=True)
    access_token = db.Column(db.String(120), nullable=False, unique=True)
    cursor = db.column(db.String(500))

    # Institution foreign key
    institution = db.Column(db.Integer, db.ForeignKey('institution.id'), nullable=False)

    accounts = db.relationship('Account', backref='item', lazy=True)
