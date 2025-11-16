import pytest
from utils.txn_utils import resolve_category_and_subcategory
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models import db


@pytest.mark.unit
class TestTxnUtils:
    """Test transaction utility functions."""

    def test_resolve_existing_category_and_subcategory(self, test_app):
        """Test resolving when both category and subcategory exist."""
        with test_app.app_context():
            # Create a test category and subcategory
            category = TxnCategory.query.filter_by(name="FOOD_AND_DRINK").first()
            if not category:
                category = TxnCategory(name="FOOD_AND_DRINK")
                db.session.add(category)
                db.session.commit()

            subcategory = TxnSubcategory.query.filter_by(
                name="RESTAURANTS", category_id=category.id
            ).first()
            if not subcategory:
                subcategory = TxnSubcategory(
                    name="RESTAURANTS",
                    description="Restaurant expenses",
                    category_id=category.id,
                )
                db.session.add(subcategory)
                db.session.commit()

            # Resolve category and subcategory
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "FOOD_AND_DRINK", "RESTAURANTS"
            )

            assert resolved_category.id == category.id
            assert resolved_category.name == "FOOD_AND_DRINK"
            assert resolved_subcategory.id == subcategory.id
            assert resolved_subcategory.name == "RESTAURANTS"

    def test_resolve_existing_category_missing_subcategory(self, test_app):
        """Test resolving when category exists but subcategory doesn't."""
        with test_app.app_context():
            # Create a test category
            category = TxnCategory.query.filter_by(name="TRANSPORTATION").first()
            if not category:
                category = TxnCategory(name="TRANSPORTATION")
                db.session.add(category)
                db.session.commit()

            # Ensure OTHER subcategory exists for this category
            other_subcategory = TxnSubcategory.query.filter_by(
                name="OTHER", category_id=category.id
            ).first()
            if not other_subcategory:
                other_subcategory = TxnSubcategory(
                    name="OTHER",
                    description="Subcategory of TRANSPORTATION",
                    category_id=category.id,
                )
                db.session.add(other_subcategory)
                db.session.commit()

            # Resolve with non-existent subcategory
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "TRANSPORTATION", "NON_EXISTENT_SUBCATEGORY"
            )

            assert resolved_category.id == category.id
            assert resolved_category.name == "TRANSPORTATION"
            assert resolved_subcategory.name == "OTHER"
            assert resolved_subcategory.category_id == category.id

    def test_resolve_missing_category_creates_other(self, test_app):
        """Test resolving when category doesn't exist - defaults to OTHER."""
        with test_app.app_context():
            # Ensure OTHER category doesn't exist initially
            TxnCategory.query.filter_by(name="OTHER").delete()
            TxnSubcategory.query.filter_by(name="OTHER").delete()
            db.session.commit()

            # Resolve with non-existent category
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "NON_EXISTENT_CATEGORY", "SOME_SUBCATEGORY"
            )

            assert resolved_category.name == "OTHER"
            assert resolved_subcategory.name == "OTHER"
            assert resolved_subcategory.category_id == resolved_category.id

            # Verify OTHER category was created
            other_category = TxnCategory.query.filter_by(name="OTHER").first()
            assert other_category is not None
            assert other_category.id == resolved_category.id

            # Verify OTHER subcategory was created
            other_subcategory = TxnSubcategory.query.filter_by(
                name="OTHER", category_id=resolved_category.id
            ).first()
            assert other_subcategory is not None
            assert other_subcategory.id == resolved_subcategory.id

    def test_resolve_missing_category_existing_other(self, test_app):
        """Test resolving when category doesn't exist but OTHER already exists."""
        with test_app.app_context():
            # Create OTHER category and subcategory
            other_category = TxnCategory.query.filter_by(name="OTHER").first()
            if not other_category:
                other_category = TxnCategory(name="OTHER")
                db.session.add(other_category)
                db.session.commit()

            other_subcategory = TxnSubcategory.query.filter_by(
                name="OTHER", category_id=other_category.id
            ).first()
            if not other_subcategory:
                other_subcategory = TxnSubcategory(
                    name="OTHER",
                    description="Subcategory of OTHER",
                    category_id=other_category.id,
                )
                db.session.add(other_subcategory)
                db.session.commit()

            # Resolve with non-existent category
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "NON_EXISTENT_CATEGORY", "SOME_SUBCATEGORY"
            )

            assert resolved_category.id == other_category.id
            assert resolved_category.name == "OTHER"
            assert resolved_subcategory.id == other_subcategory.id
            assert resolved_subcategory.name == "OTHER"

    def test_resolve_missing_subcategory_creates_other(self, test_app):
        """Test resolving when subcategory doesn't exist - creates OTHER subcategory."""
        with test_app.app_context():
            # Create a test category
            category = TxnCategory.query.filter_by(name="ENTERTAINMENT").first()
            if not category:
                category = TxnCategory(name="ENTERTAINMENT")
                db.session.add(category)
                db.session.commit()

            # Ensure OTHER subcategory doesn't exist for this category
            TxnSubcategory.query.filter_by(
                name="OTHER", category_id=category.id
            ).delete()
            db.session.commit()

            # Resolve with non-existent subcategory
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "ENTERTAINMENT", "NON_EXISTENT_SUBCATEGORY"
            )

            assert resolved_category.id == category.id
            assert resolved_category.name == "ENTERTAINMENT"
            assert resolved_subcategory.name == "OTHER"
            assert resolved_subcategory.category_id == category.id

            # Verify OTHER subcategory was created
            other_subcategory = TxnSubcategory.query.filter_by(
                name="OTHER", category_id=category.id
            ).first()
            assert other_subcategory is not None
            assert other_subcategory.id == resolved_subcategory.id

    def test_resolve_with_none_values(self, test_app):
        """Test resolving with None values defaults to OTHER."""
        with test_app.app_context():
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                None, None
            )

            assert resolved_category.name == "OTHER"
            assert resolved_subcategory.name == "OTHER"
            assert resolved_subcategory.category_id == resolved_category.id

    def test_resolve_with_empty_strings(self, test_app):
        """Test resolving with empty strings defaults to OTHER."""
        with test_app.app_context():
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "", ""
            )

            assert resolved_category.name == "OTHER"
            assert resolved_subcategory.name == "OTHER"
            assert resolved_subcategory.category_id == resolved_category.id

    def test_resolve_with_whitespace(self, test_app):
        """Test resolving with whitespace is trimmed."""
        with test_app.app_context():
            # Create a test category with no leading/trailing spaces
            category = TxnCategory.query.filter_by(name="GENERAL_MERCHANDISE").first()
            if not category:
                category = TxnCategory(name="GENERAL_MERCHANDISE")
                db.session.add(category)
                db.session.commit()

            subcategory = TxnSubcategory.query.filter_by(
                name="ONLINE_MARKETPLACES", category_id=category.id
            ).first()
            if not subcategory:
                subcategory = TxnSubcategory(
                    name="ONLINE_MARKETPLACES",
                    description="Online marketplace expenses",
                    category_id=category.id,
                )
                db.session.add(subcategory)
                db.session.commit()

            # Resolve with whitespace - should trim and find existing
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "  GENERAL_MERCHANDISE  ", "  ONLINE_MARKETPLACES  "
            )

            assert resolved_category.id == category.id
            assert resolved_category.name == "GENERAL_MERCHANDISE"
            assert resolved_subcategory.id == subcategory.id
            assert resolved_subcategory.name == "ONLINE_MARKETPLACES"

    def test_resolve_idempotent(self, test_app):
        """Test that resolving the same category/subcategory multiple times is idempotent."""
        with test_app.app_context():
            # First resolution
            cat1, sub1 = resolve_category_and_subcategory("FOOD_AND_DRINK", "GROCERIES")

            # Second resolution
            cat2, sub2 = resolve_category_and_subcategory("FOOD_AND_DRINK", "GROCERIES")

            # Should return same objects (or at least same IDs)
            assert cat1.id == cat2.id
            assert sub1.id == sub2.id

    def test_resolve_case_sensitive(self, test_app):
        """Test that category names are case-sensitive."""
        with test_app.app_context():
            # Create lowercase category
            category = TxnCategory.query.filter_by(name="food_and_drink").first()
            if not category:
                category = TxnCategory(name="food_and_drink")
                db.session.add(category)
                db.session.commit()

            # Try to resolve with uppercase - should default to OTHER
            resolved_category, resolved_subcategory = resolve_category_and_subcategory(
                "FOOD_AND_DRINK", "GROCERIES"
            )

            # Should default to OTHER since case doesn't match
            assert resolved_category.name == "OTHER"
            assert resolved_subcategory.name == "OTHER"
