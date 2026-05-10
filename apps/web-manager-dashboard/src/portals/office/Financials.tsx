import { useState, useEffect, useCallback } from 'react'
import { 
  CreditCard, Wallet, TrendingUp, Download, RefreshCw, 
  Search, Filter, CheckCircle2, AlertCircle, Clock,
  ExternalLink, ArrowRight, BarChart3, PieChart,
  ShieldCheck, FileText, MoreVertical, Pencil, Lock, Unlock, X
} from 'lucide-react'
import React from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { FinanceAPI, AuthAPI, UserSummary } from '../../services/api'

// MUI Imports
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, IconButton, Typography, Box,
  CircularProgress, Fade, Skeleton
} from '@mui/material'

interface PayoutData {
  id: string;
  name: string;
  sid: string;
  gross: number;
  adv: number;
  debt: number;
  qual: number;
  netPay: number;
  status: string;
  date: string;
}

export default function FinancialsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'balance' | 'advances'>('balance');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-GB', { month: 'short' }));
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [editedAmount, setEditedAmount] = useState<number>(0);
  const [isEditable, setIsEditable] = useState(false);

  // Role detection
  const userRole = sessionStorage.getItem('user_role') || 'office-staff';
  const isManager = userRole === 'manager' || userRole === 'admin';

  const fetchData = useCallback(async () => {
    try {
      setFetchLoading(true);
      const estateId = sessionStorage.getItem('estate_id');
      
      // 1. Get suppliers for this estate
      const allUsers = await AuthAPI.getUsers(estateId || undefined);
      const suppliers = allUsers.filter(u => u.role === 'SH' || u.role === 'SMALL_HOLDER' || u.role === 'SUPPLIER');
      
      // 2. Get requests to see what is AWAITING_APPROVAL
      const requests = await FinanceAPI.getRequests();

      // 3. Get ledger for each
      const data: PayoutData[] = await Promise.all(suppliers.map(async (s) => {
        try {
          const targetId = s.supplierId || s.userId;
          const ledger = await FinanceAPI.getSupplierLedger(targetId);
          const req = requests.find(r => r.supplierId === targetId || r.supplierId === s.userId);
          
          return {
            id: targetId,
            name: s.name,
            sid: s.id || targetId.substring(0, 8),
            gross: ledger.grossEarnings || 0,
            adv: ledger.advanceTaken || 0,
            debt: ledger.currentDebt || 0,
            qual: 500, // Mock quality ded for now
            netPay: ledger.estimatedBalance || 0,
            leafKg: ledger.totalNetWeight || 0,
            rate: ledger.leafPrice || 0,
            status: req ? req.status : (ledger.estimatedBalance > 0 ? 'PENDING' : 'PAID'),
            date: req ? new Date(req.requestDate).toLocaleDateString() : 'Active'
          };
        } catch (e) {
          return null;
        }
      })).then(results => results.filter(r => r !== null) as PayoutData[]);

      setPayouts(data);
    } catch (err) {
      console.error("Failed to fetch financial data", err);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPayoutModal = (item: any) => {
    setSelectedPayout(item);
    setEditedAmount(item.netPay);
    setIsEditable(false);
    setModalOpen(true);
  };

  const handleConfirmPayout = async () => {
    if (!selectedPayout) return;
    const requesterId = sessionStorage.getItem('user_id') || "00000000-0000-0000-0000-000000000000";
    
    try {
      setLoading(true);
      await FinanceAPI.processPayout({
        supplierId: selectedPayout.id,
        amount: editedAmount,
        requesterId,
        description: `Balance payment: ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        immediate: isManager 
      });
      
      setModalOpen(false);
      fetchData(); // Refresh list
      alert(isManager ? t('Payout processed successfully') : t('Payout request submitted to Manager'));
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = payouts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* ── Top Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Wallet className="text-emerald-500" />} 
          value={`Rs. ${payouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.netPay, 0).toLocaleString()}`} 
          label={t("BALANCE PAYMENTS PENDING")} 
          sub={`${payouts.filter(p => p.status === 'PENDING').length} suppliers`} 
          color="emerald"
        />
        <StatCard 
          icon={<Clock className="text-amber-500" />} 
          value={`Rs. ${payouts.filter(p => p.status === 'AWAITING_APPROVAL').reduce((s, p) => s + p.netPay, 0).toLocaleString()}`} 
          label={t("AWAITING APPROVAL")} 
          sub={`${payouts.filter(p => p.status === 'AWAITING_APPROVAL').length} requests`} 
          color="amber"
        />
        <StatCard 
          icon={<CreditCard className="text-indigo-500" />} 
          value={`Rs. ${payouts.reduce((s, p) => s + p.adv, 0).toLocaleString()}`} 
          label={t("TOTAL ADVANCES OUT")} 
          sub="Current Cycle" 
          color="indigo"
        />
        <StatCard 
          icon={<AlertCircle className="text-rose-500" />} 
          value={`Rs. ${payouts.reduce((s, p) => s + p.debt, 0).toLocaleString()}`} 
          label={t("TOTAL DEBT PORTFOLIO")} 
          sub="All Holders" 
          color="rose"
        />
      </div>

      {/* ── Approval Alert for Managers ──────────────────────── */}
      {isManager && payouts.some(p => p.status === 'AWAITING_APPROVAL') && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">{t('Pending Payout Approvals')}</p>
              <p className="text-xs text-amber-900 font-bold">{t('There are requests awaiting your final authorization.')}</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all">
            {t('Review All')}
          </button>
        </div>
      )}

      {/* ── Main Ledger Table ───────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-1 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('balance')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'balance' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Wallet size={14} /> {t('Balance Payments')}
            </button>
            <button 
              onClick={() => setActiveTab('advances')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'advances' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <CreditCard size={14} /> {t('Advances')}
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" size={16} />
            <input 
              type="text" 
              placeholder={t("Search supplier...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-300 text-base focus:border-emerald-600 outline-none text-black font-bold"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl text-sm font-medium text-black focus:border-emerald-600 outline-none"
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                <option key={m} value={m}>{m} 2026</option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 hover:bg-slate-50">
              <Download size={14} /> {t('Export Excel')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-200 text-[10px] font-medium text-black uppercase tracking-widest">
                <th className="px-6 py-4">{t('PAYMENT ID')}</th>
                <th className="px-6 py-4">{t('SUPPLIER')}</th>
                <th className="px-6 py-4 text-right">{t('GROSS (RS.)')}</th>
                <th className="px-6 py-4 text-right">{t('ADVANCE DED.')}</th>
                <th className="px-6 py-4 text-right">{t('DEBT DED.')}</th>
                <th className="px-6 py-4 text-right">{t('QUALITY DED.')}</th>
                <th className="px-6 py-4 text-right">{t('NET PAY')}</th>
                <th className="px-6 py-4 text-center">{t('STATUS')}</th>
                <th className="px-6 py-4 text-center">{t('DUE/PAID')}</th>
                <th className="px-6 py-4 text-right">{t('ACTION')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fetchLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4"><Skeleton variant="text" /></td>
                  </tr>
                ))
              ) : filteredPayouts.length > 0 ? (
                filteredPayouts.map((p) => (
                  <PayoutItem 
                    {...p}
                    t={t}
                    month={selectedMonth}
                    onAction={() => openPayoutModal(p)}
                    loading={loading}
                    isManager={isManager}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-900 font-bold uppercase tracking-widest text-xs">
                    {t('No pending payouts found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MUI Payout Confirmation Dialog ───────────────────── */}
      <Dialog 
        open={modalOpen} 
        onClose={() => !loading && setModalOpen(false)}
        TransitionComponent={Fade}
        PaperProps={{
          sx: { borderRadius: '24px', padding: '12px', width: '100%', maxWidth: '400px' }
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 500, color: '#000000' }}>{isManager ? t('Confirm Payout') : t('Request Payout')}</Typography>
          <IconButton onClick={() => setModalOpen(false)} disabled={loading} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, color: '#0f172a' }}>
              {t('Processing payment for')} <span className="text-emerald-600 underline">{selectedPayout?.name}</span>
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: 'slate.50', border: '1px solid', borderColor: 'slate.200' }}>
              <Typography variant="caption" sx={{ fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('Payout Amount (Rs.)')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <TextField
                  fullWidth
                  variant="standard"
                  type="number"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(Number(e.target.value))}
                  disabled={!isEditable || loading}
                  InputProps={{
                    disableUnderline: !isEditable,
                    sx: { fontSize: '1.5rem', fontWeight: 500, color: isEditable ? 'primary.main' : '#000000' }
                  }}
                />
                <IconButton 
                  onClick={() => setIsEditable(!isEditable)} 
                  disabled={loading}
                  sx={{ 
                    bgcolor: isEditable ? 'primary.main' : 'slate.100', 
                    color: isEditable ? 'white' : 'slate.500',
                    '&:hover': { bgcolor: isEditable ? 'primary.dark' : 'slate.200' }
                  }}
                >
                  {isEditable ? <Unlock size={18} /> : <Pencil size={18} />}
                </IconButton>
              </Box>
              {!isEditable && (
                <Typography variant="caption" sx={{ color: '#000000', fontStyle: 'italic', display: 'flex', itemsCenter: 'center', gap: 0.5, mt: 1, fontWeight: 500 }}>
                  <Lock size={12} /> {t('Amount is locked. Click pen to edit.')}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            fullWidth 
            onClick={handleConfirmPayout}
            variant="contained" 
            disabled={loading}
            sx={{ 
              borderRadius: '16px', 
              py: 1.5, 
              fontWeight: 500, 
              bgcolor: isManager ? '#059669' : '#000000',
              '&:hover': { bgcolor: isManager ? '#047857' : '#111111' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : (isManager ? t('CONFIRM & ISSUE PAYMENT') : t('SUBMIT REQUEST'))}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, value, label, sub, color }: any) {
  const colors: any = {
    emerald: 'border-t-emerald-500',
    amber: 'border-t-amber-500',
    rose: 'border-t-rose-500',
    indigo: 'border-t-indigo-500',
  };
  return (
    <div className={`bg-white p-6 rounded-[24px] border border-slate-200 border-t-[4px] shadow-sm hover:shadow-md transition-all ${colors[color]}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-black tracking-tight mb-1">{value}</h3>
      <p className="text-[12px] font-bold text-black uppercase tracking-widest">{label}</p>
      <p className="text-[13px] text-black font-medium mt-1">{sub}</p>
    </div>
  );
}

function PayoutItem({ id, name, sid, gross, adv, debt, qual, netPay, status, date, t, onAction, loading, isManager, month }: any) {
  const statusColors: any = {
    PENDING: 'bg-[#FEF3C7] text-[#B45309] font-bold',
    AWAITING_APPROVAL: 'bg-[#FEF3C7] text-[#B45309] font-bold',
    PAID: 'bg-[#D1FAE5] text-[#065F46] font-bold',
    APPROVED: 'bg-[#D1FAE5] text-[#065F46] font-bold',
    SETTLED: 'bg-[#D1FAE5] text-[#065F46] font-bold',
    DISPATCHED: 'bg-[#D1FAE5] text-[#065F46] font-bold',
    CALCULATED: 'bg-[#ECFDF5] text-[#047857] font-bold',
    APPROVED_BY_EXT: 'bg-[#F1F5F9] text-[#475569] font-bold',
  };

  // Generate a stable numeric suffix from the ID string (simple hash)
  const idHash = id ? id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 900 + 100 : '000';
  const paymentId = `BP-${month}-${idHash}`;
  const qualityDed = qual || 0;
  const net = netPay;
  
  const getActionLabel = () => {
    if (status === 'AWAITING_APPROVAL') return isManager ? t('APPROVE & PAY') : t('SENT');
    if (status === 'PENDING') return isManager ? t('PAY NOW') : t('REQUEST');
    if (status === 'DISPATCHED') return t('VIEW');
    return null;
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-slate-800">{paymentId}</p>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-slate-900 leading-none">{name}</p>
        <p className="text-[12px] font-medium text-slate-500 mt-2 uppercase tracking-wider">{sid}</p>
      </td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">Rs. {gross.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">-Rs. {adv.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">-Rs. {debt.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">-Rs. {qualityDed.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[14px] font-medium text-slate-900">Rs. {net.toLocaleString()}</td>
      <td className="px-6 py-4 text-center">
        {(() => {
          const isPaid = ['PAID', 'APPROVED', 'SETTLED', 'DISPATCHED', 'CALCULATED', 'APPROVED_BY_EXT'].includes(status);
          const displayLabel = isPaid ? 'PAID' : 'PENDING';
          const colorClass = isPaid ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#B45309]';
          return (
            <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold ${colorClass}`}>
              {t(displayLabel)}
            </span>
          );
        })()}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-xs font-medium text-slate-600">{date || `28 ${month} 2026`}</span>
      </td>
      <td className="px-6 py-4 text-right">
        {status !== 'PAID' && status !== 'SETTLED' && getActionLabel() ? (
          <button 
            onClick={onAction}
            disabled={loading || (status === 'AWAITING_APPROVAL' && !isManager)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all shadow-md
              ${status === 'AWAITING_APPROVAL' 
                ? 'bg-amber-600 text-white hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400' 
                : 'bg-black text-white hover:bg-slate-900'
              }`}
          >
            {loading ? <RefreshCw className="animate-spin" size={10} /> : getActionLabel()}
          </button>
        ) : (status === 'PAID' || status === 'SETTLED') ? (
          <div className="flex items-center justify-end gap-1 text-emerald-600">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-medium uppercase tracking-widest">{t('SETTLED')}</span>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
