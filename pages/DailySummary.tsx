
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Search, FileText, TrendingUp, Filter, Clock, Download, Building, MapPin, Coins, PiggyBank, Wallet } from 'lucide-react';

type SummaryPeriod = 'daily' | 'monthly' | 'yearly';

// Helper to get consistent local date string YYYY-MM-DD
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

  // Extract and flatten all transactions
  const allTransactions = useMemo(() => {
    return members.flatMap(member => 
      (member.transactions || []).map(tx => ({
        ...tx,
        memberName: member.name,
        memberCode: member.memberCode
      }))
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [members]);

  // Filter based on period and search term
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const selDate = new Date(selectedDate);
      
      const matchesSearch = tx.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tx.memberCode.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Use local date strings for robust comparison
      const txDateStr = getLocalDateString(tx.date);
      const selDateStr = getLocalDateString(selectedDate);

      if (period === 'daily') {
        return txDateStr === selDateStr;
      } else if (period === 'monthly') {
        // Compare Year and Month using local time
        return txDate.getMonth() === selDate.getMonth() && 
               txDate.getFullYear() === selDate.getFullYear();
      } else {
        // Compare Year using local time
        return txDate.getFullYear() === selDate.getFullYear();
      }
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

  const getPeriodLabel = () => {
    const date = new Date(selectedDate);
    if (period === 'daily') return date.toLocaleDateString('th-TH', { dateStyle: 'long' });
    if (period === 'monthly') return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    return `ปี พ.ศ. ${date.getFullYear() + 543}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-teal-50 p-3 rounded-xl border border-teal-100">
                <FileText className="w-8 h-8 text-teal-600" />
             </div>
             <div>
                <h1 className="text-2xl font-bold text-slate-800">สรุปรายงานการรับเงิน</h1>
                <p className="text-slate-500 font-medium">{getPeriodLabel()}</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                   onClick={() => setPeriod('daily')} 
                   className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'daily' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >รายวัน</button>
                <button 
                   onClick={() => setPeriod('monthly')} 
                   className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'monthly' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >รายเดือน</button>
                <button 
                   onClick={() => setPeriod('yearly')} 
                   className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'yearly' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >รายปี</button>
             </div>
             <input 
                type={period === 'yearly' ? 'number' : period === 'monthly' ? 'month' : 'date'}
                value={period === 'yearly' ? new Date(selectedDate).getFullYear() : selectedDate.slice(0, period === 'monthly' ? 7 : 10)}
                onChange={(e) => {
                   if (period === 'yearly') {
                      setSelectedDate(`${e.target.value}-01-01`);
                   } else {
                      setSelectedDate(e.target.value + (period === 'monthly' ? '-01' : ''));
                   }
                }}
                className="p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm font-bold text-slate-700"
             />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex items-center gap-2 mb-2">
         <h2 className="text-lg font-bold text-red-600">สรุปยอดรับเงินแยกประเภท</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard title="ค่าบ้าน" value={totals.housing} icon={<Building className="w-4 h-4" />} color="red" />
        <SummaryCard title="ค่าที่ดิน" value={totals.land} icon={<MapPin className="w-4 h-4" />} color="orange" />
        <SummaryCard title="สินเชื่อทั่วไป" value={totals.general} icon={<Coins className="w-4 h-4" />} color="amber" />
        <SummaryCard title="ค่าหุ้นสะสม" value={totals.shares} icon={<PiggyBank className="w-4 h-4" />} color="teal" />
        <SummaryCard title="เงินฝาก" value={totals.savings} icon={<Wallet className="w-4 h-4" />} color="emerald" />
      </div>

      <div className="bg-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white/20 rounded-full">
                <TrendingUp className="w-8 h-8" />
             </div>
             <div>
                <p className="text-teal-100 font-bold uppercase text-xs tracking-wider">ยอดรับสุทธิ ({getPeriodLabel()})</p>
                <h2 className="text-4xl font-extrabold">{formatTHB(totals.grandTotal)}</h2>
             </div>
          </div>
          <button className="bg-white text-teal-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-50 transition-colors shadow-lg active:scale-95">
             <Download className="w-5 h-5" />
             ส่งออกรายงาน CSV
          </button>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Clock className="w-5 h-5 text-slate-400" />
               รายการรับเงินทั้งหมด ({filteredTransactions.length} รายการ)
            </h3>
            <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input 
                  type="text" 
                  placeholder="ค้นหาตามชื่อ หรือรหัส..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
               />
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold">
               <tr>
                  <th className="px-6 py-4">วันที่/เวลา</th>
                  <th className="px-6 py-4">สมาชิก</th>
                  <th className="px-6 py-4 text-right">ค่าบ้าน/ดิน</th>
                  <th className="px-6 py-4 text-right">หุ้น/เงินฝาก</th>
                  <th className="px-6 py-4 text-right">ยอดรวม</th>
                  <th className="px-6 py-4 text-center">ผู้รับเงิน</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">{getLocalDateString(tx.date)}</div>
                        <div className="text-[10px] text-slate-400">{new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{tx.memberName}</div>
                        <div className="text-xs text-slate-500 font-mono">{tx.memberCode}</div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="text-red-600 font-medium">{formatTHB((Number(tx.housing) || 0) + (Number(tx.land) || 0))}</div>
                        <div className="text-[10px] text-slate-400">บ้าน {formatTHB(Number(tx.housing) || 0)} | ที่ดิน {formatTHB(Number(tx.land) || 0)}</div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="text-teal-600 font-medium">{formatTHB((Number(tx.shares) || 0) + (Number(tx.savings) || 0))}</div>
                        <div className="text-[10px] text-slate-400">หุ้น {formatTHB(Number(tx.shares) || 0)} | ฝาก {formatTHB(Number(tx.savings) || 0)}</div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="text-base font-bold text-slate-900">{formatTHB(Number(tx.totalAmount) || 0)}</div>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">
                           {tx.recordedBy}
                        </span>
                     </td>
                  </tr>
               ))}
               {filteredTransactions.length === 0 && (
                  <tr>
                     <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>ไม่พบรายการใน{period === 'daily' ? 'วันนี้' : period === 'monthly' ? 'เดือนนี้' : 'ปีนี้'}</p>
                     </td>
                  </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'red' | 'orange' | 'amber' | 'teal' | 'emerald';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color }) => {
  const colorMap = {
    red: "border-red-100 bg-white text-red-600 icon-bg-red-50 icon-text-red-500",
    orange: "border-orange-100 bg-white text-red-600 icon-bg-orange-50 icon-text-orange-500",
    amber: "border-amber-100 bg-white text-red-600 icon-bg-amber-50 icon-text-amber-500",
    teal: "border-teal-100 bg-white text-teal-700 icon-bg-teal-50 icon-text-teal-500",
    emerald: "border-emerald-100 bg-white text-emerald-700 icon-bg-emerald-50 icon-text-emerald-500"
  };

  const style = colorMap[color];
  const [border, bg, text, iconBg, iconText] = style.split(' ');

  return (
    <div className={`p-5 rounded-xl border ${border} ${bg} shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1`}>
      <div>
        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{title}รวม</p>
        <p className={`text-lg font-bold ${text}`}>{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value)}</p>
      </div>
      <div className={`p-2 rounded-lg ${iconBg.replace('icon-bg-', 'bg-')} ${iconText.replace('icon-text-', 'text-')}`}>
        {icon}
      </div>
    </div>
  );
};
