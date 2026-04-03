import { 
  LayoutGrid, Leaf, CircleDollarSign, Package, CheckSquare, 
  Truck, BookOpen, BarChart3, Users, Settings, LogOut, ChevronLeft
} from 'lucide-react'

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-[260px] bg-[var(--sidebar-bg)] flex flex-col shadow-xl z-20">
      <div className="p-6 flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white p-1.5 rounded-lg flex items-center justify-center border border-white/20 shadow-inner overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-black text-white tracking-tight">Dalu Potha</span>
        </div>
        <button className="text-white/50 hover:text-white bg-black/5 p-1 rounded-md">
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
        <NavItem icon={<LayoutGrid size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
        <NavItem icon={<Leaf size={18}/>} label="Collections" active={activeTab === 'collections'} onClick={() => onTabChange('collections')} />
        <NavItem icon={<CircleDollarSign size={18}/>} label="Financials" active={activeTab === 'financials'} onClick={() => onTabChange('financials')} />
        <NavItem icon={<Package size={18}/>} label="Inventory" active={activeTab === 'inventory'} onClick={() => onTabChange('inventory')} />
        <NavItem icon={<CheckSquare size={18}/>} label="Requests & Approvals" badge="18" active={activeTab === 'approvals'} onClick={() => onTabChange('approvals')} />
        <NavItem icon={<Truck size={18}/>} label="Transport Tracking" active={activeTab === 'tracking'} onClick={() => onTabChange('tracking')} />
        <NavItem icon={<BookOpen size={18}/>} label="TRI Circulars" active={activeTab === 'circulars'} onClick={() => onTabChange('circulars')} />
        <NavItem icon={<BarChart3 size={18}/>} label="Reports" active={activeTab === 'reports'} onClick={() => onTabChange('reports')} />
        <NavItem icon={<Users size={18}/>} label="User Management" active={activeTab === 'users'} onClick={() => onTabChange('users')} />
        <NavItem icon={<Settings size={18}/>} label="Settings" active={activeTab === 'settings'} onClick={() => onTabChange('settings')} />
      </nav>

      <div className="p-6 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-black/10">
          <div className="w-8 h-8 rounded-full bg-green-400 border border-white/20" />
          <div className="flex-1 overflow-hidden">
             <p className="text-xs font-bold text-white truncate">Uva Halpewatte</p>
             <p className="text-[10px] text-white/50 truncate">Full Access</p>
          </div>
        </div>
        <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border border-transparent ${
        active 
          ? 'bg-white/20 text-white border-white/10 shadow-sm' 
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className={active ? 'text-white' : 'text-white/60'}>{icon}</span>
      <span className="flex-1 text-left font-bold text-xs tracking-tight">{label}</span>
      {badge && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white/20 uppercase tracking-tighter">{badge}</span>}
    </button>
  );
}
