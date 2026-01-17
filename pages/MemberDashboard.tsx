
import React from 'react';
import { useStore } from '../context/StoreContext';
import { StatCard } from '../components/StatCard';
import { Wallet, Landmark, TrendingDown, PiggyBank, History, FileText, Home, MapPin, Coins, CalendarCheck, AlertCircle, Info, Clock, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export const MemberDashboard: React.FC = () => {
  const { currentUser, getMember, isLoading } = useStore();
  
  if (!currentUser?.memberId) return <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
    <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
    <p className="font-bold">กำลังตรวจสอบข้อมูลสมาชิก...</p>
  </div>;
  
  const member = getMember(currentUser.memberId);
  
  if (!member && isLoading) {
    return <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      <p className="font-bold">กำลังดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์...</p>
    </div>;
  }

  if (!member) return <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500 font-bold gap-4">
    <AlertCircle className="w-12 h-12" />
    <p>ไม่พบข้อมูลสมาชิกในระบบฐานข้อมูลปัจจุบัน</p>
    <button onClick={() => window.location.reload()} className="bg-slate-800 text-white px-6 py-2 rounded-xl text-sm">ลองใหม่อีกครั้ง</button>
  </div>;

  const totalDebt = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  
  const debtData = [
    { name: 'หนี้ค่าบ้าน', value: member.housingLoanBalance || 0, color: '#ef4444' }, 
    { name: 'หนี้ค่าที่ดิน', value: member.landLoanBalance || 0, color: '#f97316' }, 
    { name: 'สินเชื่อทั่วไป', value: member.generalLoanBalance || 0, color: '#f59e0b' }, 
  ].filter(d => d.value > 0);

  const formatTHB = (num: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
  };

  const currentYear = new Date().getFullYear();
  const currentYearThai = currentYear + 543;
  
  const debtPaidThisYear = (member.transactions || []).reduce((acc, tx) => {
    const txYear = new Date(tx.date).getFullYear();
    if (txYear === currentYear) {
        return acc + (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
         <h2 className="text-lg font-bold text-red-600">ภาระหนี้สิน (Liabilities)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="หนี้ค่าบ้านคงเหลือ" value={formatTHB(member.housingLoanBalance || 0)} icon={<Home className="w-6 h-6 text-red-500" />} colorClass="bg-white border-l-4 border-l-red-500" valueColorClass="text-red-600" />
        <StatCard title="หนี้ที่ดินคงเหลือ" value={formatTHB(member.landLoanBalance || 0)} icon={<MapPin className="w-6 h-6 text-orange-500" />} colorClass="bg-white border-l-4 border-l-orange-500" valueColorClass="text-red-600" />
        <StatCard title="สินเชื่อทั่วไปคงเหลือ" value={formatTHB(member.generalLoanBalance || 0)} icon={<Coins className="w-6 h-6 text-amber-500" />} colorClass="bg-white border-l-4 border-l-amber-500" valueColorClass="text-red-600" />
      </div>

      <div className="flex items-center gap-2 mb-2 mt-6">
         <h2 className="text-lg font-bold text-emerald-700">ทรัพย์สิน (Assets)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="เงินฝากคงเหลือ" value={formatTHB(member.savingsBalance || 0)} icon={<Wallet className="w-6 h-6 text-emerald-600" />} colorClass="bg-emerald-50 border border-emerald-100" valueColorClass="text-emerald-700" />
        <StatCard title="ทุนเรือนหุ้นสะสม" value={formatTHB(member.accumulatedShares || 0)} icon={<PiggyBank className="w-6 h-6 text-teal-600" />} colorClass="bg-teal-50 border border-teal-100" valueColorClass="text-teal-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Debt Pie Chart */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> สัดส่วนภาระหนี้สิน</h3>
          <div className="flex flex-col items-center">
            {debtData.length > 0 ? (
              <>
                <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={debtData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                        {debtData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: any) => formatTHB(Number(value) || 0)} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center mb-4">
                        <p className="text-slate-500 text-[10px] uppercase font-bold">หนี้สินรวมทั้งหมด</p>
                        <p className="text-xl font-bold text-red-600">{formatTHB(totalDebt)}</p>
                    </div>
                    {debtData.map((d, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                <span className="text-slate-600">{d.name}</span>
                            </div>
                            <span className="font-semibold text-red-600">{formatTHB(d.value)}</span>
                        </div>
                    ))}
                </div>
              </>
            ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                    <CheckCircleIcon className="w-12 h-12 text-slate-300 mb-2" />
                    <span>ไม่มีหนี้สินคงค้าง</span>
                </div>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-teal-600" />
                    ประวัติการชำระเงินล่าสุด
                </h3>
                <span className="text-xs text-slate-400">แสดง 5 รายการล่าสุด</span>
            </div>
            
            <div className="flex-1 overflow-x-auto">
                {member.transactions && member.transactions.length > 0 ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
                            <tr>
                                <th className="px-6 py-4">วันที่/เวลา</th>
                                <th className="px-6 py-4">รายละเอียดการชำระ</th>
                                <th className="px-6 py-4 text-right">ยอดชำระรวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {member.transactions.slice(0, 5).map(tx => {
                                const details = [];
                                if (Number(tx.housing) > 0) details.push(`ค่าบ้าน ${formatTHB(tx.housing)}`);
                                if (Number(tx.land) > 0) details.push(`ค่าที่ดิน ${formatTHB(tx.land)}`);
                                if (Number(tx.generalLoan) > 0) details.push(`สินเชื่อ ${formatTHB(tx.generalLoan)}`);
                                if (Number(tx.shares) > 0) details.push(`หุ้นสะสม ${formatTHB(tx.shares)}`);
                                if (Number(tx.savings) > 0) details.push(`เงินฝาก ${formatTHB(tx.savings)}`);
                                if (Number(tx.welfare) > 0) details.push(`สวัสดิการ ${formatTHB(tx.welfare)}`);

                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{new Date(tx.date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {details.map((d, i) => (
                                                    <span key={i} className="bg-teal-50 text-teal-700 text-[10px] px-2 py-0.5 rounded-full border border-teal-100">
                                                        {d}
                                                    </span>
                                                ))}
                                                {details.length === 0 && <span className="text-slate-400 italic">เบ็ดเตล็ด</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-slate-800">{formatTHB(tx.totalAmount)}</div>
                                            <div className="text-[10px] text-slate-400">บันทึกโดย {tx.recordedBy}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-300">
                        <History className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">ยังไม่มีประวัติการชำระเงิน</p>
                    </div>
                )}
            </div>
            
            {member.transactions && member.transactions.length > 5 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 italic">* โปรดติดต่อเจ้าหน้าที่เพื่อขอเรียกดูประวัติการเงินฉบับเต็ม</p>
                </div>
            )}
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
