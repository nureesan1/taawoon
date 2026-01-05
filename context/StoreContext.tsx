
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

// ตั้งค่า URL ที่ผู้ใช้แจ้งมาเป็นค่าเริ่มต้น
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
    // ถ้าไม่มีค่าใน localStorage หรือค่าเดิมว่าง ให้ใช้ค่าเริ่มต้นที่มี URL ใหม่
    if (!saved) return DEFAULT_CONFIG;
    const parsed = JSON.parse(saved);
    if (!parsed.scriptUrl || parsed.scriptUrl === '') return DEFAULT_CONFIG;
    return parsed;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const callApi = async (action: string, payload: any = {}) => {
    const url = config.scriptUrl.trim();
    if (!url) throw new Error("กรุณาระบุ URL ของ Google Apps Script");

    try {
      const params = new URLSearchParams();
      params.append('action', action);
      params.append('data', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        mode: 'cors',
        redirect: 'follow',
        body: params.toString()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: โปรดตรวจสอบความถูกต้องของ URL`);
      }
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.status === 'error') throw new Error(data.message);
        return data;
      } catch (e) {
        throw new Error("รูปแบบข้อมูลที่ตอบกลับไม่ถูกต้อง: " + text.substring(0, 100));
      }
    } catch (e: any) {
      console.error("API Error:", e);
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
      throw new Error("Failed");
    } catch (e) {
      setConnectionStatus('disconnected');
      return false;
    }
  };

  const refreshData = useCallback(async () => {
    if (!config.useGoogleSheets || !config.scriptUrl) {
      if (members.length === 0) setMembers(MOCK_MEMBERS);
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
      }
    } catch (error: any) {
      setConnectionStatus('disconnected');
      if (members.length === 0) setMembers(MOCK_MEMBERS);
    } finally {
      setIsLoading(false);
    }
  }, [config, members.length]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const initDatabase = async () => {
    setIsLoading(true);
    try {
      await callApi('initDatabase');
      alert('สร้างหัวตารางใน Google Sheet สำเร็จ!');
      await refreshData();
    } catch (e: any) {
      alert('ข้อผิดพลาด: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (role: UserRole, memberId?: string) => {
    if (role === UserRole.STAFF) {
      setCurrentUser({ role, name: 'ผู้ดูแลระบบ' });
      setCurrentView('dashboard');
    } else if (memberId) {
      const member = members.find(m => m.id === memberId);
      setCurrentUser({ role, memberId, name: member?.name });
      setCurrentView('dashboard');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const id = 'T' + timestamp;
      await callApi('addTransaction', { transaction: { ...tx, id, timestamp } });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addLedgerItem = async (item: Omit<LedgerTransaction, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const id = 'L' + timestamp;
      await callApi('addLedgerItem', { item: { ...item, id, timestamp } });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
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
      alert('ลบไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLedgerItem = async (id: string, data: Partial<LedgerTransaction>) => {
    setIsLoading(true);
    try {
      await callApi('updateLedgerItem', { id, data });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('อัปเดตไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (member: Omit<Member, 'transactions'>) => {
    setIsLoading(true);
    try {
      await callApi('addMember', { member });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('เพิ่มสมาชิกไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMember = async (id: string, data: Partial<Member>) => {
    setIsLoading(true);
    try {
      await callApi('updateMember', { id, data });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('อัปเดตไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMember = async (id: string) => {
    setIsLoading(true);
    try {
      await callApi('deleteMember', { id });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('ลบไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getMember = (id: string) => members.find(m => m.id === id);

  const updateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('app_config', JSON.stringify(newConfig));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('app_config');
  };

  return (
    <StoreContext.Provider value={{
      members, ledger, currentUser, currentView, config, isLoading, connectionStatus,
      login, logout, addTransaction, addLedgerItem, deleteLedgerItem, updateLedgerItem,
      getMember, setView: setCurrentView, updateConfig, resetConfig, refreshData,
      addMember, updateMember, deleteMember, initDatabase, testConnection
    }}>
      {isLoading && <LoadingOverlay />}
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within StoreProvider');
  return context;
};
