
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Member } from '../types';
import { Search, UserPlus, DollarSign, Pencil, Trash2, Building2, MapPin, Coins, PiggyBank, Wallet, Heart, ShieldCheck, Gift, Info } from 'lucide-react';
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

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH').format(num);

  const totals = filteredMembers.reduce((acc, m) => {
    // Current balances
    acc.housing += (m.housingLoanBalance || 0);
    acc.land += (m.landLoanBalance || 0);
    acc.general += (m.generalLoanBalance || 0);
    acc.savings += (m.savingsBalance || 0);
    acc.shares += (m.accumulatedShares || 0);

    // Accumulated historical fees from transactions
    m.transactions?.forEach(tx => {
      acc.welfare += (Number(tx.welfare) || 0);
      acc.insurance += (Number(tx.insurance) || 0);
      acc.donation += (Number(tx.donation) || 0);
      acc.others += (Number(tx.others) || 0);
    });

    return acc;
  }, { 
    housing: 0, land: 0, general: 0, savings: 0, shares: 0,
    welfare: 0, insurance: 0, donation: 0, others: 0
  });

  return (
    <div className="space-y-6 pb-20">
      
      {/* Financial Overview - Top Level */}
      <div className="flex items-center gap-2 mb-2">
         <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Financial Overview (Balances)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5">
         <SummaryBox title="หนี้ค่าบ้าน" value={totals.housing} color="red" icon={<Building2 className="w-4 h-4" />} />
         <SummaryBox title="หนี้ที่ดิน" value={totals.land} color="orange" icon={<MapPin className="w-4 h-4" />} />
         <SummaryBox title="สินเชื่อทั่วไป" value={totals.general} color="amber" icon={<Coins className="w-4 h-4" />} />
         <SummaryBox title="หุ้นสะสม" value={totals.shares} color="teal" icon={<PiggyBank className="w-4 h-4" />} />
         <SummaryBox title="เงินฝาก" value={totals.savings} color="emerald" icon={<Wallet className="w-4 h-4" />} />
      </div>

      {/* Fees & Donations - Second Level */}
      <div className="flex items-center gap-2 mb-2">
         <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Fees & Donations (Accumulated)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <SummaryBox title="ยอดสวัสดิการ" value={totals.welfare} color="sky" icon={<Heart className="w-4 h-4" />} />
         <SummaryBox title="ยอดประกันภัย" value={totals.insurance} color="indigo" icon={<ShieldCheck className="w-4 h-4" />} />
         <SummaryBox title="ยอดบริจาค" value={totals.donation} color="pink" icon={<Gift className="w-4 h-4" />} />
         <SummaryBox title="อื่นๆ/เบ็ดเตล็ด" value={totals.others} color="slate" icon={<Info className="w-4 h-4" />} />
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

      {/* Member List */}
      <div className="space-y-4">
        {/* Mobile List View */}
        <div className="md:hidden space-y-4">
          {filteredMembers.map(member => {
            const memberFeeTotal = (member.transactions || []).reduce((sum, tx) => 
              sum + (Number(tx.welfare) || 0) + (Number(tx.insurance) || 0) + (Number(tx.donation) || 0) + (Number(tx.others) || 0), 0
            );
            return (
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
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">ค่าธรรมเนียมสะสม</p>
                      <p className="text-sky-600 font-black text-sm">{formatTHB(memberFeeTotal)}</p>
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
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-6 py-5 whitespace-nowrap">ชื่อ-สกุล</th>
                  <th className="px-6 py-5 text-right whitespace-nowrap">หนี้บ้าน/ที่ดิน</th>
                  <th className="px-6 py-5 text-right whitespace-nowrap">สินเชื่อทั่วไป</th>
                  <th className="px-6 py-5 text-right whitespace-nowrap">สวัสดิการ/ประกัน</th>
                  <th className="px-6 py-5 text-right whitespace-nowrap">บริจาค/อื่นๆ</th>
                  <th className="px-6 py-5 text-right whitespace-nowrap">หุ้นสะสม</th>
                  <th className="px-6 py-5 text-right whitespace-nowrap">เงินฝาก</th>
                  <th className="px-6 py-5 text-center whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMembers.map((member) => {
                  const welfareTotal = (member.transactions || []).reduce((sum, tx) => sum + (Number(tx.welfare) || 0) + (Number(tx.insurance) || 0), 0);
                  const donationTotal = (member.transactions || []).reduce((sum, tx) => sum + (Number(tx.donation) || 0) + (Number(tx.others) || 0), 0);

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{member.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{member.memberCode}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-red-600 font-bold">{formatTHB((member.housingLoanBalance || 0) + (member.landLoanBalance || 0))}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-amber-600 font-bold">{formatTHB(member.generalLoanBalance || 0)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sky-600 font-bold">{formatTHB(welfareTotal)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-indigo-600 font-bold">{formatTHB(donationTotal)}</div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
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
  const cMap = { 
    red: "text-red-600", 
    orange: "text-orange-600", 
    amber: "text-amber-600", 
    teal: "text-teal-600", 
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    indigo: "text-indigo-600",
    pink: "text-pink-600",
    slate: "text-slate-600"
  };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-shrink-0 w-40 md:w-full">
      <div className="flex justify-between items-start mb-2">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">{title}</span>
         <div className={`p-1.5 rounded-lg bg-slate-50 ${cMap[color as keyof typeof cMap]}`}>{icon}</div>
      </div>
      <p className={`text-lg font-black tracking-tighter truncate ${cMap[color as keyof typeof cMap]}`}>
        {new Intl.NumberFormat('th-TH').format(value)}
      </p>
    </div>
  );
};
