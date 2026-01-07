
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig, LedgerTransaction } from '../types';
import { MOCK_MEMBERS } from '../constants';
import { LoadingOverlay } from '../components/LoadingOverlay';

type AppView = 'dashboard' | 'register_member' | 'member_management' | 'member_profile' | 'settings' | 'record_payment' | 'daily_summary' | 'accounting' | 'payment_history';

interface StoreContextType {
  members: Member[];
  ledger: LedgerTransaction[];
  currentUser: { role: UserRole; memberId?: string; name?: string } | null;
  currentView: AppView;
  config: AppConfig;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  login: (role: UserRole, memberId?: string) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<boolean>;
  addLedgerItem: (item: Omit<LedgerTransaction, 'id' | 'timestamp'>) => Promise<boolean>;
  deleteLedgerItem: (id: string) => Promise<boolean>;
  updateLedgerItem: (id: string, data: Partial<LedgerTransaction>) => Promise<boolean>;
  getMember: (id: string) => Member | undefined;
  setView: (view: AppView) => void;
  updateConfig: (newConfig: AppConfig) => void;
  resetConfig: () => void;
  refreshData: () => Promise<void>;
  addMember: (member: Omit<Member, 'transactions'>) => Promise<boolean>;
  updateMember: (id: string, data: Partial<Member>) => Promise<boolean>;
  deleteMember: (id: string) => Promise<boolean>;
  initDatabase: () => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_CONFIG: AppConfig = {
  useGoogleSheets: true,
  scriptUrl: 'https://script.google.com/macros/s/AKfycbzAHHCJP5mIJLcxXCzI4FjDWkn4eTeNk4IhMVZpqri2QZgCbxpLUK3p_yx-vkaYbrJT/exec'
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; memberId?: string; name?: string } | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('app_config');
    if (!saved) return DEFAULT_CONFIG;
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const callApi = async (action: string, payload: any = {}, retries = 2): Promise<any> => {
    const url = config.scriptUrl.trim();
    if (!url) throw new Error("กรุณาระบุ URL ในหน้าตั้งค่า");
    
    try {
      // ใช้ URLSearchParams สำหรับ Simple Request เพื่อข้าม CORS Preflight
      const params = new URLSearchParams();
      params.append('action', action);
      params.append('data', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        mode: 'cors',
        cache: 'no-cache', // ป้องกันบราวเซอร์จำ Error เก่า
        redirect: 'follow',
        body: params.toString()
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const text = await response.text();
      
      // ตรวจสอบว่าผลลัพธ์เป็น JSON จริงหรือไม่ (Google มักส่งหน้า Login มาถ้าตั้งค่า Anyone ไม่ถูก)
      if (text.trim().startsWith('<')) {
        if (text.includes('Google Account')) {
          throw new Error("ถูกบล็อก: โปรดตั้งค่าการ Deploy เป็น 'Anyone'");
        }
        throw new Error("เซิร์ฟเวอร์ตอบกลับเป็น HTML (อาจจะเกิดจาก URL ผิด)");
      }

      const data = JSON.parse(text);
      if (data.status === 'error') throw new Error(data.message);
      return data;
    } catch (e: any) {
      if (retries > 0 && e.message.includes('fetch')) {
        await new Promise(r => setTimeout(r, 1000));
        return callApi(action, payload, retries - 1);
      }
      throw e;
    }
  };

  const refreshData = useCallback(async () => {
    if (!config.useGoogleSheets || !config.scriptUrl) {
      setMembers(MOCK_MEMBERS);
      setConnectionStatus('disconnected');
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await callApi('getData');
      if (data.status === 'success') {
        setMembers(data.members || []);
        setLedger(data.ledger || []);
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error("Connection Failed:", error);
      setConnectionStatus('disconnected');
      if (members.length === 0) setMembers(MOCK_MEMBERS);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      await callApi('ping');
      setConnectionStatus('connected');
      return true;
    } catch {
      setConnectionStatus('disconnected');
      return false;
    }
  };

  const initDatabase = async () => {
    setIsLoading(true);
    try {
      await callApi('initDatabase');
      alert('เริ่มต้นฐานข้อมูลสำเร็จ');
      refreshData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('app_config', JSON.stringify(newConfig));
  };

  const resetConfig = () => {
    localStorage.removeItem('app_config');
    setConfig(DEFAULT_CONFIG);
  };

  // ส่วนจัดการ Member และ Transaction (ย่อเพื่อประหยัดพื้นที่)...
  const login = (role: UserRole, id?: string) => {
    if (role === UserRole.STAFF) setCurrentUser({ role, name: 'ผู้ดูแลระบบ' });
    else {
      const m = members.find(m => m.id === id);
      if (m) setCurrentUser({ role, memberId: id, name: m.name });
    }
    setCurrentView('dashboard');
  };

  const logout = () => { setCurrentUser(null); setCurrentView('dashboard'); };
  
  const addTransaction = async (tx: any) => {
    setIsLoading(true);
    try {
      await callApi('addTransaction', { transaction: { ...tx, id: 'T'+Date.now(), timestamp: Date.now() } });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider value={{
      members, ledger, currentUser, currentView, config, isLoading, connectionStatus,
      login, logout, addTransaction, getMember: (id) => members.find(m => m.id === id),
      setView: setCurrentView, updateConfig, resetConfig, refreshData,
      addMember: async (m) => { await callApi('addMember', { member: m }); refreshData(); return true; },
      updateMember: async (id, d) => { await callApi('updateMember', { id, data: d }); refreshData(); return true; },
      deleteMember: async (id) => { await callApi('deleteMember', { id }); refreshData(); return true; },
      initDatabase, testConnection,
      addLedgerItem: async (i) => true, deleteLedgerItem: async (id) => true, updateLedgerItem: async (id, d) => true
    }}>
      {isLoading && <LoadingOverlay />}
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore error');
  return context;
};
