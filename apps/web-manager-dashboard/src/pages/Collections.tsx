import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Filter, Download, ChevronRight, RefreshCw, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { CollectionAPI, CollectionItem } from '../services/api'
import { supabase } from '../services/supabase'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Today')

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const data = await CollectionAPI.getRecentCollections(100)
      setCollections(data)
      
      // Fetch agent names for new IDs
      const agentIds = [...new Set(data.map(c => c.transportAgentId))].filter(id => !agentsMap[id])
      if (agentIds.length > 0) {
        agentIds.forEach(id => {
          fetch(`/api/auth/users/${id}`)
            .then(res => res.json())
            .then(u => setAgentsMap(prev => ({ ...prev, [id]: u.fullName })))
            .catch(() => setAgentsMap(prev => ({ ...prev, [id]: 'Unknown' })))
        })
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err)
    } finally {
      setLoading(false)
    }
  }, [agentsMap])

  useEffect(() => {
    fetchCollections()

    const channel = supabase
      .channel('leaf_collections_sync')
      .on('broadcast', { event: 'COLLECTION_SYNCED' }, () => {
        fetchCollections()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCollections])

  const filtered = useMemo(() => {
    return collections.filter(c => {
      const matchesSearch = !search || 
        c.supplierName.toLowerCase().includes(search.toLowerCase()) || 
        c.passbookNo.toLowerCase().includes(search.toLowerCase()) ||
        (agentsMap[c.transportAgentId] || '').toLowerCase().includes(search.toLowerCase());
      
      // Simple filter mock logic
      if (filter === 'Today') {
        const today = new Date().toISOString().split('T')[0]
        return matchesSearch && c.collectedAt.startsWith(today)
      }
      return matchesSearch
    })
  }, [collections, search, filter, agentsMap])

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
           <input 
             type="text" 
             placeholder="Search by supplier, ID or TA..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full bg-white border border-slate-100 rounded-lg py-2.5 pl-12 pr-4 outline-none shadow-sm focus:ring-2 focus:ring-green-500/10 placeholder:text-slate-300 text-sm" 
           />
        </div>
        <div className="flex items-center gap-2">
           <FilterBtn label="All" active={filter === 'All'} onClick={() => setFilter('All')} />
           <FilterBtn label="Today" active={filter === 'Today'} onClick={() => setFilter('Today')} />
           <FilterBtn label="This Week" active={filter === 'This Week'} onClick={() => setFilter('This Week')} />
           <FilterBtn label="This Month" active={filter === 'This Month'} onClick={() => setFilter('This Month')} />
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2.5 rounded-lg text-slate-600 text-xs font-bold shadow-sm hover:bg-slate-50">
           <Download size={14} className="text-slate-400" />
           <span>Export</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white border-b border-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="px-6 py-5">COLLECTION ID</th>
              <th className="px-6 py-5">SUPPLIER</th>
              <th className="px-6 py-5">WEIGHT (KG)</th>
              <th className="px-6 py-5">NET (KG)</th>
              <th className="px-6 py-5">TRANSPORT AGENT</th>
              <th className="px-6 py-5">GPS</th>
              <th className="px-6 py-5 text-center">TIME</th>
              <th className="px-6 py-5">SYNC</th>
              <th className="px-6 py-5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && collections.length === 0 ? (
               <tr><td colSpan={9} className="text-center py-20 text-slate-300 text-xs tracking-widest uppercase">Loading Registry...</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.collectionId} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900 text-sm">{c.collectionId.slice(0, 4).toUpperCase()}</td>
                <td className="px-6 py-4">
                   <p className="font-bold text-slate-800 text-sm">{c.supplierName}</p>
                   <p className="text-[10px] text-slate-300 font-medium">{c.passbookNo}</p>
                </td>
                <td className="px-6 py-4 font-bold text-slate-800 text-sm">{c.grossWeight}</td>
                <td className="px-6 py-4 font-bold text-green-500 text-sm">{c.netWeight}</td>
                <td className="px-6 py-4 text-slate-600 text-sm font-medium">{agentsMap[c.transportAgentId] || '---'}</td>
                <td className="px-6 py-4">
                   {c.gpsStatus === 'GPS' ? (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-green-500/80">
                        <CheckCircle2 size={12} />
                        <span>Yes</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                        <XCircle size={12} />
                        <span>No</span>
                     </div>
                   )}
                </td>
                <td className="px-6 py-4 text-center text-slate-500 text-sm font-medium">{formatTime(c.collectedAt)}</td>
                <td className="px-6 py-4">
                   <StatusPill status={c.syncStatus} />
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                     <button className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-all border border-slate-100">Detail</button>
                     {c.syncStatus === 'FAILED' && (
                       <button className="bg-green-50 text-green-600 p-1.5 rounded-lg hover:bg-green-100 transition-all border border-green-100">
                          <RotateCcw size={12} />
                       </button>
                     )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SYNCED: 'bg-green-50 text-green-600 border-green-100',
    QUEUED: 'bg-orange-50 text-orange-600 border-orange-100',
    FAILED: 'bg-rose-50 text-rose-600 border-rose-100',
  }
  return (
    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${styles[status] || styles.SYNCED}`}>
      {status}
    </span>
  )
}

function FilterBtn({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${
        active ? 'bg-green-50 text-green-600 shadow-sm border border-green-100' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}
