import { useState } from 'react'
import { ChevronRight, Bell, Settings, LogOut, User as UserIcon } from 'lucide-react'

interface HeaderProps {
  activeTab: string;
  userInfo: { fullName: string, estateName: string, employeeId?: string };
  onLogout: () => void;
}

export default function Header({ activeTab, userInfo, onLogout }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30 shadow-sm relative">
      <div className="flex items-center gap-2 text-sm">
         <span className="text-slate-400 font-medium">Project Dalupotha</span>
         <ChevronRight size={14} className="text-slate-300" />
         <span className="text-slate-800 font-bold capitalize">{activeTab.replace('-', ' ')}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
           <DateFilter label="Today" active />
           <DateFilter label="Week" />
           <DateFilter label="Month" />
           <DateFilter label="Custom" />
        </div>
        
        <div className="flex items-center gap-4 border-l border-slate-200 pl-6 relative">
          <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">3</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 hover:bg-slate-50 p-1 rounded-xl transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{userInfo.fullName}</p>
                <p className="text-[10px] text-slate-400">
                  Manager{userInfo.employeeId ? ` • ${userInfo.employeeId}` : ''}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md uppercase">
                {userInfo.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                   <div className="px-4 py-3 border-b border-slate-50 mb-1">
                      <p className="text-xs font-bold text-slate-900">{userInfo.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{userInfo.estateName}</p>
                   </div>
                   <DropdownItem icon={<UserIcon size={14}/>} label="My Profile" />
                   <DropdownItem icon={<Settings size={14}/>} label="Account Settings" />
                   <div className="h-px bg-slate-50 my-1" />
                   <button 
                     onClick={onLogout}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-xs font-bold"
                   >
                     <LogOut size={14} />
                     Sign Out
                   </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DateFilter({ label, active }: { label: string, active?: boolean }) {
  return (
    <button className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
      active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'
    }`}>
      {label}
    </button>
  );
}

function DropdownItem({ icon, label }: { icon: any, label: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-all text-xs font-semibold">
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}
