
import React from 'react';
import { useStore } from '../context/StoreContext';
import { LogOut, Home, User, Wallet, LayoutDashboard, UserCircle, Settings as SettingsIcon, Banknote, UserPlus, Users } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, setView, currentView } = useStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Navbar */}
      <aside className="bg-teal-800 text-white w-full md:w-64 flex-shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-teal-700">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
            T
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">ตะอาวุน</h1>
            <p className="text-xs text-teal-300">ระบบสหกรณ์ฯ</p>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-6 px-2">
            <p className="text-xs text-teal-300 uppercase font-semibold mb-2">เข้าสู่ระบบโดย</p>
            <div className="flex items-center gap-2 bg-teal-900/50 p-2 rounded-lg">
              <User className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium truncate">{currentUser?.name}</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-700/50'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              แดชบอร์ด
            </button>
            
            {currentUser?.role === UserRole.MEMBER && (
               <button 
                onClick={() => setView('member_profile')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'member_profile' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-700/50'}`}
              >
                <UserCircle className="w-5 h-5" />
                ข้อมูลส่วนตัว
              </button>
            )}

            {currentUser?.role === UserRole.STAFF && (
              <>
                 <button 
                  onClick={() => setView('register_member')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'register_member' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-700/50'}`}
                >
                  <UserPlus className="w-5 h-5" />
                  เพิ่มสมาชิกใหม่
                </button>
                 <button 
                  onClick={() => setView('member_management')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'member_management' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-700/50'}`}
                >
                  <Users className="w-5 h-5" />
                  จัดการข้อมูลสมาชิก
                </button>
                 <button 
                  onClick={() => setView('record_payment')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'record_payment' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-700/50'}`}
                >
                  <Banknote className="w-5 h-5" />
                  รับชำระเงิน
                </button>
                 <button 
                  onClick={() => setView('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'settings' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-700/50'}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                  ตั้งค่าระบบ
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-teal-700">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-200 hover:text-white hover:bg-teal-700 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              {currentUser?.role === UserRole.STAFF 
                ? (() => {
                    switch(currentView) {
                        case 'record_payment': return 'ระบบรับชำระเงิน';
                        case 'register_member': return 'เพิ่มสมาชิกใหม่';
                        case 'member_management': return 'จัดการข้อมูลสมาชิก';
                        case 'settings': return 'ตั้งค่าระบบ';
                        default: return 'ระบบจัดการสมาชิก (เจ้าหน้าที่)';
                    }
                  })()
                : 'ข้อมูลสมาชิก'}
            </h2>
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20">
          {children}
        </div>
      </main>
    </div>
  );
};
