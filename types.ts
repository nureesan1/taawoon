
export enum UserRole {
  MEMBER = 'MEMBER',
  STAFF = 'STAFF',
  GUEST = 'GUEST'
}

export interface Transaction {
  id: string;
  memberId: string;
  date: string;
  timestamp: number;
  
  // Payment Breakdown
  housing: number;    // ค่าบ้าน
  land: number;       // ค่าที่ดิน
  shares: number;     // ค่าหุ้น
  savings: number;    // เงินฝาก
  welfare: number;    // สวัสดิการ
  insurance: number;  // ประกันดินบ้าน
  donation: number;   // บริจาค
  generalLoan: number;// สินเชื่อทั่วไป
  
  others?: number;    // อื่นๆ
  othersNote?: string; // รายละเอียดอื่นๆ

  totalAmount: number;
  recordedBy: string;
}

export interface Member {
  id: string;
  name: string;
  memberCode: string; // e.g., T-001
  
  // Personal Info
  personalInfo?: {
    idCard: string;
    dateOfBirth?: string;
    address: string;
    phone: string;
  };
  memberType?: 'ordinary' | 'associate';
  joinedDate?: string;

  // Balances
  accumulatedShares: number;
  savingsBalance: number;
  
  // Debts
  housingLoanBalance: number;
  landLoanBalance: number;
  generalLoanBalance: number;

  // New Fields
  monthlyInstallment: number;   // ยอดชำระต่องวด
  missedInstallments: number;   // ผิดชำระหนี้ (งวด)
  
  // History
  transactions: Transaction[];
}

export interface AppConfig {
  useGoogleSheets: boolean;
  scriptUrl: string;
}

export interface AppState {
  currentUser: { role: UserRole; memberId?: string } | null;
  members: Member[];
}
