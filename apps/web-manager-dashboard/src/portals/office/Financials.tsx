import { useState, useEffect, useCallback } from 'react'
import { 
  CreditCard, Wallet, TrendingUp, Download, RefreshCw, 
  Search, Filter, CheckCircle2, AlertCircle, Clock,
  ExternalLink, ArrowRight, BarChart3, PieChart,
  ShieldCheck, FileText, MoreVertical, Pencil, Lock, Unlock, X
} from 'lucide-react'
import React from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { FinanceAPI, AuthAPI, CollectionAPI, UserSummary } from '../../services/api'

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
  const [activeTab, setActiveTab] = useState<'balance' | 'advances' | 'approvals'>(() => {
    const saved = sessionStorage.getItem('financials_active_tab');
    if (saved === 'balance' || saved === 'advances' || saved === 'approvals') {
      sessionStorage.removeItem('financials_active_tab');
      return saved;
    }
    return 'balance';
  });

  useEffect(() => {
    const handleRedirect = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === 'approvals' || customEvent.detail === 'advances' || customEvent.detail === 'balance') {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('financials-tab-redirect', handleRedirect);
    return () => window.removeEventListener('financials-tab-redirect', handleRedirect);
  }, []);

  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('en-GB', { month: 'short' }));
  const [globalDueDate, setGlobalDueDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-28`;
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [editedAmount, setEditedAmount] = useState<number>(0);
  const [isEditable, setIsEditable] = useState(false);
  const [remark, setRemark] = useState<string>('');
  const [fallbackManagerId, setFallbackManagerId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Statement Modal State
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<any>(null);
  const [statements, setStatements] = useState<any[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  // Profile Drawer State
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedSupplierForProfile, setSelectedSupplierForProfile] = useState<any>(null);
  const [profileTransactions, setProfileTransactions] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Role detection
  const userRole = sessionStorage.getItem('user_role') || 'office-staff';
  const isManager = userRole === 'manager' || userRole === 'admin';
  const requesterId = sessionStorage.getItem('current_user_id') || sessionStorage.getItem('user_id') || fallbackManagerId || '00000000-0000-0000-0000-000000000000';

  const fetchData = useCallback(async () => {
    try {
      setFetchLoading(true);
      const estateId = sessionStorage.getItem('estate_id');
      
      // 1. Get suppliers for this estate
      const allUsers = await AuthAPI.getUsers(estateId || undefined);
      const suppliers = allUsers.filter(u => u.role === 'SH' || u.role === 'SMALL_HOLDER' || u.role === 'SUPPLIER');
      
      // Find a valid manager/admin to use as fallback ID if session is missing it
      const manager = allUsers.find(u => u.role === 'MANAGER' || u.role === 'ADMIN');
      if (manager) setFallbackManagerId(manager.userId || manager.id);
      
      // 2. Get requests to see what is AWAITING_APPROVAL
      const requests = await FinanceAPI.getRequests();

      // 3. Get ledger and summary for each
      const data: PayoutData[] = await Promise.all(suppliers.map(async (s) => {
        try {
          const targetId = s.supplierId || s.userId;
          const [ledger, history, transactions] = await Promise.all([
            FinanceAPI.getSupplierLedger(targetId),
            fetch(`/api/collection/history/${targetId}`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}` } })
              .then(r => r.ok ? r.json() : [])
              .catch(() => []),
            FinanceAPI.getLedgerTransactions(targetId)
              .catch(() => [])
          ]);
          const req = requests.find(r => r.supplierId === targetId || r.supplierId === s.userId);
          
          // Calculate Net Weight for the selected month (e.g., "Apr 2026")
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          // selectedMonth might be just "May" or "Apr" based on line 247
          const monthIdx = monthNames.findIndex(m => selectedMonth.includes(m));
          const year = new Date().getFullYear();
          
          const startOfMonth = new Date(year, monthIdx, 1).getTime();
          const endOfMonth = new Date(year, monthIdx + 1, 1).getTime();
          
          const currentMonthNet = (history as any[])
              .filter((item: any) => {
                 const t = new Date(item.collectedAt).getTime();
                 return item.netWeight != null && t >= startOfMonth && t < endOfMonth;
              })
              .reduce((sum: number, item: any) => sum + Number(item.netWeight), 0);

          const leafPrice = ledger.leafPrice || 0;
          // User requested month-wise Gross Earnings based strictly on Net Weight
          const trueGross = currentMonthNet * leafPrice;
          const qualityDed = 0;

          const currentDebt = ledger.currentDebt || 0;
          const advanceTaken = ledger.advanceTaken || 0;
          const calculatedNetPay = trueGross - (currentDebt + advanceTaken);

          const hasPaidPayout = transactions.find((t: any) => {
            if (t.transactionType !== 'PAYOUT' || !['APPROVED', 'PAID', 'CLEARED'].includes(t.status)) return false;
            const date = new Date(t.transactionDate);
            const monthName = date.toLocaleString('en-GB', { month: 'short' });
            return selectedMonth.includes(monthName);
          });
          
          const pendingPayout = transactions.find((t: any) => t.transactionType === 'PAYOUT' && t.status === 'AWAITING_APPROVAL');
          
          const status = pendingPayout ? 'AWAITING_APPROVAL' : (hasPaidPayout ? 'APPROVED' : 'PENDING');

          return {
            id: targetId,
            name: s.name,
            sid: s.id || targetId.substring(0, 8),
            gross: trueGross,
            adv: advanceTaken,
            debt: currentDebt,
            qual: qualityDed,
            netPay: calculatedNetPay,
            leafKg: currentMonthNet,
            rate: leafPrice,
            status: status,
            date: req ? new Date(req.requestDate).toLocaleDateString() : 'Active',
            trend: transactions // Save transactions for trend calculation
          };
        } catch (e) {
          return null;
        }
      })).then(results => results.filter(r => r !== null) as PayoutData[]);

      // Calculate trend data for the last 6 months based on selected month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = monthNames.findIndex(m => selectedMonth.includes(m));
      const year = new Date().getFullYear();
      
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, monthIdx - i, 1);
        last6Months.push(d.toLocaleString('en-US', { month: 'short' }));
      }
      
      const trend = last6Months.map(month => {
        let adv = 0;
        let pay = 0;
        
        data.forEach((supplier: any) => {
          supplier.trend?.forEach((t: any) => {
            const date = new Date(t.transactionDate);
            const m = date.toLocaleString('en-US', { month: 'short' });
            if (m === month) {
              if (t.transactionType === 'ADVANCE') adv += Number(t.amount);
              if (t.transactionType === 'PAYOUT' && ['APPROVED', 'PAID', 'CLEARED'].includes(t.status)) pay += Number(t.amount);
            }
          });
        });
        
        return { month, adv, pay };
      }).filter(d => d.adv > 0 || d.pay > 0); // Filter out empty months
      
      setTrendData(trend);
      setPayouts(data);
      setServiceRequests(requests.filter((r: any) => r.requestType === 'ADVANCE' && ['APPROVED', 'APPROVED_BY_EXT', 'DISPATCHED', 'COMPLETED', 'CLEARED'].includes(r.status)));
    } catch (err) {
      console.error("Failed to fetch financial data", err);
    } finally {
      setFetchLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const openPayoutModal = (item: any) => {
    setSelectedPayout(item);
    setEditedAmount(item.netPay);
    setIsEditable(false);
    setRemark('');
    setModalOpen(true);
  };

  const openStatement = async (supplier: any) => {
    setSelectedSupplierForStatement(supplier);
    setStatementOpen(true);
    setStatementLoading(true);
    try {
      const data = await FinanceAPI.getLedgerTransactions(supplier.id);
      setStatements(data);
    } catch (err) {
      console.error("Failed to fetch statement", err);
    } finally {
      setStatementLoading(false);
    }
  };

  const openProfile = async (supplier: any) => {
    setSelectedSupplierForProfile(supplier);
    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const data = await FinanceAPI.getLedgerTransactions(supplier.id);
      setProfileTransactions(data);
    } catch (err) {
      console.error("Failed to fetch supplier profile transactions", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleConfirmPayout = async () => {
    if (!selectedPayout) return;
    
    try {
      setLoading(true);
      await FinanceAPI.processPayout({
        supplierId: selectedPayout.id,
        amount: editedAmount,
        requesterId,
        description: `STATEMENT_SUMMARY|Gross:${selectedPayout.gross}|Adv:${selectedPayout.adv}|Debt:${selectedPayout.debt}|Net:${selectedPayout.netPay}|Month:${selectedMonth}|Remark:${remark || ''}`,
        immediate: isManager 
      });
      
      setModalOpen(false);
      fetchData(); // Refresh list
      setSuccessMessage(isManager ? t('Payout processed successfully') : t('Payout request submitted to Manager'));
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = payouts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sid.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeTab === 'approvals') {
      return p.status === 'AWAITING_APPROVAL';
    } else if (activeTab === 'advances') {
      return p.adv > 0;
    } else {
      return true;
    }
  });

  const filteredAdvances = serviceRequests.filter(r => {
    const name = r.supplierName || '';
    const passbook = r.passbookNo || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || passbook.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {successMessage && (
        <Box sx={{ p: 2, borderRadius: '16px', bgcolor: '#E6F4EA', border: '1px solid #CEEAD6', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle2 size={20} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{successMessage}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setSuccessMessage(null)} sx={{ color: '#137333' }}>
            <X size={16} />
          </IconButton>
        </Box>
      )}
      {/* ── Global Due Date Selector ────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900">{t('Next Payout Date')}</span>
          <span className="text-xs font-medium text-slate-500 mt-1">{t('This date will be applied to all pending suppliers for the current cycle.')}</span>
        </div>
        <input 
          type="date" 
          value={globalDueDate}
          onChange={(e) => setGlobalDueDate(e.target.value)}
          className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl text-sm font-medium text-black focus:border-emerald-600 outline-none"
        />
      </div>

      {/* ── Top Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Wallet className="text-emerald-500" />} 
          value={`Rs. ${payouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.netPay, 0).toLocaleString()}`} 
          label={t("BALANCE PAYMENTS PENDING")} 
          sub={`${payouts.filter(p => p.status === 'PENDING').length} ${t('suppliers')}`} 
          color="emerald"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-emerald-500" />} 
          value={`Rs. ${payouts.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.netPay, 0).toLocaleString()}`} 
          label={t("PAID THIS WEEK")} 
          sub={`${payouts.filter(p => p.status === 'APPROVED').length} ${t('payments')}`} 
          color="emerald"
        />
        <StatCard 
          icon={<CreditCard className="text-amber-500" />} 
          value={`Rs. ${payouts.reduce((s, p) => s + p.adv, 0).toLocaleString()}`} 
          label={t("TOTAL ADVANCES OUT")} 
          sub={t("Current Cycle")} 
          color="amber"
        />
        <StatCard 
          icon={<AlertCircle className="text-rose-500" />} 
          value={`Rs. ${payouts.reduce((s, p) => s + p.debt, 0).toLocaleString()}`} 
          label={t("TOTAL DEBT PORTFOLIO")} 
          sub={t("All Holders")} 
          color="rose"
        />
      </div>

      {/* ── Financial Trend Chart ────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('Financial Trend (6 Months)')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('Advances vs Balance Payments (Rs.)')}</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
              <span>{t('Advances')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <span>{t('Payments')}</span>
            </div>
          </div>
        </div>
        
        <div className="relative h-64 flex items-end justify-center gap-16 pb-2">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-slate-100 w-full h-0"></div>
            <div className="border-t border-slate-100 w-full h-0"></div>
            <div className="border-t border-slate-100 w-full h-0"></div>
            <div className="border-t border-slate-100 w-full h-0"></div>
            <div className="border-t border-slate-100 w-full h-0"></div>
          </div>
          
          {/* Bars */}
          {trendData.map((data, idx) => {
            const maxVal = Math.max(...trendData.map(d => Math.max(d.adv, d.pay)), 100000);
            return (
              <div key={idx} className="flex flex-col items-center gap-2 w-20 z-10">
                <div className="flex items-end gap-2 h-48 w-full justify-center">
                  <div 
                    className="bg-gradient-to-t from-blue-600 to-blue-400 w-8 rounded-t-md transition-all duration-500 hover:from-blue-700 hover:to-blue-500 shadow-sm" 
                    style={{ height: `${(data.adv / maxVal) * 100}%` }}
                    title={`Advances: Rs. ${data.adv.toLocaleString()}`}
                  ></div>
                  <div 
                    className="bg-gradient-to-t from-emerald-600 to-emerald-400 w-8 rounded-t-md transition-all duration-500 hover:from-emerald-700 hover:to-emerald-500 shadow-sm" 
                    style={{ height: `${(data.pay / maxVal) * 100}%` }}
                    title={`Payments: Rs. ${data.pay.toLocaleString()}`}
                  ></div>
                </div>
                <span className="text-xs font-medium text-slate-500">{data.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Ledger Table ───────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-1 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('balance')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-all rounded-t-lg ${activeTab === 'balance' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Wallet size={14} /> {t('Balance Payments')}
            </button>
            <button 
              onClick={() => setActiveTab('advances')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-all rounded-t-lg ${activeTab === 'advances' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <CreditCard size={14} /> {t('Advances')} {serviceRequests.length > 0 && (
                <span className="ml-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {serviceRequests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-all rounded-t-lg ${activeTab === 'approvals' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <ShieldCheck size={14} /> {t('Approvals')} {payouts.filter(p => p.status === 'AWAITING_APPROVAL').length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {payouts.filter(p => p.status === 'AWAITING_APPROVAL').length}
                </span>
              )}
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
                <option key={m} value={m}>{m} {new Date().getFullYear()}</option>
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
              {activeTab === 'advances' ? (
                <tr className="bg-slate-100 border-b-2 border-slate-200 text-[10px] font-medium text-slate-800 uppercase tracking-widest">
                  <th className="px-6 py-4">{t('ADVANCE ID')}</th>
                  <th className="px-6 py-4">{t('SUPPLIER')}</th>
                  <th className="px-6 py-4">{t('AMOUNT')}</th>
                  <th className="px-6 py-4">{t('DATE')}</th>
                  <th className="px-6 py-4">{t('APPROVED BY')}</th>
                  <th className="px-6 py-4">{t('STATUS')}</th>
                  <th className="px-6 py-4 text-right">{t('ACTIONS')}</th>
                </tr>
              ) : (
                <tr className="bg-slate-100 border-b-2 border-slate-200 text-[10px] font-medium text-black uppercase tracking-widest">
                  <th className="px-6 py-4">{t('PAYMENT ID')}</th>
                  <th className="px-6 py-4">{t('SUPPLIER')}</th>
                  <th className="px-6 py-4 text-right">{t('GROSS (RS.)')}</th>
                  <th className="px-6 py-4 text-right">{t('ADVANCE DED.')}</th>
                  <th className="px-6 py-4 text-right">{t('DEBT DED.')}</th>
                  <th className="px-6 py-4 text-right">{t('NET PAY')}</th>
                  <th className="px-6 py-4 text-center">{t('STATUS')}</th>
                  <th className="px-6 py-4 text-center">{t('DUE/PAID')}</th>
                  <th className="px-6 py-4 text-right">{t('ACTION')}</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fetchLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={activeTab === 'advances' ? 7 : 9} className="px-6 py-4"><Skeleton variant="text" /></td>
                  </tr>
                ))
              ) : activeTab === 'advances' ? (
                filteredAdvances.length > 0 ? (
                  filteredAdvances.map((r, index) => (
                    <AdvanceItem 
                      key={r.requestId}
                      index={index}
                      request={r}
                      t={t}
                      onViewStatement={() => openStatement({ id: r.supplierId, name: r.supplierName, sid: r.passbookNo })}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-900 font-bold uppercase tracking-widest text-xs">
                      {t('No active advances found')}
                    </td>
                  </tr>
                )
              ) : filteredPayouts.length > 0 ? (
                filteredPayouts.map((p) => (
                  <PayoutItem 
                    key={p.id}
                    {...p}
                    t={t}
                    month={selectedMonth}
                    globalDueDate={globalDueDate}
                    onAction={() => openPayoutModal(p)}
                    onViewStatement={() => openStatement(p)}
                    onViewProfile={() => openProfile(p)}
                    loading={loading}
                    isManager={isManager}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === 'advances' ? 7 : 9} className="px-6 py-12 text-center text-slate-900 font-bold uppercase tracking-widest text-xs">
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
        sx={{ 
          '& .MuiDialog-paper': { borderRadius: '24px', padding: '12px', width: '100%', maxWidth: '400px' }
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 500, color: '#000000' }}>
            {selectedPayout && ['APPROVED', 'PAID', 'CLEARED'].includes(selectedPayout.status) ? t('Payment Receipt') : (isManager ? t('Confirm Payout') : t('Request Payout'))}
          </Typography>
          <IconButton onClick={() => setModalOpen(false)} disabled={loading} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
         <>
          {selectedPayout && ['APPROVED', 'PAID', 'CLEARED'].includes(selectedPayout.status) ? (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#0f172a' }}>
                {t('Payment completed for')} <span className="text-emerald-600 underline">{selectedPayout?.name}</span>
              </Typography>
              <Box sx={{ mb: 3, p: 2, borderRadius: '16px', bgcolor: 'slate.50', border: '1px solid', borderColor: 'slate.200' }}>
                <Typography variant="caption" sx={{ fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t('Amount Paid')}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#059669' }}>
                  Rs. {selectedPayout?.netPay.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ) : (
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
                    sx={{ 
                      '& .MuiInput-underline:before': { display: !isEditable ? 'none' : 'block' },
                      '& .MuiInput-underline:after': { display: !isEditable ? 'none' : 'block' },
                      '& input': { fontSize: '1.5rem', fontWeight: 500, color: isEditable ? '#1976d2' : '#000000' }
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

              {/* Remark Field */}
              <Box sx={{ mt: 2, p: 2, borderRadius: '16px', bgcolor: 'slate.50', border: '1px solid', borderColor: 'slate.200' }}>
                <Typography variant="caption" sx={{ fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t('Remarks')}
                </Typography>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder={t('Add remarks (optional)...')}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  disabled={loading}
                  multiline
                  rows={2}
                  sx={{ 
                    '& .MuiInput-underline:before': { borderBottom: 'none' },
                    '& .MuiInput-underline:after': { borderBottom: 'none' },
                    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                    fontSize: '0.875rem', 
                    fontWeight: 500, 
                    color: '#000000', 
                    mt: 1 
                  }}
                />
              </Box>
            </Box>
          )}

            {/* Official Statement Summary */}
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, fontWeight: 700, color: '#0f172a', letterSpacing: '0.05em' }}>
              {t('OFFICIAL STATEMENT SUMMARY')} ({selectedMonth} {new Date().getFullYear()})
            </Typography>
            <Box sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>{t('Gross Earnings')}</Typography>
                <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 700 }}>Rs. {selectedPayout?.gross.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>{t('Advances Deducted')}</Typography>
                <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 700 }}>- Rs. {selectedPayout?.adv.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>{t('Other Deductions (Debt)')}</Typography>
                <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 700 }}>- Rs. {selectedPayout?.debt.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ borderTop: '1px dashed #cbd5e1', my: 1.5 }}></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 800 }}>{t('Net Payable')}</Typography>
                <Typography variant="subtitle2" sx={{ color: '#059669', fontWeight: 800 }}>Rs. {selectedPayout?.netPay.toLocaleString()}</Typography>
              </Box>
            </Box>

            {/* Session Warning */}
            {requesterId === '00000000-0000-0000-0000-000000000000' && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: '12px', bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AlertCircle size={14} /> {t('Warning: Your session user ID is missing. The request might fail on the server.')}
                </Typography>
              </Box>
            )}
         </>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {selectedPayout && ['APPROVED', 'PAID', 'CLEARED'].includes(selectedPayout.status) ? (
            <Button 
              fullWidth 
              onClick={() => setModalOpen(false)}
              variant="contained" 
              sx={{ 
                borderRadius: '16px', 
                py: 1.5, 
                fontWeight: 500, 
                bgcolor: '#64748b',
                '&:hover': { bgcolor: '#475569' }
              }}
            >
              {t('CLOSE')}
            </Button>
          ) : (
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
          )}
        </DialogActions>
      </Dialog>

      {/* ── Statement Dialog ───────────────────── */}
      <Dialog 
        open={statementOpen} 
        onClose={() => setStatementOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: '24px', padding: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>{t('Account Statement')} - {selectedSupplierForStatement?.name}</Typography>
          <IconButton onClick={() => setStatementOpen(false)} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {statementLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : statements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-medium text-black uppercase tracking-widest">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statements.map((s: any) => (
                    <tr key={s.transactionId} className="text-sm">
                      <td className="px-4 py-3">{new Date(s.transactionDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{s.description}</td>
                      <td className="px-4 py-3 font-medium">{s.transactionType}</td>
                      <td className="px-4 py-3 text-right font-bold">Rs. {s.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold ${s.status === 'APPROVED' || s.status === 'CLEARED' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              No transactions found for this supplier.
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Supplier Profile Pop-up Sheet ───────────────────── */}
      <Dialog 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{ 
          '& .MuiDialog-paper': { borderRadius: '28px', overflow: 'hidden', padding: 0, bgcolor: '#f8fafc' }
        }}
      >
        <div className="flex flex-col md:flex-row h-full min-h-[500px]">
          {/* LEFT PANEL: PROFILE SUMMARY (40% width) */}
          <div className="w-full md:w-[40%] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 text-white flex flex-col justify-between border-r border-slate-700">
            <div>
              {/* Header Close button */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                    {t('Supplier Profile')}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-slate-300 border border-white/15 px-3 py-1 rounded-full">
                    {selectedMonth.toUpperCase()}{/\d{4}/.test(selectedMonth) ? '' : ` ${new Date().getFullYear()}`}
                  </span>
                </div>
                <IconButton onClick={() => setProfileOpen(false)} sx={{ color: 'white', p: 0.5 }}>
                  <X size={18} />
                </IconButton>
              </div>

              {/* Avatar and Info */}
              <div className="flex items-center gap-4 mt-6 mb-8">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
                  {selectedSupplierForProfile?.name ? selectedSupplierForProfile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'SH'}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">{selectedSupplierForProfile?.name}</h3>
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">{selectedSupplierForProfile?.sid}</p>
                </div>
              </div>

              <div className="border-t border-slate-700/60 my-6"></div>

              {/* Monthly Stats Summary */}
              <div className="space-y-5">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Gross Earnings')} ({selectedMonth})</span>
                  <p className="text-xl font-extrabold text-white mt-1">Rs. {selectedSupplierForProfile?.gross.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-400 font-medium mt-1">
                    {selectedSupplierForProfile?.leafKg || 0} kg @ Rs. {selectedSupplierForProfile?.rate || 0}/kg
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Outstanding Debt')}</span>
                  <p className="text-xl font-extrabold text-rose-400 mt-1">Rs. {(selectedSupplierForProfile?.debt + selectedSupplierForProfile?.adv || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    {t('Advances')}: Rs. {selectedSupplierForProfile?.adv.toLocaleString()} | {t('Service Debts')}: Rs. {selectedSupplierForProfile?.debt.toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 border border-emerald-500/20 rounded-2xl p-4 shadow-inner">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">{t('Net Payout Estimate')}</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">Rs. {selectedSupplierForProfile?.netPay.toLocaleString()}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${selectedSupplierForProfile?.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                    {t(selectedSupplierForProfile?.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-8">
              Dalupotha Estate Financials
            </div>
          </div>

          {/* RIGHT PANEL: CATEGORIZED DEBT PORTFOLIO (60% width) */}
          <div className="w-full md:w-[60%] p-8 flex flex-col justify-between overflow-y-auto max-h-[600px]">
            <div>
              {/* Section 1: Debt Portfolio */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-950 mb-4">{t('Categorized Debt Portfolio')}</h4>
                
                {profileLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                ) : (() => {
                  const debts = profileTransactions.filter(t => 
                    (t.transactionType === 'DEBT' || t.transactionType === 'ADVANCE') && 
                    t.amount > 0 && t.status !== 'FAILED'
                  );
                  
                  if (debts.length === 0) {
                    return (
                      <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-150">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('No Outstanding Debts')}</p>
                        <p className="text-slate-500 text-xs mt-1">{t('This supplier has a clean financial sheet with no deductions.')}</p>
                      </div>
                    );
                  }

                  // Helper function to categorize into pure, exact category names
                  const getCategoryInfo = (desc: string) => {
                    const d = desc?.toUpperCase() || '';
                    if (d.includes('FERTILIZER')) return { label: t('Fertilizer'), color: 'bg-emerald-500' };
                    if (d.includes('BAG') || d.includes('LEAF_BAG')) return { label: t('Leaf Bags'), color: 'bg-blue-500' };
                    if (d.includes('TRANSPORT')) return { label: t('Transport'), color: 'bg-orange-500' };
                    if (d.includes('TOOL') || d.includes('MACHINE')) return { label: t('Tools & Machinery'), color: 'bg-purple-500' };
                    // Default fallback to advances for anything else like requested via mobile, need now, advance, etc.
                    return { label: t('Advances'), color: 'bg-amber-500' };
                  };

                  // Group by category and month of the transaction
                  const categories: Record<string, { amount: number; color: string; label: string; monthStr: string }> = {};
                  debts.forEach(d => {
                    const info = getCategoryInfo(d.description || d.transactionType);
                    const txDate = new Date(d.transactionDate);
                    const monthName = txDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    const key = `${info.label}-${monthName}`;
                    if (!categories[key]) {
                      categories[key] = { amount: 0, color: info.color, label: info.label, monthStr: monthName };
                    }
                    categories[key].amount += Number(d.amount);
                  });

                  const totalDebt = Object.values(categories).reduce((sum, c) => sum + c.amount, 0);

                  return (
                    <div className="space-y-4">
                      {Object.values(categories).map((c, idx) => {
                        const pct = totalDebt > 0 ? (c.amount / totalDebt) * 100 : 0;
                        return (
                          <div key={idx} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-sm font-black text-slate-900 block">{c.label}</span>
                                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 block">{c.monthStr}</span>
                              </div>
                              <span className="text-sm font-black text-slate-950">Rs. {c.amount.toLocaleString()}</span>
                            </div>
                            {/* Modern slider / progress bar */}
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium">
                              <span>{pct.toFixed(0)}% of total deductions</span>
                              <span>Active</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer close action */}
            <div className="pt-6 border-t border-slate-150 flex justify-end mt-8">
              <Button 
                onClick={() => setProfileOpen(false)}
                variant="contained" 
                sx={{ 
                  borderRadius: '16px', 
                  px: 4,
                  py: 1, 
                  fontWeight: 500, 
                  bgcolor: '#0f172a',
                  '&:hover': { bgcolor: '#1e293b' }
                }}
              >
                {t('Done')}
              </Button>
            </div>
          </div>
        </div>
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

function AdvanceItem({ index, request, t, onViewStatement }: any) {
  const advanceId = `ADV-${String(index + 1).padStart(3, '0')}`;
  
  const getStatusDisplay = () => {
    const s = request.status;
    if (s === 'PENDING') {
      return { label: 'REVIEW', color: 'bg-[#FEF3C7] text-[#B45309]' };
    }
    if (s === 'APPROVED' || s === 'APPROVED_BY_EXT') {
      return { label: 'APPROVED', color: 'bg-[#D1FAE5] text-[#065F46]' };
    }
    if (s === 'DISPATCHED' || s === 'COMPLETED') {
      return { label: 'CLEARED', color: 'bg-[#D1FAE5] text-[#065F46]' };
    }
    return { label: s || 'REVIEW', color: 'bg-[#FEF3C7] text-[#B45309]' };
  };

  const statusInfo = getStatusDisplay();
  
  const dateStr = request.requestDate ? new Date(request.requestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Active';
  
  const approverDisplay = request.status === 'PENDING' ? 'Pending' : `MG-00${(request.approverId ? request.approverId.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % 2 + 1 : 1)}`;

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4 text-xs font-black text-slate-800">
        {advanceId}
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-black text-slate-900 leading-none">
          {request.supplierName || 'Unknown Supplier'}
        </p>
        <p className="text-[11px] font-bold text-slate-400 mt-2 tracking-wider">
          {request.passbookNo || 'SH-XXXX'}
        </p>
      </td>
      <td className="px-6 py-4 text-sm font-black text-slate-900">
        Rs. {Number(request.approvedAmount || request.requestedAmount || 0).toLocaleString()}
      </td>
      <td className="px-6 py-4 text-xs font-bold text-slate-500">
        {dateStr}
      </td>
      <td className="px-6 py-4 text-xs font-bold text-slate-600">
        {approverDisplay}
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide ${statusInfo.color}`}>
          {t(statusInfo.label)}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button 
          onClick={onViewStatement}
          className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
        >
          {t('Detail')}
        </button>
      </td>
    </tr>
  );
}

function PayoutItem({ id, name, sid, gross, adv, debt, qual, netPay, status, date, t, onAction, onViewStatement, onViewProfile, loading, isManager, month, globalDueDate }: any) {
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
    if (status === 'AWAITING_APPROVAL') return isManager ? t('VIEW & APPROVE') : t('SENT');
    if (status === 'PENDING') return t('PAY');
    if (status === 'DISPATCHED' || status === 'APPROVED' || status === 'PAID' || status === 'CLEARED') return t('VIEW');
    return null;
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-slate-800">{paymentId}</p>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-slate-900 leading-none flex items-center gap-2">
          {name}
          <IconButton size="small" onClick={onViewStatement} title={t('View Statement')} sx={{ p: 0.5 }}>
            <FileText size={14} className="text-slate-400 hover:text-emerald-600" />
          </IconButton>
        </p>
        <p className="text-[12px] font-medium text-slate-500 mt-2 uppercase tracking-wider">{sid}</p>
      </td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">Rs. {gross.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">-Rs. {adv.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[13px] font-medium text-slate-700">-Rs. {debt.toLocaleString()}</td>
      <td className="px-6 py-4 text-right text-[14px] font-medium text-slate-900">Rs. {net.toLocaleString()}</td>
      <td className="px-6 py-4 text-center">
        {(() => {
          const isPaid = ['PAID', 'APPROVED', 'SETTLED', 'DISPATCHED', 'CALCULATED', 'APPROVED_BY_EXT'].includes(status);
          const displayLabel = status === 'AWAITING_APPROVAL' ? 'AWAITING APPROVAL' : (isPaid ? 'PAID' : 'PENDING');
          const colorClass = isPaid ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#B45309]';
          return (
            <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold ${colorClass}`}>
              {t(displayLabel)}
            </span>
          );
        })()}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-xs font-medium text-slate-600">
          {new Date(globalDueDate).toLocaleDateString('en-GB')}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={onViewProfile}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm border border-slate-200 whitespace-nowrap"
          >
            {t('Profile')}
          </button>
          {status !== 'PAID' && status !== 'SETTLED' && getActionLabel() ? (
            <button 
              onClick={onAction}
              disabled={loading || net <= 0 || (status === 'AWAITING_APPROVAL' && !isManager)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all shadow-md whitespace-nowrap
                ${status === 'AWAITING_APPROVAL' 
                  ? 'bg-amber-600 text-white hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400' 
                  : net <= 0 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
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
        </div>
      </td>
    </tr>
  );
}
