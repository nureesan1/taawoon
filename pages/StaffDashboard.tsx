
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Member } from '../types';
import { Search, UserPlus, DollarSign, Pencil, Trash2, Building2, MapPin, Coins, PiggyBank, Wallet } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { EditMemberModal } from './EditMemberModal';

export const StaffDashboard: React.FC = () => {
  const { members, setView, deleteMember } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
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
    if (confirm(`ลบสมาชิก "${member.name}" ใช่หรือไม่?`)) {
       await deleteMember(member.id);
    }
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
    <div className="space-y-6 pb-20">
      
      {/* Financial Overview - Horizontal Scroll on Mobile */}
      <div className="flex items-center gap-2 mb-2">
         <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Financial Overview</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5">
         <SummaryBox title="หนี้ค่าบ้าน" value={totals.housing} color="red" icon={<Building2 className="w-4 h-4" />} />
         <SummaryBox title="หนี้ที่ดิน" value={totals.land} color="orange" icon={<MapPin className="w-4 h-4" />} />
         <SummaryBox title="สินเชื่อทั่วไป" value={totals.general} color="amber" icon={<Coins className="w-4 h-4" />} />
         <SummaryBox title="หุ้นสะสม" value={totals.shares} color="teal" icon={<PiggyBank className="w-4 h-4" />} />
         <SummaryBox title="เงินฝาก" value={totals.savings} color="emerald" icon={<Wallet className="w-4 h-4" />} />
      </div>

      {/* Action Bar */}
      <div className="sticky top-16 md:top-24 z-20 bg-slate-50/90 backdrop-blur-md py-2 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, เลขบัตร..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-bold text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setView('register_member')}
          className="flex items-center justify-center gap-2 bg-[#064e3b] text-white px-6 py-4 rounded-2xl hover:bg-black transition-all shadow-lg shadow-teal-900/10 active:scale-95 font-bold"
        >
            <UserPlus className="w-5 h-5" />
            <span className="md:inline">เพิ่มสมาชิก</span>
        </button>
      </div>

      {/* Member List - Responsive Card/Table */}
      <div className="space-y-4">
        <div className="md:hidden space-y-4">
          {filteredMembers.map(member => (
            <div key={member.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
               <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg leading-tight">{member.name}</h3>
                    <p className="text-xs font-bold text-slate-400 font-mono mt-1">{member.memberCode} | {member.personalInfo?.idCard}</p>
                  </div>
                  <div className="flex gap-1">
                      <button onClick={() => handleOpenEdit(member.id)} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(member)} className="p-2 text-red-300 bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">หนี้บ้าน/ที่ดิน</p>
                    <p className="text-red-600 font-black text-sm">{formatTHB((member.housingLoanBalance || 0) + (member.landLoanBalance || 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">สินเชื่อทั่วไป</p>
                    <p className="text-amber-600 font-black text-sm">{formatTHB(member.generalLoanBalance || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">หุ้นสะสม</p>
                    <p className="text-teal-600 font-black text-sm">{formatTHB(member.accumulatedShares || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">เงินฝาก</p>
                    <p className="text-emerald-600 font-black text-sm">{formatTHB(member.savingsBalance || 0)}</p>
                  </div>
               </div>

               <button 
                  onClick={() => handleOpenPayment(member.id)}
                  className="w-full py-3 bg-teal-50 text-teal-700 font-black rounded-xl border border-teal-100 flex items-center justify-center gap-2 active:bg-teal-100 transition-colors"
               >
                  <DollarSign className="w-4 h-4" />
                  บันทึกรับชำระเงิน
               </button>
            </div>
          ))}
          {filteredMembers.length === 0 && <div className="text-center py-20 text-slate-400">ไม่พบสมาชิกที่ค้นหา</div>}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-5">รหัส</th>
                <th className="px-6 py-5">ชื่อ-สกุล</th>
                <th className="px-6 py-5 text-right">หนี้บ้าน/ที่ดิน</th>
                <th className="px-6 py-5 text-right">สินเชื่อทั่วไป</th>
                <th className="px-6 py-5 text-right">หุ้นสะสม</th>
                <th className="px-6 py-5 text-right">เงินฝาก</th>
                <th className="px-6 py-5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">{member.memberCode}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{member.name}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-red-600 font-bold">{formatTHB((member.housingLoanBalance || 0) + (member.landLoanBalance || 0))}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-amber-600 font-bold">{formatTHB(member.generalLoanBalance || 0)}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-teal-700 font-bold">{formatTHB(member.accumulatedShares)}</td>
                  <td className="px-6 py-4 text-right text-emerald-700 font-bold">{formatTHB(member.savingsBalance)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenPayment(member.id)} className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl font-bold text-xs border border-teal-100 hover:bg-teal-100 transition-colors">รับชำระ</button>
                        <button onClick={() => handleOpenEdit(member.id)} className="p-2 text-slate-400 hover:text-amber-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(member)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMemberId && modalType === 'payment' && (
        <PaymentModal memberId={selectedMemberId} onClose={() => { setSelectedMemberId(null); setModalType(null); }} />
      )}
      {selectedMemberId && modalType === 'edit' && (
        <EditMemberModal memberId={selectedMemberId} onClose={() => { setSelectedMemberId(null); setModalType(null); }} />
      )}
    </div>
  );
};

const SummaryBox: React.FC<{ title: string; value: number; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => {
  const cMap = { red: "text-red-600", orange: "text-orange-600", amber: "text-amber-600", teal: "text-teal-600", emerald: "text-emerald-600" };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-shrink-0 w-40 md:w-full">
      <div className="flex justify-between items-start mb-2">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{title}</span>
         <div className={`p-1.5 rounded-lg bg-slate-50 ${cMap[color as keyof typeof cMap]}`}>{icon}</div>
      </div>
      <p className={`text-lg font-black tracking-tighter truncate ${cMap[color as keyof typeof cMap]}`}>
        {new Intl.NumberFormat('th-TH').format(value)}
      </p>
    </div>
  );
};
