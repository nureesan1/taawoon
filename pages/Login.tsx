
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole } from '../types';
import { Users, ShieldCheck, Home, ArrowRight, CreditCard, Lock, Loader2, AlertCircle, Settings } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, members, isLoading, connectionStatus, setView, errorMessage } = useStore();
  const [idCardInput, setIdCardInput] = useState('');
  const [error, setError] = useState('');
  
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleMemberLogin = () => {
    setError('');
    
    if (connectionStatus === 'disconnected') {
      setError('ระบบยังไม่ได้เชื่อมต่อกับฐานข้อมูล โปรดแจ้งเจ้าหน้าที่');
      return;
    }

    if (isLoading && members.length === 0) {
      setError('กำลังโหลดข้อมูลสมาชิก โปรดรอสักครู่...');
      return;
    }

    if (!idCardInput) {
      setError('กรุณากรอกเลขบัตรประชาชน');
      return;
    }

    const cleanInput = idCardInput.replace(/\D/g, '');
    const member = members.find(m => {
        if (!m.personalInfo?.idCard) return false;
        const cleanDbId = String(m.personalInfo.idCard).replace(/\D/g, '');
        return cleanDbId === cleanInput;
    });

    if (member) {
      login(UserRole.MEMBER, member.id);
    } else {
      setError('ไม่พบข้อมูลสมาชิกในระบบ (ตรวจสอบเลขบัตรอีกครั้ง)');
    }
  };

  const handleStaffLogin = () => {
    setAdminError('');
    if (adminPassword === '123456') {
        login(UserRole.STAFF);
    } else {
        setAdminError('รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-600/95 p-4 font-['Sarabun']">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row min-h-[650px]">
        
        {/* Left Side: Branding */}
        <div className="md:w-[45%] bg-[#065F46] p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-[0.05] pointer-events-none">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 100 L 100 0 L 100 100 Z" fill="white" />
              </svg>
          </div>
            
          <div className="relative z-10">
            <div className="w-16 h-16 bg-[#10B981] rounded-2xl flex items-center justify-center mb-10 shadow-2xl">
                <Home className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black mb-6 leading-tight">
                สหกรณ์เคหสถาน<br/>
                บ้านมั่นคงชุมชนตะอาวุน
            </h1>
            <p className="text-teal-100/70 text-sm leading-relaxed max-w-[280px] font-bold">
                เข้าถึงข้อมูลหนี้สิน เงินออม และทุนเรือนหุ้นของคุณได้ทุกที่ ทุกเวลา
            </p>
          </div>

          <div className="relative z-10 pt-10">
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`}></div>
               <p className="text-[10px] text-teal-400 uppercase tracking-[0.2em] font-black">
                 {connectionStatus === 'connected' ? 'Systems Online' : 'Connection Required'}
               </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Options */}
        <div className="md:w-[55%] p-10 md:p-14 flex flex-col justify-center bg-white relative">
          
          {connectionStatus === 'disconnected' && (
            <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-3xl animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h4 className="text-xs font-black text-red-800 uppercase tracking-widest">การเชื่อมต่อขัดข้อง</h4>
              </div>
              <p className="text-[10px] text-red-600 font-bold mb-3">แอปไม่สามารถโหลดข้อมูลจาก Google Sheets ได้ในขณะนี้</p>
              <button 
                onClick={() => setView('settings')}
                className="text-[10px] font-black text-red-700 bg-red-100 px-3 py-1.5 rounded-full hover:bg-red-200 flex items-center gap-2"
              >
                <Settings className="w-3 h-3" /> ไปที่หน้าตั้งค่าเพื่อแก้ไข
              </button>
            </div>
          )}

          <h2 className="text-2xl font-black text-slate-800 mb-10 text-center tracking-tight">เข้าสู่ระบบใช้งาน</h2>
          
          <div className="space-y-8">
            {/* Member Login Section */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-50 p-2.5 rounded-xl">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">สมาชิก (MEMBER)</h3>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                    <input 
                        type="text"
                        maxLength={13}
                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 ${error ? 'border-red-200' : 'border-slate-50'} rounded-2xl focus:bg-white focus:border-emerald-500 outline-none text-slate-700 font-black tracking-widest transition-all text-lg`}
                        placeholder="เลขบัตรประชาชน"
                        value={idCardInput}
                        onChange={(e) => setIdCardInput(e.target.value.replace(/\D/g, ''))}
                    />
                    <CreditCard className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                {error && <p className="text-[10px] text-red-500 font-black ml-2 animate-in fade-in">{error}</p>}
                
                <button 
                  onClick={handleMemberLogin}
                  disabled={isLoading}
                  className="w-full bg-[#0D9488] text-white py-4 rounded-2xl hover:bg-[#0F766E] font-black transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-teal-900/10 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ตรวจสอบข้อมูล'}
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="px-4 bg-white">Administrative</span>
              </div>
            </div>

            {/* Staff Login Section */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6">
                 <div className="bg-indigo-50 p-2.5 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">เจ้าหน้าที่ (ADMIN)</h3>
              </div>
              
              <div className="space-y-4">
                  <div className="relative">
                    <input 
                        type="password"
                        className={`w-full pl-12 pr-4 py-4 bg-white border-2 ${adminError ? 'border-red-200' : 'border-slate-50'} rounded-2xl focus:border-indigo-500 outline-none text-slate-700 transition-all font-black tracking-widest`}
                        placeholder="PASSWORD"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <Lock className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                  {adminError && <p className="text-[10px] text-red-500 font-black ml-2">{adminError}</p>}

                  <button 
                    onClick={handleStaffLogin}
                    className="w-full bg-[#1F2937] text-white py-4 rounded-2xl hover:bg-black font-black transition-all active:scale-[0.98] shadow-xl"
                  >
                    LOGIN TO SYSTEM
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
