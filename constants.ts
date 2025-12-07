import { Member } from './types';

export const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'นายสมชาย ใจดี',
    memberCode: 'M-001',
    personalInfo: {
      idCard: '1103700123456',
      phone: '081-234-5678',
      address: '123 หมู่ 1 ต.บางเขน อ.เมือง จ.นนทบุรี 11000',
      dateOfBirth: '1980-05-15'
    },
    accumulatedShares: 15000,
    savingsBalance: 5000,
    housingLoanBalance: 450000,
    landLoanBalance: 120000,
    generalLoanBalance: 0,
    transactions: []
  },
  {
    id: '2',
    name: 'นางสาวมีนา รักสงบ',
    memberCode: 'M-002',
    personalInfo: {
      idCard: '1201548852147',
      phone: '089-987-6543',
      address: '45/2 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
      dateOfBirth: '1992-11-20'
    },
    accumulatedShares: 8500,
    savingsBalance: 1200,
    housingLoanBalance: 380000,
    landLoanBalance: 0,
    generalLoanBalance: 20000,
    transactions: []
  },
  {
    id: '3',
    name: 'นายอาหมัด มั่นคง',
    memberCode: 'M-003',
    personalInfo: {
      idCard: '3340500123987',
      phone: '086-555-4444',
      address: '88 หมู่บ้านมั่นคง ต.ตลาดขวัญ อ.เมือง จ.นนทบุรี 11000',
      dateOfBirth: '1975-03-10'
    },
    accumulatedShares: 50000,
    savingsBalance: 25000,
    housingLoanBalance: 0,
    landLoanBalance: 50000,
    generalLoanBalance: 0,
    transactions: []
  }
];

export const APP_NAME = "ระบบตรวจสอบหนี้ สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด";