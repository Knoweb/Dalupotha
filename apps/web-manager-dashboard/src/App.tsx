import { useState } from 'react'
import DashboardLayout from './components/layout/DashboardLayout'

// Pages
import LoginPage from './pages/Login'
import SuperAdminView from './pages/SuperAdminView'
import DashboardPage from './pages/Dashboard'
import CollectionsPage from './pages/Collections'
import FinancialsPage from './pages/Financials'
import InventoryPage from './pages/Inventory'
import ApprovalsPage from './pages/Approvals'
import TrackingPage from './pages/Tracking'
import CircularsPage from './pages/Circulars'
import ReportsPage from './pages/Reports'
import UsersPage from './pages/Users'
import SettingsPage from './pages/Settings'
import QualityPage from './pages/QualityPage'

export type UserRole = 'manager' | 'super-admin' | 'extension-officer' | 'store-keeper' | 'factory-staff' | 'office-staff';

// Which nav tabs each role can access
export const ROLE_TABS: Record<UserRole, string[]> = {
  'manager':           ['dashboard', 'collections', 'financials', 'inventory', 'approvals', 'tracking', 'circulars', 'reports', 'users', 'settings'],
  'extension-officer': ['dashboard', 'approvals', 'financials', 'collections', 'circulars', 'reports'],
  'office-staff':      ['dashboard', 'collections', 'financials', 'reports'],
  'store-keeper':      ['dashboard', 'inventory', 'approvals'],
  'factory-staff':     ['dashboard', 'quality', 'collections'],
  'super-admin':       [],
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('is_auth') === 'true');
  const [userRole, setUserRole] = useState<UserRole | null>(() => localStorage.getItem('user_role') as UserRole | null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('active_tab') || 'dashboard');
  const [userInfo, setUserInfo] = useState<{ fullName: string; estateName: string; employeeId?: string; role?: string }>(() => ({
    fullName: localStorage.getItem('user_name') || 'Estate Manager',
    estateName: localStorage.getItem('estate_name') || 'Weliwita Estate',
    employeeId: localStorage.getItem('employee_id') || undefined,
    role: localStorage.getItem('user_role') || undefined,
  }));

  const handleLogin = (data: { role: UserRole; fullName: string; estateName: string; employeeId?: string }) => {
    setUserRole(data.role);
    setIsAuthenticated(true);
    setUserInfo({ fullName: data.fullName, estateName: data.estateName, employeeId: data.employeeId, role: data.role });
    localStorage.setItem('is_auth', 'true');
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_name', data.fullName);
    localStorage.setItem('estate_name', data.estateName);
    if (data.employeeId) localStorage.setItem('employee_id', data.employeeId);
    else localStorage.removeItem('employee_id');
    // Land on the first allowed tab for this role
    const firstTab = ROLE_TABS[data.role]?.[0] || 'dashboard';
    setActiveTab(firstTab);
    localStorage.setItem('active_tab', firstTab);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.clear();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('active_tab', tab);
  };

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;
  if (userRole === 'super-admin') return <SuperAdminView onLogout={handleLogout} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <DashboardPage />;
      case 'collections': return <CollectionsPage />;
      case 'financials':  return <FinancialsPage />;
      case 'inventory':   return <InventoryPage />;
      case 'approvals':   return <ApprovalsPage />;
      case 'tracking':    return <TrackingPage />;
      case 'circulars':   return <CircularsPage />;
      case 'reports':     return <ReportsPage />;
      case 'users':       return <UsersPage />;
      case 'quality':     return <QualityPage />;
      case 'settings':    return <SettingsPage />;
      default:            return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      userInfo={userInfo}
      userRole={userRole || 'manager'}
      onLogout={handleLogout}
    >
      <div className="flex flex-col gap-8 h-full">{renderContent()}</div>
    </DashboardLayout>
  );
}
