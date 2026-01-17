
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig, LedgerTransaction } from '../types';
import { LoadingOverlay } from '../components/LoadingOverlay';

type AppView = 'dashboard' | 'register_member' | 'member_management' | 'member_profile' | 'settings' | 'record_payment' | 'accounting' | 'payment_history' | 'billing';

interface StoreContextType {
  members: Member[];
  ledger: LedgerTransaction[];
  currentUser: { role: UserRole; memberId?: string; name?: string } | null;
  currentView: AppView;
  config: AppConfig;
  isLoading: boolean;
  loadingMessage?: string;
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
  scriptUrl: 'https://script.google.com/macros/s/AKfycbwfuHhUaAbJjSXQSWcIqwTy5y3FtFZfK2XKwnGLNx4Fy-rqYA5ecSQPXPnEkg3SDdp7sA/exec' 
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
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const callApi = async (action: string, payload: any = {}, retries = 2): Promise<any> => {
    const url = config.scriptUrl.trim();
    if (!url) throw new Error("ยังไม่ได้ระบุ Web App URL ในหน้าตั้งค่า");
    
    // สำหรับการอ่านข้อมูล ใช้ GET เพื่อลดปัญหา CORS
    const isReadAction = action === 'getData' || action === 'ping';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      let response;
      if (isReadAction) {
        const getUrl = new URL(url);
        getUrl.searchParams.append('action', action);
        getUrl.searchParams.append('data', JSON.stringify(payload));
        
        response = await fetch(getUrl.toString(), {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal
        });
      } else {
        // สำหรับการเขียนข้อมูล ใช้ POST แบบ Form-Encoded ซึ่งเสถียรที่สุดสำหรับ GAS
        const body = new URLSearchParams();
        body.append('action', action);
        body.append('data', JSON.stringify(payload));

        response = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body,
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.status === 'error') throw new Error(data.message);
        return data;
      } catch (e) {
        if (text.includes('Google Account')) throw new Error("กรุณาตั้งค่า Deployment เป็น 'Anyone'");
        throw new Error("เซิร์ฟเวอร์ส่งข้อมูลกลับไม่ถูกต้อง (ตรวจสอบ URL)");
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (retries > 0 && (e.name === 'AbortError' || e.message.includes('failed'))) {
        await new Promise(r => setTimeout(r, 1000));
        return callApi(action, payload, retries - 1);
      }
      throw e;
    }
  };

  const refreshData = useCallback(async () => {
    if (!config.scriptUrl.trim()) {
      setConnectionStatus('disconnected');
      return;
    }
    setIsLoading(true);
    setLoadingMessage("กำลังโหลดข้อมูล...");
    setErrorMessage(null);
    try {
      const data = await callApi('getData');
      if (data.status === 'success') {
        setMembers(data.members || []);
        setLedger(data.ledger || []);
        setConnectionStatus('connected');
      }
    } catch (error: any) {
      setConnectionStatus('disconnected');
      setErrorMessage(error.message);
      setMembers([]);
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }
  }, [config.scriptUrl]);

  useEffect(() => { refreshData(); }, [refreshData]);

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

  return (
    <StoreContext.Provider value={{
      members, ledger, currentUser, currentView, config, isLoading, loadingMessage, connectionStatus, errorMessage,
      login, logout, 
      addTransaction: async (tx) => {
        setIsLoading(true);
        try {
          await callApi('addTransaction', { transaction: { ...tx, id: 'T'+Date.now(), timestamp: Date.now() } });
          await refreshData();
          return true;
        } catch (e: any) { alert(e.message); return false; }
        finally { setIsLoading(false); }
      },
      deleteTransaction: async (id, mId) => {
        setIsLoading(true);
        try {
          await callApi('deleteTransaction', { id, memberId: mId });
          await refreshData();
          return true;
        } catch (e: any) { alert(e.message); return false; }
        finally { setIsLoading(false); }
      },
      getMember: (id) => members.find(m => m.id === id),
      setView: setCurrentView, updateConfig, resetConfig: () => { setConfig(DEFAULT_CONFIG); localStorage.removeItem('app_config'); }, refreshData,
      addMember: async (m) => { 
        setIsLoading(true);
        try { await callApi('addMember', { member: m }); await refreshData(); return true; } 
        catch(e: any) { alert(e.message); return false; } 
        finally { setIsLoading(false); }
      },
      updateMember: async (id, d) => { 
        setIsLoading(true);
        try { await callApi('updateMember', { id, data: d }); await refreshData(); return true; } 
        catch(e: any) { alert(e.message); return false; } 
        finally { setIsLoading(false); }
      },
      deleteMember: async (id) => { 
        setIsLoading(true);
        try { await callApi('deleteMember', { id }); await refreshData(); return true; } 
        catch(e: any) { alert(e.message); return false; } 
        finally { setIsLoading(false); }
      },
      addLedgerItem: async (item) => {
        setIsLoading(true);
        try {
          await callApi('addLedgerItem', { item: { ...item, id: 'L' + Date.now(), timestamp: Date.now() } });
          await refreshData();
          return true;
        } catch (e: any) { alert(e.message); return false; }
        finally { setIsLoading(false); }
      },
      deleteLedgerItem: async (id) => {
        setIsLoading(true);
        try {
          await callApi('deleteLedgerItem', { id });
          await refreshData();
          return true;
        } catch (e: any) { alert(e.message); return false; }
        finally { setIsLoading(false); }
      },
      updateLedgerItem: async () => true,
      initDatabase: async () => { 
        setIsLoading(true); 
        try { await callApi('initDatabase'); alert('ตั้งค่าหัวตารางสำเร็จ'); await refreshData(); } 
        catch (e: any) { alert(e.message); } 
        finally { setIsLoading(false); } 
      }, 
      testConnection: async () => {
        setIsLoading(true);
        try { 
          await callApi('ping'); 
          setConnectionStatus('connected'); 
          setErrorMessage(null);
          return true; 
        } catch (e: any) { 
          setConnectionStatus('disconnected'); 
          setErrorMessage(e.message); 
          return false; 
        } finally { setIsLoading(false); }
      }
    }}>
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore error');
  return context;
};
