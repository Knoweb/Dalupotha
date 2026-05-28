import { useEffect, useState, useCallback, useRef } from "react"
import { CheckCircle2, XCircle, Eye, RefreshCw, Search, Download, X, Lightbulb, Package, AlertTriangle, Clock, Truck, Pencil, Check } from "lucide-react"
import { CollectionAPI, FinanceAPI, ServiceRequest, RequestStatus, InventoryAPI, InventoryItem } from "../../services/api"
import { useLanguage } from "../../hooks/useLanguage"
import { useNotifications } from "../../hooks/useNotifications"
import { useToast } from "../../hooks/useToast"

const TYPE_FILTERS = ["All Types", "Advance", "Fertilizer", "Transport", "Machine Rent", "Tools", "Advisory", "Leaf Bags"]

// Global caches to persist across re-renders and avoid redundant fetches
const USER_INFO_CACHE: Record<string, any> = {};
const FAILED_USER_FETCHES = new Set<string>(JSON.parse(sessionStorage.getItem('failed_users') || '[]'));
const USER_FETCH_PROMISES = new Map<string, Promise<any>>();

function markFailed(id: string) {
  FAILED_USER_FETCHES.add(id);
  sessionStorage.setItem('failed_users', JSON.stringify([...FAILED_USER_FETCHES]));
}

/** Helper to fetch user with deduplication and caching */
async function getCachedUser(id: string) {
  if (!id || id === "---" || id.startsWith("00000000") || id.startsWith("11111111") || id.startsWith("d6417896") || id.length < 10) {
    throw new Error("Mock ID");
  }
  
  if (USER_INFO_CACHE[id]) return USER_INFO_CACHE[id];
  if (FAILED_USER_FETCHES.has(id)) throw new Error("Cached failure");
  
  if (USER_FETCH_PROMISES.has(id)) {
    return USER_FETCH_PROMISES.get(id);
  }

  const promise = fetch(`/api/auth/users/${id}`).then(async r => {
    if (!r.ok) {
      markFailed(id);
      throw new Error();
    }
    const data = await r.json();
    USER_INFO_CACHE[id] = data;
    return data;
  }).finally(() => {
    USER_FETCH_PROMISES.delete(id);
  });

  USER_FETCH_PROMISES.set(id, promise);
  return promise;
}

const TYPE_META_KEYS: Record<string, { label: string; color: string }> = {
  ADVANCE:       { label: "Advance",       color: "text-green-600 font-semibold" },
  FERTILIZER:    { label: "Fertilizer",    color: "text-green-500 font-semibold" },
  TOOL_RENT:     { label: "Machine Rent",  color: "text-purple-600 font-semibold" },
  TOOL_PURCHASE: { label: "Tool Purchase", color: "text-teal-600 font-semibold" },
  ADVISORY:      { label: "Advisory",      color: "text-orange-500 font-semibold" },
  LEAF_BAG:      { label: "Leaf Bags",     color: "text-green-400 font-semibold" },
  TRANSPORT:     { label: "Transport",     color: "text-blue-500 font-semibold" },
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:         "bg-yellow-100 text-yellow-700",
  REVIEW:          "bg-blue-100 text-blue-600",
  APPROVED_BY_EXT: "bg-green-100 text-green-700",
  REJECTED:        "bg-red-100 text-red-500",
  DISPATCHED:      "bg-purple-100 text-purple-600",
  CANCELLED:       "bg-slate-100 text-slate-900",
}

function getAmountQty(req: ServiceRequest, t: any): string {
  if (req.requestType === "ADVANCE") return `Rs. ${Number(req.requestedAmount || 0).toLocaleString()}`
  if (req.requestType === "FERTILIZER") return `${Number(req.quantity || 0)} kg`
  if (req.requestType === "LEAF_BAG") return `${Number(req.quantity || 0)} ${t('bags')}`
  if (req.requestType === "TOOL_RENT") {
    return `${Number(req.quantity || 1)} ${t('units')}`;
  }
  if (req.requestType === "ADVISORY") return t(req.itemType || req.notes || "Soil query")
  if (req.requestType === "TRANSPORT") return t("Provision")
  return `${Number(req.quantity || 0)} ${t('units')}`
}

function formatDate(str: string, lang: string) {
  return new Date(str).toLocaleDateString(lang === 'si' ? 'si-LK' : 'en-GB', { day: "2-digit", month: "short", year: "numeric" })
}

