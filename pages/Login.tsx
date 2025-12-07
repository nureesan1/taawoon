import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole } from '../types';
import { Users, ShieldCheck, Home, ArrowRight, CreditCard, Lock } from 'lucide-react';

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

    // Search for member with matching ID Card
    const member = members.find(m => m.personalInfo?.idCard === idCardInput);

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

  // For Demo purposes: helper to fill existing ID
  const fillDemoId = () => {
    if (members[0]?.personalInfo?.idCard) {
      setIdCardInput(members[0].personalInfo.idCard);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-700 p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branding */}
        <div className="md:w-1/2 bg-teal-800 p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
            </div>
          <div>
            <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Home className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">สหกรณ์เคหสถาน<br/>บ้านมั่นคงชุมชนตะอาวุน</h1>
            <p className="text-teal-200 opacity-90">สร้างความมั่นคง สร้างอนาคต ด้วยระบบการออมและการจัดการหนี้ที่มีประสิทธิภาพ</p>
          </div>
          <div className="mt-10">
            <p className="text-xs text-teal-400 uppercase tracking-wider font-semibold">Version 1.0.1</p>
          </div>
        </div>

        {/* Right Side: Login Options */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">เข้าสู่ระบบ</h2>
          
          <div className="space-y-6">
            
            {/* Member Login Section */}
            <div className="border border-slate-200 rounded-xl p-6 hover:border-teal-400 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <Users className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="font-semibold text-slate-700">สำหรับสมาชิก</h3>
              </div>
              <div className="space-y-3">
                <label className="block text-sm text-slate-500">เลขบัตรประชาชน</label>
                <div className="relative">
                  <input 
                    type="text"
                    maxLength={13}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 outline-none text-slate-700 font-mono"
                    placeholder="เลขบัตร 13 หลัก"
                    value={idCardInput}
                    onChange={(e) => setIdCardInput(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <CreditCard className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                
                <button 
                  onClick={handleMemberLogin}
                  className="w-full bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  เข้าใช้งาน
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button onClick={fillDemoId} className="text-xs text-teal-500 underline text-center w-full mt-2 hover:text-teal-600">
                  ใช้เลขบัตรทดสอบ (Demo)
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">หรือ</span>
              </div>
            </div>

            {/* Staff Login Section */}
            <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-400 transition-colors bg-slate-50/50">
              <div className="flex items-center gap-3 mb-4">
                 <div className="bg-blue-100 p-2 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="font-semibold text-slate-700">สำหรับเจ้าหน้าที่</h3>
              </div>
              
              <div className="space-y-3">
                  <div className="relative">
                    <input 
                        type="password"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 outline-none text-slate-700"
                        placeholder="รหัสผ่าน Admin"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        onKeyDown={handleAdminKeyDown}
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {adminError && <p className="text-xs text-red-500">{adminError}</p>}

                  <button 
                    onClick={handleStaffLogin}
                    className="w-full bg-slate-800 text-white py-2.5 rounded-lg hover:bg-slate-900 font-medium transition-all active:scale-[0.98]"
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