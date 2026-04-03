import { useState, useEffect } from 'react'
import { Building2, Plus, RefreshCw } from 'lucide-react'

export default function EstatesPage() {
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
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tea Estates / Divisions</h1>
          <p className="text-slate-500 text-sm">Configure multi-tenant isolation master data</p>
        </div>
        <button 
          onClick={() => setShowAddEstateModal(true)}
          className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-900/10 font-bold"
        >
          <Plus size={18} />
          <span>Register Estate</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="px-8 py-5">Estate Name</th>
              <th className="px-8 py-5 text-center">Code</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5">System Date</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {estates.map((est) => (
              <tr key={est.estateId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                       <Building2 size={16} />
                    </div>
                    <span className="font-bold text-slate-700">{est.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">{est.code}</span>
                </td>
                <td className="px-8 py-5">
                  <span className="px-2 py-1 rounded-md text-[10px] bg-green-50 text-green-600 border border-green-200 font-bold uppercase tracking-tighter">Active</span>
                </td>
                <td className="px-8 py-5 text-sm text-slate-400">
                  {new Date(est.createdAt).toLocaleDateString()}
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="text-slate-400 hover:text-slate-800 font-bold text-xs uppercase tracking-widest">Manage</button>
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={5} className="text-center py-20 text-slate-400">
                   <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-20" />
                   <p className="text-xs font-bold italic">Loading Tenant Data...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddEstateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-1">New Tenant Registration</h3>
            <p className="text-slate-500 text-xs mb-8">Initialize a new estate for isolation</p>

            <form onSubmit={handleRegisterEstate} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-2">Full Estate Name</label>
                <input 
                  type="text" 
                  value={estateForm.name}
                  onChange={e => setEstateForm({...estateForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-800 font-medium"
                  placeholder="e.g. Riverside Division"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-2">Industrial Code</label>
                <input 
                  type="text" 
                  value={estateForm.code}
                  onChange={e => setEstateForm({...estateForm, code: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-green-500 outline-none text-slate-800 font-mono uppercase font-bold"
                  placeholder="RSVD-01"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddEstateModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm tracking-tight hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-xl transition-all font-bold text-sm tracking-tight shadow-lg shadow-green-900/20"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
