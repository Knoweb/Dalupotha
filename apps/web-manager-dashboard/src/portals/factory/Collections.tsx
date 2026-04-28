import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Filter, Download, ChevronRight, RefreshCw, CheckCircle2, XCircle, RotateCcw, MapPin, User, Scale, Clock, X } from 'lucide-react'
import { CollectionAPI, CollectionItem } from '../../services/api'
import { supabase } from '../../services/supabase'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Today')
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const data = await CollectionAPI.getRecentCollections(100)
      setCollections(data)
      
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
      .on('broadcast', { event: 'COLLECTION_SYNCED' }, () => fetchCollections())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchCollections])

  const filtered = useMemo(() => {
    return collections.filter(c => {
      const matchesSearch = !search || 
        c.supplierName.toLowerCase().includes(search.toLowerCase()) || 
        c.passbookNo.toLowerCase().includes(search.toLowerCase()) ||
        (agentsMap[c.transportAgentId] || '').toLowerCase().includes(search.toLowerCase());
      
      if (filter === 'Today') {
        const today = new Date().toISOString().split('T')[0]
        return matchesSearch && c.collectedAt.startsWith(today)
      }
      return matchesSearch
    })
  }, [collections, search, filter, agentsMap])

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
             className="w-full bg-white border border-slate-100 rounded-lg py-2.5 pl-12 pr-4 outline-none shadow-sm focus:ring-2 focus:ring-green-500/10 text-sm" 
           />
        </div>
        <div className="flex items-center gap-2">
           {['All', 'Today', 'This Week', 'This Month'].map(f => (
             <FilterBtn key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
           ))}
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
                   <GPSStatus status={c.gpsStatus} />
                </td>
                <td className="px-6 py-4 text-center text-slate-500 text-sm font-medium">
                  {new Date(c.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </td>
                <td className="px-6 py-4"><StatusPill status={c.syncStatus} /></td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                     <button 
                       onClick={() => setSelectedCollection(c)}
                       className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-100 border border-slate-100"
                     >Detail</button>
                     {c.syncStatus === 'FAILED' && (
                       <button className="bg-green-50 text-green-600 p-1.5 rounded-lg hover:bg-green-100 border border-green-100">
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

      {/* Detail Modal */}
      {selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                 <h3 className="font-bold text-slate-800 tracking-tight">Collection Details</h3>
                 <button onClick={() => setSelectedCollection(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                    <X size={18} />
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* ID & Status */}
                 <div className="flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collection ID</p>
                       <p className="text-sm font-mono font-bold text-slate-900">{selectedCollection.collectionId.toUpperCase()}</p>
                    </div>
                    <StatusPill status={selectedCollection.syncStatus} />
                 </div>

                 {/* Supplier & Agent */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                       <User size={14} className="text-green-500 mb-2" />
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Supplier</p>
                       <p className="text-sm font-bold text-slate-800">{selectedCollection.supplierName}</p>
                       <p className="text-[10px] text-slate-400">{selectedCollection.passbookNo}</p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                       <User size={14} className="text-blue-500 mb-2" />
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Transport Agent</p>
                       <p className="text-sm font-bold text-slate-800">{agentsMap[selectedCollection.transportAgentId] || 'Unknown'}</p>
                    </div>
                 </div>

                 {/* Weights */}
                 <div className="bg-green-50/30 p-5 rounded-2xl border border-green-100 flex items-center justify-around text-center">
                    <div>
                       <Scale size={16} className="text-slate-400 mx-auto mb-2" />
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Weight</p>
                       <p className="text-xl font-black text-slate-800">{selectedCollection.grossWeight}<span className="text-[10px] ml-1">KG</span></p>
                    </div>
                    <div className="w-px h-10 bg-green-200/50"></div>
                    <div>
                       <Scale size={16} className="text-green-500 mx-auto mb-2" />
                       <p className="text-[10px] font-bold text-green-600 uppercase">Net Weight</p>
                       <p className="text-xl font-black text-green-600">{selectedCollection.netWeight}<span className="text-[10px] ml-1">KG</span></p>
                    </div>
                 </div>

                 {/* Footer Info */}
                 <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium pt-2">
                    <div className="flex items-center gap-1.5">
                       <Clock size={12} />
                       <span>Collected at {new Date(selectedCollection.collectedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <MapPin size={12} className={selectedCollection.gpsStatus === 'GPS' ? 'text-green-500' : 'text-rose-400'} />
                       <span>{selectedCollection.gpsStatus === 'GPS' ? 'GPS Verified' : 'Manual Entry'}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 p-4 flex gap-3">
                 <button className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all">Download Receipt</button>
                 <button onClick={() => setSelectedCollection(null)} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Close</button>
              </div>
           </div>
        </div>
      )}
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

function GPSStatus({ status }: { status: string }) {
  return status === 'GPS' ? (
    <div className="flex items-center gap-1 text-[10px] font-bold text-green-500/80">
       <CheckCircle2 size={12} />
       <span>Yes</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
       <XCircle size={12} />
       <span>No</span>
    </div>
  )
}

function FilterBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${active ? 'bg-green-50 text-green-600 shadow-sm border border-green-100' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
  );
}
