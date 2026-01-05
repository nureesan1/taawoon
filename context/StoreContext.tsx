
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
  scriptUrl: '' // แนะนำให้ผู้ใช้กรอกเองในหน้า Settings
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; memberId?: string; name?: string } | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('app_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const callApi = async (action: string, payload: any = {}) => {
    if (!config.scriptUrl || config.scriptUrl.trim() === '') {
      throw new Error("ยังไม่ได้ระบุ URL ของ Google Apps Script");
    }
    
    try {
      // ใช้ Content-Type: text/plain เพื่อข้าม CORS Preflight (OPTIONS request)
      // Google Apps Script JSON.parse() จะสามารถแกะข้อมูลออกมาได้ปกติ
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'cors', // ต้องเป็นโหมด cors
        redirect: 'follow', // ต้องเป็น follow เพราะ Google จะ redirect ไปยัง UserContent URL
        body: JSON.stringify({ action, ...payload }),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      
      // กรณี Failed to fetch ในเบราว์เซอร์ มักจะกระโดดไป catch ทันที
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message);
      return data;
    } catch (e) {
      console.error("Fetch API Error:", e);
      throw e;
    }
  };

  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      const data = await callApi('ping');
      if (data && data.status === 'success') {
        setConnectionStatus('connected');
        return true;
      }
      throw new Error("Invalid response status");
    } catch (e) {
      setConnectionStatus('disconnected');
      return false;
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
      if (data && data.status === 'success') {
        if (data.members) setMembers(data.members);
        if (data.ledger) setLedger(data.ledger.sort((a: any, b: any) => b.timestamp - a.timestamp));
        setConnectionStatus('connected');
      } else {
        throw new Error(data?.message || "Data fetch unsuccessful");
      }
    } catch (error) {
      console.error("Refresh Data Error:", error);
      setConnectionStatus('disconnected');
      // หากดึงไม่ได้เลยและไม่มีข้อมูลเดิม ให้ใช้ Mock ไปก่อน
      if (members.length === 0) setMembers(MOCK_MEMBERS);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const initDatabase = async () => {
    setIsLoading(true);
    try {
      await callApi('initDatabase');
      alert('Initialize Database สำเร็จ! กรุณารอระบบดึงข้อมูลใหม่...');
      await refreshData();
    } catch (e) {
      alert('ไม่สามารถเชื่อมต่อได้: ' + e + '\n\nคำแนะนำ: ตรวจสอบว่าได้ Deploy เป็น "Anyone" และใช้ URL ล่าสุดแล้วหรือยัง?');
    } finally {
      setIsLoading(false);
    }
  };

  const resetConfig = () => {
    localStorage.removeItem('app_config');
    setConfig(DEFAULT_CONFIG);
    window.location.reload();
  };

  const addTransaction = async (txData: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = { ...txData, id: 'T' + Date.now(), timestamp: Date.now() };
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('addTransaction', { transaction: newTx });
        await refreshData();
        return true;
      } catch (e) {
        alert("บันทึกไม่สำเร็จ: " + e);
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
      setMembers(prev => prev.map(m => m.id === txData.memberId ? { ...m, transactions: [newTx, ...m.transactions] } : m));
      return true;
    }
  };

  const addLedgerItem = async (itemData: Omit<LedgerTransaction, 'id' | 'timestamp'>) => {
    const newItem: LedgerTransaction = { ...itemData, id: 'L' + Date.now(), timestamp: Date.now() };
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('addLedgerItem', { item: newItem });
        await refreshData();
        return true;
      } catch (e) { return false; } finally { setIsLoading(false); }
    } else {
      setLedger(prev => [newItem, ...prev]);
      return true;
    }
  };

  const deleteLedgerItem = async (id: string) => {
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('deleteLedgerItem', { id });
        await refreshData();
        return true;
      } catch (e) { return false; } finally { setIsLoading(false); }
    } else {
      setLedger(prev => prev.filter(i => i.id !== id));
      return true;
    }
  };

  const updateLedgerItem = async (id: string, data: Partial<LedgerTransaction>) => {
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('updateLedgerItem', { id, data });
        await refreshData();
        return true;
      } catch (e) { return false; } finally { setIsLoading(false); }
    } else {
      setLedger(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
      return true;
    }
  };

  const addMember = async (memberData: Omit<Member, 'transactions'>) => {
    const newMember: Member = { ...memberData, transactions: [] };
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('addMember', { member: newMember });
        await refreshData();
        return true;
      } catch (e) { return false; } finally { setIsLoading(false); }
    } else {
      setMembers(prev => [...prev, newMember]);
      return true;
    }
  };

  const updateMember = async (id: string, data: Partial<Member>) => {
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('updateMember', { id, data });
        await refreshData();
        return true;
      } catch (e) { return false; } finally { setIsLoading(false); }
    } else {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
      return true;
    }
  };

  const deleteMember = async (id: string) => {
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('deleteMember', { id });
        await refreshData();
        return true;
      } catch (e) { return false; } finally { setIsLoading(false); }
    } else {
      setMembers(prev => prev.filter(m => m.id !== id));
      return true;
    }
  };

  const login = (role: UserRole, memberId?: string) => {
    if (role === UserRole.MEMBER && memberId) {
      const member = members.find(m => m.id === memberId);
      if (member) {
        setCurrentUser({ role, memberId, name: member.name });
        setCurrentView('dashboard');
      }
    } else if (role === UserRole.STAFF) {
      setCurrentUser({ role, name: 'เจ้าหน้าที่ (Admin)' });
      setCurrentView('dashboard');
    }
  };

  const logout = () => { setCurrentUser(null); setCurrentView('dashboard'); };
  const getMember = (id: string) => members.find(m => m.id === id);
  const setView = (view: AppView) => setCurrentView(view);
  const updateConfig = (c: AppConfig) => { setConfig(c); localStorage.setItem('app_config', JSON.stringify(c)); };

  return (
    <StoreContext.Provider value={{ 
      members, ledger, currentUser, currentView, config, isLoading, connectionStatus,
      login, logout, addTransaction, addLedgerItem, deleteLedgerItem, updateLedgerItem,
      getMember, setView, updateConfig, resetConfig, refreshData, addMember, updateMember, deleteMember, initDatabase, testConnection
    }}>
      {children}
      {isLoading && <LoadingOverlay />}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
