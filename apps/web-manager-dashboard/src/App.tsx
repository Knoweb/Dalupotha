import { useState } from 'react'
import DashboardLayout from './components/layout/DashboardLayout'

// Portals
import LoginPage from './pages/Login'
import SuperAdminView from './pages/SuperAdminView'

// Manager Portal
import DashboardPage from './portals/manager/Dashboard'
import TrackingPage from './portals/manager/Tracking'
import UsersPage from './portals/manager/Users'
import SettingsPage from './portals/manager/Settings'

// Factory Portal
import QualityPage from './portals/factory/Quality'
import CollectionsPage from './portals/factory/Collections'

// Office Portal
import FinancialsPage from './portals/office/Financials'
import ReportsPage from './portals/office/Reports'

// Store Keeper Portal
import InventoryPage from './portals/store-keeper/Inventory'

// Extension Portal
import ApprovalsPage from './portals/extension/Approvals'
import CircularsPage from './portals/extension/Circulars'
import RoutesPage from './portals/manager/Routes'

export type UserRole = 'manager' | 'super-admin' | 'extension-officer' | 'store-keeper' | 'factory-staff' | 'office-staff';

// Which nav tabs each role can access
export const ROLE_TABS: Record<UserRole, string[]> = {
  'manager':           ['dashboard', 'collections', 'quality', 'financials', 'inventory', 'approvals', 'tracking', 'circulars', 'reports', 'users', 'routes', 'settings'],
  'extension-officer': ['approvals', 'financials', 'collections', 'settings'],
  'office-staff':      ['collections', 'financials', 'reports', 'settings'],
  'store-keeper':      ['inventory', 'approvals', 'settings'],
  'factory-staff':     ['quality', 'collections', 'settings'],
  'super-admin':       [],
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('is_auth') === 'true');
  const [userRole, setUserRole] = useState<UserRole | null>(() => sessionStorage.getItem('user_role') as UserRole | null);
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('active_tab') || 'dashboard');
  const [userInfo, setUserInfo] = useState<{ fullName: string; estateName: string; estateId?: string; employeeId?: string; role?: string }>(() => ({
    fullName: sessionStorage.getItem('user_name') || 'Estate Manager',
    estateName: sessionStorage.getItem('estate_name') || 'Weliwita Estate',
    estateId: sessionStorage.getItem('current_estate_id') || undefined,
    employeeId: sessionStorage.getItem('employee_id') || undefined,
    role: sessionStorage.getItem('user_role') || undefined,
  }));

  const handleLogin = (data: { role: UserRole; fullName: string; estateName: string; estateId?: string; employeeId?: string }) => {
    setUserRole(data.role);
    setIsAuthenticated(true);
    setUserInfo({ fullName: data.fullName, estateName: data.estateName, estateId: data.estateId, employeeId: data.employeeId, role: data.role });
    sessionStorage.setItem('is_auth', 'true');
    sessionStorage.setItem('user_role', data.role);
    sessionStorage.setItem('user_name', data.fullName);
    sessionStorage.setItem('estate_name', data.estateName);
    if (data.estateId) {
      sessionStorage.setItem('current_estate_id', data.estateId);
      sessionStorage.setItem('estate_id', data.estateId);
    }
    if (data.employeeId) sessionStorage.setItem('employee_id', data.employeeId);
    else sessionStorage.removeItem('employee_id');
    // Land on the first allowed tab for this role
    const firstTab = ROLE_TABS[data.role]?.[0] || 'dashboard';
    setActiveTab(firstTab);
    sessionStorage.setItem('active_tab', firstTab);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    sessionStorage.clear();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem('active_tab', tab);
  };

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;
  if (userRole === 'super-admin') return <SuperAdminView onLogout={handleLogout} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <DashboardPage onNavigate={handleTabChange} />;
      case 'collections': return <CollectionsPage />;
      case 'financials':  return <FinancialsPage />;
      case 'inventory':   return <InventoryPage />;
      case 'approvals':   return <ApprovalsPage />;
      case 'tracking':    return <TrackingPage />;
      case 'circulars':   return <CircularsPage />;
      case 'reports':     return <ReportsPage />;
      case 'users':       return <UsersPage />;
      case 'routes':      return <RoutesPage />;
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
