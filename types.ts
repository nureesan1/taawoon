
export enum UserRole {
  MEMBER = 'MEMBER',
  STAFF = 'STAFF',
  GUEST = 'GUEST'
}

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'transfer';

export interface LedgerTransaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  note?: string;
  timestamp: number;
}

export interface Transaction {
  id: string;
  memberId: string;
  date: string;
  timestamp: number;
  housing: number;
  land: number;
  shares: number;
  savings: number;
  welfare: number;
  insurance: number;
  donation: number;
  generalLoan: number;
  totalAmount: number;
  recordedBy: string;
  paymentMethod: PaymentMethod;
}

export interface Member {
  id: string;
  name: string;
  memberCode: string;
  personalInfo?: {
    idCard: string;
    address: string;
    phone: string;
  };
  memberType?: 'ordinary' | 'associate';
  joinedDate?: string;
  accumulatedShares: number;
  savingsBalance: number;
  housingLoanBalance: number;
  landLoanBalance: number;
  generalLoanBalance: number;
  monthlyInstallment: number;
  missedInstallments: number;
  transactions: Transaction[];
}

export interface AppConfig {
  useGoogleSheets: boolean;
  scriptUrl: string;
}
