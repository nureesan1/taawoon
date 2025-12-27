
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Member, Transaction, UserRole, AppConfig } from '../types';
import { MOCK_MEMBERS } from '../constants';
import { LoadingOverlay } from '../components/LoadingOverlay';

type AppView = 'dashboard' | 'register_member' | 'member_management' | 'member_profile' | 'settings' | 'record_payment';

interface StoreContextType {
  members: Member[];
  currentUser: { role: UserRole; memberId?: string; name?: string } | null;
  currentView: AppView;
  config: AppConfig;
  isLoading: boolean;
  login: (role: UserRole, memberId?: string) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<boolean>;
  getMember: (id: string) => Member | undefined;
  addMember: (member: Omit<Member, 'id' | 'transactions'>) => Promise<boolean>;
  updateMember: (id: string, data: Partial<Member>) => Promise<boolean>;
  deleteMember: (id: string) => Promise<boolean>;
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
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; memberId?: string; name?: string } | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('app_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Helper to call GAS API
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
    if (!config.useGoogleSheets || !config.scriptUrl) {
        return;
    }

    setIsLoading(true);
    try {
      const data = await callApi('getData');
      if (data && data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Initial Data Load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const getMember = useCallback((id: string) => {
    return members.find(m => m.id === id);
  }, [members]);

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 6);
  };

  const addTransaction = async (txData: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...txData,
      id: generateId(),
      timestamp: Date.now(),
    };

    const prevMembers = [...members];
    const updateLocal = () => {
        setMembers(currentMembers => currentMembers.map(member => {
            if (member.id !== txData.memberId) return member;

            const newHousingBalance = Math.max(0, member.housingLoanBalance - txData.housing);
            const newLandBalance = Math.max(0, member.landLoanBalance - txData.land);
            const newGeneralBalance = Math.max(0, member.generalLoanBalance - txData.generalLoan);
            
            const newShares = member.accumulatedShares + txData.shares;
            const newSavings = member.savingsBalance + txData.savings;

            return {
                ...member,
                housingLoanBalance: newHousingBalance,
                landLoanBalance: newLandBalance,
                generalLoanBalance: newGeneralBalance,
                accumulatedShares: newShares,
                savingsBalance: newSavings,
                transactions: [newTx, ...member.transactions]
            };
        }));
    };

    updateLocal();

    if (config.useGoogleSheets) {
        setIsLoading(true);
        try {
            await callApi('addTransaction', { transaction: newTx });
            await refreshData();
            return true;
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการบันทึกลง Google Sheets");
            setMembers(prevMembers);
            setIsLoading(false);
            return false;
        }
    }
    return true;
  };

  const addMember = async (memberData: Omit<Member, 'id' | 'transactions'>) => {
    const newMember: Member = {
      ...memberData,
      id: generateId(),
      transactions: []
    };

    if (config.useGoogleSheets) {
        try {
            await callApi('addMember', { member: newMember });
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    } else {
        setMembers(prev => [newMember, ...prev]);
        return true;
    }
  };

  const updateMember = async (id: string, data: Partial<Member>) => {
    const prevMembers = [...members];
    
    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      
      const updated = { ...m, ...data };
      if (data.personalInfo && m.personalInfo) {
        updated.personalInfo = { ...m.personalInfo, ...data.personalInfo };
      }
      return updated;
    }));

    if (currentUser?.memberId === id && data.name) {
      setCurrentUser(prev => prev ? { ...prev, name: data.name } : null);
    }

    if (config.useGoogleSheets) {
        try {
            await callApi('updateMember', { id, data });
            return true;
        } catch (error) {
            console.error(error);
            alert("อัปเดตข้อมูลล้มเหลว");
            setMembers(prevMembers);
            return false;
        }
    }
    return true;
  };

  const deleteMember = async (id: string) => {
    const prevMembers = [...members];
    
    setMembers(prev => prev.filter(m => m.id !== id));

    if (config.useGoogleSheets) {
      setIsLoading(true);
      try {
        await callApi('deleteMember', { id });
        return true;
      } catch (error) {
        console.error(error);
        alert("ลบข้อมูลล้มเหลว");
        setMembers(prevMembers);
        return false;
      } finally {
        setIsLoading(false);
      }
    }
    return true;
  };

  const updateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('app_config', JSON.stringify(newConfig));
  };

  return (
    <StoreContext.Provider value={{ 
      members, 
      currentUser, 
      currentView, 
      config,
      isLoading,
      login, 
      logout, 
      addTransaction, 
      getMember, 
      addMember, 
      updateMember,
      deleteMember,
      setView: setCurrentView,
      updateConfig,
      refreshData
    }}>
      {children}
      {isLoading && <LoadingOverlay />}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
