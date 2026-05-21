import { useState, lazy, Suspense } from 'react'
import DashboardLayout from './components/layout/DashboardLayout'

// Portals
import LoginPage from './pages/Login'
// Portals
const SuperAdminView = lazy(() => import('./pages/SuperAdminView'));

// Manager Portal
const DashboardPage = lazy(() => import('./portals/manager/Dashboard'));
const TrackingPage = lazy(() => import('./portals/manager/Tracking'));
const UsersPage = lazy(() => import('./portals/manager/Users'));
const SettingsPage = lazy(() => import('./portals/manager/Settings'));

// Factory Portal
const QualityPage = lazy(() => import('./portals/factory/Quality'));
const CollectionsPage = lazy(() => import('./portals/factory/Collections'));

// Office Portal
const FinancialsPage = lazy(() => import('./portals/office/Financials'));
const ReportsPage = lazy(() => import('./portals/office/Reports'));

// Store Keeper Portal
const InventoryPage = lazy(() => import('./portals/store-keeper/Inventory'));

// Extension Portal
const ApprovalsPage = lazy(() => import('./portals/extension/Approvals'));
const CircularsPage = lazy(() => import('./portals/extension/Circulars'));
const RoutesPage = lazy(() => import('./portals/manager/Routes'));

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
  if (userRole === 'super-admin') return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#3d7a2d]"></div>
      </div>
    }>
      <SuperAdminView onLogout={handleLogout} />
    </Suspense>
  );

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
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#3d7a2d]"></div>
        </div>
      }>
        <div className="flex flex-col gap-8 h-full">{renderContent()}</div>
      </Suspense>
    </DashboardLayout>
  );
}
