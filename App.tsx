
import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { MemberDashboard } from './pages/MemberDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { RegisterMember } from './pages/RegisterMember';
import { MemberProfile } from './pages/MemberProfile';
import { RecordPayment } from './pages/RecordPayment';
import { Settings } from './pages/Settings';
import { MemberManagement } from './pages/MemberManagement';
import { DailySummary } from './pages/DailySummary';
import { FinancialTracker } from './pages/FinancialTracker';
import { PaymentHistory } from './pages/PaymentHistory';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { currentUser, currentView } = useStore();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout>
      {/* Member Views */}
      {currentUser.role === UserRole.MEMBER && currentView === 'dashboard' && <MemberDashboard />}
      {currentUser.role === UserRole.MEMBER && currentView === 'member_profile' && <MemberProfile />}
      {currentUser.role === UserRole.MEMBER && currentView === 'payment_history' && <PaymentHistory />}
      
      {/* Staff Views */}
      {currentUser.role === UserRole.STAFF && currentView === 'dashboard' && <StaffDashboard />}
      {currentUser.role === UserRole.STAFF && currentView === 'payment_history' && <PaymentHistory />}
      {currentUser.role === UserRole.STAFF && currentView === 'register_member' && <RegisterMember />}
      {currentUser.role === UserRole.STAFF && currentView === 'record_payment' && <RecordPayment />}
      {currentUser.role === UserRole.STAFF && currentView === 'accounting' && <FinancialTracker />}
      {currentUser.role === UserRole.STAFF && currentView === 'settings' && <Settings />}
      {currentUser.role === UserRole.STAFF && currentView === 'member_management' && <MemberManagement />}
      {currentUser.role === UserRole.STAFF && currentView === 'daily_summary' && <DailySummary />}
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
