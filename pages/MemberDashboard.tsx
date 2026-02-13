
import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Wallet, Landmark, TrendingDown, PiggyBank, History, FileText, 
  Home, MapPin, Coins, AlertCircle, Info, 
  Loader2, ChevronRight, ArrowUpRight, Receipt, User,
  ClipboardList, Globe, Users, Headset, Sprout, Phone, PhoneCall
} from 'lucide-react';

export const MemberDashboard: React.FC = () => {
  const { currentUser, getMember, isLoading, setView } = useStore();
  
  if (!currentUser?.memberId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      <p className="font-bold font-['Sarabun']">กำลังตรวจสอบข้อมูลสมาชิก...</p>
    </div>
  );
  
  const member = getMember(currentUser.memberId);
  
  if (!member && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        <p className="font-bold font-['Sarabun']">กำลังดึงข้อมูลล่าสุด...</p>
      </div>
    );
  }

  if (!member) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500 font-bold gap-4 p-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2">
        <AlertCircle className="w-12 h-12" />
      </div>
      <p className="text-xl">ไม่พบข้อมูลสมาชิก</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-slate-800 text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg">ลองใหม่อีกครั้ง</button>
    </div>
  );

  const formatTHB = (num: number) => {
    return new Intl.NumberFormat('th-TH', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(num);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const totalDebt = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500 font-['Sarabun']">
      
      {/* 1. RICH MENU GRID (3x2) - ปุ่มเมนูหลัก */}
      <section className="grid grid-cols-3 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-teal-900/5">
        <MenuButton 
          onClick={() => scrollToSection('debt-section')} 
          icon={<ClipboardList className="w-8 h-8" />} 
          label="ยอดหนี้" 
          subLabel="( ภาระหนี้สินคงเหลือ )" 
          bgColor="bg-white"
        />
        <MenuButton 
          onClick={() => scrollToSection('shares-section')} 
          icon={<Landmark className="w-8 h-8" />} 
          label="หุ้นสะสม" 
          subLabel="( ทุนเรือนหุ้นสะสมคงเหลือ )" 
          bgColor="bg-white"
        />
        <MenuButton 
          onClick={() => scrollToSection('savings-section')} 
          icon={<div className="relative"><Sprout className="w-8 h-8" /><Coins className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500" /></div>} 
          label="เงินออมทรัพย์" 
          subLabel="( เงินฝากออมทรัพย์คงเหลือ )" 
          bgColor="bg-slate-50"
        />
        <MenuButton 
          onClick={() => setView('payment_history')} 
          icon={<History className="w-8 h-8" />} 
          label="ประวัติชำระ" 
          subLabel="( ตรวจสอบรายการย้อนหลัง )" 
          bgColor="bg-white"
        />
        <MenuButton 
          onClick={() => scrollToSection('profile-section')} 
          icon={<Users className="w-8 h-8" />} 
          label="ข้อมูลสมาชิก" 
          bgColor="bg-slate-50"
        />
        <MenuButton 
          onClick={() => scrollToSection('contact-section')} 
          icon={<Headset className="w-8 h-8" />} 
          label="ติดต่อเรา" 
          bgColor="bg-white"
        />
      </section>

      {/* 2. ยอดหนี้ (Debt Section) - ออกแบบตาม LINE Flex Message เป๊ะๆ */}
      <section id="debt-section" className="bg-white rounded-[2rem] shadow-2xl shadow-red-900/5 border border-slate-100 overflow-hidden">
        <div className="bg-[#064E3B] p-6 flex items-center gap-4 text-white">
          <div className="bg-white/10 p-2 rounded-xl">
             <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-black text-xl tracking-tight">ภาระหนี้สินทั้งหมด</h3>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">ยอดหนี้คงเหลือสุทธิ</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#EF4444] tracking-tighter">{formatTHB(totalDebt)}</span>
              <span className="text-2xl font-black text-[#EF4444]">บาท</span>
            </div>
          </div>
          
          <div className="h-px bg-slate-100 w-full"></div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">หนี้ค่าบ้าน</span>
                <span className="font-black text-slate-800 text-lg">{formatTHB(member.housingLoanBalance)} ฿</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">หนี้ค่าที่ดิน</span>
                <span className="font-black text-slate-800 text-lg">{formatTHB(member.landLoanBalance)} ฿</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">สินเชื่อทั่วไป</span>
                <span className="font-black text-slate-800 text-lg">{formatTHB(member.generalLoanBalance)} ฿</span>
             </div>
          </div>

          {/* Warning Box ตามรูปในไลน์ */}
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mt-6 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-[#EF4444] font-black text-sm uppercase tracking-widest">
                ค้างชำระสะสม {member.missedInstallments} งวด
            </p>
          </div>
        </div>
      </section>

      {/* 3. ข้อมูลทุนเรือนหุ้น (Shares Card) */}
      <section id="shares-section" className="bg-white rounded-[2rem] shadow-xl shadow-teal-900/5 border border-slate-100 overflow-hidden">
        <div className="bg-[#0D9488] p-6 flex items-center gap-4 text-white">
          <div className="bg-white/10 p-2 rounded-xl">
             <Landmark className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-black text-xl tracking-tight">ข้อมูลทุนเรือนหุ้น</h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">ยอดหุ้นสะสมรวม</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#0D9488] tracking-tighter">{formatTHB(member.accumulatedShares)}</span>
              <span className="text-2xl font-black text-[#0D9488]">บาท</span>
            </div>
          </div>
          <div className="bg-teal-50 p-4 rounded-2xl flex items-center justify-center border border-teal-100">
            <p className="text-[#0D9488] font-black text-xs">✨ สิทธิประโยชน์: มีสิทธิได้รับปันผลประจำปี</p>
          </div>
        </div>
      </section>

      {/* 4. เงินฝาก (Savings Section) */}
      <section id="savings-section" className="bg-white rounded-[2rem] shadow-xl shadow-emerald-900/5 border border-slate-100 overflow-hidden">
        <div className="bg-[#059669] p-6 flex items-center gap-4 text-white">
          <div className="bg-white/10 p-2 rounded-xl">
             <PiggyBank className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-black text-xl tracking-tight">เงินฝากออมทรัพย์</h3>
        </div>
        <div className="p-8">
          <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-widest">ยอดเงินฝากคงเหลือ</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-[#059669] tracking-tighter">{formatTHB(member.savingsBalance)}</span>
            <span className="text-2xl font-black text-[#059669]">บาท</span>
          </div>
        </div>
      </section>

      {/* 5. ข้อมูลสมาชิก (Profile Card) */}
      <section id="profile-section" className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 shadow-inner">
            <User className="w-12 h-12" />
          </div>
          <div className="flex-1 w-full space-y-4">
            <div className="border-b border-slate-100 pb-4">
               <h3 className="text-2xl font-black text-slate-800">ข้อมูลสมาชิก</h3>
               <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">Verified Member Status</p>
            </div>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">ชื่อ-นามสกุล</span>
              <span className="text-slate-800 font-black text-right">{member.name}</span>
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">รหัสสมาชิก</span>
              <span className="text-slate-800 font-black text-right font-mono">{member.memberCode}</span>
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">เลขบัตรประชาชน</span>
              <span className="text-slate-800 font-black text-right font-mono">{member.personalInfo?.idCard}</span>
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">วันที่เข้าร่วม</span>
              <span className="text-slate-800 font-black text-right">{member.joinedDate || '-'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ติดต่อเจ้าหน้าที่ (Contact Card) */}
      <section id="contact-section" className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Headset className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-400">
                <PhoneCall className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest">ฝ่ายบริการสมาชิก</span>
            </div>
            <h3 className="text-xl font-black">สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด</h3>
            <p className="text-slate-400 text-sm font-bold">จังหวัดยะลา 95000 | พร้อมดูแลสมาชิกทุกท่าน</p>
          </div>
          
          <a 
            href="tel:0895952329"
            className="w-full bg-[#064E3B] hover:bg-teal-700 text-white py-5 rounded-3xl flex items-center justify-center gap-4 font-black text-xl shadow-xl transition-all active:scale-95 group"
          >
            <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                <Phone className="w-6 h-6 fill-white" />
            </div>
            089-595-2329
          </a>
          <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">ติดต่อ: น.ส.นูรีซัน ไพเราะ (เจ้าหน้าที่การเงิน)</p>
        </div>
      </section>

    </div>
  );
};

const MenuButton: React.FC<{ icon: React.ReactNode, label: string, subLabel?: string, bgColor: string, onClick: () => void }> = ({ icon, label, subLabel, bgColor, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-8 transition-all active:scale-90 hover:opacity-80 border-slate-50 border-r border-b last:border-r-0 ${bgColor}`}
  >
    <div className="mb-4 text-slate-800 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
      {icon}
    </div>
    <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">{label}</span>
    {subLabel && <span className="text-[8px] text-slate-400 font-bold mt-1.5 leading-none max-w-[80px]">{subLabel}</span>}
  </button>
);
