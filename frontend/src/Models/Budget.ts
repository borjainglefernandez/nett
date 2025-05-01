interface Budget {
  id: string;
  amount: number | 0;
  frequency: BudgetFrequency | null;
  category_id: string | null;
  subcategory_id?: string | null;
}

export enum BudgetFrequency {
    WEEKLY = "weekly",
    BIWEEKLY = "biweekly",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly"
}

export default Budget;
