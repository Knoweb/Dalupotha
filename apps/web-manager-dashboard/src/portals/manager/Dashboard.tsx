import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, 
  Users, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle, 
  Package, 
  Clock, 
  MapPin, 
  AlertCircle,
  CheckSquare 
} from "lucide-react";
import { FinanceAPI, CollectionAPI } from "../../services/api";
import { supabase } from "../../services/supabase";

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [stats, setStats] = useState({
    todayWeight: 0,
    suppliersCount: 0,
    pendingSync: 0,
    routeProgress: { current: 0, total: 32 } // Total can be dynamic later
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Pending Approvals
      const reqs = await FinanceAPI.getRequests({ status: 'PENDING' });
      setPendingCount(reqs.length);

      // 2. Fetch Today's Collections
      const history = await CollectionAPI.getRecentCollections();
      const todayStr = new Date().toISOString().split('T')[0];
      
      const todayData = history.filter(c => (c as any).collectedAt?.startsWith(todayStr) || (c as any).timestamp?.startsWith(todayStr));
      const totalWeight = todayData.reduce((sum, c) => sum + (c.netWeight || 0), 0);
      const uniqueSuppliers = new Set(todayData.map(c => c.supplierId)).size;
      const pendingSyncs = todayData.filter(c => c.status === 'PENDING').length;

      setStats(prev => ({
        ...prev,
        todayWeight: totalWeight,
        suppliersCount: uniqueSuppliers,
        pendingSync: pendingSyncs,
        routeProgress: { ...prev.routeProgress, current: uniqueSuppliers }
      }));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    // 1. Regular polling fallback
    const interval = setInterval(fetchDashboardData, 30000);

    // 2. Real-time updates
    const channel = supabase
      .channel('dashboard_updates')
      .on('broadcast', { event: 'new_collection' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Operational Overview</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live System Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard 
            title={`${stats.todayWeight.toFixed(1)} kg`} 
            subtitle="Today's Green Leaf" 
            label={`${stats.suppliersCount} suppliers active`}
            icon={<TrendingUp size={20} className="text-emerald-500" />} 
            color="emerald"
            onClick={() => onNavigate?.('collections')}
          />
          <KPICard 
            title={stats.pendingSync.toString()} 
            subtitle="Pending Sync" 
            label="records in queue"
            icon={<Clock size={20} className="text-amber-500" />} 
            color="amber"
            onClick={() => onNavigate?.('collections')}
          />
          <KPICard 
            title={`${stats.routeProgress.current}/${stats.routeProgress.total}`}
            subtitle="Route Progress" 
            label={`${Math.round((stats.routeProgress.current / stats.routeProgress.total) * 100)}% complete`}
            icon={<MapPin size={20} className="text-sky-500" />} 
            color="sky"
            onClick={() => onNavigate?.('tracking')}
          />
        </div>
      </section>

      {pendingCount > 0 && (
        <section className="animate-in slide-in-from-top-4 duration-500">
          <div 
            onClick={() => onNavigate?.('approvals')}
            className="group cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-orange-200 hover:shadow-md transition-all sm:px-8"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                <CheckSquare size={24} />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">Action Required: {pendingCount} Pending Requests</p>
                <p className="text-xs text-slate-500 font-medium tracking-tight">Advances and Fertilizer orders are waiting for your final approval.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest pl-4">
              <span>Go to Approvals</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-[400px] flex flex-col group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">Yield Analysis</h3>
            <div className="text-[10px] font-bold text-slate-400 border border-slate-100 px-3 py-1 rounded-full group-hover:border-slate-200 transition-colors">LAST 7 DAYS</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl font-medium uppercase tracking-widest text-[10px] gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
               <TrendingUp size={24} />
            </div>
            Generating visualization...
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-[400px] flex flex-col group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">Agent Performance</h3>
            <button className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors tracking-widest">VIEW ALL</button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 styled-scrollbar">
            <PerformanceBar label="Jagath Somapala" value={85} color="bg-emerald-500" detail="1,240 kg collected" />
            <PerformanceBar label="Sunil Perera" value={62} color="bg-emerald-500" detail="980 kg collected" />
            <PerformanceBar label="Nimal Kumara" value={45} color="bg-amber-500" detail="540 kg • 2 pending" />
            <PerformanceBar label="Kamal Silva" value={20} color="bg-slate-200" detail="Awaiting sync" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, subtitle, label, icon, color, onClick }: any) {
  const colors: any = {
    emerald: 'border-emerald-100 group-hover:border-emerald-500 text-emerald-500 bg-emerald-50',
    amber: 'border-amber-100 group-hover:border-amber-500 text-amber-500 bg-amber-50',
    sky: 'border-sky-100 group-hover:border-sky-500 text-sky-500 bg-sky-50'
  };

  return (
    <button 
      onClick={onClick}
      className="group w-full text-left bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{subtitle}</p>
      <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{title}</h3>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-sky-500'}`} />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={24} className="text-slate-200" />
      </div>
    </button>
  );
}

function PerformanceBar({ label, value, color, detail }: any) {
  return (
    <div className="space-y-2 group/bar">
      <div className="flex justify-between items-end">
        <p className="text-xs font-bold text-slate-700 group-hover/bar:text-slate-900 transition-colors uppercase tracking-tight">{label}</p>
        <p className="text-[10px] font-bold text-slate-400 group-hover/bar:text-slate-600 transition-colors">{detail}</p>
      </div>
      <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
}


