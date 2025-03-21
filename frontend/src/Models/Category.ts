// Define the Subcategory interface
export interface Subcategory {
  subcategory: string; // The name of the subcategory (e.g., 'BANK_FEES_ATM_FEES')
  description: string; // The description of the subcategory (e.g., 'Fees incurred for out-of-network ATMs')
}

// Define the Category interface
export interface Category {
  name: string; // The name of the category (e.g., 'BANK_FEES')
  subcategories: Subcategory[]; // An array of subcategories under this category
}
