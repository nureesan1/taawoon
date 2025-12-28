
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Member } from '../types';
import { Search, Plus, UserPlus, DollarSign, Pencil, Trash2, Wallet, Building2, MapPin, Coins, PiggyBank, Calendar, Clock, FileText } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { EditMemberModal } from './EditMemberModal';

export const StaffDashboard: React.FC = () => {
  const { members, setView, deleteMember } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'payment' | 'edit' | null>(null);

  const filteredMembers = members.filter(m => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return true;
    
    return (
      m.name.toLowerCase().includes(cleanSearch) || 
      m.memberCode.toLowerCase().includes(cleanSearch) ||
      (m.personalInfo?.idCard && String(m.personalInfo.idCard).includes(cleanSearch))
    );
  });

  const handleOpenPayment = (memberId: string) => {
    setSelectedMemberId(memberId);
    setModalType('payment');
  };

  const handleOpenEdit = (memberId: string) => {
    setSelectedMemberId(memberId);
    setModalType('edit');
  }

  const handleDelete = async (member: Member) => {
    if (confirm(`คุณต้องการลบสมาชิก "${member.name}" ใช่หรือไม่?\nการกระทำนี้ไม่สามารถเรียกคืนได้`)) {
       await deleteMember(member.id);
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedMemberId(null);
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  const totals = filteredMembers.reduce((acc, m) => ({
    housing: acc.housing + (m.housingLoanBalance || 0),
    land: acc.land + (m.landLoanBalance || 0),
    general: acc.general + (m.generalLoanBalance || 0),
    savings: acc.savings + (m.savingsBalance || 0),
    shares: acc.shares + (m.accumulatedShares || 0)
  }), { housing: 0, land: 0, general: 0, savings: 0, shares: 0 });

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-2 mb-2 mt-6">
         <h2 className="text-lg font-bold text-red-600">ภาพรวมสถานะการเงิน (Financial Status)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      {/* Top Summary Section - Matching Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-4">
         <SummaryBox title="หนี้ค่าบ้านรวม" value={totals.housing} color="red" icon={<Building2 className="w-4 h-4" />} />
         <SummaryBox title="หนี้ที่ดินรวม" value={totals.land} color="orange" icon={<MapPin className="w-4 h-4" />} />
         <SummaryBox title="สินเชื่อทั่วไปรวม" value={totals.general} color="amber" icon={<Coins className="w-4 h-4" />} />
         <SummaryBox title="หุ้นสะสมรวม" value={totals.shares} color="teal" icon={<PiggyBank className="w-4 h-4" />} />
         <SummaryBox title="เงินฝากรวม" value={totals.savings} color="emerald" icon={<Wallet className="w-4 h-4" />} />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-[500px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาสมาชิก (ชื่อ, รหัส หรือ เลขบัตรประชาชน)"
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setView('register_member')}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1f2937] text-white px-6 py-3 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 font-bold"
        >
            <UserPlus className="w-5 h-5" />
            เพิ่มสมาชิกใหม่
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-tighter text-[11px]">
              <tr>
                <th className="px-6 py-4">รหัส</th>
                <th className="px-6 py-4">ชื่อ-สกุล</th>
                <th className="px-6 py-4 text-right">หนี้บ้าน</th>
                <th className="px-6 py-4 text-right">หนี้ที่ดิน</th>
                <th className="px-6 py-4 text-right">สินเชื่อทั่วไป</th>
                <th className="px-6 py-4 text-right">หุ้นสะสม</th>
                <th className="px-6 py-4 text-right">เงินฝาก</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">{member.memberCode}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{member.name}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-medium">{formatTHB(member.housingLoanBalance)}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-medium">{formatTHB(member.landLoanBalance)}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-medium">{formatTHB(member.generalLoanBalance)}</td>
                  <td className="px-6 py-4 text-right text-teal-700 font-bold">{formatTHB(member.accumulatedShares)}</td>
                  <td className="px-6 py-4 text-right text-emerald-700 font-bold">{formatTHB(member.savingsBalance)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenPayment(member.id)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors font-bold text-[10px] border border-teal-100"
                        >
                          <DollarSign className="w-3 h-3" />
                          บันทึกยอด
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(member.id)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(member)}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMemberId && modalType === 'payment' && (
        <PaymentModal 
          memberId={selectedMemberId} 
          onClose={handleCloseModal} 
        />
      )}

      {selectedMemberId && modalType === 'edit' && (
        <EditMemberModal 
          memberId={selectedMemberId} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};

interface SummaryBoxProps {
  title: string;
  value: number;
  color: 'red' | 'orange' | 'amber' | 'teal' | 'emerald';
  icon: React.ReactNode;
}

const SummaryBox: React.FC<SummaryBoxProps> = ({ title, value, color, icon }) => {
  const colorMap = {
    red: "border-red-100 text-red-600 bg-red-50",
    orange: "border-orange-100 text-red-600 bg-orange-50",
    amber: "border-amber-100 text-red-600 bg-amber-50",
    teal: "border-teal-100 text-teal-700 bg-teal-50",
    emerald: "border-emerald-100 text-emerald-700 bg-emerald-50"
  };

  const style = colorMap[color];
  const [border, text, iconBg] = style.split(' ');

  return (
    <div className={`bg-white p-5 rounded-2xl border ${border} shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-1`}>
      <div>
         <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">{title}</p>
         <p className={`text-lg font-black tracking-tighter ${text}`}>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value)}</p>
      </div>
      <div className={`p-2.5 rounded-xl ${iconBg} ${text}`}>
          {icon}
      </div>
    </div>
  );
};