function formatTime(str: string) {
  return new Date(str).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
}

function matchesFilter(req: ServiceRequest, filter: string) {
  if (filter === "All Types") return true
  if (filter === "Advance") return req.requestType === "ADVANCE"
  if (filter === "Fertilizer") return req.requestType === "FERTILIZER"
  if (filter === "Machine Rent") return req.requestType === "TOOL_RENT"
  if (filter === "Tools") return req.requestType === "TOOL_PURCHASE"
  if (filter === "Transport") return req.requestType === "TRANSPORT"
  if (filter === "Advisory") return req.requestType === "ADVISORY"
  if (filter === "Leaf Bags") return req.requestType === "LEAF_BAG"
  return true
}

function calcSupplierMonthSupplyKg(history: Array<{ collectedAt: string; netWeight?: number; grossWeight?: number }>): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return history.reduce((sum, item) => {
    const date = new Date(item.collectedAt);
    if (Number.isNaN(date.getTime())) return sum;
    if (date.getFullYear() !== year || date.getMonth() !== month) return sum;
    const weight = Number(item.netWeight ?? item.grossWeight ?? 0);
    return sum + (Number.isFinite(weight) ? weight : 0);
  }, 0);
}

function ViewModal({ req, code, debt, supplyThisMonth, onClose, onApprove, onReject, onAction, processing }: {
  req: ServiceRequest;
  code: string;
  debt: number | null;
  supplyThisMonth: number | null;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  onAction: (status: RequestStatus, comment: string) => void;
  processing: boolean;
}) {
  const { t, lang } = useLanguage();
  const [comment, setComment] = useState("")
  const [customAmount, setCustomAmount] = useState<string>(
    req.approvedAmount?.toString() || 
    (req.requestType === "TOOL_RENT" ? "" : req.requestedAmount?.toString()) || 
    ""
  )
  const [dailyRate, setDailyRate] = useState<string>("")
  const [creatorInfo, setCreatorInfo] = useState<{ fullName: string; employeeId?: string; role?: string } | null>(null)
  const [approverInfo, setApproverInfo] = useState<{ fullName: string; role?: string } | null>(null)
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isAmountEditable, setIsAmountEditable] = useState(req.requestType === "TOOL_RENT")

  useEffect(() => {
    if (!req.createdById) return
    fetch(`/api/auth/users/${req.createdById}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCreatorInfo({ fullName: d.fullName, employeeId: d.employeeId || d.passbookNo, role: d.role }) })
      .catch(() => {})
  }, [req.createdById])

  useEffect(() => {
    if (!req.approverId) return
    fetch(`/api/auth/users/${req.approverId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setApproverInfo({ fullName: d.fullName, role: d.role }) })
      .catch(() => {})
  }, [req.approverId])
  useEffect(() => {
    const fetchPrices = async () => {
      if (req.requestType === "ADVANCE") return;
      
      setFetchingPrice(true);
      setFetchError(null);
      
      try {
        let total = 0;
        let mainItem: InventoryItem | null = null;

        // Handle List of items (JSON)
        if (req.itemDetails) {
          try {
            const items = JSON.parse(req.itemDetails);
            if (Array.isArray(items)) {
              for (const it of items) {
                const inv = await InventoryAPI.getItem(it.itemId || it.id);
                if (inv) {
                  const itemDays = req.requestType === "TOOL_RENT" ? (Number(it.days || req.days || 1)) : 1;
                  total += (Number(inv.unitCost) || 0) * (Number(it.quantity) || 0) * itemDays;
                }
              }
            }
          } catch (e) { console.error("JSON parse error", e); }
        } 
        
        // Handle Single item fallback
        if (total === 0 && req.itemId) {
          const inv = await InventoryAPI.getItem(req.itemId);
          if (inv) {
            mainItem = inv;
            const itemDays = req.requestType === "TOOL_RENT" ? (Number(req.days || 1)) : 1;
            total = (Number(inv.unitCost) || 0) * (Number(req.quantity) || 1) * itemDays;
          }
        }

        if (total > 0 || req.itemId) {
          setInventoryItem(mainItem); // Set main item for UI if single
          const currentAmount = Number(req.approvedAmount || req.requestedAmount || 0);
          if (req.requestType === "TOOL_RENT") {
            setCustomAmount(req.approvedAmount ? req.approvedAmount.toString() : "");
          } else {
            // Only auto-sync if we don't have a valid stored amount or if it's 0
            if (currentAmount === 0 || !req.approvedAmount) {
              setCustomAmount(total.toString());
            } else {
              setCustomAmount(currentAmount.toString());
            }
          }
        }
      } catch (err) {
        setFetchError("Connection error to inventory service");
      } finally {
        setFetchingPrice(false);
      }
    };

    fetchPrices();
  }, [req.itemId, req.itemDetails, req.requestType, req.requestedAmount, req.approvedAmount, req.quantity, req.days])


  const debtVal = debt ?? 0
  const supplyVal = supplyThisMonth ?? 0
  const meta = TYPE_META_KEYS[req.requestType] || { label: req.requestType, color: "text-slate-950 font-medium" }
  const isPending = req.status === "PENDING" || req.status === "REVIEW"
  const userRole = sessionStorage.getItem('user_role');
  const isStoreKeeper = userRole === 'store-keeper';
  const canDispatch = isStoreKeeper && req.status === 'APPROVED_BY_EXT';

  const isDirect = creatorInfo?.role === 'SH' || creatorInfo?.role === 'supplier' || req.createdById === req.supplierId || (creatorInfo?.fullName && req.supplierName && creatorInfo.fullName.trim() === req.supplierName.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">{t('Request Detail')} - {code}</h2>
          <button onClick={onClose} className="text-slate-900 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className={`px-5 py-3 grid gap-3 ${req.requestType === 'ADVISORY' ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2">
              {req.requestType === 'ADVISORY' ? t('Advisory Request Info') : t('Supplier Info')}
            </p>
            {[
              { label: t("Supplier"),     value: req.supplierName || "---" },
              { label: t("Passbook ID"),  value: req.passbookNo || "---" },
              { label: t("Request Type"), value: t(meta.label) },
              { label: t("Requested At"), value: (
                <div className="flex flex-col items-end">
                  <span>{formatDate(req.requestDate, lang)}</span>
                  <span className="text-[10px] text-slate-500 font-medium -mt-1">{formatTime(req.requestDate)}</span>
                </div>
              )},
              { label: t("Assigned Agent"), value: req.assignedAgentName || t("Not Assigned") },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-[11px] font-medium text-slate-950">{row.label}</span>
                <div className={`text-sm font-bold ${row.label === t('Assigned Agent') ? (req.assignedAgentName ? 'text-blue-600' : 'text-slate-900') : 'text-slate-800'}`}>{row.value}</div>
              </div>
            ))}
          </div>

          {(() => {
            let parsedDetails: Array<{ type?: string; itemName?: string; quantity: number | string; unit?: string; days?: string }> = [];
            try {
              if (req.itemDetails) {
                const parsed = JSON.parse(req.itemDetails);
                if (Array.isArray(parsed)) {
                  parsedDetails = parsed;
                }
              }
            } catch (e) {}

            return (
              req.requestType !== 'ADVISORY' && (
                <div className="flex flex-col gap-3">
                  {!isStoreKeeper && (
                    <div className="bg-slate-50 rounded-xl p-3 flex-1">
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2">{t('Financial Standing')}</p>
                      {[
                        { label: t("Outstanding Debt"),  value: `Rs. ${debtVal.toLocaleString()}` },
                        { label: t("Supply This Month"), value: `${supplyVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg` },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                          <span className="text-[11px] font-medium text-slate-950">{row.label}</span>
                          <span className="text-sm font-bold text-slate-800">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {req.requestType === 'TRANSPORT' ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                          <Truck size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('Transport Service')}</p>
                          <p className="text-sm font-bold text-slate-800 leading-none">{t(req.notes || "Standard Transport")}</p>
                          <p className="text-xs font-semibold text-slate-950">{t('Service Category')}: {t('Logistic')}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-blue-100 flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{t('Transport Fee (Rs.)')}</p>
                        <div className="bg-white/50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-base font-black text-blue-700">Rs. {Number(isPending ? customAmount : req.approvedAmount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ) : req.requestType === 'TOOL_RENT' ? (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-purple-600 shadow-sm border border-purple-50">
                          <Clock size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t('Rental Configuration')}</p>
                          <p className="text-sm font-bold text-slate-800 leading-none">{t(inventoryItem?.itemName || "Rental Machine")}</p>
                          <p className="text-xs font-semibold text-slate-950">{t('Duration')}: {req.days || req.quantity || 0} {t('Days')}</p>
                        </div>
                      </div>
                      {parsedDetails.length > 0 && (
                        <div className="pt-2 border-t border-purple-100 flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{t('Requested Items')}</p>
                          <div className="flex flex-col gap-1.5 bg-white/40 border border-purple-100 rounded-lg p-2">
                            {parsedDetails.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-850">
                                <span>{t(item.type || item.itemName || '')}</span>
                                <span className="text-purple-700 font-extrabold">
                                  {item.quantity} {t(item.unit || 'units')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-purple-100 flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{t('Total Rental Fee (Rs.)')}</p>
                        <div className="bg-white/50 border border-purple-100 rounded-lg px-3 py-2">
                           <p className="text-base font-black text-purple-700">Rs. {Number(isPending ? customAmount : req.approvedAmount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ) : (inventoryItem || req.itemDetails) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                          <Package size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('Inventory Pricing')}</p>
                          <p className="text-sm font-bold text-slate-800 leading-none">
                            {inventoryItem ? t(inventoryItem.itemName) : t('Multiple Items List')}
                          </p>
                          {inventoryItem && <p className="text-xs font-semibold text-slate-950">Rs. {Number(inventoryItem.unitCost).toLocaleString()} / {t(inventoryItem.unit || 'unit')}</p>}
                        </div>
                      </div>
                      {parsedDetails.length > 0 && (
                        <div className="pt-2 border-t border-blue-100 flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">{t('Requested Items')}</p>
                          <div className="flex flex-col gap-1.5 bg-white/40 border border-blue-100 rounded-lg p-2">
                            {parsedDetails.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-850">
                                <span>{t(item.type || item.itemName || '')}</span>
                                <span className="text-blue-700 font-extrabold">
                                  {item.quantity} {t(item.unit || (req.requestType?.startsWith('TOOL') ? 'units' : 'kg'))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-blue-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-900 uppercase">{t('Calculated Total')}</span>
                        <span className="text-base font-black text-blue-700">Rs. {Number(customAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            );
          })()}
        </div>

        <div className="px-5 pb-3">
          <div className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{t('Source')}</p>
                <div className={`mt-0.5 text-[10px] px-2 py-0.5 rounded-full inline-block text-center font-bold uppercase ${isDirect ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isDirect ? t('Direct') : t('Agent')}
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-tight">{isDirect ? t('Supplier') : t('Agent')}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {creatorInfo?.fullName || (isDirect ? req.supplierName : (req.creatorName || "---"))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-tight">{t('Requested Item')}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                   {t(inventoryItem?.itemName || req.itemType || meta.label)}
                </p>
              </div>
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />
              <div>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-tight">{t('Quantity')}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                   {getAmountQty(req, t)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {req.notes && (
          <div className="px-5 pb-3">
            <div className="bg-green-50/50 border border-green-100 rounded-xl px-4 py-2.5">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">{isDirect ? t('Supplier Note') : t('Agent Note')}</p>
              <p className="text-sm text-slate-900 leading-relaxed font-bold whitespace-pre-wrap break-words">{req.notes}</p>
            </div>
          </div>
        )}

        {!isPending && (
          <div className="px-7 pb-4">
             <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{t('Decision Status')}</p>
                  <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{req.status === 'REJECTED' ? t('Rejected At') : t('Approved At')}</p>
                </div>
                <div className="flex justify-between items-center">
                   <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                     {req.status === 'REJECTED' ? t('REJECTED') : t('APPROVED')}
                   </span>
                   {approverInfo && (
                     <div className="flex flex-col items-end">
                       <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/50 flex flex-col items-end shadow-sm">
                         <p className="text-xs font-bold text-slate-800 leading-none mb-1">{approverInfo.fullName}</p>
                         <p className="text-[10px] text-slate-950 font-bold uppercase tracking-tight leading-none">
                           {t(approverInfo.role === 'EXT' ? 'Extension Officer' : 
                            approverInfo.role === 'MG' ? 'Factory Manager' : 
                            approverInfo.role === 'ADMIN' ? 'Administrator' : approverInfo.role || 'Officer')}
                         </p>
                       </div>
                     </div>
                   )}
                   <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{formatDate(req.updatedAt, lang)}</p>
                      <p className="text-[10px] text-slate-900">{formatTime(req.updatedAt)}</p>
                   </div>
                </div>
                {(req.approverComment || (req as any).approver_comment) && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest mb-1">{t('Manager Remarks')}</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[15px] font-bold text-slate-900 leading-relaxed italic whitespace-pre-wrap break-words">"{req.approverComment || (req as any).approver_comment}"</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {isPending && (
          <div className="px-7 pb-4 grid grid-cols-3 gap-4">
            {req.requestType !== 'ADVISORY' && (
              <div className="col-span-1">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{t('Final Deduction (Rs.)')}</p>
                  {inventoryItem && (
                    <span className="text-[9px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                      Rs. {Number(inventoryItem.unitCost).toLocaleString()} x {req.quantity || 1}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 font-bold text-sm">Rs.</span>
                  <input 
                    type="number" 
                    value={customAmount} 
                    onChange={e => setCustomAmount(e.target.value)} 
                    placeholder="0"
                    readOnly={!isAmountEditable}
                    className={`w-full border rounded-xl pl-12 pr-10 py-3 text-lg font-black text-slate-800 outline-none transition-all ${isAmountEditable ? "bg-white border-blue-400 ring-2 ring-blue-100 shadow-sm" : "bg-slate-50 border-slate-200 cursor-not-allowed"} ${(!customAmount || Number(customAmount) === 0) ? "ring-2 ring-orange-400 border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.4)] animate-pulse" : ""}`} 
                  />
                  <button 
                    onClick={() => setIsAmountEditable(!isAmountEditable)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors group ${isAmountEditable ? "bg-green-100 hover:bg-green-200" : "hover:bg-blue-50"}`}
                    title={isAmountEditable ? t("Confirm Amount") : t("Edit Amount")}
                  >
                    {isAmountEditable ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Pencil size={14} className="text-slate-400 group-hover:text-blue-500" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div className={req.requestType === 'ADVISORY' ? "col-span-3" : "col-span-2"}>
              <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest mb-2">{t('Manager Remark')}</p>
              <textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                placeholder={t("Add comment (optional)...")} 
                rows={1}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-900 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none" 
              />
            </div>
          </div>
        )}

        <div className="px-7 py-4 border-t border-slate-100 flex justify-end gap-3">
          {isPending ? (
            <>
              <button disabled={processing} onClick={() => onReject(comment)} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 shadow-sm">
                <XCircle size={16} /> {req.requestType === 'ADVISORY' ? t('Dismiss Request') : t('Reject Request')}
              </button>
              <button disabled={processing} onClick={() => onApprove(comment + "|||" + customAmount)} className="inline-flex items-center gap-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 shadow-sm">
                <CheckCircle2 size={16} /> 
                {req.requestType === 'ADVISORY' ? t('Send Advice') : 
                 (['FERTILIZER', 'LEAF_BAG', 'TOOL_PURCHASE', 'TOOL_RENT'].includes(req.requestType) ? t('Approve & Send to Store Keeper') : t('Approve Request'))}
              </button>
            </>
          ) : canDispatch ? (
            <button disabled={processing} onClick={() => onAction('DISPATCHED', comment)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
              <Package size={16} /> {t('Confirm Dispatch')}
            </button>
          ) : (
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">{t('Close')}</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const { t, lang } = useLanguage();
  const { notifications } = useNotifications();
  const { success, error } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const initialLoadedRef = useRef(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [search, setSearch] = useState("")
  const [debtMap, setDebtMap] = useState<Record<string, number>>({})
  const [supplyMap, setSupplyMap] = useState<Record<string, number>>({})
  const [approverMap, setApproverMap] = useState<Record<string, string>>({})
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({})
  const [viewReq, setViewReq] = useState<{ req: ServiceRequest; code: string } | null>(null)
  const [inventoryMap, setInventoryMap] = useState<Record<string, { stock: number; unit: string }>>({})
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")

  useEffect(() => {
    const handleRedirect = () => {
      setStatusFilter('PENDING');
    };
    window.addEventListener('approvals-tab-redirect', handleRedirect);
    return () => window.removeEventListener('approvals-tab-redirect', handleRedirect);
  }, []);

  const loadRequests = useCallback(async () => {
    if (!initialLoadedRef.current) {
      setLoading(true)
    }
    setRefreshing(true)
    const userRole = sessionStorage.getItem('user_role');
    const estateId = sessionStorage.getItem('estate_id') || undefined;
    try {
      const pendingStatus = userRole === 'store-keeper' ? 'APPROVED_BY_EXT' : 'PENDING';
      const approvedStatus = userRole === 'store-keeper' ? 'DISPATCHED' : 'APPROVED_BY_EXT';
      
      const pParams: Record<string, string> = { status: pendingStatus };
      const aParams: Record<string, string> = { status: approvedStatus };
      const rParams: Record<string, string> = { status: 'REJECTED' };
      if (estateId) {
        pParams.estateId = estateId;
        aParams.estateId = estateId;
        rParams.estateId = estateId;
      }

      const [p, a, r] = await Promise.all([
        FinanceAPI.getRequests(pParams),
        FinanceAPI.getRequests(aParams),
        FinanceAPI.getRequests(rParams),
      ])
      const sorted = [...[...p, ...a, ...r]].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
      setRequests(sorted)
      
      if (userRole === 'store-keeper') {
        InventoryAPI.getItems(estateId).then(items => {
          const map: Record<string, { stock: number; unit: string }> = {}
          items.forEach(item => {
            map[item.itemId] = { stock: item.quantityInStock, unit: item.unit || '' }
          })
          setInventoryMap(map)
        }).catch(err => console.error("Failed to load inventory map", err))
      }

      const activeIds = [...new Set(sorted.filter(r => r.status === "PENDING" || r.status === "APPROVED_BY_EXT").map(r => r.supplierId))]
      const dmap: Record<string, number> = {}
      const smap: Record<string, number> = {}
      await Promise.allSettled(activeIds.map(async id => {
        try { 
          const ledger = await FinanceAPI.getSupplierLedger(id);
          dmap[id] = (ledger.currentDebt ?? 0) + (ledger.advanceTaken ?? 0);
        }
        catch { dmap[id] = 0 }

        try {
          const history = await CollectionAPI.getSupplierHistory(id, 250)
          smap[id] = calcSupplierMonthSupplyKg(history || [])
        } catch {
          smap[id] = 0
        }
      }))
      setDebtMap(dmap)
      setSupplyMap(smap)
      
      const approverIds = [...new Set(sorted.filter(r => r.approverId).map(r => r.approverId!))]
      const amap: Record<string, string> = {}
      await Promise.allSettled(approverIds.map(async id => {
        if (approverMap[id] && approverMap[id] !== "---") return
        try {
          const u = await getCachedUser(id);
          const val = u.employeeId || u.fullName
          amap[id] = (val && !val.startsWith("11111111")) ? val : "---"
        } catch { 
          amap[id] = "---" 
        }
      }))
      setApproverMap(prev => ({ ...prev, ...amap }))

      const creatorIds = [...new Set(sorted.filter(r => r.createdById).map(r => r.createdById))]
      const cmap: Record<string, string> = {}
      await Promise.allSettled(creatorIds.map(async id => {
        if (creatorMap[id] && creatorMap[id] !== "---") return
        if (FAILED_USER_FETCHES.has(id)) {
          cmap[id] = "---";
          return;
        }
        try {
          const u = await getCachedUser(id);
          const cid = u.employeeId || u.passbookNo || u.passbook_no;
          cmap[id] = cid ? `${u.fullName} (${cid})` : u.fullName || "---"
        } catch { 
          cmap[id] = "---" 
        }
      }))
      setCreatorMap(prev => ({ ...prev, ...cmap }))
    } catch (err) { console.error(err) }
    finally {
      setLoading(false)
      setRefreshing(false)
      initialLoadedRef.current = true
    }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  const prevLengthRef = useRef(notifications.length);
  useEffect(() => {
    const latest = notifications[0];
    if (latest && latest.type === 'service_request' && !latest.read && notifications.length > prevLengthRef.current) {
      loadRequests();
    }
    prevLengthRef.current = notifications.length;
  }, [notifications.length, loadRequests]);

  const handleAction = async (requestId: string, status: RequestStatus, payload?: string) => {
    setProcessingId(requestId)
    try {
      let remark = payload;
      let amount: number | undefined = undefined;

      if (payload && payload.includes("|||")) {
        const parts = payload.split("|||");
        remark = parts[0];
        amount = parts[1] ? Number(parts[1]) : undefined;
      }

      await FinanceAPI.updateStatus(requestId, status, sessionStorage.getItem("current_user_id") || "", remark, amount)
      success(status === "REJECTED" ? t("Request rejected successfully") : t("Request approved successfully"))
      setViewReq(null)
      loadRequests()
      // Notify layout to refresh global alert counts
      window.dispatchEvent(new CustomEvent('refresh-alerts'));
    } catch (err: any) { error(err?.message || t("Action failed.")) }
    finally { setProcessingId(null) }
  }

  const userRole = sessionStorage.getItem('user_role');

  const allowedRequests = requests.filter(r => {
    if (userRole === 'store-keeper') {
      return ["FERTILIZER", "LEAF_BAG", "TOOL_PURCHASE", "TOOL_RENT"].includes(r.requestType);
    }
    return true;
  });

  const pending = allowedRequests.filter(r => {
    if (userRole === 'store-keeper') {
      return r.status === "APPROVED_BY_EXT";
    }
    return r.status === "PENDING";
  }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  
  const approvedToday  = allowedRequests.filter(r => (r.status === "APPROVED_BY_EXT" || r.status === "DISPATCHED") && new Date(r.updatedAt).toDateString() === new Date().toDateString())
  const rejectedToday  = allowedRequests.filter(r => r.status === "REJECTED" && new Date(r.updatedAt).toDateString() === new Date().toDateString())
  
  const recentApproved = allowedRequests
    .filter(r => r.status === "APPROVED_BY_EXT" || r.status === "DISPATCHED")
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())

  const recentRejected = allowedRequests
    .filter(r => r.status === "REJECTED")
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())

  const availableFilters = userRole === 'store-keeper' 
    ? ["All Types", "Fertilizer", "Machine Rent", "Tools", "Leaf Bags"] 
    : TYPE_FILTERS;

  const applyFilters = (list: ServiceRequest[]) => list.filter(r =>
    matchesFilter(r, typeFilter) &&
    (!search || (r.supplierName || "").toLowerCase().includes(search.toLowerCase()) || (r.requestId || "").toLowerCase().includes(search.toLowerCase()))
  )

  const TH = "px-4 py-2.5 text-[10px] font-medium text-slate-900 uppercase tracking-wider text-left"
  const TD = "px-4 py-2.5"

  const StatusSummary = ({ label, count, color }: { label: string, count: number, color: 'amber' | 'emerald' | 'rose' }) => {
    const colors = {
      amber: "bg-amber-50 text-amber-600 border-amber-200",
      emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
      rose: "bg-rose-50 text-rose-600 border-rose-200"
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
        {count} {t(label)}
      </span>
    );
  };

  const TabButton = ({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) => (
    <button onClick={onClick} className={`flex items-center gap-2 text-sm font-bold pb-3 transition-all border-b-2 -mb-[1px] ${active ? "text-slate-900 border-[#2d6a4f]" : "text-slate-900 border-transparent hover:text-slate-600"}`}>
      <span className="whitespace-nowrap">{t(label)}</span>
      {count !== undefined && count > 0 && (
        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full border border-white/20 shadow-sm">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusSummary 
            label={userRole === 'store-keeper' ? "Ready to Dispatch" : "Pending"} 
            count={pending.length} 
            color="amber" 
          />
          <StatusSummary 
            label={userRole === 'store-keeper' ? "Dispatched Today" : "Approved Today"} 
            count={approvedToday.length} 
            color="emerald" 
          />
          <StatusSummary 
            label="Rejected Today" 
            count={rejectedToday.length} 
            color="rose" 
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRequests} className="p-1.5 text-slate-900 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button className="inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
            <Download size={12} /> {t('Export List')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="pt-4 px-6 border-b border-slate-100">
          <div className="flex gap-8">
            <TabButton 
              active={statusFilter === "PENDING"} 
              onClick={() => setStatusFilter("PENDING")} 
              label={userRole === 'store-keeper' ? "Ready to Dispatch" : "Pending Approvals"} 
              count={pending.length} 
            />
            <TabButton 
              active={statusFilter === "APPROVED"} 
              onClick={() => setStatusFilter("APPROVED")} 
              label={userRole === 'store-keeper' ? "Dispatched" : "Recently Approved"} 
            />
            <TabButton 
              active={statusFilter === "REJECTED"} 
              onClick={() => setStatusFilter("REJECTED")} 
              label="Recently Rejected" 
            />
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-900" />
              <input type="text" placeholder={t("Search by name or ID...")} value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-900 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all w-48" />
            </div>
            {availableFilters.map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${typeFilter === f ? "bg-[#2d6a4f] text-white border-[#2d6a4f]" : "bg-white text-slate-950 border-slate-200 hover:border-slate-300"}`}>
                {t(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-slate-100">
                <th className={TH}>{t('Request ID')}</th>
                <th className={TH}>{t('Supplier')}</th>
                <th className={TH}>{t('Type')}</th>
                <th className={TH}>{t('Amount / Qty')}</th>
                {userRole === 'store-keeper' && <th className={TH}>{t('Available')}</th>}
                <th className={TH}>{t('Date')}</th>
                <th className={TH}>{t('Status')}</th>
                <th className={`${TH} text-right`}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(userRole === 'store-keeper' ? 8 : 7)].map((_, j) => <td key={j} className={TD}><div className="h-3 bg-slate-100 rounded w-3/4" /></td>)}
                  </tr>
                ))
              ) : applyFilters(statusFilter === "PENDING" ? pending : statusFilter === "APPROVED" ? recentApproved : recentRejected).length === 0 ? (
                <tr><td colSpan={userRole === 'store-keeper' ? 8 : 7} className="text-center py-10 text-slate-900 text-xs">{t('No requests found')}</td></tr>
              ) : (
                applyFilters(statusFilter === "PENDING" ? pending : statusFilter === "APPROVED" ? recentApproved : recentRejected).map((req, i) => {
                  const meta = TYPE_META_KEYS[req.requestType] || { label: req.requestType, color: "text-slate-950 font-medium" }
                  const debt = debtMap[req.supplierId] ?? null
                  const supply = supplyMap[req.supplierId] ?? null
                  const isProcessing = processingId === req.requestId
                  return (
                    <tr key={req.requestId} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TD}>
                        <span className="text-xs font-semibold text-slate-600">
                          REQ-{String(i + 1).padStart(3, "0")}
                        </span>
                      </td>
                      <td className={TD}>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{req.supplierName || "---"}</p>
                        {req.passbookNo && (
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                            {req.passbookNo}
                          </span>
                        )}
                      </td>
                      <td className={TD}><span className={`text-sm ${meta.color}`}>{t(meta.label)}</span></td>
                      <td className={TD}><span className="text-sm font-semibold text-slate-800">{getAmountQty(req, t)}</span></td>
                      {userRole === 'store-keeper' && (
                        <td className={TD}>
                          {req.itemId && inventoryMap[req.itemId] ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-bold ${inventoryMap[req.itemId].stock < (req.quantity || 0) ? 'text-red-600' : 'text-blue-600'}`}>
                                {inventoryMap[req.itemId].stock}
                              </span>
                              <span className="text-[10px] text-slate-900 font-medium uppercase">{t(inventoryMap[req.itemId].unit)}</span>
                              {inventoryMap[req.itemId].stock < (req.quantity || 0) && (
                                <AlertTriangle size={12} className="text-red-500" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-950">---</span>
                          )}
                        </td>
                      )}
                      <td className={TD}>
                        <span className="text-xs text-slate-950 block">{formatDate(req.requestDate, lang)}</span>
                        <span className="text-[10px] text-slate-900">{formatTime(req.requestDate)}</span>
                      </td>
                      <td className={TD}>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[req.status] || "bg-slate-100 text-slate-900"}`}>
                          {req.status === 'APPROVED_BY_EXT' ? t('APPROVED BY MGR') : t(req.status.replace(/_/g, ' '))}
                        </span>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => setViewReq({ req, code: `REQ-${String(i + 1).padStart(3, "0")}` })} className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                            <Eye size={14} /> {req.status === 'PENDING' ? t('View & Process') : t('View')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {viewReq && (
        <ViewModal
          req={viewReq.req}
          code={viewReq.code}
          debt={debtMap[viewReq.req.supplierId] ?? null}
          supplyThisMonth={supplyMap[viewReq.req.supplierId] ?? null}
          onClose={() => setViewReq(null)}
          onApprove={(remark) => handleAction(viewReq.req.requestId!, "APPROVED_BY_EXT", remark)}
          onReject={(remark) => handleAction(viewReq.req.requestId!, "REJECTED", remark)}
          onAction={(status, remark) => handleAction(viewReq.req.requestId!, status, remark)}
          processing={processingId === viewReq.req.requestId}
        />
      )}
    </div>
  )
}



