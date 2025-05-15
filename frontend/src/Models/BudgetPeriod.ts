export interface BudgetPeriod {
    category_name: string;
    subcategory_name: string | null;
    start_date: string;
    end_date: string;
    limit_amount: string;
    spent_amount: number;
  }