
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Save, Calculator, Banknote, Landmark } from 'lucide-react';

interface PaymentModalProps {
  memberId: string;
  onClose: () => void;
}

const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ memberId, onClose }) => {
  const { getMember, addTransaction, currentUser } = useStore();
  const member = getMember(memberId);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
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
      date: getLocalDateString(),
      ...formData,
      totalAmount,
      recordedBy: currentUser?.name || 'Unknown',
      paymentMethod
    });
    
    if (success) {
        onClose();
    }
  };

  const InputField = ({ label, field, color = "slate" }: { label: string, field: keyof typeof formData, color?: string }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          className={`w-full p-3 pl-3 pr-10 border rounded-xl focus:ring-2 focus:outline-none transition-all font-bold
            ${formData[field] > 0 ? `border-${color}-500 bg-${color}-50 ring-${color}-100 text-${color}-700` : 'border-slate-200 focus:border-teal-500 focus:ring-teal-50'}`}
          value={formData[field] === 0 ? '' : formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder="0.00"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-bold">฿</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#064e3b] p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black tracking-tight">บันทึกรับชำระเงิน</h2>
            <p className="text-teal-200 text-sm font-bold mt-1">{member.name} ({member.memberCode})</p>
          </div>
          <button onClick={onClose} className="text-teal-100 hover:text-white bg-teal-800/50 p-2 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Payment Method Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">ช่องทางรับเงิน</label>
             <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold ${paymentMethod === 'cash' ? 'bg-white border-teal-500 text-teal-700 shadow-sm' : 'bg-slate-100 border-transparent text-slate-400'}`}
                >
                    <Banknote className="w-4 h-4" />
                    เงินสด
                </button>
                <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold ${paymentMethod === 'transfer' ? 'bg-white border-blue-500 text-blue-700 shadow-sm' : 'bg-slate-100 border-transparent text-slate-400'}`}
                >
                    <Landmark className="w-4 h-4" />
                    เงินโอน
                </button>
             </div>
          </div>

          <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Group 1: Loans */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-4 bg-red-500 rounded-full"></span>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">ชำระหนี้</h3>
                  </div>
                  <InputField label="ค่าบ้าน (Housing)" field="housing" color="red" />
                  <InputField label="ค่าที่ดิน (Land)" field="land" color="red" />
                  <InputField label="สินเชื่อทั่วไป (Loan)" field="generalLoan" color="amber" />
                </div>

                {/* Group 2: Assets */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">เงินออม & หุ้น</h3>
                  </div>
                  <InputField label="ค่าหุ้น (Shares)" field="shares" color="emerald" />
                  <InputField label="เงินฝาก (Savings)" field="savings" color="emerald" />
                </div>

                {/* Group 3: Others */}
                <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                        <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                        <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">ค่าธรรมเนียมอื่นๆ</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="สวัสดิการ" field="welfare" color="blue" />
                        <InputField label="ประกัน" field="insurance" color="blue" />
                        <InputField label="บริจาค" field="donation" color="blue" />
                    </div>
                </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">ยอดรวม {paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}</span>
                <span className={`text-3xl font-black ${paymentMethod === 'cash' ? 'text-red-500' : 'text-blue-400'}`}>
                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalAmount)}
                </span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-6 py-3 text-slate-400 hover:text-white font-bold transition-colors"
                >
                    ยกเลิก
                </button>
                <button 
                    type="submit" 
                    form="payment-form"
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-xl
                        ${paymentMethod === 'cash' ? 'bg-teal-500 hover:bg-teal-400 shadow-teal-950/40' : 'bg-blue-500 hover:bg-blue-400 shadow-blue-950/40'}`}
                >
                    <Save className="w-5 h-5" />
                    ยืนยันบันทึก
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};