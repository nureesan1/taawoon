import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Save, AlertTriangle } from 'lucide-react';

interface EditMemberModalProps {
  memberId: string;
  onClose: () => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ memberId, onClose }) => {
  const { getMember, updateMember } = useStore();
  const member = getMember(memberId);

  // Form State for Balances
  const [formData, setFormData] = useState({
    housingLoanBalance: 0,
    landLoanBalance: 0,
    generalLoanBalance: 0,
    accumulatedShares: 0,
    savingsBalance: 0
  });

  useEffect(() => {
    if (member) {
      setFormData({
        housingLoanBalance: member.housingLoanBalance,
        landLoanBalance: member.landLoanBalance,
        generalLoanBalance: member.generalLoanBalance,
        accumulatedShares: member.accumulatedShares,
        savingsBalance: member.savingsBalance
      });
    }
  }, [member]);

  if (!member) return null;

  const handleChange = (field: keyof typeof formData, value: string) => {
    // Allow empty string for better typing experience, convert to 0 on save if needed
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm(`ยืนยันการแก้ไขยอดเงินของสมาชิก ${member.name} หรือไม่? \n(การกระทำนี้เป็นการแก้ไขฐานข้อมูลโดยตรง)`)) {
      const success = await updateMember(memberId, formData);
      if (success) {
        onClose();
      }
    }
  };

  const InputField = ({ label, field, color = "slate" }: { label: string, field: keyof typeof formData, color?: string }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          className={`w-full p-2.5 pl-3 pr-10 border rounded-lg focus:ring-2 focus:outline-none transition-all
            border-slate-200 focus:border-${color}-500 focus:ring-${color}-200`}
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-amber-500 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-100" />
              แก้ไขยอดคงเหลือ
            </h2>
            <p className="text-amber-100 text-sm mt-1">สมาชิก: {member.name} ({member.memberCode})</p>
          </div>
          <button onClick={onClose} className="text-amber-100 hover:text-white bg-amber-600/50 p-1.5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="edit-balance-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-amber-50 p-3 rounded-lg text-amber-800 text-xs flex items-start gap-2 border border-amber-100">
               <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
               <p>การแก้ไขในหน้านี้คือการ "ระบุยอดคงเหลือใหม่" (Set Balance) ไม่ใช่การบันทึกรายการชำระเงิน กรุณาใช้งานด้วยความระมัดระวัง</p>
            </div>

            {/* Debts */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2">ภาระหนี้สิน (Debts)</h3>
              <InputField label="หนี้ค่าบ้านคงเหลือ" field="housingLoanBalance" color="red" />
              <InputField label="หนี้ที่ดินคงเหลือ" field="landLoanBalance" color="red" />
              <InputField label="สินเชื่อทั่วไปคงเหลือ" field="generalLoanBalance" color="amber" />
            </div>

            {/* Assets */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2">ทรัพย์สิน (Assets)</h3>
              <InputField label="ทุนเรือนหุ้นสะสม" field="accumulatedShares" color="emerald" />
              <InputField label="เงินฝากคงเหลือ" field="savingsBalance" color="emerald" />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
                ยกเลิก
            </button>
            <button 
                type="submit" 
                form="edit-balance-form"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-md shadow-amber-200 font-medium transition-transform active:scale-95"
            >
                <Save className="w-4 h-4" />
                บันทึกการแก้ไข
            </button>
        </div>
      </div>
    </div>
  );
};