
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig, LedgerTransaction } from '../types';
import { MOCK_MEMBERS } from '../constants';
import { LoadingOverlay } from '../components/LoadingOverlay';

type AppView = 'dashboard' | 'register_member' | 'member_management' | 'member_profile' | 'settings' | 'record_payment' | 'daily_summary' | 'accounting' | 'payment_history' | 'billing';

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
      const params = new URLSearchParams();
      params.append('action', action);
      params.append('data', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow',
        body: params
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const text = await response.text();
      
      if (text.trim().startsWith('<')) {
        if (text.includes('Google Account')) {
          throw new Error("ถูกบล็อก: โปรดตั้งค่า Deployment เป็น 'Anyone'");
        }
        throw new Error("เซิร์ฟเวอร์ตอบกลับเป็น HTML (อาจเป็นเพราะ URL ผิด)");
      }

      const data = JSON.parse(text);
      if (data.status === 'error') throw new Error(data.message);
      return data;
    } catch (e: any) {
      if (retries > 0 && (e.message.includes('fetch') || e.message.includes('HTTP') || e.message.includes('Failed to fetch'))) {
        await new Promise(r => setTimeout(r, 1000));
        return callApi(action, payload, retries - 1);
      }
      throw e;
    }
  };

  const refreshData = useCallback(async () => {
    if (!config.useGoogleSheets || !config.scriptUrl) {
      setMembers(MOCK_MEMBERS);
      setLedger([]); 
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
    } catch (error: any) {
      console.error("Connection Failed:", error);
      setConnectionStatus('disconnected');
      if (members.length === 0) setMembers(MOCK_MEMBERS);
    } finally {
      setIsLoading(false);
    }
  }, [config, members.length]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const addLedgerItem = async (item: Omit<LedgerTransaction, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
      await callApi('addLedgerItem', { 
        item: { ...item, id: 'L' + Date.now(), timestamp: Date.now() } 
      });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('บันทึกบัญชีไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLedgerItem = async (id: string) => {
    setIsLoading(true);
    try {
      await callApi('deleteLedgerItem', { id });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('ลบรายการไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = (role: UserRole, id?: string) => {
    if (role === UserRole.STAFF) setCurrentUser({ role, name: 'ผู้ดูแลระบบ' });
    else {
      const m = members.find(m => m.id === id);
      if (m) setCurrentUser({ role, memberId: id, name: m.name });
    }
    setCurrentView('dashboard');
  };

  const logout = () => { setCurrentUser(null); setCurrentView('dashboard'); };
  
  const updateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('app_config', JSON.stringify(newConfig));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('app_config');
  };

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
      addLedgerItem, deleteLedgerItem, updateLedgerItem: async (id, d) => true,
      initDatabase: async () => { 
        setIsLoading(true); 
        try { await callApi('initDatabase'); alert('เริ่มต้นสำเร็จ'); refreshData(); } 
        catch (e: any) { alert(e.message); } 
        finally { setIsLoading(false); } 
      }, 
      testConnection: async () => {
        try { await callApi('ping'); setConnectionStatus('connected'); return true; } 
        catch { setConnectionStatus('disconnected'); return false; }
      }
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
