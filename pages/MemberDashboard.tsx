
import React from 'react';
import { useStore } from '../context/StoreContext';
import { StatCard } from '../components/StatCard';
import { Wallet, Landmark, TrendingDown, PiggyBank, History, FileText, Home, MapPin, Coins, CalendarCheck, AlertCircle, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export const MemberDashboard: React.FC = () => {
  const { currentUser, getMember } = useStore();
  
  if (!currentUser?.memberId) return <div>Loading...</div>;
  
  const member = getMember(currentUser.memberId);
  if (!member) return <div>Member not found</div>;

  const totalDebt = member.housingLoanBalance + member.landLoanBalance + member.generalLoanBalance;
  
  const debtData = [
    { name: 'หนี้ค่าบ้าน', value: member.housingLoanBalance, color: '#ef4444' }, // red-500
    { name: 'หนี้ค่าที่ดิน', value: member.landLoanBalance, color: '#f97316' }, // orange-500
    { name: 'สินเชื่อทั่วไป', value: member.generalLoanBalance, color: '#f59e0b' }, // amber-500
  ].filter(d => d.value > 0);

  const formatTHB = (num: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
  };

  const currentYear = new Date().getFullYear();
  const currentYearThai = currentYear + 543;
  
  const debtPaidThisYear = member.transactions.reduce((acc, tx) => {
    const txYear = new Date(tx.date).getFullYear();
    if (txYear === currentYear) {
        return acc + (tx.housing || 0) + (tx.land || 0) + (tx.generalLoan || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Yearly Debt Repayment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md p-6 text-white flex items-center justify-between transition-transform hover:-translate-y-1">
            <div>
                <p className="text-blue-100 font-medium mb-1 flex items-center gap-2 text-sm">
                <CalendarCheck className="w-4 h-4" />
                ยอดชำระหนี้สะสม ปี {currentYearThai}
                </p>
                <h3 className="text-3xl font-bold">{formatTHB(debtPaidThisYear)}</h3>
                <p className="text-xs text-blue-200 mt-2 opacity-80">รวมค่าบ้าน, ค่าที่ดิน, และสินเชื่อทั่วไปที่ชำระแล้วในปีนี้</p>
            </div>
            <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                <TrendingDown className="w-8 h-8 text-white" />
            </div>
        </div>

        {/* Loan Term Status Card */}
        <div className={`rounded-xl shadow-md p-6 flex items-center justify-between transition-transform hover:-translate-y-1 border ${member.missedInstallments > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className={`font-bold text-sm ${member.missedInstallments > 0 ? 'text-red-700' : 'text-slate-500'}`}>สถานะงวดชำระ</p>
                  {member.missedInstallments > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">ค้างชำระ</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">ยอดชำระต่องวด</p>
                    <p className="text-xl font-bold text-red-600">{formatTHB(member.monthlyInstallment || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ผิดนัดสะสม</p>
                    <p className="text-xl font-bold text-red-600">{member.missedInstallments || 0} งวด</p>
                  </div>
                </div>
            </div>
            <div className={`p-4 rounded-full ${member.missedInstallments > 0 ? 'bg-red-100' : 'bg-slate-50'}`}>
                {member.missedInstallments > 0 ? <AlertCircle className="w-8 h-8 text-red-600" /> : <Info className="w-8 h-8 text-teal-600" />}
            </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 mt-2">
         <h2 className="text-lg font-bold text-slate-700">ภาระหนี้สิน (Liabilities)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="หนี้ค่าบ้านคงเหลือ" value={formatTHB(member.housingLoanBalance)} icon={<Home className="w-6 h-6 text-red-500" />} colorClass="bg-white border-l-4 border-l-red-500" valueColorClass="text-red-600" />
        <StatCard title="หนี้ที่ดินคงเหลือ" value={formatTHB(member.landLoanBalance)} icon={<MapPin className="w-6 h-6 text-orange-500" />} colorClass="bg-white border-l-4 border-l-orange-500" valueColorClass="text-red-600" />
        <StatCard title="สินเชื่อทั่วไปคงเหลือ" value={formatTHB(member.generalLoanBalance)} icon={<Coins className="w-6 h-6 text-amber-500" />} colorClass="bg-white border-l-4 border-l-amber-500" valueColorClass="text-red-600" />
      </div>

      <div className="flex items-center gap-2 mb-2 mt-6">
         <h2 className="text-lg font-bold text-slate-700">ทรัพย์สิน (Assets)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="เงินฝากคงเหลือ" value={formatTHB(member.savingsBalance)} icon={<Wallet className="w-6 h-6 text-emerald-600" />} colorClass="bg-emerald-50 border border-emerald-100" valueColorClass="text-emerald-700" />
        <StatCard title="ทุนเรือนหุ้นสะสม" value={formatTHB(member.accumulatedShares)} icon={<PiggyBank className="w-6 h-6 text-teal-600" />} colorClass="bg-teal-50 border border-teal-100" valueColorClass="text-teal-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> สัดส่วนภาระหนี้สิน</h3>
          <div className="flex flex-col md:flex-row items-center">
            {debtData.length > 0 ? (
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={debtData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {debtData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatTHB(value)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
                <div className="w-full md:w-1/2 h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                    <CheckCircleIcon className="w-12 h-12 text-slate-300 mb-2" />
                    <span>ไม่มีหนี้สินคงค้าง</span>
                </div>
            )}
            <div className="w-full md:w-1/2 space-y-4 mt-6 md:mt-0 md:pl-8">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-slate-500 text-sm mb-1">หนี้สินรวมทั้งหมด</p>
                  <p className="text-2xl font-bold text-red-600">{formatTHB(totalDebt)}</p>
               </div>
               <div className="space-y-2">
                   {debtData.map((d, i) => (
                       <div key={i} className="flex justify-between items-center text-sm">
                           <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                               <span className="text-slate-600">{d.name}</span>
                           </div>
                           <span className="font-semibold text-red-600">{formatTHB(d.value)}</span>
                       </div>
                   ))}
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
           <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-teal-600" /> รายการเคลื่อนไหวล่าสุด</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[400px] scrollbar-thin scrollbar-thumb-slate-200">
            {member.transactions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                    <History className="w-8 h-8 mb-2 opacity-50" />
                    ยังไม่มีรายการบันทึก
                </div>
            )}
            {member.transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="border-b border-slate-100 last:border-0 pb-3 group hover:bg-slate-50 p-2 rounded-lg transition-colors">
                 <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-slate-400 font-medium">{new Date(tx.timestamp).toLocaleDateString('th-TH')}</span>
                    <span className="text-sm font-bold text-teal-600">+{formatTHB(tx.totalAmount)}</span>
                 </div>
                 <div className="text-xs text-slate-500 space-y-1 mt-1">
                    {tx.housing > 0 && <div className="flex justify-between items-center bg-red-50/50 px-2 py-0.5 rounded text-red-700"><span>ค่าบ้าน</span><span>{formatTHB(tx.housing)}</span></div>}
                    {tx.land > 0 && <div className="flex justify-between items-center bg-orange-50/50 px-2 py-0.5 rounded text-orange-700"><span>ค่าที่ดิน</span><span>{formatTHB(tx.land)}</span></div>}
                    {tx.generalLoan > 0 && <div className="flex justify-between items-center bg-amber-50/50 px-2 py-0.5 rounded text-amber-700"><span>สินเชื่อ</span><span>{formatTHB(tx.generalLoan)}</span></div>}
                    {tx.shares > 0 && <div className="flex justify-between items-center bg-teal-50/50 px-2 py-0.5 rounded text-teal-700"><span>ค่าหุ้น</span><span>{formatTHB(tx.shares)}</span></div>}
                    {tx.savings > 0 && <div className="flex justify-between items-center bg-emerald-50/50 px-2 py-0.5 rounded text-emerald-700"><span>ฝากเงิน</span><span>{formatTHB(tx.savings)}</span></div>}
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
