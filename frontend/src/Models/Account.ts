type AccountType = "depository" | "investment" | "credit" | "loan" | "other";
type AccountSubtype =
    | "401a"
    | "401k"
    | "403B"
    | "457b"
    | "529"
    | "auto"
    | "brokerage"
    | "business"
    | "cash isa"
    | "cash management"
    | "cd"
    | "checking"
    | "commercial"
    | "construction"
    | "consumer"
    | "credit card"
    | "crypto exchange"
    | "ebt"
    | "education savings account"
    | "fixed annuity"
    | "gic"
    | "health reimbursement arrangement"
    | "home equity"
    | "hsa"
    | "isa"
    | "ira"
    | "keogh"
    | "lif"
    | "life insurance"
    | "line of credit"
    | "lira"
    | "loan"
    | "lrif"
    | "lrsp"
    | "money market"
    | "mortgage"
    | "mutual fund"
    | "non-custodial wallet"
    | "non-taxable brokerage account"
    | "other"
    | "other insurance"
    | "other annuity"
    | "overdraft"
    | "paypal"
    | "payroll"
    | "pension"
    | "prepaid"
    | "prif"
    | "profit sharing plan"
    | "rdsp"
    | "resp"
    | "retirement"
    | "rlif"
    | "roth"
    | "roth 401k"
    | "rrif"
    | "rrsp"
    | "sarsep"
    | "savings"
    | "sep ira"
    | "simple ira"
    | "sipp"
    | "stock plan"
    | "student"
    | "thrift savings plan"
    | "tfsa"
    | "trust"
    | "ugma"
    | "utma"
    | "variable annuity";

interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  balance: number;
  institution_name: string;
  last_updated: Date;
  transaction_count: number;
  logo: string | null;
}

export default Account;