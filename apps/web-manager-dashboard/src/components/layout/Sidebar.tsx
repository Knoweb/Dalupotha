import {
  LayoutGrid, Leaf, CircleDollarSign, Package, CheckSquare,
  Truck, BookOpen, BarChart3, Users, Settings, LogOut, ChevronLeft, FlaskConical
} from 'lucide-react'
import { ROLE_TABS, UserRole } from '../../App'

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userInfo: { fullName: string; estateName: string; employeeId?: string; role?: string };
  userRole: UserRole;
  onLogout: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  'manager': 'Manager',
  'extension-officer': 'Extension Officer',
  'office-staff': 'Office Staff',
  'store-keeper': 'Store Keeper',
  'factory-staff': 'Factory Staff',
};

const ALL_NAV = [
  { key: 'dashboard',   icon: <LayoutGrid size={18}/>,       label: 'Dashboard' },
  { key: 'collections', icon: <Leaf size={18}/>,             label: 'Collections' },
  { key: 'financials',  icon: <CircleDollarSign size={18}/>, label: 'Financials' },
  { key: 'inventory',   icon: <Package size={18}/>,          label: 'Inventory' },
  { key: 'approvals',   icon: <CheckSquare size={18}/>,      label: 'Requests & Approvals', badge: '18' },
  { key: 'tracking',    icon: <Truck size={18}/>,            label: 'Transport Tracking' },
  { key: 'quality',     icon: <FlaskConical size={18}/>,     label: 'Quality Assessment' },
  { key: 'circulars',   icon: <BookOpen size={18}/>,         label: 'TRI Circulars' },
  { key: 'reports',     icon: <BarChart3 size={18}/>,        label: 'Reports' },
  { key: 'users',       icon: <Users size={18}/>,            label: 'User Management' },
  { key: 'settings',    icon: <Settings size={18}/>,         label: 'Settings' },
];

export default function Sidebar({ activeTab, onTabChange, userInfo, userRole, onLogout }: SidebarProps) {
  const allowedTabs = ROLE_TABS[userRole] || ROLE_TABS['manager'];
  const visibleNav = ALL_NAV.filter(n => allowedTabs.includes(n.key));

  return (
    <aside className="w-[260px] bg-[var(--sidebar-bg)] flex flex-col shadow-xl z-20">
      <div className="p-6 flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-white/10 shadow-lg overflow-hidden group">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover transform transition-transform group-hover:scale-110 duration-500" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight uppercase">{userInfo.estateName}</span>
        </div>
        <button className="text-white/50 hover:text-white bg-black/5 p-1 rounded-md">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Role Badge */}
      <div className="px-6 mb-3">
        <span className="inline-block bg-white/10 text-white/80 text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-full border border-white/10">
          {ROLE_LABELS[userRole] || 'Staff'}
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
        {visibleNav.map(item => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.key}
            onClick={() => onTabChange(item.key)}
            badge={item.key === 'approvals' ? item.badge : undefined}
          />
        ))}
      </nav>

      <div className="p-6 border-t border-white/10 mt-auto">
        <div className="mb-3 px-1">
          <p className="text-white font-bold text-sm truncate">{userInfo.fullName}</p>
          {userInfo.employeeId && <p className="text-white/50 text-[10px] font-mono tracking-wider">{userInfo.employeeId}</p>}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-black/10 rounded-xl transition-all text-sm font-semibold group"
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: any; label: string; active: boolean; onClick: () => void; badge?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border border-transparent ${
        active ? 'bg-white/20 text-white border-white/10 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className={active ? 'text-white' : 'text-white/60'}>{icon}</span>
      <span className="flex-1 text-left font-semibold text-xs tracking-tight">{label}</span>
      {badge && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 uppercase tracking-tighter">{badge}</span>}
    </button>
  );
}
