export interface Period {
    start_date: string;
    end_date: string;
    spent_amount: number; // use number here now
    income_amount: number;
  }
  
  export function parsePeriod(raw: any): Period {
    return {
      start_date: raw.start_date,
      end_date: raw.end_date,
      spent_amount: parseFloat(raw.spent_amount).toFixed(2), // returns string, cast after
      income_amount: parseFloat(raw.income_amount).toFixed(2),
    } as unknown as Period; // cast only if you keep interface with numbers
  }
  