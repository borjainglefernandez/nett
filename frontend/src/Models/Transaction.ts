import { Category, Subcategory } from "./Category";

export default interface Transaction {
  id: string;
  name: string;
  amount: number; // Converted from Decimal to number
  category: Category; 
  subcategory: Subcategory;
  date?: Date;
  dateTime?: Date;
  merchant?: string | null;
  logoUrl?: string | null;
  channel?: PaymentChannel | null;
  accountId: string;
  accountName: string;
}

export enum PaymentChannel {
  IN_STORE = "in store",
  ONLINE = "online",
  OTHER = "other"
}
