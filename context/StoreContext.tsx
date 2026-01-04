
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig, LedgerTransaction } from '../types';
import { MOCK_MEMBERS } from '../constants';
import { LoadingOverlay } from '../components/LoadingOverlay';

type AppView = 'dashboard' | 'register_member' | 'member_management' | 'member_profile' | 'settings' | 'record_payment' | 'daily_summary' | 'accounting';

interface StoreContextType {
  members: Member[];
  ledger: LedgerTransaction[];
  currentUser: { role: UserRole; memberId?: string; name?: string } | null;
  currentView: AppView;
  config: AppConfig;
  isLoading: boolean;
  login: (role: UserRole, memberId?: string) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<boolean>;
  addLedgerItem: (item: Omit<LedgerTransaction, 'id' | 'timestamp'>) => Promise<boolean>;
  deleteLedgerItem: (id: string) => Promise<boolean>;
  updateLedgerItem: (id: string, data: Partial<LedgerTransaction>) => Promise<boolean>;
  getMember: (id: string) => Member | undefined;
  setView: (view: AppView) => void;
  updateConfig: (newConfig: AppConfig) => void;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_CONFIG: AppConfig = {
  useGoogleSheets: true,
  scriptUrl: 'https://script.google.com/macros/s/AKfycbzMokV0Pc8OpMXGFuK1ClXKMBsF-rEX3HJ4ycqjLwhZSj1zGW8lunhChvKIuDm2bC-oqA/exec'
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; memberId?: string; name?: string } | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('app_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [isLoading, setIsLoading] = useState(false);

  const callApi = async (action: string, payload: any = {}) => {
    if (!config.scriptUrl) throw new Error("Script URL not configured");
    const response = await fetch(config.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json();
    if (data.status === 'error') throw new Error(data.message);
    return data;
  };

  const refreshData = useCallback(async () => {
    if (!config.useGoogleSheets || !config.scriptUrl) return;
    setIsLoading(true);
    try {
      const data = await callApi('getData');
      if (data) {
        if (data.members) setMembers(data.members);
        if (data.ledger) setLedger(data.ledger.sort((a: any, b: any) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addLedgerItem = async (itemData: Omit<LedgerTransaction, 'id' | 'timestamp'>) => {
    const newItem: LedgerTransaction = {
      ...itemData,
      id: 'L' + Date.now(),
      timestamp: Date.now()
    };
    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('addLedgerItem', { item: newItem });
        await refreshData();
        return true;
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        setIsLoading(false);
      }
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
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        setIsLoading(false);
      }
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
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
        setLedger(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
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
  const addTransaction = async (txData: any) => { /* existing logic */ return true; };
  const setView = (view: AppView) => setCurrentView(view);
  const updateConfig = (c: AppConfig) => { setConfig(c); localStorage.setItem('app_config', JSON.stringify(c)); };

  return (
    <StoreContext.Provider value={{ 
      members, ledger, currentUser, currentView, config, isLoading,
      login, logout, addTransaction, addLedgerItem, deleteLedgerItem, updateLedgerItem,
      getMember, setView, updateConfig, refreshData 
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
