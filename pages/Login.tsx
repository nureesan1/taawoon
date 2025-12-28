
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole } from '../types';
import { Users, ShieldCheck, Home, ArrowRight, CreditCard, Lock, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, members } = useStore();
  const [idCardInput, setIdCardInput] = useState('');
  const [error, setError] = useState('');
  
  // Admin Login State
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleMemberLogin = () => {
    setError('');
    if (!idCardInput) {
      setError('กรุณากรอกเลขบัตรประชาชน');
      return;
    }

    // Search for member with matching ID Card - robust string comparison
    const member = members.find(m => {
        if (!m.personalInfo?.idCard) return false;
        return String(m.personalInfo.idCard).trim() === idCardInput.trim();
    });

    if (member) {
      login(UserRole.MEMBER, member.id);
    } else {
      setError('ไม่พบข้อมูลสมาชิกในระบบ');
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

  const handleAdminKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleStaffLogin();
    }
  }

  const handleMemberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleMemberLogin();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-600/90 p-4 font-['Sarabun']">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side: Branding */}
        <div className="md:w-[45%] bg-[#065F46] p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-full h-full opacity-[0.05] pointer-events-none">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 L 100 0 L 100 100 Z" fill="white" />
                </svg>
            </div>
            
          <div className="relative z-10">
            <div className="w-14 h-14 bg-[#10B981] rounded-2xl flex items-center justify-center mb-8 shadow-xl">
                <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4 leading-tight">
                สหกรณ์เคหสถาน<br/>
                บ้านมั่นคงชุมชนตะอาวุน
            </h1>
            <p className="text-teal-100/80 text-sm leading-relaxed max-w-[280px]">
                สร้างความมั่นคง สร้างอนาคต ด้วยระบบการออมและ การจัดการหนี้ที่มีประสิทธิภาพ
            </p>
          </div>

          <div className="relative z-10 pt-10">
            <p className="text-[10px] text-teal-400 uppercase tracking-widest font-bold opacity-60">VERSION 1.0.1</p>
          </div>
        </div>

        {/* Right Side: Login Options */}
        <div className="md:w-[55%] p-8 md:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-[26px] font-bold text-slate-800 mb-10 text-center tracking-tight">เข้าสู่ระบบ</h2>
          
          <div className="space-y-8">
            
            {/* Member Login Section */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-50 p-2.5 rounded-xl">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-700">สำหรับสมาชิก</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase ml-1">เลขบัตรประชาชน</label>
                    <div className="relative">
                        <input 
                            type="text"
                            maxLength={13}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border ${error ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none text-slate-700 font-mono transition-all text-base`}
                            placeholder="รหัสประจำตัว 13 หลัก"
                            value={idCardInput}
                            onChange={(e) => setIdCardInput(e.target.value.replace(/[^0-9]/g, ''))}
                            onKeyDown={handleMemberKeyDown}
                        />
                        <CreditCard className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{error}</p>}
                </div>
                
                <button 
                  onClick={handleMemberLogin}
                  className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl hover:bg-[#0F766E] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-teal-100"
                >
                  เข้าใช้งาน
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-slate-400 font-medium">หรือ</span>
              </div>
            </div>

            {/* Staff Login Section */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 transition-all hover:bg-slate-50">
              <div className="flex items-center gap-3 mb-6">
                 <div className="bg-indigo-50 p-2.5 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-700">สำหรับเจ้าหน้าที่</h3>
              </div>
              
              <div className="space-y-4">
                  <div className="relative">
                    <input 
                        type="password"
                        className={`w-full pl-11 pr-4 py-3 bg-white border ${adminError ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none text-slate-700 transition-all`}
                        placeholder="รหัสผ่าน Admin"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        onKeyDown={handleAdminKeyDown}
                    />
                    <Lock className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                  {adminError && <p className="text-xs text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">{adminError}</p>}

                  <button 
                    onClick={handleStaffLogin}
                    className="w-full bg-[#1F2937] text-white py-3.5 rounded-xl hover:bg-black font-bold transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                  >
                    เข้าใช้งาน (Admin)
                  </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
