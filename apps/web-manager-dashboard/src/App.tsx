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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'manager' | 'super-admin' | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (role: 'manager' | 'super-admin') => {
    setUserRole(role);
    setIsAuthenticated(true);
    // Reset tab when switching roles/logging in
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (userRole === 'super-admin') {
    return <SuperAdminView onLogout={handleLogout} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'collections': return <CollectionsPage />;
      case 'financials': return <FinancialsPage />;
      case 'inventory': return <InventoryPage />;
      case 'approvals': return <ApprovalsPage />;
      case 'tracking': return <TrackingPage />;
      case 'circulars': return <CircularsPage />;
      case 'reports': return <ReportsPage />;
      case 'users': return <UsersPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="flex flex-col gap-8 h-full">
         <div className="flex justify-end">
            <button 
              onClick={handleLogout}
              className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Sign Out
            </button>
         </div>
         {renderContent()}
      </div>
    </DashboardLayout>
  );
}
