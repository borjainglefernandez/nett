from backend.utils.file_utils import create_enum_from_csv

# Transaction Categories Enum
file_path = '../assets/plaid_categories.csv'  # Replace with your actual CSV file path
column_name = 'DETAILED'  # Replace with the actual column name
TransactionCategories = create_enum_from_csv(file_path, column_name)
