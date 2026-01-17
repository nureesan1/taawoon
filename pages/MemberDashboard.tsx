
import React from 'react';
import { useStore } from '../context/StoreContext';
import { StatCard } from '../components/StatCard';
import { 
  Wallet, Landmark, TrendingDown, PiggyBank, History, FileText, 
  Home, MapPin, Coins, CalendarCheck, AlertCircle, Info, Clock, 
  Loader2, ChevronRight, ArrowUpRight, Receipt, User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export const MemberDashboard: React.FC = () => {
  const { currentUser, getMember, isLoading, setView } = useStore();
  
  if (!currentUser?.memberId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      <p className="font-bold">กำลังตรวจสอบข้อมูลสมาชิก...</p>
    </div>
  );
  
  const member = getMember(currentUser.memberId);
  
  if (!member && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        <p className="font-bold">กำลังดึงข้อมูลล่าสุด...</p>
      </div>
    );
  }

  if (!member) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500 font-bold gap-4 p-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2">
        <AlertCircle className="w-12 h-12" />
      </div>
      <p className="text-xl">ไม่พบข้อมูลสมาชิก</p>
      <p className="text-slate-500 text-sm font-normal">กรุณาติดต่อเจ้าหน้าที่เพื่อตรวจสอบสถานะการลงทะเบียนของคุณ</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-slate-800 text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg">ลองใหม่อีกครั้ง</button>
    </div>
  );

  const totalDebt = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  
  const debtData = [
    { name: 'หนี้บ้าน', value: member.housingLoanBalance || 0, color: '#ef4444' }, 
    { name: 'หนี้ที่ดิน', value: member.landLoanBalance || 0, color: '#f97316' }, 
    { name: 'สินเชื่อ', value: member.generalLoanBalance || 0, color: '#f59e0b' }, 
  ].filter(d => d.value > 0);

  const formatTHB = (num: number) => {
    return new Intl.NumberFormat('th-TH', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(num);
  };

  const currentYearThai = new Date().getFullYear() + 543;
  const debtPaidThisYear = (member.transactions || []).reduce((acc, tx) => {
    const txYear = new Date(tx.date).getFullYear();
    if (txYear === new Date().getFullYear()) {
        return acc + (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* 0. Greeting Section (New: Show Member Name) */}
      <section className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white border-2 border-teal-100 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm overflow-hidden">
             <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">สวัสดีคุณ {member.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">{member.memberCode}</span>
              <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {member.memberType === 'ordinary' ? 'สมาชิกสามัญ' : 'สมาชิกสมทบ'}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setView('member_profile')}
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-teal-600 shadow-sm"
          title="โปรไฟล์ของคุณ"
        >
          <Info className="w-5 h-5" />
        </button>
      </section>

      {/* 1. ยอดชำระรายเดือนและสถานะ */}
      <section className="relative overflow-hidden bg-[#064e3b] rounded-[2.5rem] p-8 text-white shadow-xl shadow-teal-900/20">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Landmark className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">Monthly Status</span>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${member.missedInstallments > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
              {member.missedInstallments > 0 ? 'ค้างชำระ' : 'สถานะปกติ'}
            </div>
          </div>
          
          <div>
            <p className="text-teal-100/70 text-xs font-bold mb-1">ยอดที่ต้องชำระต่องวด</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black tracking-tight">{formatTHB(member.monthlyInstallment || 0)}</h2>
              <span className="text-xl font-bold text-teal-300">บาท</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-[9px] text-teal-300 font-bold uppercase mb-1">ผิดนัดสะสม</p>
              <p className="text-xl font-black">{member.missedInstallments || 0} งวด</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-[9px] text-teal-300 font-bold uppercase mb-1">ชำระแล้ว (ปี {currentYearThai})</p>
              <p className="text-xl font-black">{formatTHB(debtPaidThisYear)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ภาระหนี้คงเหลือ (Liabilities) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            ภาระหนี้คงเหลือ (Debt)
          </h3>
          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">Total: {formatTHB(totalDebt)} ฿</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DebtCard 
            title="หนี้ค่าบ้าน" 
            value={member.housingLoanBalance || 0} 
            icon={<Home className="w-5 h-5" />} 
            color="red"
          />
          <DebtCard 
            title="หนี้ค่าที่ดิน" 
            value={member.landLoanBalance || 0} 
            icon={<MapPin className="w-5 h-5" />} 
            color="orange"
          />
          <DebtCard 
            title="สินเชื่อทั่วไป" 
            value={member.generalLoanBalance || 0} 
            icon={<Coins className="w-5 h-5" />} 
            color="amber"
          />
        </div>
      </div>

      {/* 3. ทรัพย์สิน (Assets) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-800 px-2 uppercase tracking-widest flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-emerald-500" />
          ทรัพย์สินสะสม (Assets)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <AssetCard 
            title="เงินฝาก" 
            value={member.savingsBalance || 0} 
            icon={<Wallet className="w-5 h-5" />} 
            color="emerald"
          />
          <AssetCard 
            title="ทุนเรือนหุ้น" 
            value={member.accumulatedShares || 0} 
            icon={<Landmark className="w-5 h-5" />} 
            color="teal"
          />
        </div>
      </div>

      {/* 4. กราฟและประวัติ (Mobile Optimized) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* สัดส่วนหนี้สิน */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            สัดส่วนภาระหนี้
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={debtData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {debtData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => formatTHB(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3">
              {debtData.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                    <span className="font-bold text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-black text-slate-800">{formatTHB(d.value)} ฿</span>
                </div>
              ))}
              {debtData.length === 0 && <p className="text-center text-slate-400 text-xs italic">ไม่มีหนี้ค้างชำระ</p>}
            </div>
          </div>
        </div>

        {/* ประวัติล่าสุด */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              การชำระเงินล่าสุด
            </h3>
            <button 
              onClick={() => setView('payment_history')}
              className="text-[10px] font-black text-teal-600 flex items-center gap-1 uppercase tracking-widest hover:underline"
            >
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {member.transactions && member.transactions.length > 0 ? (
              member.transactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-transform active:scale-95">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{formatTHB(tx.totalAmount)} ฿</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {new Date(tx.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} • {tx.paymentMethod === 'transfer' ? 'โอนเงิน' : 'เงินสด'}
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <ArrowUpRight className="w-4 h-4 text-teal-600" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-300">
                <History className="w-10 h-10 mx-auto opacity-20 mb-2" />
                <p className="text-xs font-bold">ยังไม่มีประวัติการเงิน</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const DebtCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
  const colors: any = {
    red: "bg-red-50 border-red-100 text-red-600",
    orange: "bg-orange-50 border-orange-100 text-orange-600",
    amber: "bg-amber-50 border-amber-100 text-amber-600"
  };
  return (
    <div className={`p-6 rounded-[2rem] border transition-all active:scale-95 ${colors[color] || colors.red}`}>
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
        <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">{icon}</div>
      </div>
      <p className="text-2xl font-black tracking-tight">{new Intl.NumberFormat('th-TH').format(value)}</p>
      <p className="text-[8px] font-bold mt-1 opacity-50 uppercase tracking-tighter">ยอดคงค้างสุทธิ</p>
    </div>
  );
};

const AssetCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
  const colors: any = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    teal: "bg-teal-50 border-teal-100 text-teal-700",
  };
  return (
    <div className={`p-6 rounded-[2rem] border transition-all active:scale-95 ${colors[color] || colors.emerald}`}>
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
        <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">{icon}</div>
      </div>
      <p className="text-2xl font-black tracking-tight">{new Intl.NumberFormat('th-TH').format(value)}</p>
      <p className="text-[8px] font-bold mt-1 opacity-50 uppercase tracking-tighter">สินทรัพย์สะสม</p>
    </div>
  );
};
