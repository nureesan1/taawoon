
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

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500 font-['Sarabun']">
      
      {/* 1. RICH MENU GRID (3x2) - ตามรูปเป๊ะๆ */}
      <section className="grid grid-cols-3 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl">
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
          icon={<div className="relative"><Sprout className="w-8 h-8" /><Coins className="absolute -top-1 -right-1 w-4 h-4" /></div>} 
          label="เงินออมทรัพย์" 
          subLabel="( เงินฝากออมทรัพย์คงเหลือ )" 
          bgColor="bg-[#f1f5f9]"
        />
        <MenuButton 
          onClick={() => setView('payment_history')} 
          icon={<Globe className="w-8 h-8" />} 
          label="เว็บไซต์" 
          subLabel="( เช็คประวัติการชำระได้ที่นี่ )" 
          bgColor="bg-white"
        />
        <MenuButton 
          onClick={() => scrollToSection('profile-section')} 
          icon={<Users className="w-8 h-8" />} 
          label="ข้อมูลสมาชิก" 
          bgColor="bg-[#f1f5f9]"
        />
        <MenuButton 
          onClick={() => scrollToSection('contact-section')} 
          icon={<Headset className="w-8 h-8" />} 
          label="ติดต่อเจ้าหน้าที่" 
          bgColor="bg-white"
        />
      </section>

      {/* 2. ข้อมูลทุนเรือนหุ้น (Shares Card) */}
      <section id="shares-section" className="bg-white rounded-[1.5rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="bg-[#0D9488] p-4 flex items-center gap-3 text-white">
          <Landmark className="w-6 h-6 opacity-70" />
          <h3 className="font-bold text-lg">ข้อมูลทุนเรือนหุ้น</h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <p className="text-slate-500 font-bold text-sm">ยอดหุ้นสะสมรวม</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#0D9488]">{formatTHB(member.accumulatedShares)}</span>
              <span className="text-2xl font-black text-[#0D9488]">บาท</span>
            </div>
          </div>
          <div className="bg-[#F0FDFA] p-4 rounded-2xl flex items-center justify-center">
            <p className="text-[#0D9488] font-bold text-sm">สิทธิประโยชน์: มีสิทธิได้รับปันผลประจำปี</p>
          </div>
        </div>
      </section>

      {/* 3. ยอดหนี้ (Debt Section) */}
      <section id="debt-section" className="bg-white rounded-[1.5rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="bg-[#064E3B] p-4 flex items-center gap-3 text-white">
          <TrendingDown className="w-6 h-6 opacity-70" />
          <h3 className="font-bold text-lg">ภาระหนี้สินทั้งหมด</h3>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-slate-500 font-bold text-sm">ยอดหนี้คงเหลือสุทธิ</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-[#EF4444]">{formatTHB((member.housingLoanBalance||0) + (member.landLoanBalance||0) + (member.generalLoanBalance||0))}</span>
            <span className="text-2xl font-black text-[#EF4444]">บาท</span>
          </div>
          <hr className="border-slate-100 my-4" />
          <div className="space-y-3">
             <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">หนี้ค่าบ้าน</span><span className="font-black text-slate-800">{formatTHB(member.housingLoanBalance)} ฿</span></div>
             <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">หนี้ค่าที่ดิน</span><span className="font-black text-slate-800">{formatTHB(member.landLoanBalance)} ฿</span></div>
             <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">สินเชื่อทั่วไป</span><span className="font-black text-slate-800">{formatTHB(member.generalLoanBalance)} ฿</span></div>
          </div>
          <div className="bg-red-50 p-3 rounded-xl mt-6">
            <p className="text-red-600 font-black text-center text-xs uppercase tracking-widest">⚠️ ค้างชำระสะสม {member.missedInstallments} งวด</p>
          </div>
        </div>
      </section>

      {/* 4. เงินฝาก (Savings Section) */}
      <section id="savings-section" className="bg-white rounded-[1.5rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="bg-emerald-600 p-4 flex items-center gap-3 text-white">
          <PiggyBank className="w-6 h-6 opacity-70" />
          <h3 className="font-bold text-lg">เงินฝากออมทรัพย์</h3>
        </div>
        <div className="p-8">
          <p className="text-slate-500 font-bold text-sm mb-1">ยอดเงินฝากคงเหลือ</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-emerald-600">{formatTHB(member.savingsBalance)}</span>
            <span className="text-2xl font-black text-emerald-600">บาท</span>
          </div>
        </div>
      </section>

      {/* 5. ข้อมูลสมาชิก (Profile Card) */}
      <section id="profile-section" className="bg-white rounded-[1.5rem] shadow-md border border-slate-100 p-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-100 p-5 rounded-[1.5rem] text-slate-400">
            <User className="w-12 h-12" />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-2">ข้อมูลสมาชิก</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-slate-400 font-bold">ชื่อ-สกุล</span>
              <span className="text-slate-800 font-black text-right">{member.name}</span>
              <span className="text-slate-400 font-bold">รหัสสมาชิก</span>
              <span className="text-slate-800 font-black text-right">{member.memberCode}</span>
              <span className="text-slate-400 font-bold">เลขบัตร</span>
              <span className="text-slate-800 font-black text-right">{member.personalInfo?.idCard}</span>
              <span className="text-slate-400 font-bold">วันที่เข้าร่วม</span>
              <span className="text-slate-800 font-black text-right">{member.joinedDate || '-'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ติดต่อเจ้าหน้าที่ (Contact Card) */}
      <section id="contact-section" className="bg-white rounded-[1.5rem] shadow-md border border-slate-100 overflow-hidden">
        <div className="bg-[#1E293B] p-4 flex items-center gap-3 text-white">
          <Phone className="w-6 h-6 text-red-400 fill-red-400" />
          <h3 className="font-bold text-lg">ติดต่อเจ้าหน้าที่</h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-1">
            <p className="font-black text-slate-800">สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด</p>
            <p className="text-sm text-slate-500 font-bold">ยะลา 95000 | โทร: 089-595-2329</p>
          </div>
          <a 
            href="tel:0895952329"
            className="w-full bg-[#064E3B] text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xl shadow-lg active:scale-95 transition-all"
          >
            <PhoneCall className="w-6 h-6" />
            โทรออกทันที
          </a>
        </div>
      </section>

    </div>
  );
};

// Helper Component for Menu Buttons
const MenuButton: React.FC<{ icon: React.ReactNode, label: string, subLabel?: string, bgColor: string, onClick: () => void }> = ({ icon, label, subLabel, bgColor, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-6 transition-all active:scale-90 hover:opacity-80 border-slate-100 ${bgColor}`}
  >
    <div className="mb-4 text-black">
      {icon}
    </div>
    <span className="text-sm font-black text-slate-800">{label}</span>
    {subLabel && <span className="text-[9px] text-slate-400 font-bold mt-1">{subLabel}</span>}
  </button>
);
