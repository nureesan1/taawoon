
import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  LogOut, User, LayoutDashboard, UserCircle, Settings as SettingsIcon, 
  Banknote, UserPlus, Users, ClipboardList, Menu, X 
} from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, setView, currentView } = useStore();

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: [UserRole.MEMBER, UserRole.STAFF] },
    { id: 'member_profile', label: 'ข้อมูลส่วนตัว', icon: UserCircle, roles: [UserRole.MEMBER] },
    { id: 'record_payment', label: 'รับชำระ', icon: Banknote, roles: [UserRole.STAFF] },
    { id: 'daily_summary', label: 'สรุปยอด', icon: ClipboardList, roles: [UserRole.STAFF] },
    { id: 'member_management', label: 'สมาชิก', icon: Users, roles: [UserRole.STAFF] },
    { id: 'settings', label: 'ตั้งค่า', icon: SettingsIcon, roles: [UserRole.STAFF] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(currentUser?.role || UserRole.GUEST));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-['Sarabun']">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex bg-[#064e3b] text-white w-64 flex-shrink-0 flex-col h-screen sticky top-0 overflow-y-auto z-30">
        <div className="p-6 flex items-center gap-3 border-b border-teal-900">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">T</div>
          <div>
            <h1 className="font-bold text-lg leading-tight">ตะอาวุน</h1>
            <p className="text-xs text-teal-300 opacity-80 uppercase tracking-tighter">COOP SYSTEM</p>
          </div>
        </div>

        <div className="p-4 flex-1">
          <div className="mb-6 px-2">
            <p className="text-[10px] text-teal-400 uppercase font-bold mb-2 tracking-widest">USER ACCOUNT</p>
            <div className="flex items-center gap-2 bg-teal-950/40 p-2.5 rounded-xl border border-teal-800/50">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold">{currentUser?.name?.charAt(0)}</div>
              <span className="text-sm font-bold truncate flex-1">{currentUser?.name}</span>
            </div>
          </div>

          <nav className="space-y-1">
            {filteredNav.map((item) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-bold rounded-xl transition-all ${currentView === item.id ? 'bg-teal-600 text-white shadow-lg' : 'text-teal-100 hover:bg-teal-700/50'}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-teal-900">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm font-bold text-teal-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-[#064e3b] text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-sm">T</div>
              <h1 className="font-bold tracking-tight">ระบบสหกรณ์ตะอาวุน</h1>
           </div>
           <button onClick={logout} className="p-2 bg-teal-900/50 rounded-lg text-teal-200">
              <LogOut className="w-5 h-5" />
           </button>
        </header>

        {/* Desktop Top Header (Hidden on Mobile) */}
        <header className="hidden md:block bg-white shadow-sm sticky top-0 z-10 border-b border-slate-100">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {filteredNav.find(n => n.id === currentView)?.label || 'แผงควบคุม'}
            </h2>
            <div className="flex items-center gap-4">
               <div className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest">
                {new Date().toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
               </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] h-16">
        {filteredNav.slice(0, 5).map((item) => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={`flex flex-col items-center justify-center w-full gap-1 py-1 transition-all ${currentView === item.id ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${currentView === item.id ? 'bg-teal-50 text-teal-600 scale-110' : ''}`}>
               <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
