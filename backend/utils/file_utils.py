import csv
from enum import Enum

# Function to read CSV and create Enum
def create_enum_from_csv(file_path, column_name, enum_name):
    # Read the CSV and extract the unique values from the specified column
    
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        # Extract the values from the specific column
        column_values = sorted(set(row[column_name] for row in reader))

    # Create the Enum dynamically
    dynamic_enum = Enum(enum_name, {value: value for value in column_values})

    return dynamic_enum
