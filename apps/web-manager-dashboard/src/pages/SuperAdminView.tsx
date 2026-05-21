import { useState, useEffect } from 'react'
import {
  Building2, Plus, RefreshCw, LogOut, ShieldCheck, Power, PowerOff,
  Eye, X, MapPin, Phone, Calendar, Hash, ChevronRight, Search,
  CheckCircle2, XCircle, ArrowLeft, ArrowRight, Lock, User, EyeOff
} from 'lucide-react'

interface Estate {
  estateId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
}

interface SuperAdminViewProps {
  onLogout: () => void;
}

export default function SuperAdminView({ onLogout }: SuperAdminViewProps) {
  const [estates, setEstates] = useState<Estate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Registration form (mirrors Login.tsx)
  const [regStep, setRegStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [estateForm, setEstateForm] = useState({
    name: '', code: '', address: '', phone: '', managerName: '', adminEmail: '', adminPassword: ''
  });

  useEffect(() => { fetchEstates(); }, []);

  const fetchEstates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/estates');
      const data = await res.json();
      setEstates(Array.isArray(data) ? data : []);
    } catch { setEstates([]); }
    finally { setIsLoading(false); }
  };

  const flash = (text: string, ok: boolean) => {
    setStatusMsg({ text, ok });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const toggleStatus = async (estate: Estate) => {
    setTogglingId(estate.estateId);
    try {
      const res = await fetch(`/api/auth/estates/${estate.estateId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !estate.isActive })
      });
      if (res.ok) {
        setEstates(prev => prev.map(e => e.estateId === estate.estateId ? { ...e, isActive: !e.isActive } : e));
        if (selectedEstate?.estateId === estate.estateId)
          setSelectedEstate(s => s ? { ...s, isActive: !s.isActive } : s);
        flash(`${estate.name} ${!estate.isActive ? 'activated' : 'deactivated'} successfully.`, true);
      } else { flash('Failed to update status.', false); }
    } catch { flash('Network error.', false); }
    finally { setTogglingId(null); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estateForm.adminPassword !== confirmPassword) { flash('Passwords do not match.', false); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/estates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estateForm)
      });
      if (res.ok) {
        setShowAddModal(false);
        setRegStep(1);
        setEstateForm({ name: '', code: '', address: '', phone: '', managerName: '', adminEmail: '', adminPassword: '' });
        setConfirmPassword('');
        flash('Estate onboarded successfully!', true);
        fetchEstates();
      } else { flash('Registration failed. Check your input.', false); }
    } catch { flash('Network error.', false); }
    finally { setIsSubmitting(false); }
  };

  const filtered = estates.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const active = estates.filter(e => e.isActive).length;
  const inactive = estates.length - active;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-green-950 flex flex-col font-sans">

      {/* Toast */}
      {statusMsg && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md text-sm font-bold transition-all
          ${statusMsg.ok ? 'bg-green-950/90 border-green-700/50 text-green-300' : 'bg-red-950/90 border-red-700/50 text-red-300'}`}>
          {statusMsg.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/40">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white uppercase tracking-[3px]">Super Admin</h1>
            <p className="text-[9px] font-bold text-green-400/60 uppercase tracking-widest">Dalupotha Control Center</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-green-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />{active} Active
            </span>
            <span className="text-slate-500">·</span>
            <span className="flex items-center gap-1.5 text-slate-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-slate-600" />{inactive} Inactive
            </span>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-all text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-red-500/30 px-4 py-2 rounded-xl">
            <LogOut size={13} />Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">

        {/* Page Title + Actions */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Estate Registry</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">{estates.length} registered estates in the Dalupotha network</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search estates..."
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-green-500/50 focus:bg-white/8 transition-all w-52"
              />
            </div>
            <button onClick={fetchEstates}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all">
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { setShowAddModal(true); setRegStep(1); }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-900/30">
              <Plus size={15} />Onboard Estate
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Estates', value: estates.length, color: 'text-white' },
            { label: 'Active Estates', value: active, color: 'text-green-400' },
            { label: 'Inactive Estates', value: inactive, color: 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/3 border border-white/5 rounded-2xl px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
              <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Estate Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/3 border border-white/5 rounded-2xl p-6 animate-pulse h-52" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <Building2 size={40} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold text-sm">{search ? 'No estates match your search.' : 'No estates registered yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(estate => (
              <div key={estate.estateId}
                className={`group relative bg-white/3 border rounded-2xl p-6 transition-all hover:bg-white/5 cursor-default
                  ${estate.isActive ? 'border-green-500/10 hover:border-green-500/25' : 'border-white/5 opacity-60 hover:opacity-80'}`}>

                {/* Status badge */}
                <div className={`absolute top-5 right-5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                  ${estate.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-700/30 text-slate-500 border border-slate-700/30'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${estate.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                  {estate.isActive ? 'Active' : 'Inactive'}
                </div>

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border
                  ${estate.isActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-slate-700/20 border-slate-700/20 text-slate-500'}`}>
                  <Building2 size={22} />
                </div>

                <h3 className="text-base font-black text-white tracking-tight pr-20">{estate.name}</h3>
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[3px] mt-0.5">{estate.code}</p>

                {estate.address && (
                  <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5 line-clamp-1">
                    <MapPin size={11} className="mt-0.5 shrink-0" />{estate.address}
                  </p>
                )}
                {estate.phone && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Phone size={11} className="shrink-0" />{estate.phone}
                  </p>
                )}
                {estate.createdAt && (
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <Calendar size={11} className="shrink-0" />
                    {new Date(estate.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2">
                  <button onClick={() => setSelectedEstate(estate)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                    <Eye size={12} />Details
                  </button>
                  <button
                    onClick={() => toggleStatus(estate)}
                    disabled={togglingId === estate.estateId}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all
                      ${estate.isActive
                        ? 'text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500/20 border-red-500/20'
                        : 'text-green-400 hover:text-white bg-green-500/5 hover:bg-green-500/20 border-green-500/20'}`}>
                    {togglingId === estate.estateId
                      ? <RefreshCw size={12} className="animate-spin" />
                      : estate.isActive ? <><PowerOff size={12} />Deactivate</> : <><Power size={12} />Activate</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Estate Detail Modal */}
      {selectedEstate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3
                    ${selectedEstate.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-700/30 text-slate-500 border border-slate-700/30'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedEstate.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                    {selectedEstate.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <h3 className="text-xl font-black text-white">{selectedEstate.name}</h3>
                </div>
                <button onClick={() => setSelectedEstate(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Hash, label: 'Estate Code', value: selectedEstate.code },
                  { icon: MapPin, label: 'Address', value: selectedEstate.address || '—' },
                  { icon: Phone, label: 'Phone', value: selectedEstate.phone || '—' },
                  { icon: Calendar, label: 'Registered', value: selectedEstate.createdAt ? new Date(selectedEstate.createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <row.icon size={14} className="text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{row.label}</p>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { toggleStatus(selectedEstate); }}
                disabled={togglingId === selectedEstate.estateId}
                className={`mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all
                  ${selectedEstate.isActive
                    ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 hover:text-white'
                    : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400 hover:text-white'}`}>
                {togglingId === selectedEstate.estateId
                  ? <RefreshCw size={14} className="animate-spin" />
                  : selectedEstate.isActive
                    ? <><PowerOff size={14} />Deactivate Estate</>
                    : <><Power size={14} />Activate Estate</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Estate Modal — same flow as Login registration */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Onboard New Estate</h3>
                <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest mt-0.5">Phase {regStep} of 2</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-1 rounded-full transition-all ${regStep >= 1 ? 'bg-green-500' : 'bg-white/10'}`} />
                <div className={`w-8 h-1 rounded-full transition-all ${regStep >= 2 ? 'bg-green-500' : 'bg-white/10'}`} />
                <button onClick={() => { setShowAddModal(false); setRegStep(1); }}
                  className="ml-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                  <X size={15} />
                </button>
              </div>
            </div>

            <form onSubmit={handleRegister} className="p-8">
              {regStep === 1 ? (
                <div className="space-y-5">
                  {[
                    { label: '1. Estate Name', key: 'name', placeholder: 'e.g. Riverside Highlands', type: 'text' },
                    { label: '2. Estate Code', key: 'code', placeholder: 'e.g. RIV-01', type: 'text' },
                    { label: '3. Manager Full Name', key: 'managerName', placeholder: 'A. Wickramasinghe', type: 'text' },
                    { label: '4. Contact Phone', key: 'phone', placeholder: '+94 77 XXX XXXX', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder}
                        value={(estateForm as any)[f.key]}
                        onChange={e => setEstateForm({ ...estateForm, [f.key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-green-500/50 transition-all"
                        required />
                    </div>
                  ))}
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">5. Physical Address</label>
                    <textarea placeholder="Location details"
                      value={estateForm.address}
                      onChange={e => setEstateForm({ ...estateForm, address: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-green-500/50 transition-all resize-none min-h-[70px]"
                      required />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="button"
                      onClick={() => setRegStep(2)}
                      disabled={!estateForm.name || !estateForm.code || !estateForm.managerName}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                      Next <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">6. Master Admin Email</label>
                    <input type="email" placeholder="manager@estate.com"
                      value={estateForm.adminEmail}
                      onChange={e => setEstateForm({ ...estateForm, adminEmail: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-green-500/50 transition-all"
                      required />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">7. Administrator Password</label>
                    <div className="relative">
                      <input type={showAdminPw ? 'text' : 'password'} placeholder="••••••••"
                        value={estateForm.adminPassword}
                        onChange={e => setEstateForm({ ...estateForm, adminPassword: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-slate-600 outline-none focus:border-green-500/50 transition-all"
                        required />
                      <button type="button" onClick={() => setShowAdminPw(!showAdminPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showAdminPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">8. Confirm Password</label>
                    <div className="relative">
                      <input type={showConfirmPw ? 'text' : 'password'} placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-slate-600 outline-none focus:border-green-500/50 transition-all
                          ${confirmPassword && estateForm.adminPassword !== confirmPassword ? 'border-red-500/50' : 'border-white/10'}`}
                        required />
                      <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button type="button" onClick={() => setRegStep(1)}
                      className="flex items-center gap-2 px-5 py-3 border border-white/10 rounded-xl text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all">
                      <ArrowLeft size={13} />Back
                    </button>
                    <button type="submit" disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-900/30">
                      {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      {isSubmitting ? 'Onboarding...' : 'Confirm & Register'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
