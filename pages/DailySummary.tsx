
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Search, FileText, TrendingUp, Filter, Clock, Download, Building, MapPin, Coins, PiggyBank, Wallet, Calendar } from 'lucide-react';

type SummaryPeriod = 'daily' | 'monthly' | 'yearly';

const getLocalDateString = (dateInput?: any) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DailySummary: React.FC = () => {
  const { members } = useStore();
  const [period, setPeriod] = useState<SummaryPeriod>('daily');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');

  const allTransactions = useMemo(() => {
    return members.flatMap(member => 
      (member.transactions || []).map(tx => ({
        ...tx,
        memberName: member.name,
        memberCode: member.memberCode
      }))
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [members]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const selDate = new Date(selectedDate);
      const matchesSearch = tx.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tx.memberCode.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      const txDateStr = getLocalDateString(tx.date);
      const selDateStr = getLocalDateString(selectedDate);
      if (period === 'daily') return txDateStr === selDateStr;
      if (period === 'monthly') return txDate.getMonth() === selDate.getMonth() && txDate.getFullYear() === selDate.getFullYear();
      return txDate.getFullYear() === selDate.getFullYear();
    });
  }, [allTransactions, period, selectedDate, searchTerm]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => ({
      housing: acc.housing + (Number(tx.housing) || 0),
      land: acc.land + (Number(tx.land) || 0),
      shares: acc.shares + (Number(tx.shares) || 0),
      savings: acc.savings + (Number(tx.savings) || 0),
      general: acc.general + (Number(tx.generalLoan) || 0),
      others: acc.others + (Number(tx.welfare) || 0) + (Number(tx.insurance) || 0) + (Number(tx.donation) || 0) + (Number(tx.others) || 0),
      grandTotal: acc.grandTotal + (Number(tx.totalAmount) || 0)
    }), { housing: 0, land: 0, shares: 0, savings: 0, general: 0, others: 0, grandTotal: 0 });
  }, [filteredTransactions]);

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  return (
    <div className="space-y-6 pb-24">
      {/* Date Picker Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
           <div className="bg-teal-50 p-3 rounded-2xl text-teal-600"><Calendar className="w-6 h-6" /></div>
           <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">สรุปรายงาน</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{period} Report</p>
           </div>
        </div>

        <div className="flex flex-col gap-3">
           <div className="grid grid-cols-3 bg-slate-100 p-1.5 rounded-2xl">
              {(['daily', 'monthly', 'yearly'] as SummaryPeriod[]).map(p => (
                 <button key={p} onClick={() => setPeriod(p)} className={`py-2.5 rounded-xl text-xs font-black transition-all ${period === p ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>
                    {p === 'daily' ? 'รายวัน' : p === 'monthly' ? 'รายเดือน' : 'รายปี'}
                 </button>
              ))}
           </div>
           <input 
              type={period === 'yearly' ? 'number' : period === 'monthly' ? 'month' : 'date'}
              value={period === 'yearly' ? new Date(selectedDate).getFullYear() : selectedDate.slice(0, period === 'monthly' ? 7 : 10)}
              onChange={(e) => setSelectedDate(e.target.value + (period === 'monthly' ? '-01' : ''))}
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700 bg-slate-50/50"
           />
        </div>
      </div>

      {/* Net Total Card */}
      <div className="bg-[#064e3b] rounded-3xl p-8 text-white shadow-xl shadow-teal-900/10 flex flex-col items-center text-center space-y-2">
          <p className="text-teal-300 font-bold uppercase text-[10px] tracking-[0.2em] mb-2">ยอดรับเงินสุทธิ</p>
          <h2 className="text-4xl font-black tracking-tight">{formatTHB(totals.grandTotal)}</h2>
          <div className="pt-4 flex gap-2">
             <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{filteredTransactions.length} รายการ</div>
             <button className="bg-teal-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
          </div>
      </div>

      {/* Categories Grid - 2 cols on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryMiniCard label="ค่าบ้าน" value={totals.housing} color="red" />
          <SummaryMiniCard label="ค่าที่ดิน" value={totals.land} color="orange" />
          <SummaryMiniCard label="สินเชื่อ" value={totals.general} color="amber" />
          <SummaryMiniCard label="หุ้น" value={totals.shares} color="teal" />
          <SummaryMiniCard label="เงินฝาก" value={totals.savings} color="emerald" />
      </div>

      {/* Transaction List - Mobile Cards */}
      <div className="space-y-3">
         <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-slate-800 tracking-tight">ประวัติรายการ</h3>
            <div className="relative">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input type="text" placeholder="ค้นหา..." className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
         </div>

         <div className="space-y-3">
            {filteredTransactions.map(tx => (
               <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between transition-transform active:scale-[0.98]">
                  <div className="flex gap-4 items-center">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <span className="text-[10px] font-bold uppercase">{new Date(tx.date).toLocaleDateString('en-US', {month: 'short'})}</span>
                        <span className="text-lg font-black leading-none">{new Date(tx.date).getDate()}</span>
                     </div>
                     <div>
                        <p className="font-black text-slate-800">{tx.memberName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{tx.memberCode} • {new Date(tx.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-lg font-black text-teal-600">{formatTHB(tx.totalAmount)}</p>
                     <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">{tx.recordedBy}</span>
                  </div>
               </div>
            ))}
            {filteredTransactions.length === 0 && (
               <div className="py-20 text-center text-slate-300">
                  <Filter className="w-10 h-10 mx-auto opacity-20 mb-2" />
                  <p className="text-sm font-bold">ไม่พบรายการ</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

const SummaryMiniCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const cMap = { red: "text-red-600", orange: "text-orange-600", amber: "text-amber-600", teal: "text-teal-600", emerald: "text-emerald-600" };
  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <p className={`text-sm font-black truncate ${cMap[color as keyof typeof cMap]}`}>{new Intl.NumberFormat('th-TH').format(value)}</p>
    </div>
  );
};
