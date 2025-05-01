interface Budget {
  id: string;
  amount: number | 0;
  frequency: BudgetFrequency | null;
  category_id: string | null;
  subcategory_id?: string | null;
}

export enum BudgetFrequency {
    WEEKLY = "Weekly",
    MONTHLY = "Monthly",
    YEARLY = "Yearly"
}

export default Budget;
