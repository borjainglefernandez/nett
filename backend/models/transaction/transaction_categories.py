import csv
from models import db

from constants.file_constants import CATEGORIES_CSV
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory


def seed_transaction_categories():
    with open(CATEGORIES_CSV, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            primary = row["PRIMARY"].strip()
            detailed = row["DETAILED"].strip()
            description = row["DESCRIPTION"].strip()

            # Check if the category exists by primary (used as id and name)
            category = TxnCategory.query.filter_by(name=primary).one_or_none()
            if not category:
                category = TxnCategory(name=primary)
                db.session.add(category)
                db.session.commit()  # Commit so that category is available for relationship

            # Check if the subcategory exists by detailed (used as id and name)
            subcategory = TxnSubcategory.query.get(detailed)
            if not subcategory:
                subcategory = TxnSubcategory(
                    name=detailed,
                    description=description,
                    category=category,
                )
                db.session.add(subcategory)
        db.session.commit()
