
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
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const callApi = async (action: string, payload: any = {}, retries = 3): Promise<any> => {
    const url = config.scriptUrl.trim();
    if (!url) throw new Error("กรุณาระบุ URL ในหน้าตั้งค่า");
    
    if (!url.startsWith('https://script.google.com')) {
      throw new Error("URL ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://script.google.com");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      if (retries < 3) {
        setLoadingMessage(`กำลังลองใหม่... (${3 - retries}/3)`);
      }

      const params = new URLSearchParams();
      params.append('action', action);
      params.append('data', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow', // Critical for GAS
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      
      const text = await response.text();
      
      // If response is HTML, it's usually a Google Login page (Deployment not set to "Anyone")
      if (text.trim().startsWith('<')) {
        if (text.includes('Google Account')) {
          throw new Error("การเข้าถึงถูกปฏิเสธ: โปรดตั้งค่า Deployment เป็น 'Anyone' (ทุกคน)");
        }
        throw new Error("การตอบกลับไม่ถูกต้อง: เซิร์ฟเวอร์ส่ง HTML แทน JSON (ตรวจสอบความถูกต้องของ URL)");
      }

      try {
        const data = JSON.parse(text);
        if (data.status === 'error') throw new Error(data.message);
        return data;
      } catch (parseError) {
        console.error("Parse Error Raw Text:", text);
        throw new Error("ไม่สามารถประมวลผลข้อมูล JSON ได้");
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      
      const isNetworkError = 
        e.name === 'AbortError' || 
        e.message.toLowerCase().includes('fetch') || 
        e.message.toLowerCase().includes('load failed') || 
        e.message.toLowerCase().includes('networkerror');

      if (retries > 0 && isNetworkError) {
        const backoff = (4 - retries) * 1000;
        await new Promise(r => setTimeout(r, backoff));
        return callApi(action, payload, retries - 1);
      }

      if (e.name === 'AbortError') throw new Error("การเชื่อมต่อหมดเวลา (Timeout) กรุณาตรวจสอบอินเทอร์เน็ต");
      
      if (e.message.toLowerCase().includes('load failed') || e.message.toLowerCase().includes('failed to fetch')) {
        throw new Error("การเชื่อมต่อล้มเหลว (Load failed): โปรดตรวจสอบว่า URL ถูกต้องและ Google Apps Script ถูกตั้งค่าเป็น Public (Anyone)");
      }
      
      throw e;
    }
  };

  const refreshData = useCallback(async () => {
    if (!config.useGoogleSheets || !config.scriptUrl || config.scriptUrl.includes('YOUR_URL_HERE')) {
      setMembers(MOCK_MEMBERS);
      setLedger([]); 
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
      console.error("Refresh Data Failed:", error);
      setConnectionStatus('disconnected');
      setErrorMessage(error.message);
      // Fallback to mock if empty
      if (members.length === 0) setMembers(MOCK_MEMBERS);
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }
  }, [config, members.length]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const addLedgerItem = async (item: Omit<LedgerTransaction, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    setLoadingMessage("กำลังบันทึกรายการบัญชี...");
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
      setLoadingMessage(undefined);
    }
  };

  const deleteLedgerItem = async (id: string) => {
    setIsLoading(true);
    setLoadingMessage("กำลังลบรายการ...");
    try {
      await callApi('deleteLedgerItem', { id });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('ลบรายการไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
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
    setLoadingMessage("กำลังบันทึกการชำระเงิน...");
    try {
      await callApi('addTransaction', { transaction: { ...tx, id: 'T'+Date.now(), timestamp: Date.now() } });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }
  };

  const deleteTransaction = async (id: string, memberId: string) => {
    setIsLoading(true);
    setLoadingMessage("กำลังลบรายการและคืนยอดหนี้...");
    try {
      await callApi('deleteTransaction', { id, memberId });
      await refreshData();
      return true;
    } catch (e: any) {
      alert('ลบรายการไม่สำเร็จ: ' + e.message);
      return false;
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }
  };

  return (
    <StoreContext.Provider value={{
      members, ledger, currentUser, currentView, config, isLoading, loadingMessage, connectionStatus, errorMessage,
      login, logout, addTransaction, deleteTransaction, getMember: (id) => members.find(m => m.id === id),
      setView: setCurrentView, updateConfig, resetConfig, refreshData,
      addMember: async (m) => { 
        setIsLoading(true);
        setLoadingMessage("กำลังบันทึกข้อมูลสมาชิก...");
        try {
          await callApi('addMember', { member: m }); 
          refreshData(); 
          return true; 
        } catch(e: any) {
          alert('ไม่สามารถเพิ่มสมาชิกได้: ' + e.message);
          return false;
        } finally {
          setIsLoading(false);
          setLoadingMessage(undefined);
        }
      },
      updateMember: async (id, d) => { 
        setIsLoading(true);
        try {
          await callApi('updateMember', { id, data: d }); 
          refreshData(); 
          return true; 
        } catch(e: any) {
          alert('ไม่สามารถอัปเดตสมาชิกได้: ' + e.message);
          return false;
        } finally {
          setIsLoading(false);
        }
      },
      deleteMember: async (id) => { 
        setIsLoading(true);
        try {
          await callApi('deleteMember', { id }); 
          refreshData(); 
          return true; 
        } catch(e: any) {
          alert('ไม่สามารถลบสมาชิกได้: ' + e.message);
          return false;
        } finally {
          setIsLoading(false);
        }
      },
      addLedgerItem, deleteLedgerItem, updateLedgerItem: async (id, d) => true,
      initDatabase: async () => { 
        setIsLoading(true); 
        setLoadingMessage("กำลังตั้งค่าฐานข้อมูล...");
        try { await callApi('initDatabase'); alert('เริ่มต้นฐานข้อมูลสำเร็จ'); refreshData(); } 
        catch (e: any) { alert(e.message); } 
        finally { setIsLoading(false); setLoadingMessage(undefined); } 
      }, 
      testConnection: async () => {
        setIsLoading(true);
        setLoadingMessage("กำลังทดสอบการเชื่อมต่อ...");
        try { 
          await callApi('ping'); 
          setConnectionStatus('connected'); 
          setErrorMessage(null);
          return true; 
        } 
        catch (e: any) { 
          setConnectionStatus('disconnected'); 
          setErrorMessage(e.message); 
          return false; 
        } finally {
          setIsLoading(false);
          setLoadingMessage(undefined);
        }
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
