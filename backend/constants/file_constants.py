import os

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATEGORIES_CSV = os.path.join(BACKEND_ROOT, "assets", "plaid_categories.csv")
