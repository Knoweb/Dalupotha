import { Bell, ChevronRight } from 'lucide-react'

interface HeaderProps {
  activeTab: string;
}

export default function Header({ activeTab }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
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
        
        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">3</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">A. Wickramasinghe</p>
              <p className="text-[10px] text-slate-400">Manager • MG-001</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm border border-green-200 shadow-sm uppercase">
              AW
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function DateFilter({ label, active }: { label: string, active?: boolean }) {
  return (
    <button className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
    }`}>
      {label}
    </button>
  );
}
