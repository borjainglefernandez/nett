import { Category, Subcategory } from "./Category";

export default interface Transaction {
  id: string;
  name: string;
  amount: number; // Converted from Decimal to number
  category: Category; 
  subcategory: Subcategory;
  date?: Date;
  date_time?: Date;
  merchant?: string | null;
  logo_url?: string | null;
  channel?: PaymentChannel | null;
  account_id: string;
  account_name: string;
}

export enum PaymentChannel {
  IN_STORE = "in store",
  ONLINE = "online",
  OTHER = "other"
}
