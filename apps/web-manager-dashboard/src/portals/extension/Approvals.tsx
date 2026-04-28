import { useEffect, useState, useCallback } from "react"
import { CheckCircle2, XCircle, Eye, RefreshCw, Search, Download, X, Lightbulb } from "lucide-react"
import { FinanceAPI, ServiceRequest, RequestStatus } from "../../services/api"

const TYPE_FILTERS = ["All Types", "Advance", "Fertilizer", "Machine Rent", "Advisory", "Leaf Bags"]

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

function ViewModal({ req, code, debt, onClose, onApprove, onReject, processing }: {
  req: ServiceRequest;
  code: string;
  debt: number | null;
  onClose: () => void;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  processing: boolean;
}) {
  const [comment, setComment] = useState("")
  const [creatorInfo, setCreatorInfo] = useState<{ fullName: string; employeeId?: string; role?: string } | null>(null)

  useEffect(() => {
    if (!req.createdById) return
    fetch(`/api/auth/users/${req.createdById}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCreatorInfo({ fullName: d.fullName, employeeId: d.employeeId || d.passbookNo, role: d.role }) })
      .catch(() => {})
  }, [req.createdById])

  const supplyThisMonth = (req as any).supplyThisMonth ?? 0
  const debtVal = debt ?? 0
  const ratio = supplyThisMonth > 0 ? ((debtVal / supplyThisMonth) * 100).toFixed(1) : "0.0"
  const highRatio = Number(ratio) > 40
  const meta = TYPE_META[req.requestType] || { label: req.requestType, color: "text-slate-500 font-medium" }
  const isPending = req.status === "PENDING" || req.status === "REVIEW"

  const isDirect = creatorInfo?.role?.toLowerCase() === 'supplier' || req.createdById === req.supplierId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Request Detail - {code}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-7 py-5 grid grid-cols-2 gap-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Supplier Info</p>
            {[
              { label: "Supplier",     value: req.supplierName || "---" },
              { label: "ID",           value: req.supplierId?.slice(-7)?.toUpperCase() || "---" },
              { label: "Request Type", value: meta.label },
              { label: "Amount / Qty", value: getAmountQty(req) },
              { label: "Date",         value: formatDate(req.requestDate) },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm font-semibold text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Financial Standing</p>
              {[
                { label: "Outstanding Debt",  value: `Rs. ${debtVal.toLocaleString()}` },
                { label: "Supply This Month", value: `${supplyThisMonth.toLocaleString()} kg` },
                { label: "Debt/Supply Ratio", value: `${ratio}%` },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>
            {highRatio && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex gap-2 items-start">
                <Lightbulb size={14} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600"><span className="font-semibold text-green-700">Recommendation: </span>High debt ratio - review carefully before approving</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-7 pb-4">
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-6">
            <div className="flex flex-col shrink-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Request Source</p>
              <div className={`mt-1 text-[9px] px-3 py-1 rounded-full inline-block text-center font-bold uppercase ${isDirect ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {isDirect ? 'Direct' : 'Agent'}
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[10px] text-slate-400">{isDirect ? 'Supplier Name' : 'Agent Name'}</p>
                <p className="text-sm font-semibold text-slate-800">{creatorInfo?.fullName || (isDirect ? req.supplierName : "---")}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">{isDirect ? 'Passbook' : 'Employee ID'}</p>
                <p className="text-sm font-semibold text-slate-800">{creatorInfo?.employeeId || (isDirect ? req.passbookNo : "---")}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Timestamp</p>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-semibold text-slate-800">{formatDate(req.requestDate)}</p>
                   <p className="text-[10px] text-slate-400">{formatTime(req.requestDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {req.notes && (
          <div className="px-7 pb-4">
            <div className="bg-green-50/50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-1">{isDirect ? 'Supplier Note' : 'Agent Note'}</p>
              <p className="text-[15px] text-slate-900 leading-relaxed font-semibold whitespace-pre-wrap break-words">{req.notes}</p>
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
          <div className="px-7 pb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Manager Comment</p>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add comment (optional)..." rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none" />
          </div>
        )}

        <div className="px-7 py-4 border-t border-slate-100 flex justify-end gap-3">
          {isPending ? (
            <>
              <button disabled={processing} onClick={() => onReject(comment)} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 shadow-sm">
                <XCircle size={16} /> Reject Request
              </button>
              <button disabled={processing} onClick={() => onApprove(comment)} className="inline-flex items-center gap-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 shadow-sm">
                <CheckCircle2 size={16} /> Approve Request
              </button>
            </>
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

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await FinanceAPI.getRequests({ limit: "50" })
      const sorted = [...data].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
      setRequests(sorted)
      const pendingIds = [...new Set(sorted.filter(r => r.status === "PENDING" || r.status === "REVIEW").map(r => r.supplierId))]
      const dmap: Record<string, number> = {}
      await Promise.allSettled(pendingIds.map(async id => {
        try { dmap[id] = (await FinanceAPI.getSupplierLedger(id)).currentDebt ?? 0 }
        catch { dmap[id] = 0 }
      }))
      setDebtMap(dmap)
      const approverIds = [...new Set(sorted.filter(r => r.approverId).map(r => r.approverId!))]
      const amap: Record<string, string> = {}
      await Promise.allSettled(approverIds.map(async id => {
        try {
          const u = await fetch(`/api/auth/users/${id}`).then(r => r.json())
          const val = u.employeeId || u.fullName
          amap[id] = (val && !val.startsWith("11111111")) ? val : "---"
        } catch { amap[id] = "---" }
      }))
      setApproverMap(amap)
      // Fetch TA names using createdById for all requests
      const creatorIds = [...new Set(sorted.filter(r => r.createdById).map(r => r.createdById))]
      const cmap: Record<string, string> = {}
      await Promise.allSettled(creatorIds.map(async id => {
        try {
          const u = await fetch(`/api/auth/users/${id}`).then(r => r.json())
          const cid = u.employeeId || u.passbookNo || u.passbook_no;
          cmap[id] = cid ? `${u.fullName} (${cid})` : u.fullName || "---"
        } catch { cmap[id] = "---" }
      }))
      setCreatorMap(cmap)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  const handleAction = async (requestId: string, status: RequestStatus, remark?: string) => {
    setProcessingId(requestId)
    try {
      await FinanceAPI.updateStatus(requestId, status, localStorage.getItem("current_user_id") || "", remark)
      setViewReq(null)
      loadRequests()
    } catch (err: any) { alert(err?.message || "Action failed.") }
    finally { setProcessingId(null) }
  }

  const pending        = requests.filter(r => r.status === "PENDING")
  const underReview    = requests.filter(r => r.status === "REVIEW")
  const approvedToday  = requests.filter(r => r.status === "APPROVED_BY_EXT" && new Date(r.requestDate).toDateString() === new Date().toDateString())
  const recentApproved = requests
    .filter(r => r.status === "APPROVED_BY_EXT" || r.status === "DISPATCHED")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const applyFilters = (list: ServiceRequest[]) => list.filter(r =>
    matchesFilter(r, typeFilter) &&
    (!search || (r.supplierName || "").toLowerCase().includes(search.toLowerCase()) || (r.requestId || "").toLowerCase().includes(search.toLowerCase()))
  )

  const code = (i: number) => `REQ-${String(i + 1).padStart(3, "0")}`
  const TH = "px-4 py-2.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider text-left"
  const TD = "px-4 py-2.5"

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { label: `${pending.length} Pending`,              cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
            { label: `${underReview.length} Under Review`,     cls: "bg-blue-50 text-blue-500 border-blue-200" },
            { label: `${approvedToday.length} Approved Today`, cls: "bg-green-50 text-green-600 border-green-200" },
          ].map(p => (
            <span key={p.label} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${p.cls}`}>{p.label}</span>
          ))}
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
        <div className="px-5 pt-4 pb-3">
          <p className="text-sm font-semibold text-slate-800 mb-3">Pending Approvals</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all w-48" />
            </div>
            {TYPE_FILTERS.map(f => (
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
                <th className={TH}>Requested</th>
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
              ) : applyFilters(pending).length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-xs">No pending requests</td></tr>
              ) : (
                applyFilters(pending).map((req, i) => {
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
                          <button disabled={isProcessing} onClick={() => handleAction(req.requestId!, "APPROVED_BY_EXT")} className="inline-flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button disabled={isProcessing} onClick={() => handleAction(req.requestId!, "REJECTED")} className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                            <XCircle size={14} /> Reject
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Recently Approved</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={TH}>Request ID</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Type</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Submitted By</th>
                <th className={TH}>Manager Remarks</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentApproved.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-xs">No approved requests yet</td></tr>
              ) : (
                recentApproved.map((req, i) => {
                  const meta = TYPE_META[req.requestType] || { label: req.requestType, color: "text-slate-500 font-medium" }
                  const c = code(i + 100)
                  return (
                    <tr key={req.requestId} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TD}><span className="text-xs font-medium text-slate-600">{c}</span></td>
                      <td className={TD}>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{req.supplierName || "---"}</p>
                        <p className="text-[10px] text-slate-400">{req.supplierId?.slice(-7)?.toUpperCase()}</p>
                      </td>
                      <td className={TD}><span className={`text-sm ${meta.color}`}>{meta.label}</span></td>
                      <td className={TD}><span className="text-sm font-semibold text-slate-800">{getAmountQty(req)}</span></td>
                      <td className={TD}><span className="text-xs text-slate-500">{creatorMap[req.createdById] || "---"}</span></td>
                      <td className={TD}><div className="text-[11px] font-medium text-slate-700 leading-tight max-w-[150px] break-words italic line-clamp-2">{(req as any).approverComment || (req as any).approver_comment || (req as any).remark || "---"}</div></td>
                      <td className={TD}><span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Approved</span></td>
                      <td className={`${TD} text-right`}>
                        <button onClick={() => setViewReq({ req, code: c })} className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                          <Eye size={14} /> View
                        </button>
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
          processing={processingId === viewReq.req.requestId}
        />
      )}
    </div>
  )
}


