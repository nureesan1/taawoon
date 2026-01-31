
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig, LedgerTransaction, AppView } from '../types';
import { LoadingOverlay } from '../components/LoadingOverlay';

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

const USER_PROVIDED_URL = 'https://script.google.com/macros/s/AKfycbyRSnOD_MgG9t3M05Tj_PhrglNFWHkkndXR8cyOxZciMHVWnJtmzacXNxjHOaPHUYuXHQ/exec';

const DEFAULT_CONFIG: AppConfig = {
  useGoogleSheets: true,
  scriptUrl: USER_PROVIDED_URL
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

  const callApi = async (action: string, payload: any = {}, retries = 1): Promise<any> => {
    let url = config.scriptUrl.trim();
    if (!url) throw new Error("API URL is missing");
    
    try {
      const body = new URLSearchParams();
      body.append('action', action);
      body.append('data', JSON.stringify(payload));
      
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        body: body
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message);
      return data;
    } catch (e: any) {
      if (retries > 0) return callApi(action, payload, retries - 1);
      throw e;
    }
  };

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage("กำลังซิงค์ข้อมูลล่าสุด...");
    try {
      const data = await callApi('getData');
      setMembers(data.members || []);
      setLedger(data.ledger || []);
      setConnectionStatus('connected');
      setErrorMessage(null);
    } catch (error: any) {
      setConnectionStatus('disconnected');
      setErrorMessage(error.message);
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
      setView: setCurrentView, updateConfig, 
      resetConfig: () => { setConfig(DEFAULT_CONFIG); localStorage.removeItem('app_config'); }, 
      refreshData,
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
        try { await callApi('initDatabase'); await refreshData(); alert('เริ่มต้นฐานข้อมูลสำเร็จ'); } 
        catch(e: any) { alert(e.message); } 
        finally { setIsLoading(false); }
      }, 
      testConnection: async () => {
        setIsLoading(true);
        try { await callApi('getData'); return true; } 
        catch (e: any) { return false; } 
        finally { setIsLoading(false); }
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
