import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userInfo: { fullName: string, estateName: string, employeeId?: string };
  onLogout: () => void;
}

export default function DashboardLayout({ children, activeTab, onTabChange, userInfo, onLogout }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-[#f1f5f9] text-[#334155] font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} userInfo={userInfo} onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header activeTab={activeTab} userInfo={userInfo} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
