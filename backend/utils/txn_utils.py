from utils.logger import get_logger
from utils.model_utils import create_model_instance_from_dict
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory

logger = get_logger(__name__)


def resolve_category_and_subcategory(primary_category: str, detailed_category: str):
    """
    Resolve category and subcategory for a transaction.
    If category/subcategory doesn't exist, defaults to OTHER/OTHER.
    Only creates OTHER category/subcategory if they don't exist.

    Args:
        primary_category: The primary category name from Plaid
        detailed_category: The detailed subcategory name from Plaid

    Returns:
        tuple: (category, subcategory) objects
    """
    primary_category = primary_category.strip() if primary_category else "OTHER"
    detailed_category = detailed_category.strip() if detailed_category else "OTHER"

    # Check if the category from Plaid exists
    category = TxnCategory.query.filter_by(name=primary_category).one_or_none()

    # If category doesn't exist, default to OTHER
    if not category:
        logger.debug(f"Category '{primary_category}' not found, defaulting to OTHER")
        primary_category = "OTHER"
        detailed_category = "OTHER"
        category = TxnCategory.query.filter_by(name="OTHER").one_or_none()

        # Create OTHER category if it doesn't exist
        if not category:
            logger.info("Creating OTHER category (default category)")
            category = create_model_instance_from_dict(
                TxnCategory, {"name": "OTHER"}, fail_on_duplicate=False
            )

    # Get or create subcategory under the category
    subcategory = TxnSubcategory.query.filter_by(
        name=detailed_category, category_id=category.id
    ).one_or_none()

    # If subcategory doesn't exist, default to OTHER
    if not subcategory:
        logger.debug(
            f"Subcategory '{detailed_category}' not found in category '{category.name}', defaulting to OTHER"
        )
        detailed_category = "OTHER"
        subcategory = TxnSubcategory.query.filter_by(
            name="OTHER", category_id=category.id
        ).one_or_none()

        # Create OTHER subcategory if it doesn't exist
        if not subcategory:
            logger.info(f"Creating OTHER subcategory under {category.name} category")
            subcategory = create_model_instance_from_dict(
                TxnSubcategory,
                {
                    "name": "OTHER",
                    "description": f"Subcategory of {category.name}",
                    "category_id": category.id,
                },
                fail_on_duplicate=False,
            )

    return category, subcategory
