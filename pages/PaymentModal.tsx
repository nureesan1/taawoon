import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Save, Calculator } from 'lucide-react';

interface PaymentModalProps {
  memberId: string;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ memberId, onClose }) => {
  const { getMember, addTransaction, currentUser } = useStore();
  const member = getMember(memberId);

  // Form State
  const [formData, setFormData] = useState({
    housing: 0,
    land: 0,
    shares: 0,
    savings: 0,
    welfare: 0,
    insurance: 0,
    donation: 0,
    generalLoan: 0
  });

  if (!member) return null;

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const totalAmount = (Object.values(formData) as number[]).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount === 0) {
        alert("กรุณาระบุยอดเงิน");
        return;
    }

    const success = await addTransaction({
      memberId,
      date: new Date().toISOString(),
      ...formData,
      totalAmount,
      recordedBy: currentUser?.name || 'Unknown'
    });
    
    if (success) {
        onClose();
    }
  };

  const InputField = ({ label, field, color = "slate" }: { label: string, field: keyof typeof formData, color?: string }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          className={`w-full p-2.5 pl-3 pr-10 border rounded-lg focus:ring-2 focus:outline-none transition-all
            ${formData[field] > 0 ? `border-${color}-500 bg-${color}-50 ring-${color}-200` : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'}`}
          value={formData[field] === 0 ? '' : formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder="0.00"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">บันทึกการชำระเงิน</h2>
            <p className="text-teal-100 text-sm mt-1">สมาชิก: {member.name} ({member.memberCode})</p>
          </div>
          <button onClick={onClose} className="text-teal-100 hover:text-white bg-teal-700/50 p-1.5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="payment-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Group 1: Loans */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                <span className="w-2 h-6 bg-red-500 rounded-full"></span>
                <h3 className="font-semibold text-slate-800">ชำระหนี้</h3>
              </div>
              <InputField label="ค่าบ้าน (Housing)" field="housing" color="red" />
              <InputField label="ค่าที่ดิน (Land)" field="land" color="red" />
              <InputField label="สินเชื่อทั่วไป (General Loan)" field="generalLoan" color="amber" />
            </div>

            {/* Group 2: Savings & Assets */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                <h3 className="font-semibold text-slate-800">เงินออม & หุ้น</h3>
              </div>
              <InputField label="ค่าหุ้น (Shares)" field="shares" color="emerald" />
              <InputField label="เงินฝาก (Savings)" field="savings" color="emerald" />
            </div>

             {/* Group 3: Others */}
             <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                <h3 className="font-semibold text-slate-800">อื่นๆ</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <InputField label="สวัสดิการ (Welfare)" field="welfare" color="blue" />
                 <InputField label="ประกันดินบ้าน (Insurance)" field="insurance" color="blue" />
                 <InputField label="บริจาค (Donation)" field="donation" color="blue" />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">ยอดรวมทั้งหมด</span>
                <span className="text-2xl font-bold text-teal-700">
                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalAmount)}
                </span>
            </div>
            <div className="flex gap-3">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                    ยกเลิก
                </button>
                <button 
                    type="submit" 
                    form="payment-form"
                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-md shadow-teal-200 font-medium transition-transform active:scale-95"
                >
                    <Save className="w-4 h-4" />
                    บันทึกรายการ
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};