
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig, LedgerTransaction } from '../types';
import { MOCK_MEMBERS } from '../constants';
import { LoadingOverlay } from '../components/LoadingOverlay';

type AppView = 'dashboard' | 'register_member' | 'member_management' | 'member_profile' | 'settings' | 'record_payment' | 'accounting' | 'payment_history' | 'billing';

interface StoreContextType {
  members: Member[];
  ledger: LedgerTransaction[];
  currentUser: { role: UserRole; memberId?: string; name?: string } | null;
  currentView: AppView;
  config: AppConfig;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  errorMessage: string | null;
  login: (role: UserRole, memberId?: string) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<boolean>;
  deleteTransaction: (id: string, memberId: string) => Promise<boolean>;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    
    // Check if URL is a valid GAS URL
    if (!url.startsWith('https://script.google.com')) {
      throw new Error("URL ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://script.google.com");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const params = new URLSearchParams();
      params.append('action', action);
      params.append('data', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      
      const text = await response.text();
      
      if (text.trim().startsWith('<')) {
        if (text.includes('Google Account')) {
          throw new Error("ถูกบล็อกโดย Google: โปรดตั้งค่า Deployment เป็น 'Anyone'");
        }
        throw new Error("เซิร์ฟเวอร์ตอบกลับเป็น HTML (เป็นไปได้ว่า URL ไม่ถูกต้อง หรือ Script ไม่ได้เผยแพร่แบบสาธารณะ)");
      }

      try {
        const data = JSON.parse(text);
        if (data.status === 'error') throw new Error(data.message);
        return data;
      } catch (parseError) {
        console.error("Parse Error Raw Text:", text);
        throw new Error("ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์ได้ (Invalid JSON)");
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      
      const isNetworkError = e.name === 'AbortError' || e.message.includes('fetch') || e.message.includes('NetworkError') || e.message.includes('Failed to fetch');

      if (retries > 0 && isNetworkError) {
        console.warn(`API Call failed, retrying... (${retries} retries left)`);
        await new Promise(r => setTimeout(r, 2000));
        return callApi(action, payload, retries - 1);
      }

      if (e.name === 'AbortError') throw new Error("การเชื่อมต่อหมดเวลา (Timeout) กรุณาลองใหม่อีกครั้ง");
      if (e.message.includes('Failed to fetch')) throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Failed to fetch) กรุณาตรวจสอบการตั้งค่า CORS หรือ Deployment ใน Google Apps Script");
      
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
    setErrorMessage(null);
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
      setErrorMessage(error.message);
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

  const deleteTransaction = async (id: string, memberId: string) => {
    setIsLoading(true);
    try {
      await callApi('deleteTransaction', { id, memberId });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('ลบรายการไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider value={{
      members, ledger, currentUser, currentView, config, isLoading, connectionStatus, errorMessage,
      login, logout, addTransaction, deleteTransaction, getMember: (id) => members.find(m => m.id === id),
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
        catch (e: any) { setConnectionStatus('disconnected'); setErrorMessage(e.message); return false; }
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
