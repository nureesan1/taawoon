
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
  
  // Payment Amounts
  housing: number;    // ค่าบ้าน
  land: number;       // ค่าที่ดิน
  shares: number;     // ค่าหุ้น
  savings: number;    // เงินฝาก
  welfare: number;    // สวัสดิการ
  insurance: number;  // ประกันดินบ้าน
  donation: number;   // บริจาค
  generalLoan: number;// สินเชื่อทั่วไป
  
  // Quantities (จำนวนงวด/หน่วย)
  qtyHousing?: number;
  qtyLand?: number;
  qtyShares?: number;
  qtySavings?: number;
  qtyWelfare?: number;
  qtyInsurance?: number;
  qtyDonation?: number;
  qtyGeneralLoan?: number;

  others?: number;    // อื่นๆ
  othersNote?: string; // รายละเอียดอื่นๆ

  totalAmount: number;
  recordedBy: string;
  paymentMethod: 'cash' | 'transfer';
}

export interface Member {
  id: string;
  name: string;
  memberCode: string;
  
  personalInfo?: {
    idCard: string;
    dateOfBirth?: string;
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

export interface AppState {
  currentUser: { role: UserRole; memberId?: string } | null;
  members: Member[];
}
