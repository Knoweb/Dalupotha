import { useEffect, useState, useCallback } from "react"
import { CheckCircle2, XCircle, Eye, RefreshCw, Search, Download, X, Lightbulb, Package, AlertTriangle, Clock } from "lucide-react"
import { FinanceAPI, ServiceRequest, RequestStatus, InventoryAPI, InventoryItem } from "../../services/api"
import { useNotifications } from "../../hooks/useNotifications"

const TYPE_FILTERS = ["All Types", "Advance", "Fertilizer", "Machine Rent", "Advisory", "Leaf Bags"]

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

const TYPE_META: Record<string, { label: string; color: string }> = {
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
  CANCELLED:       "bg-slate-100 text-slate-400",
}

function getAmountQty(req: ServiceRequest): string {
  if (req.requestType === "ADVANCE") return `Rs. ${Number(req.requestedAmount || 0).toLocaleString()}`
  if (req.requestType === "FERTILIZER") return `${Number(req.quantity || 0)} kg`
  if (req.requestType === "LEAF_BAG") return `${Number(req.quantity || 0)} bags`
  if (req.requestType === "TOOL_RENT") {
    const d = (req as any).days || req.quantity || 0;
    return `${d} days`;
  }
  if (req.requestType === "ADVISORY") return req.itemType || req.notes || "Soil query"
  if (req.requestType === "TRANSPORT") return "Provision"
  return `${Number(req.quantity || 0)} units`
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatTime(str: string) {
  return new Date(str).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
}

function matchesFilter(req: ServiceRequest, filter: string) {
  if (filter === "All Types") return true
  if (filter === "Advance") return req.requestType === "ADVANCE"
  if (filter === "Fertilizer") return req.requestType === "FERTILIZER"
  if (filter === "Machine Rent") return req.requestType === "TOOL_RENT"
  if (filter === "Advisory") return req.requestType === "ADVISORY"
  if (filter === "Leaf Bags") return req.requestType === "LEAF_BAG"
  return true
}

function ViewModal({ req, code, debt, onClose, onApprove, onReject, onAction, processing }: {
  req: ServiceRequest;
  code: string;
  debt: number | null;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  onAction: (status: RequestStatus, comment: string) => void;
  processing: boolean;
}) {
  const [comment, setComment] = useState("")
  const [customAmount, setCustomAmount] = useState<string>(req.requestedAmount?.toString() || "")
  const [dailyRate, setDailyRate] = useState<string>("")
  const [creatorInfo, setCreatorInfo] = useState<{ fullName: string; employeeId?: string; role?: string } | null>(null)
  const [approverInfo, setApproverInfo] = useState<{ fullName: string; role?: string } | null>(null)
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    console.log("DEBUG: Request Detail:", { id: req.requestId, type: req.requestType, itemId: req.itemId, qty: req.quantity });
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
    if (!req.itemId || req.requestType === "ADVANCE") {
      console.log("INFO: Skipping inventory fetch. No itemId or request is an Advance.", { id: req.requestId, itemId: req.itemId });
      return;
    }
    
    setFetchingPrice(true);
    setFetchError(null);
    console.log("ACTION: Fetching inventory item:", req.itemId);
    
    InventoryAPI.getItem(req.itemId)
      .then(item => {
        console.log("RESULT: Inventory item fetched:", item);
        if (item) {
          setInventoryItem(item);
          if (req.requestType !== 'TOOL_RENT' && (!req.requestedAmount || Number(req.requestedAmount) === 0)) {
            const calculated = (Number(item.unitCost) || 0) * (Number(req.quantity) || 1);
            console.log("CALC: Setting custom amount:", calculated);
            setCustomAmount(calculated.toString());
          }
        } else {
          setFetchError("Item not found in inventory");
        }
      })
      .catch(err => {
        console.error("ERROR: Failed to fetch inventory item price:", err);
        setFetchError("Connection error to inventory service");
      })
      .finally(() => setFetchingPrice(false));
  }, [req.itemId, req.requestType, req.requestedAmount, req.quantity])


  const supplyThisMonth = (req as any).supplyThisMonth ?? 0
  const debtVal = debt ?? 0
  const ratio = supplyThisMonth > 0 ? ((debtVal / supplyThisMonth) * 100).toFixed(1) : "0.0"
  const highRatio = Number(ratio) > 40
  const meta = TYPE_META[req.requestType] || { label: req.requestType, color: "text-slate-500 font-medium" }
  const isPending = req.status === "PENDING" || req.status === "REVIEW"
  const userRole = sessionStorage.getItem('user_role');
  const isStoreKeeper = userRole === 'store-keeper';
  const canDispatch = isStoreKeeper && req.status === 'APPROVED_BY_EXT';

  const isDirect = creatorInfo?.role === 'SH' || creatorInfo?.role === 'supplier' || req.createdById === req.supplierId || (creatorInfo?.fullName && req.supplierName && creatorInfo.fullName.trim() === req.supplierName.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Request Detail - {code}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className={`px-5 py-3 grid gap-3 ${req.requestType === 'ADVISORY' ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              {req.requestType === 'ADVISORY' ? 'Advisory Request Info' : 'Supplier Info'}
            </p>
            {[
              { label: "Supplier",     value: req.supplierName || "---" },
              { label: "Passbook ID",  value: req.passbookNo || "---" },
              { label: "Request Type", value: meta.label },
              { label: req.requestType === 'ADVISORY' ? "Subject" : "Amount / Qty", value: getAmountQty(req) },
              { label: "Date",         value: formatDate(req.requestDate) },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-[11px] font-medium text-slate-500">{row.label}</span>
                <span className="text-sm font-bold text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          {req.requestType !== 'ADVISORY' && (
            <div className="flex flex-col gap-3">
              {!isStoreKeeper && (
                <div className="bg-slate-50 rounded-xl p-3 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Financial Standing</p>
                  {[
                    { label: "Outstanding Debt",  value: `Rs. ${debtVal.toLocaleString()}` },
                    { label: "Supply This Month", value: `${supplyThisMonth.toLocaleString()} kg` },
                    { label: "Debt/Supply Ratio", value: `${ratio}%` },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-[11px] font-medium text-slate-500">{row.label}</span>
                      <span className="text-sm font-bold text-slate-800">{row.value}</span>
                    </div>
                  ))}
                  {highRatio && (
                    <div className="mt-2 bg-green-50 border border-green-100 rounded-lg p-2 flex gap-2 items-start">
                      <Lightbulb size={12} className="text-green-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-slate-600 leading-tight font-medium"><span className="font-bold text-green-700">Tip: </span>Review debt ratio carefully</p>
                    </div>
                  )}
                </div>
              )}
              
              {req.requestType === 'TOOL_RENT' ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-purple-600 shadow-sm border border-purple-50">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Rental Configuration</p>
                      <p className="text-sm font-bold text-slate-800 leading-none">{inventoryItem?.itemName || "Rental Machine"}</p>
                      <p className="text-xs font-semibold text-slate-500">Duration: {req.days || req.quantity || 0} Days</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-purple-100 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rental Fee (Rs.)</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                      <input 
                        type="number" 
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-purple-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-100"
                      />
                    </div>
                  </div>
                </div>
              ) : inventoryItem && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                      <Package size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inventory Pricing</p>
                      <p className="text-sm font-bold text-slate-800 leading-none">{inventoryItem.itemName}</p>
                      <p className="text-xs font-semibold text-slate-500">Rs. {Number(inventoryItem.unitCost).toLocaleString()} / {inventoryItem.unit || 'unit'}</p>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-blue-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Calculated Total</span>
                    <span className="text-base font-black text-blue-700">Rs. {((Number(inventoryItem.unitCost) || 0) * (Number(req.quantity) || 1)).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-3">
          <div className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</p>
                <div className={`mt-0.5 text-[10px] px-2 py-0.5 rounded-full inline-block text-center font-bold uppercase ${isDirect ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isDirect ? 'Direct' : 'Agent'}
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{isDirect ? 'Supplier' : 'Agent'}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {creatorInfo?.fullName || (isDirect ? req.supplierName : (req.creatorName || "---"))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{isDirect ? 'Passbook' : 'Emp ID'}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {creatorInfo?.employeeId || (isDirect ? req.passbookNo : (req.creatorId || "---"))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight text-right">Requested At</p>
                <div className="flex items-center gap-1.5 justify-end">
                   <p className="text-sm font-bold text-slate-800">{formatDate(req.requestDate)}</p>
                   <p className="text-xs text-slate-400 font-bold">{formatTime(req.requestDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {req.notes && (
          <div className="px-5 pb-3">
            <div className="bg-green-50/50 border border-green-100 rounded-xl px-4 py-2.5">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">{isDirect ? 'Supplier Note' : 'Agent Note'}</p>
              <p className="text-sm text-slate-900 leading-relaxed font-bold whitespace-pre-wrap break-words">{req.notes}</p>
            </div>
          </div>
        )}

        {!isPending && (
          <div className="px-7 pb-4">
             <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Decision Status</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{req.status === 'REJECTED' ? 'Rejected At' : 'Approved At'}</p>
                </div>
                <div className="flex justify-between items-center">
                   <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                     {req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED'}
                   </span>
                   {approverInfo && (
                     <div className="flex flex-col items-end">
                       <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/50 flex flex-col items-end shadow-sm">
                         <p className="text-xs font-bold text-slate-800 leading-none mb-1">{approverInfo.fullName}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-none">
                           {approverInfo.role === 'EXT' ? 'Extension Officer' : 
                            approverInfo.role === 'MG' ? 'Factory Manager' : 
                            approverInfo.role === 'ADMIN' ? 'Administrator' : approverInfo.role || 'Officer'}
                         </p>
                       </div>
                     </div>
                   )}
                   <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{formatDate(req.updatedAt)}</p>
                      <p className="text-[10px] text-slate-400">{formatTime(req.updatedAt)}</p>
                   </div>
                </div>
                {(req.approverComment || (req as any).approver_comment) && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Manager Remarks</p>
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
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Final Deduction (Rs.)</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                  <input 
                    type="number" 
                    value={customAmount} 
                    onChange={e => setCustomAmount(e.target.value)} 
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f] transition-all" 
                  />
                </div>
              </div>
            )}
            <div className={req.requestType === 'ADVISORY' ? "col-span-3" : "col-span-2"}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Manager Remark</p>
              <textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                placeholder="Add comment (optional)..." 
                rows={1}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none" 
              />
            </div>
          </div>
        )}

        <div className="px-7 py-4 border-t border-slate-100 flex justify-end gap-3">
          {isPending ? (
            <>
              <button disabled={processing} onClick={() => onReject(comment)} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 shadow-sm">
                <XCircle size={16} /> {req.requestType === 'ADVISORY' ? 'Dismiss Request' : 'Reject Request'}
              </button>
              <button disabled={processing} onClick={() => onApprove(comment + "|||" + customAmount)} className="inline-flex items-center gap-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 shadow-sm">
                <CheckCircle2 size={16} /> 
                {req.requestType === 'ADVISORY' ? 'Send Advice' : 
                 (['FERTILIZER', 'LEAF_BAG', 'TOOL_PURCHASE', 'TOOL_RENT'].includes(req.requestType) ? 'Approve & Send to Store Keeper' : 'Approve Request')}
              </button>
            </>
          ) : canDispatch ? (
            <button disabled={processing} onClick={() => onAction('DISPATCHED', comment)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
              <Package size={16} /> Confirm Dispatch
            </button>
          ) : (
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Close</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [search, setSearch] = useState("")
  const [debtMap, setDebtMap] = useState<Record<string, number>>({})
  const [approverMap, setApproverMap] = useState<Record<string, string>>({})
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({})
  const [viewReq, setViewReq] = useState<{ req: ServiceRequest; code: string } | null>(null)
  const [inventoryMap, setInventoryMap] = useState<Record<string, { stock: number; unit: string }>>({})
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const { notifications } = useNotifications()

  const loadRequests = useCallback(async () => {
    setLoading(true)
    const userRole = sessionStorage.getItem('user_role');
    try {
      const pendingStatus = userRole === 'store-keeper' ? 'APPROVED_BY_EXT' : 'PENDING';
      const approvedStatus = userRole === 'store-keeper' ? 'DISPATCHED' : 'APPROVED_BY_EXT';
      const [p, a, r] = await Promise.all([
        FinanceAPI.getRequests({ status: pendingStatus }),
        FinanceAPI.getRequests({ status: approvedStatus }),
        FinanceAPI.getRequests({ status: 'REJECTED' }),
      ])
      const sorted = [...[...p, ...a, ...r]].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
      setRequests(sorted)
      
      if (userRole === 'store-keeper') {
        InventoryAPI.getItems().then(items => {
          const map: Record<string, { stock: number; unit: string }> = {}
          items.forEach(item => {
            map[item.itemId] = { stock: item.quantityInStock, unit: item.unit || '' }
          })
          setInventoryMap(map)
        }).catch(err => console.error("Failed to load inventory map", err))
      }

      const pendingIds = [...new Set(sorted.filter(r => r.status === "PENDING" || r.status === "APPROVED_BY_EXT").map(r => r.supplierId))]
      const dmap: Record<string, number> = {}
      await Promise.allSettled(pendingIds.map(async id => {
        try { dmap[id] = (await FinanceAPI.getSupplierLedger(id)).currentDebt ?? 0 }
        catch { dmap[id] = 0 }
      }))
      setDebtMap(dmap)
      
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
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  // Real-time update: Refresh list when a new service_request notification arrives
  useEffect(() => {
    const latest = notifications[0];
    if (latest && latest.type === 'service_request' && !latest.read) {
      loadRequests();
    }
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
      setViewReq(null)
      loadRequests()
    } catch (err: any) { alert(err?.message || "Action failed.") }
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
  });
  
  const approvedToday  = allowedRequests.filter(r => (r.status === "APPROVED_BY_EXT" || r.status === "DISPATCHED") && new Date(r.updatedAt).toDateString() === new Date().toDateString())
  const rejectedToday  = allowedRequests.filter(r => r.status === "REJECTED" && new Date(r.updatedAt).toDateString() === new Date().toDateString())
  
  const recentApproved = allowedRequests
    .filter(r => r.status === "APPROVED_BY_EXT" || r.status === "DISPATCHED")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const recentRejected = allowedRequests
    .filter(r => r.status === "REJECTED")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const availableFilters = userRole === 'store-keeper' 
    ? ["All Types", "Fertilizer", "Machine Rent", "Leaf Bags"] 
    : TYPE_FILTERS;

  const applyFilters = (list: ServiceRequest[]) => list.filter(r =>
    matchesFilter(r, typeFilter) &&
    (!search || (r.supplierName || "").toLowerCase().includes(search.toLowerCase()) || (r.requestId || "").toLowerCase().includes(search.toLowerCase()))
  )

  const code = (i: number) => `REQ-${String(i + 1).padStart(3, "0")}`
  const TH = "px-4 py-2.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider text-left"
  const TD = "px-4 py-2.5"

  const StatusSummary = ({ label, count, color }: { label: string, count: number, color: 'amber' | 'emerald' | 'rose' }) => {
    const colors = {
      amber: "bg-amber-50 text-amber-600 border-amber-200",
      emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
      rose: "bg-rose-50 text-rose-600 border-rose-200"
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
        {count} {label}
      </span>
    );
  };

  const TabButton = ({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) => (
    <button onClick={onClick} className={`flex items-center gap-2 text-sm font-bold pb-3 transition-all border-b-2 -mb-[1px] ${active ? "text-slate-900 border-[#2d6a4f]" : "text-slate-400 border-transparent hover:text-slate-600"}`}>
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full border border-white/20 shadow-sm">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
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
          <button onClick={loadRequests} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
            <Download size={12} /> Export List
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
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all w-48" />
            </div>
            {availableFilters.map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${typeFilter === f ? "bg-[#2d6a4f] text-white border-[#2d6a4f]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-slate-100">
                <th className={TH}>Request ID</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Type</th>
                <th className={TH}>Amount / Qty</th>
                {userRole === 'store-keeper' && <th className={TH}>Available</th>}
                <th className={TH}>Date</th>
                <th className={TH}>Debt</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className={TD}><div className="h-3 bg-slate-100 rounded w-3/4" /></td>)}
                  </tr>
                ))
              ) : applyFilters(statusFilter === "PENDING" ? pending : statusFilter === "APPROVED" ? recentApproved : recentRejected).length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-xs">No {statusFilter.toLowerCase()} requests</td></tr>
              ) : (
                applyFilters(statusFilter === "PENDING" ? pending : statusFilter === "APPROVED" ? recentApproved : recentRejected).map((req, i) => {
                  const meta = TYPE_META[req.requestType] || { label: req.requestType, color: "text-slate-500 font-medium" }
                  const debt = debtMap[req.supplierId] ?? null
                  const isProcessing = processingId === req.requestId
                  const c = code(i)
                  return (
                    <tr key={req.requestId} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TD}><span className="text-xs font-medium text-slate-600">{c}</span></td>
                      <td className={TD}>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{req.supplierName || "---"}</p>
                        <p className="text-[10px] text-slate-400">{req.supplierId?.slice(-7)?.toUpperCase()}</p>
                      </td>
                      <td className={TD}><span className={`text-sm ${meta.color}`}>{meta.label}</span></td>
                      <td className={TD}><span className="text-sm font-semibold text-slate-800">{getAmountQty(req)}</span></td>
                      {userRole === 'store-keeper' && (
                        <td className={TD}>
                          {req.itemId && inventoryMap[req.itemId] ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-bold ${inventoryMap[req.itemId].stock < (req.quantity || 0) ? 'text-red-600' : 'text-blue-600'}`}>
                                {inventoryMap[req.itemId].stock}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium uppercase">{inventoryMap[req.itemId].unit}</span>
                              {inventoryMap[req.itemId].stock < (req.quantity || 0) && (
                                <AlertTriangle size={12} className="text-red-500" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">---</span>
                          )}
                        </td>
                      )}
                      <td className={TD}>
                        <span className="text-xs text-slate-500 block">{formatDate(req.requestDate)}</span>
                        <span className="text-[10px] text-slate-400">{formatTime(req.requestDate)}</span>
                      </td>
                      <td className={TD}>
                        <span className={`text-sm font-semibold ${debt && debt > 0 ? "text-slate-800" : "text-slate-500"}`}>
                          {debt === null ? "..." : `Rs. ${debt.toLocaleString()}`}
                        </span>
                      </td>
                      <td className={TD}>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[req.status] || "bg-slate-100 text-slate-400"}`}>
                          {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => setViewReq({ req, code: c })} className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            <Eye size={14} /> View
                          </button>
                          
                          {userRole === 'store-keeper' ? (
                            req.status === "APPROVED_BY_EXT" && (
                              <button disabled={isProcessing} onClick={() => handleAction(req.requestId!, "DISPATCHED")} className="inline-flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                                <Package size={14} /> Dispatch
                              </button>
                            )
                          ) : (
                            statusFilter === "PENDING" && (
                              req.requestType === 'ADVISORY' ? (
                                <span className="text-[10px] text-slate-400 italic mr-2">Open to respond</span>
                              ) : (
                                <>
                                  <button disabled={isProcessing} onClick={() => handleAction(req.requestId!, "APPROVED_BY_EXT")} className="inline-flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                                    <CheckCircle2 size={14} /> Approve
                                  </button>
                                  <button disabled={isProcessing} onClick={() => handleAction(req.requestId!, "REJECTED")} className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                                    <XCircle size={14} /> Reject
                                  </button>
                                </>
                              )
                            )
                          )}
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


