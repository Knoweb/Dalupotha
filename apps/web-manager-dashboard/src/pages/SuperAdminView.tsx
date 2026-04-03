import { useState, useEffect } from 'react'
import { Building2, Plus, RefreshCw, LogOut, ShieldCheck } from 'lucide-react'

interface SuperAdminViewProps {
  onLogout: () => void;
}

export default function SuperAdminView({ onLogout }: SuperAdminViewProps) {
  const [estates, setEstates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddEstateModal, setShowAddEstateModal] = useState(false);
  const [estateForm, setEstateForm] = useState({ name: '', code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEstates();
  }, []);

  const fetchEstates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/estates');
      const data = await res.json();
      setEstates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estateForm.name || !estateForm.code) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/estates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estateForm)
      });
      if (res.ok) {
        setShowAddEstateModal(false);
        setEstateForm({ name: '', code: '' });
        fetchEstates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Super Admin Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-12 z-10 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-[#2d6a4f] rounded-xl flex items-center justify-center border border-green-900/10 shadow-lg shadow-green-900/10">
              <ShieldCheck size={20} className="text-white" />
           </div>
           <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-[2px]">Super Admin Console</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">DaluPotha Master Data Control</p>
           </div>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest border-l border-slate-100 pl-8"
        >
          <LogOut size={16} />
          <span>Exit System</span>
        </button>
      </header>

      <main className="flex-1 p-12 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Tea Estate Registry</h2>
            <p className="text-slate-500 font-medium mt-1">Onboard and manage isolated multi-tenant entities</p>
          </div>
          <button 
            onClick={() => setShowAddEstateModal(true)}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-green-900/20 font-black text-xs uppercase tracking-widest"
          >
            <Plus size={18} />
            <span>Onboard New Estate</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {estates.map((est) => (
             <div key={est.estateId} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-green-500/20 transition-all group overflow-hidden relative">
                {/* Status Dot */}
                <div className="absolute top-8 right-8 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500" />
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active</span>
                </div>
                
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 mb-6 group-hover:bg-green-50 group-hover:text-green-600 group-hover:border-green-100 transition-colors">
                   <Building2 size={24} />
                </div>
                
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{est.name}</h3>
                <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-[3px] mt-1 mb-6">{est.code}</p>
                
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Registered</p>
                      <p className="text-xs font-bold text-slate-500">{new Date(est.createdAt).toLocaleDateString()}</p>
                   </div>
                   <button className="text-[10px] font-black text-[#2d6a4f] uppercase tracking-widest hover:text-[#1b4332] bg-green-50 px-4 py-2 rounded-lg border border-green-100">Configure →</button>
                </div>
             </div>
           ))}

           {isLoading && [1,2,3].map(i => (
             <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-64">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 mb-6" />
                <div className="h-6 w-3/4 bg-slate-50 rounded-lg mb-2" />
                <div className="h-4 w-1/4 bg-slate-50 rounded-lg" />
             </div>
           ))}
        </div>
      </main>

      {showAddEstateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">New Tenant Registration</h3>
            <p className="text-slate-500 text-xs font-medium mb-10">Initialize a new isolated division in the system</p>

            <form onSubmit={handleRegisterEstate} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[3px] pl-1">Full Estate Name</label>
                <input 
                  type="text" 
                  value={estateForm.name}
                  onChange={e => setEstateForm({...estateForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-green-500 outline-none text-slate-800 font-bold transition-all placeholder:text-slate-300 text-sm"
                  placeholder="e.g. Riverside Division"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[3px] pl-1">Industrial Code</label>
                <input 
                  type="text" 
                  value={estateForm.code}
                  onChange={e => setEstateForm({...estateForm, code: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-green-500 outline-none text-slate-800 font-mono uppercase font-black transition-all placeholder:text-slate-300 text-sm"
                  placeholder="RSVD-01"
                  required
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddEstateModal(false)}
                  className="flex-1 px-4 py-4 border border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-4 bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/20"
                >
                  {isSubmitting ? 'Onboarding...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
