import { Edit2, Shield, Globe, Leaf, CheckCircle, AlertCircle, Loader, X, AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'
import { useState, useEffect, useRef } from 'react'

export default function SettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const userRole = sessionStorage.getItem('user_role');
  const isManager = userRole === 'manager';
  const estateName = sessionStorage.getItem('estate_name') || 'Estate';

  // ── Leaf Price State ──────────────────────────────────────────────
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceStatus, setPriceStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [priceError, setPriceError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Advance Limit State ───────────────────────────────────────────
  const [advanceLimit, setAdvanceLimit] = useState<number | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [limitLoading, setLimitLoading] = useState(true);
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitStatus, setLimitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [limitError, setLimitError] = useState('');
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [showLimitConfirm, setShowLimitConfirm] = useState(false);
  const limitInputRef = useRef<HTMLInputElement>(null);
  const [isEditingEstate, setIsEditingEstate] = useState(false);
  const [newEstateName, setNewEstateName] = useState(estateName);

  // ── Profile & Estate Detailed State ──────────────────────────────
  const [profile, setProfile] = useState({ 
    name: sessionStorage.getItem('user_name') || '', 
    email: '', 
    contact: '', 
    password: '' 
  });
  const [estateInfo, setEstateInfo] = useState({ id: '', name: estateName, phone: '', address: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [estateSaving, setEstateSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isManager) return;
    fetch('/api/finance/leaf-price')
      .then(r => r.json())
      .then(d => {
        setCurrentPrice(Number(d.pricePerKg));
        setEffectiveDate(d.effectiveDate ?? null);
      })
      .catch(() => setCurrentPrice(240))
      .finally(() => setPriceLoading(false));

    fetch('/api/finance/advance-limit')
      .then(r => r.json())
      .then(d => setAdvanceLimit(Number(d.advanceLimit)))
      .catch(() => setAdvanceLimit(25000))
      .finally(() => setLimitLoading(false));

    const userId = sessionStorage.getItem('current_user_id');
    const storedEstateId = sessionStorage.getItem('current_estate_id');

    const fetchEstate = (eId: string) => {
      fetch(`/api/auth/estates/${eId}`)
        .then(res => res.json())
        .then(estate => {
          setEstateInfo({
            id: estate.estateId || estate.id,
            name: estate.name || estateName,
            phone: estate.phone || '',
            address: estate.address || ''
          });
        })
        .catch(err => console.error('Estate fetch error:', err));
    };

    if (userId) {
      setProfileLoading(true);
      fetch(`/api/auth/users/${userId}/detailed`)
        .then(r => r.json())
        .then(d => {
           setProfile({
              name: d.name || '',
              email: d.email || '',
              contact: d.contact || '',
              password: ''
           });
           
           const eId = d.estateId || storedEstateId;
           if (eId) {
             sessionStorage.setItem('current_estate_id', eId);
             fetchEstate(eId);
           }
        })
        .catch(err => {
          console.error('User fetch error:', err);
          if (storedEstateId) fetchEstate(storedEstateId);
        })
        .finally(() => setProfileLoading(false));
    } else if (storedEstateId) {
      fetchEstate(storedEstateId);
      setProfileLoading(false);
    } else {
      setProfileLoading(false);
    }
  }, [isManager, estateName]);

  // ── Advance limit handlers ────────────────────────────────────────
  const startEditingLimit = () => {
    setNewLimit(advanceLimit?.toFixed(2) ?? '');
    setIsEditingLimit(true);
    setLimitStatus('idle');
    setTimeout(() => limitInputRef.current?.select(), 50);
  };
  const cancelEditingLimit = () => { setIsEditingLimit(false); setNewLimit(''); setLimitStatus('idle'); setLimitError(''); };
  const requestSaveLimit = () => {
    const val = parseFloat(newLimit);
    if (!newLimit || isNaN(val) || val <= 0) { setLimitError('Please enter a valid amount greater than 0.'); setLimitStatus('error'); return; }
    setShowLimitConfirm(true);
  };
  const confirmSaveLimit = async () => {
    const val = parseFloat(newLimit);
    setShowLimitConfirm(false);
    setLimitSaving(true); setLimitStatus('idle'); setLimitError('');
    try {
      const res = await fetch('/api/finance/advance-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advanceLimit: val }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdvanceLimit(Number(data.advanceLimit));
      setIsEditingLimit(false); setNewLimit('');
      setLimitStatus('success');
      setTimeout(() => setLimitStatus('idle'), 4000);
    } catch {
      setLimitError('Failed to save. Please try again.');
      setLimitStatus('error');
    } finally { setLimitSaving(false); }
  };

  const saveEstateName = async () => {
    if (!estateInfo.name || estateInfo.name.trim() === "") return;
    setEstateSaving(true);
    try {
      const estateId = estateInfo.id || sessionStorage.getItem('estate_id');
      const res = await fetch(`/api/auth/estates/${estateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: estateInfo.name,
          phone: estateInfo.phone,
          address: estateInfo.address
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      sessionStorage.setItem('estate_name', estateInfo.name);
      setIsEditingEstate(false);
      window.location.reload();
    } catch (err: any) {
      alert(`Failed to save estate details: ${err.message}`);
    } finally { setEstateSaving(false); }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const userId = sessionStorage.getItem('user_id');
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setIsEditingProfile(false);
      setProfile({...profile, password: ''}); // Clear password after save
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally { setProfileSaving(false); }
  };

  const startEditing = () => {
    setNewPrice(currentPrice?.toFixed(2) ?? '');
    setIsEditing(true);
    setPriceStatus('idle');
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNewPrice('');
    setPriceStatus('idle');
    setPriceError('');
  };

  const requestSave = () => {
    const val = parseFloat(newPrice);
    if (!newPrice || isNaN(val) || val <= 0) {
      setPriceError('Please enter a valid price greater than 0.');
      setPriceStatus('error');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    const val = parseFloat(newPrice);
    setShowConfirm(false);
    setPriceSaving(true);
    setPriceStatus('idle');
    setPriceError('');
    try {
      const res = await fetch('/api/finance/leaf-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricePerKg: val }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setCurrentPrice(Number(data.pricePerKg));
      setEffectiveDate(data.effectiveDate ?? null);
      setIsEditing(false);
      setNewPrice('');
      setPriceStatus('success');
      setTimeout(() => setPriceStatus('idle'), 4000);
    } catch {
      setPriceError('Failed to save. Please check your connection and try again.');
      setPriceStatus('error');
    } finally {
      setPriceSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{isManager ? t('System Settings') : t('Preferences')}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {isManager ? t('Global configuration and estate management') : t('Manage your dashboard experience')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Language (Compact) ── */}
        <section className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between group hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Globe size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 tracking-tight">{t('Select your language')}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('Current')}: {lang === 'en' ? 'English' : 'සිංහල'}</p>
              </div>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setLang('en')}
                className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('si')}
                className={`px-6 py-2 rounded-xl text-lg font-bold leading-none transition-all ${
                  lang === 'si' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                සි
              </button>
            </div>
          </div>
        </section>

        {isManager && (
          <section className="lg:col-span-3 space-y-4">
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
              <Shield size={12} className="text-blue-600" />
              {t('Estate & Manager Profile')}
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <p className="font-black text-slate-900 text-lg tracking-tight">{t('General Information')}</p>
                   <p className="text-[10px] text-slate-500 font-medium mt-0.5">{t('Manage identity & credentials')}</p>
                 </div>
                 {!profileLoading && (
                   <button 
                     onClick={() => setIsEditingProfile(!isEditingProfile)}
                     className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                       isEditingProfile 
                       ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                       : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                     }`}
                   >
                     {isEditingProfile ? t('Cancel') : t('Edit All')}
                   </button>
                 )}
              </div>

              {profileLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 animate-pulse">
                  <div className="space-y-6">
                    <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2"><div className="h-3 bg-slate-100 rounded w-1/2"></div><div className="h-10 bg-slate-50 rounded-xl w-full"></div></div>
                       <div className="space-y-2"><div className="h-3 bg-slate-100 rounded w-1/2"></div><div className="h-10 bg-slate-50 rounded-xl w-full"></div></div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2"><div className="h-3 bg-slate-100 rounded w-1/2"></div><div className="h-10 bg-slate-50 rounded-xl w-full"></div></div>
                       <div className="space-y-2"><div className="h-3 bg-slate-100 rounded w-1/2"></div><div className="h-10 bg-slate-50 rounded-xl w-full"></div></div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                 {/* ── Estate Section ── */}
                 <div className="space-y-5">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest pb-2 border-b border-blue-50 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      {t('Estate Details')}
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Estate Name')}</label>
                          <input 
                            type="text" 
                            disabled={!isEditingProfile}
                            value={estateInfo.name}
                            onChange={e => setEstateInfo({...estateInfo, name: e.target.value})}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Phone')}</label>
                            <input 
                              type="text" 
                              disabled={!isEditingProfile}
                              value={estateInfo.phone}
                              onChange={e => setEstateInfo({...estateInfo, phone: e.target.value})}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Address')}</label>
                            <input 
                              type="text" 
                              disabled={!isEditingProfile}
                              value={estateInfo.address}
                              onChange={e => setEstateInfo({...estateInfo, address: e.target.value})}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                            />
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* ── Manager Section ── */}
                 <div className="space-y-5">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest pb-2 border-b border-blue-50 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      {t('Manager Account')}
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Manager Name')}</label>
                          <input 
                            type="text" 
                            disabled={!isEditingProfile}
                            value={profile.name}
                            onChange={e => setProfile({...profile, name: e.target.value})}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                          />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Email')}</label>
                            <input 
                              type="email" 
                              disabled={!isEditingProfile}
                              value={profile.email}
                              onChange={e => setProfile({...profile, email: e.target.value})}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Phone')}</label>
                            <input 
                              type="text" 
                              disabled={!isEditingProfile}
                              value={profile.contact}
                              onChange={e => setProfile({...profile, contact: e.target.value})}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Password')}</label>
                            <div className="relative">
                              <input 
                                type={showPassword ? "text" : "password"} 
                                disabled={!isEditingProfile}
                                placeholder="••••••••"
                                value={profile.password}
                                onChange={e => setProfile({...profile, password: e.target.value})}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                              />
                            </div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              {isEditingProfile && (
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                   <button 
                     onClick={async () => {
                        setProfileSaving(true);
                        try {
                          const userId = sessionStorage.getItem('current_user_id');
                          const estateId = estateInfo.id || sessionStorage.getItem('current_estate_id');
                          const p1 = fetch(`/api/auth/users/${userId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(profile),
                          });
                          const p2 = fetch(`/api/auth/estates/${estateId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: estateInfo.name, phone: estateInfo.phone, address: estateInfo.address }),
                          });
                          const [r1, r2] = await Promise.all([p1, p2]);
                          if (!r1.ok || !r2.ok) throw new Error('Failed to save');
                          sessionStorage.setItem('estate_name', estateInfo.name);
                          setIsEditingProfile(false);
                          setProfile({...profile, password: ''});
                          window.location.reload();
                        } catch (err: any) { alert(err.message); } finally { setProfileSaving(false); }
                     }}
                     disabled={profileSaving}
                     className="px-10 py-3 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all"
                   >
                     {profileSaving && <Loader size={14} className="animate-spin" />}
                     {profileSaving ? t('Saving...') : t('Save All Changes')}
                   </button>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

        {isManager && (
          <>
            {/* ── Leaf Price ── */}
            <section className="lg:col-span-1 space-y-3">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
                <Leaf size={12} className="text-emerald-500" />
                {t('Leaf Pricing')}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:border-emerald-100 transition-colors">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Current Rate')}</p>
                    {!isEditing && (
                      <button onClick={startEditing} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors active:scale-90">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  {priceLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-slate-100 rounded w-24"></div>
                      <div className="h-4 bg-slate-50 rounded w-32"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">Rs. {currentPrice?.toFixed(2)}</span>
                        <span className="text-sm font-bold text-slate-500">/kg</span>
                      </div>
                      {effectiveDate && (
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest opacity-80">
                          {t('Since')}: {new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </>
                  )}

                  {isEditing && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rs.</span>
                        <input
                          ref={inputRef}
                          type="number"
                          value={newPrice}
                          onChange={e => setNewPrice(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-emerald-100 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={requestSave} className="flex-1 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                          {t('Update')}
                        </button>
                        <button onClick={cancelEditing} className="px-4 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
                          {t('Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] font-medium text-slate-500 leading-tight italic">
                    {t('Used to calculate gross earnings for all suppliers.')}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Cash Advance Limit ── */}
            <section className="lg:col-span-1 space-y-3">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
                <Shield size={12} className="text-blue-500" />
                {t('Advance Limit')}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:border-blue-100 transition-colors">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('Max Request')}</p>
                    {!isEditingLimit && (
                      <button onClick={startEditingLimit} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors active:scale-90">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  {limitLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-slate-100 rounded w-24"></div>
                      <div className="h-4 bg-slate-50 rounded w-32"></div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter">Rs. {advanceLimit?.toLocaleString('en-LK')}</span>
                      <span className="text-sm font-bold text-slate-500">max</span>
                    </div>
                  )}

                  {isEditingLimit && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rs.</span>
                        <input
                          ref={limitInputRef}
                          type="number"
                          value={newLimit}
                          onChange={e => setNewLimit(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-blue-100 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={requestSaveLimit} className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95 transition-all">
                          {t('Update')}
                        </button>
                        <button onClick={cancelEditingLimit} className="px-4 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
                          {t('Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] font-medium text-slate-500 leading-tight italic">
                    {t('Limits set here apply to all new advance requests.')}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Security Status (Compact) ── */}
            <section className="lg:col-span-1 space-y-3">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
                <Shield size={12} className="text-amber-500" />
                {t('Security')}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full border-dashed border-2 bg-slate-50/5 flex flex-col justify-center items-center text-center group hover:border-amber-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-amber-50 transition-colors">
                  <Shield size={24} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">{t('System Locked')}</p>
                <p className="text-[10px] text-slate-500 max-w-[180px] font-medium">{t('Access to security auditing is restricted to root admins.')}</p>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">{t('Update Leaf Rate?')}</h3>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed font-medium">
                {t('This change will immediately affect all supplier earnings calculations.')}
              </p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  {t('Cancel')}
                </button>
                <button onClick={confirmSave} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-95 transition-all">
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLimitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">{t('Update Advance Limit?')}</h3>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed font-medium">
                {t('Requests above this amount will be automatically rejected.')}
              </p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowLimitConfirm(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  {t('Cancel')}
                </button>
                <button onClick={confirmSaveLimit} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all">
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Security ── */}
      <section className="pt-6 opacity-40">
        <div className="bg-slate-100/50 rounded-2xl p-8 border border-slate-200 text-center border-dashed">
          <Shield size={32} className="mx-auto mb-4 text-slate-400" />
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[4px]">{t('Advanced Security Controls')}</p>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">{t('Root Admin Only')}</p>
        </div>
      </section>
    </div>
  );
}
