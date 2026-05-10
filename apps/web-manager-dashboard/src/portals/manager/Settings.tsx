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
  }, [isManager]);

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
          <h1 className="text-2xl font-bold text-slate-900">{isManager ? t('System Settings') : t('Preferences')}</h1>
          <p className="text-slate-500 text-sm">
            {isManager
              ? t('Global configuration and external service integrations')
              : t('Manage your app experience')
            }
          </p>
        </div>
      </div>

      {/* ── Language ── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Globe size={14} />
          {t('Language Preference')}
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{t('Language Preference')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('Choose your preferred interface language')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('en')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                  lang === 'en'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t('English')}
              </button>
              <button
                onClick={() => setLang('si')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                  lang === 'si'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t('Sinhala')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {isManager && (
        <>
          {/* ── Leaf Price (LIVE) ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Leaf size={14} className="text-emerald-600" />
              Green Leaf Pricing
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Current Rate Display Row */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Active Rate</p>
                  {priceLoading ? (
                    <div className="flex items-center gap-2 h-10">
                      <Loader size={18} className="animate-spin text-slate-400" />
                      <span className="text-slate-400 text-sm font-medium">Loading rate...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-4xl font-black text-emerald-700 tracking-tight">
                        Rs.&nbsp;{currentPrice?.toFixed(2)}
                        <span className="text-base font-bold text-slate-400 ml-1">/ kg</span>
                      </p>
                      {effectiveDate ? (
                        <p className="text-xs text-slate-400 mt-1.5">
                          Effective since:{' '}
                          <span className="font-semibold text-slate-500">
                            {new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500 font-semibold mt-1.5">
                          ⚠ Fallback rate — no rate has been configured yet
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!isEditing && !priceLoading && (
                    <button
                      id="edit-leaf-price-btn"
                      onClick={startEditing}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all group"
                    >
                      <Edit2 size={13} className="group-hover:scale-110 transition-transform" />
                      Edit Rate
                    </button>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Leaf size={28} className="text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Edit Mode Panel — only shown when isEditing */}
              {isEditing && (
                <div className="px-8 py-6 bg-amber-50/40 border-b border-amber-100">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Edit2 size={11} />
                    Set New Rate
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center border-2 border-emerald-300 rounded-xl overflow-hidden bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all w-64 shadow-sm">
                      <span className="px-4 py-3 text-sm font-bold text-slate-500 border-r border-slate-200 bg-slate-50 select-none">Rs.</span>
                      <input
                        ref={inputRef}
                        id="leaf-price-input"
                        type="number"
                        step="0.01"
                        min="1"
                        value={newPrice}
                        onChange={e => { setNewPrice(e.target.value); setPriceStatus('idle'); setPriceError(''); }}
                        className="flex-1 px-4 py-3 text-sm font-bold text-slate-800 bg-transparent outline-none"
                        onKeyDown={e => { if (e.key === 'Enter') requestSave(); if (e.key === 'Escape') cancelEditing(); }}
                      />
                      <span className="px-4 py-3 text-sm font-bold text-slate-400 bg-slate-50 border-l border-slate-200 select-none">/ kg</span>
                    </div>
                    <button
                      id="save-leaf-price-btn"
                      onClick={requestSave}
                      disabled={priceSaving || !newPrice}
                      className="px-5 py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
                    >
                      {priceSaving && <Loader size={13} className="animate-spin" />}
                      {priceSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-5 py-3 bg-white text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                  {priceStatus === 'error' && (
                    <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-bold">
                      <AlertCircle size={14} />
                      {priceError}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-3">Press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">Enter</kbd> to save · <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">Esc</kbd> to cancel</p>
                </div>
              )}

              {/* Success Feedback */}
              {priceStatus === 'success' && (
                <div className="px-8 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2 text-emerald-700 text-xs font-bold">
                  <CheckCircle size={15} />
                  Rate updated successfully. All supplier gross earnings now use Rs.&nbsp;{currentPrice?.toFixed(2)} / kg.
                </div>
              )}

              {/* Formula Footer */}
              <div className="px-8 py-5">
                <p className="text-xs text-slate-400 leading-relaxed">
                  This rate calculates <strong className="text-slate-600">Gross Earnings</strong> for all suppliers across the mobile app and manager dashboard.
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] ml-2 inline-block">
                    Gross Earnings = Net Weight (kg) × Rate (Rs./kg)
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* ── Confirmation Modal ── */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-base">Confirm Rate Change</p>
                      <p className="text-xs text-slate-500 mt-0.5">This will affect all supplier earnings immediately</p>
                    </div>
                  </div>
                  <button onClick={() => setShowConfirm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="px-7 py-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-50 rounded-2xl p-4 text-center border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Rate</p>
                      <p className="text-2xl font-black text-slate-500 line-through decoration-red-400">
                        Rs. {currentPrice?.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">per kg</p>
                    </div>
                    <div className="text-slate-300 font-black text-xl">→</div>
                    <div className="flex-1 bg-emerald-50 rounded-2xl p-4 text-center border-2 border-emerald-300">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">New Rate</p>
                      <p className="text-2xl font-black text-emerald-700">
                        Rs. {parseFloat(newPrice).toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-500 mt-0.5">per kg</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                    <strong>⚠ Important:</strong> This change will recalculate gross earnings for <strong>all suppliers</strong> in real time. The previous rate will be deactivated permanently.
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-7 pb-7">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-leaf-price-btn"
                    onClick={confirmSave}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
                  >
                    Yes, Update Rate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Advance Limit (LIVE) ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Cash Advance Limit
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Current Limit Display */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Maximum Per Advance Request</p>
                  {limitLoading ? (
                    <div className="flex items-center gap-2 h-10"><Loader size={18} className="animate-spin text-slate-400" /><span className="text-slate-400 text-sm font-medium">Loading...</span></div>
                  ) : (
                    <p className="text-4xl font-black text-blue-700 tracking-tight">
                      Rs.&nbsp;{advanceLimit?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      <span className="text-base font-bold text-slate-400 ml-1">max</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">Any advance request exceeding this amount will be automatically rejected.</p>
                </div>
                <div className="flex items-center gap-3">
                  {!isEditingLimit && !limitLoading && (
                    <button id="edit-advance-limit-btn" onClick={startEditingLimit}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all group">
                      <Edit2 size={13} className="group-hover:scale-110 transition-transform" />
                      Edit Limit
                    </button>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                </div>
              </div>
              {isEditingLimit && (
                <div className="px-8 py-6 bg-amber-50/40 border-b border-amber-100">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Edit2 size={11} />Set New Limit</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center border-2 border-blue-300 rounded-xl overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all w-64 shadow-sm">
                      <span className="px-4 py-3 text-sm font-bold text-slate-500 border-r border-slate-200 bg-slate-50 select-none">Rs.</span>
                      <input ref={limitInputRef} id="advance-limit-input" type="number" step="500" min="1"
                        value={newLimit} onChange={e => { setNewLimit(e.target.value); setLimitStatus('idle'); setLimitError(''); }}
                        className="flex-1 px-4 py-3 text-sm font-bold text-slate-800 bg-transparent outline-none"
                        onKeyDown={e => { if (e.key === 'Enter') requestSaveLimit(); if (e.key === 'Escape') cancelEditingLimit(); }} />
                      <span className="px-4 py-3 text-sm font-bold text-slate-400 bg-slate-50 border-l border-slate-200 select-none">max</span>
                    </div>
                    <button id="save-advance-limit-btn" onClick={requestSaveLimit} disabled={limitSaving || !newLimit}
                      className="px-5 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-sm">
                      {limitSaving && <Loader size={13} className="animate-spin" />}{limitSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEditingLimit} className="px-5 py-3 bg-white text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all">Cancel</button>
                  </div>
                  {limitStatus === 'error' && <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-bold"><AlertCircle size={14} />{limitError}</div>}
                  <p className="text-xs text-slate-400 mt-3">Press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">Enter</kbd> to save · <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">Esc</kbd> to cancel</p>
                </div>
              )}
              {limitStatus === 'success' && (
                <div className="px-8 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-blue-700 text-xs font-bold">
                  <CheckCircle size={15} />Advance limit updated to Rs.&nbsp;{advanceLimit?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}. New requests will be validated against this cap.
                </div>
              )}
            </div>
          </section>

          {/* Advance Limit Confirm Modal */}
          {showLimitConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
                    <div><p className="font-black text-slate-900 text-base">Confirm Advance Limit Change</p><p className="text-xs text-slate-500 mt-0.5">This will apply to all new advance requests immediately</p></div>
                  </div>
                  <button onClick={() => setShowLimitConfirm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                </div>
                <div className="px-7 py-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-50 rounded-2xl p-4 text-center border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Limit</p>
                      <p className="text-2xl font-black text-slate-500 line-through decoration-red-400">Rs. {advanceLimit?.toLocaleString('en-LK')}</p>
                    </div>
                    <div className="text-slate-300 font-black text-xl">→</div>
                    <div className="flex-1 bg-blue-50 rounded-2xl p-4 text-center border-2 border-blue-300">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">New Limit</p>
                      <p className="text-2xl font-black text-blue-700">Rs. {parseFloat(newLimit).toLocaleString('en-LK')}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                    <strong>⚠ Important:</strong> Any advance request above Rs.&nbsp;{parseFloat(newLimit).toLocaleString('en-LK')} will be automatically rejected by the system.
                  </div>
                </div>
                <div className="flex gap-3 px-7 pb-7">
                  <button onClick={() => setShowLimitConfirm(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                  <button id="confirm-advance-limit-btn" onClick={confirmSaveLimit}
                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
                    Yes, Update Limit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── System Config ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <SettingsIcon size={14} />
              {t('System')}
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              <SettingRow label={t("Estate Name")} value={estateName} />
            </div>
          </section>

          <section className="pt-4 opacity-40">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center border-dashed">
              <Shield size={32} className="mx-auto mb-4 text-slate-400" />
              <p className="text-xs font-black text-slate-600 uppercase tracking-[4px]">{t('Advanced Security Controls')}</p>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">{t('Access to security auditing and encryption keys is restricted to root administrators.')}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between px-8 py-6 group hover:bg-slate-50/50 transition-colors">
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="font-bold text-slate-800">{value}</p>
      </div>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-all">
        <Edit2 size={12} />
        {t('Edit')}
      </button>
    </div>
  );
}

function SettingsIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
