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
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8 pb-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{isManager ? t('System Settings') : t('Preferences')}</h1>
        <p className="text-sm text-slate-500 font-semibold mt-2">
          {isManager ? t('Global configuration and estate management') : t('Manage your dashboard experience')}
        </p>
      </div>

      {/* ── Language Selection ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Globe size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{t('Select your language')}</p>
              <p className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{t('Current')}: {lang === 'en' ? 'English' : 'සිංහල'}</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-2 rounded-2xl gap-1">
            <button
              onClick={() => setLang('en')}
              className={`px-8 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                lang === 'en' ? 'bg-white text-slate-900 shadow-lg border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('si')}
              className={`px-8 py-2.5 rounded-xl text-base font-bold transition-all ${
                lang === 'si' ? 'bg-emerald-600 text-white shadow-lg border border-emerald-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              සි
            </button>
          </div>
        </div>
      </div>

      {isManager && (
        <>
          {/* ── General Information Section ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-blue-600" />
                  <div>
                    <p className="font-black text-slate-900 text-base">{t('General Information')}</p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{t('Manage identity & credentials')}</p>
                  </div>
                </div>
                {!profileLoading && (
                   <button 
                     onClick={() => setIsEditingProfile(!isEditingProfile)}
                     className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                       isEditingProfile 
                       ? 'bg-white text-slate-600 border border-slate-200 shadow-sm' 
                       : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                     }`}
                   >
                     {isEditingProfile ? t('Cancel') : t('Edit All')}
                   </button>
                )}
              </div>
            </div>

            <div className="p-8">
              {profileLoading ? (
                <div className="grid grid-cols-2 gap-8 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                      <div className="h-11 bg-slate-50 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* ── Estate Details ── */}
                    <div>
                      <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-widest pb-4 border-b-2 border-blue-100 mb-6">
                        {t('Estate Details')}
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">{t('Estate Name')}</label>
                          <input 
                            type="text" 
                            disabled={!isEditingProfile}
                            value={estateInfo.name}
                            onChange={e => setEstateInfo({...estateInfo, name: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">{t('Address')}</label>
                          <input 
                            type="text" 
                            disabled={!isEditingProfile}
                            value={estateInfo.address}
                            onChange={e => setEstateInfo({...estateInfo, address: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Manager Account ── */}
                    <div>
                      <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-widest pb-4 border-b-2 border-blue-100 mb-6">
                        {t('Manager Account')}
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">{t('Manager Name')}</label>
                          <input 
                            type="text" 
                            disabled={!isEditingProfile}
                            value={profile.name}
                            onChange={e => setProfile({...profile, name: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">{t('Email')}</label>
                            <input 
                              type="email" 
                              disabled={!isEditingProfile}
                              value={profile.email}
                              onChange={e => setProfile({...profile, email: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">{t('Phone')}</label>
                            <input 
                              type="text" 
                              disabled={!isEditingProfile}
                              value={profile.contact}
                              onChange={e => setProfile({...profile, contact: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">{t('Password')}</label>
                            <input 
                              type={showPassword ? "text" : "password"} 
                              disabled={!isEditingProfile}
                              placeholder="••••••••"
                              value={profile.password}
                              onChange={e => setProfile({...profile, password: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-slate-900 disabled:opacity-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isEditingProfile && (
                    <div className="pt-6 border-t-2 border-slate-200 flex justify-end">
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
                         className="px-12 py-3.5 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 active:scale-95 transition-all"
                       >
                         {profileSaving && <Loader size={16} className="animate-spin" />}
                         {profileSaving ? t('Saving...') : t('Save All Changes')}
                       </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Financial Settings Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ── Leaf Price ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                <Leaf size={20} className="text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-900">{t('Leaf Pricing')}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{t('Current Rate')}</p>
                </div>
              </div>
              <div className="p-6 flex-1">
                {priceLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-slate-100 rounded w-32"></div>
                    <div className="h-4 bg-slate-50 rounded w-40"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl font-black text-slate-900">Rs. {currentPrice?.toFixed(2)}</span>
                      <span className="text-base font-bold text-slate-500">/kg</span>
                    </div>
                    {effectiveDate && (
                      <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                        {t('Since')}: {new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}

                    {isEditing && (
                      <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs.</span>
                          <input
                            ref={inputRef}
                            type="number"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-emerald-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={requestSave} className="flex-1 py-3 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all">
                            {t('Update')}
                          </button>
                          <button onClick={cancelEditing} className="px-4 py-3 bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
                            {t('Cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!isEditing && (
                <div className="px-6 py-4 bg-emerald-50/50 border-t border-emerald-100 flex items-center justify-between">
                  <p className="text-[10px] text-slate-600 font-semibold">{t('Used to calculate supplier earnings')}</p>
                  {!isEditing && (
                    <button onClick={startEditing} className="p-2.5 rounded-lg bg-white text-emerald-600 hover:bg-emerald-100 transition-all border border-emerald-200">
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Advance Limit ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-blue-50 to-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
                <Shield size={20} className="text-blue-600" />
                <div>
                  <p className="font-bold text-slate-900">{t('Advance Limit')}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{t('Max Request')}</p>
                </div>
              </div>
              <div className="p-6 flex-1">
                {limitLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-slate-100 rounded w-32"></div>
                    <div className="h-4 bg-slate-50 rounded w-40"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl font-black text-slate-900">Rs. {advanceLimit?.toLocaleString('en-LK')}</span>
                      <span className="text-base font-bold text-slate-500">max</span>
                    </div>

                    {isEditingLimit && (
                      <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs.</span>
                          <input
                            ref={limitInputRef}
                            type="number"
                            value={newLimit}
                            onChange={e => setNewLimit(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-blue-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={requestSaveLimit} className="flex-1 py-3 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                            {t('Update')}
                          </button>
                          <button onClick={cancelEditingLimit} className="px-4 py-3 bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
                            {t('Cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!isEditingLimit && (
                <div className="px-6 py-4 bg-blue-50/50 border-t border-blue-100 flex items-center justify-between">
                  <p className="text-[10px] text-slate-600 font-semibold">{t('Applies to all advance requests')}</p>
                  {!isEditingLimit && (
                    <button onClick={startEditingLimit} className="p-2.5 rounded-lg bg-white text-blue-600 hover:bg-blue-100 transition-all border border-blue-200">
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Security Status ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-amber-50 to-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                <Shield size={20} className="text-amber-600" />
                <div>
                  <p className="font-bold text-slate-900">{t('Security')}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{t('System Status')}</p>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Shield size={28} className="text-amber-600" />
                </div>
                <p className="text-[12px] font-black text-slate-900 uppercase tracking-wider mb-2">{t('System Locked')}</p>
                <p className="text-[11px] text-slate-600 font-semibold">{t('Root admin access only')}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Confirmation Modals ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">{t('Update Leaf Rate?')}</h3>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed font-semibold">
                {t('This change will immediately affect all supplier earnings calculations.')}
              </p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-[12px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  {t('Cancel')}
                </button>
                <button onClick={confirmSave} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all">
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLimitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">{t('Update Advance Limit?')}</h3>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed font-semibold">
                {t('Requests above this amount will be automatically rejected.')}
              </p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowLimitConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-[12px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">
                  {t('Cancel')}
                </button>
                <button onClick={confirmSaveLimit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
