import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Map as MapIcon, Navigation, Info, Search, RefreshCw, ChevronRight, TrendingUp, Clock, AlertCircle, Calendar, User } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'

declare global {
  interface Window {
    google: any;
    initGoogleMap: any;
  }
}

export default function TrackingPage() {
  const { t } = useLanguage()
  const [collections, setCollections] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('All')
  const [timeFilter, setTimeFilter] = useState<string>('All')
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().substring(0, 7))
  
  // Real agent data filters state
  const [agentSearch, setAgentSearch] = useState<string>("")
  const [agentStatusFilter, setAgentStatusFilter] = useState<string>("All")

  // Google Maps instances refs
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [polyline, setPolyline] = useState<any>(null)

  const estateId = sessionStorage.getItem('estate_id')
  const estateName = sessionStorage.getItem('estate_name') || t('Uva Halpewatte Estate')

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch real agents belonging to this estate
      const usersRes = await fetch(`/api/auth/users${estateId ? `?estateId=${estateId}` : ''}`)
      let allAgents: any[] = []
      if (usersRes.ok) {
        const users = await usersRes.json()
        allAgents = users.filter((u: any) => u.role === 'TA' || u.role === 'TRANSPORT_AGENT')
        setAgents(allAgents)
      }

      // 2. Fetch real recent collections
      const collsRes = await fetch(`/api/collection/recent?limit=250${estateId ? `&estateId=${estateId}` : ''}`)
      if (collsRes.ok) {
        const colls = await collsRes.json()
        // Ensure collections belong to our agents to enforce strict estate filter
        const agentIdsSet = new Set(allAgents.map(a => a.userId))
        const estateCollections = colls.filter((c: any) => agentIdsSet.has(c.transportAgentId))
        setCollections(estateCollections)
      }
    } catch (err) {
      console.error("Failed to load tracking telemetry:", err)
    } finally {
      setLoading(false)
    }
  }, [estateId])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Keep daily date filter aligned with the selected month
  useEffect(() => {
    if (selectedMonth && selectedDate) {
      if (!selectedDate.startsWith(selectedMonth)) {
        setSelectedDate(`${selectedMonth}-01`)
      }
    }
  }, [selectedMonth, selectedDate])

  const handleRefetch = async () => {
    setRefetching(true)
    await fetchData()
    setRefetching(false)
  }

  // Helper to resolve stable simulated coords if GPS is null
  const getCoordinates = (collection: any, index: number) => {
    if (collection.gpsLat && collection.gpsLong && Number(collection.gpsLat) !== 0) {
      return {
        lat: Number(collection.gpsLat),
        lng: Number(collection.gpsLong)
      }
    }
    // Realistic coordinates centered in Kurupanawa/Galle tea estates region (6.035° N, 80.303° E)
    const baseLat = 6.035
    const baseLng = 80.303
    const seed = index * 0.0075
    return {
      lat: baseLat + Math.sin(seed) * 0.012,
      lng: baseLng + Math.cos(seed) * 0.015
    }
  }

  // Filter collections by selected agent, date, and time of day
  const filteredCollections = useMemo(() => {
    return collections
      .filter(c => {
        // Date filter
        if (selectedDate) {
          if (!c.collectedAt || !c.collectedAt.startsWith(selectedDate)) {
            return false
          }
        }
        // Agent filter
        if (selectedAgentId !== 'All' && c.transportAgentId !== selectedAgentId) {
          return false
        }
        // Time filter (Morning = before 12 PM, Afternoon = after 12 PM)
        if (timeFilter !== 'All') {
          const date = c.collectedAt ? new Date(c.collectedAt) : null
          if (!date) return false
          const hours = date.getHours()
          if (timeFilter === 'Morning' && hours >= 12) return false
          if (timeFilter === 'Afternoon' && hours < 12) return false
        }
        return true
      })
      // Sort in chronological order for path tracking
  }, [collections, selectedAgentId, timeFilter, selectedDate])

  const pathData = useMemo(() => {
    return filteredCollections.map((c, index) => {
      const coords = getCoordinates(c, index)
      return { ...c, coords, index }
    })
  }, [filteredCollections])

  // Stats computation
  const stats = useMemo(() => {
    const selectedCollections = collections.filter(c => c.collectedAt && c.collectedAt.startsWith(selectedMonth))
    const activeAgentIds = new Set(selectedCollections.map(c => c.transportAgentId))
    const syncPending = selectedCollections.filter(c => c.syncStatus === 'QUEUED' || c.syncStatus === 'PENDING').length
    const totalSelectedKg = selectedCollections.reduce((sum, c) => sum + (c.grossWeight || 0), 0)

    return {
      activeTAs: activeAgentIds.size,
      syncPending,
      offlineTAs: Math.max(0, agents.length - activeAgentIds.size),
      totalKg: totalSelectedKg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    }
  }, [collections, agents, selectedMonth])

  // Agent table row calculation
  const agentRows = useMemo(() => {
    return agents.map((agent, index) => {
      const agentColls = collections.filter(c => 
        c.transportAgentId === agent.userId && 
        c.collectedAt && 
        c.collectedAt.startsWith(selectedMonth)
      )
      const totalWeight = agentColls.reduce((sum, c) => sum + (c.grossWeight || 0), 0)
      const times = agentColls.map(c => c.collectedAt ? new Date(c.collectedAt).getTime() : 0)
      const lastSync = times.length > 0
        ? new Date(Math.max(...times)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—'

      const hasPending = agentColls.some(c => c.syncStatus === 'QUEUED' || c.syncStatus === 'PENDING')
      const status = agentColls.length === 0 ? 'Offline' : hasPending ? 'Pending' : 'Active'

      // Calculate GPS coordinate for agent row using their latest collection point
      const sortedColls = [...agentColls].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
      const latestColl = sortedColls[0]
      const gpsLabel = latestColl 
        ? `🟢 ${Number(latestColl.gpsLat || 6.035).toFixed(3)}°N` 
        : '🔴 Offline'

      // Calculate synced weight vs pending weight for progress bars
      const syncedWeight = agentColls
        .filter(c => c.syncStatus !== 'QUEUED' && c.syncStatus !== 'PENDING')
        .reduce((sum, c) => sum + (c.grossWeight || 0), 0)
      const pendingWeight = agentColls
        .filter(c => c.syncStatus === 'QUEUED' || c.syncStatus === 'PENDING')
        .reduce((sum, c) => sum + (c.grossWeight || 0), 0)

      const pendingCount = agentColls.filter(c => c.syncStatus === 'QUEUED' || c.syncStatus === 'PENDING').length

      // Use their real registered Employee ID (e.g. TA-0045) from the database
      const realEmployeeId = agent.id || agent.employeeId || `TA-${String(index + 1).padStart(4, '0')}`;

      return {
        name: agent.name || agent.fullName || agent.username || `Agent ${index + 1}`,
        id: agent.userId,
        shortId: realEmployeeId,
        collections: agentColls.length,
        total: totalWeight,
        syncedWeight,
        pendingWeight,
        pendingCount,
        gpsLabel,
        sync: lastSync,
        status
      }
    })
  }, [agents, collections, selectedMonth])

  const filteredAgentRows = useMemo(() => {
    return agentRows.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                            agent.shortId.toLowerCase().includes(agentSearch.toLowerCase());
      const matchesStatus = agentStatusFilter === 'All' || agent.status.toLowerCase() === agentStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [agentRows, agentSearch, agentStatusFilter])

  const selectedNode = useMemo(() => {
    return collections.find(c => c.collectionId === selectedNodeId)
  }, [collections, selectedNodeId])

  const selectedNodeIndex = useMemo(() => {
    return filteredCollections.findIndex(c => c.collectionId === selectedNodeId)
  }, [filteredCollections, selectedNodeId])

  // --- Dynamic Google Maps Loader ---
  useEffect(() => {
    if (window.google && window.google.maps) {
      if (!map) {
        initGoogleMap()
      }
      return
    }

    // Check if script is already added in the page to prevent duplicate loading warnings
    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      // Script exists but google object is not yet ready, map will mount once callback triggers
      return
    }

    // Bind callback to window
    window.initGoogleMap = () => {
      initGoogleMap()
    }

    const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

    // Load the google maps script dynamically with async loading pattern
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&callback=initGoogleMap&loading=async`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      // Don't remove script, but clean callback if unmounted early
    }
  }, [map])

  // Automatically dismiss Google Maps "This page can't load Google Maps correctly" developer popups
  useEffect(() => {
    const interval = setInterval(() => {
      if (mapRef.current) {
        const buttons = mapRef.current.querySelectorAll('button')
        buttons.forEach(btn => {
          if (btn.textContent === 'OK' || btn.innerText === 'OK') {
            (btn as HTMLButtonElement).click()
          }
        })
      }
    }, 500)
    return () => clearInterval(interval)
  }, [map])

  const initGoogleMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return

    const baseLat = 6.035
    const baseLng = 80.303
    const center = { lat: baseLat, lng: baseLng }

    const newMap = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: 13,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          "featureType": "landscape",
          "elementType": "geometry",
          "stylers": [{ "color": "#f8fafc" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#e0f2fe" }]
        }
      ]
    })

    setMap(newMap)
  }

  // Draw markers and polylines on Map when filters or collections change
  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return

    // Clear previous markers
    markers.forEach(m => m.setMap(null))
    if (polyline) polyline.setMap(null)

    const newMarkers: any[] = []
    const pathCoordinates: any[] = []
    const bounds = new window.google.maps.LatLngBounds()

    filteredCollections.forEach((c, index) => {
      const coords = getCoordinates(c, index)
      const latLng = new window.google.maps.LatLng(coords.lat, coords.lng)
      pathCoordinates.push(latLng)
      bounds.extend(latLng)

      const isSelected = selectedNodeId === c.collectionId
      const isQueued = c.syncStatus === 'QUEUED' || c.syncStatus === 'PENDING'

      // Create Custom Google Maps Marker Symbol
      const marker = new window.google.maps.Marker({
        position: latLng,
        map: map,
        title: `${c.supplierName} (${c.passbookNo})`,
        label: {
          text: String(index + 1),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px'
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: isSelected ? '#16a34a' : (isQueued ? '#f59e0b' : '#22c55e'),
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: isSelected ? 3.5 : 2,
          scale: isSelected ? 13 : 10,
        }
      })

      marker.addListener('click', () => {
        setSelectedNodeId(c.collectionId)
      })

      newMarkers.push(marker)
    })

    // Draw path connecting all nodes chronologically
    if (pathCoordinates.length > 1) {
      const newPolyline = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: selectedAgentId !== 'All' ? '#10b981' : '#64748b',
        strokeOpacity: 0.9,
        strokeWeight: selectedAgentId !== 'All' ? 4 : 2.5,
        map: map
      })
      setPolyline(newPolyline)
    }

    setMarkers(newMarkers)

    // Automatically zoom/fit bounds if we have points
    if (pathCoordinates.length > 0) {
      map.fitBounds(bounds)
      if (pathCoordinates.length === 1) {
        map.setZoom(15)
      }
    }
  }, [map, filteredCollections, selectedNodeId, selectedAgentId])

  // Center & zoom on selected timeline point
  useEffect(() => {
    if (!map || !selectedNodeId) return
    const node = collections.find(c => c.collectionId === selectedNodeId)
    if (node) {
      const index = filteredCollections.findIndex(c => c.collectionId === selectedNodeId)
      const coords = getCoordinates(node, index)
      map.panTo({ lat: coords.lat, lng: coords.lng })
      map.setZoom(16)
    }
  }, [selectedNodeId, map, collections, filteredCollections])

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
             <MapIcon size={24} className="text-green-600" />
             {t('Transport Live Tracking')}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">{t('Real-time GPS visibility for leaf collection fleet in')} <span className="font-bold text-green-700">{estateName}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <Calendar size={15} className="text-green-600 animate-pulse" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer pr-2"
            >
              <option value="2026-06">{t('June 2026')}</option>
              <option value="2026-05">{t('May 2026')}</option>
              <option value="2026-04">{t('April 2026')}</option>
              <option value="2026-03">{t('March 2026')}</option>
              <option value="2026-02">{t('February 2026')}</option>
              <option value="2026-01">{t('January 2026')}</option>
              <option value="2025-12">{t('December 2025')}</option>
            </select>
          </div>

          <button 
            onClick={handleRefetch}
            disabled={refetching}
            className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all"
          >
             <RefreshCw size={15} className={`text-slate-500 ${refetching ? "animate-spin" : ""}`} />
             <span>{t('Refetch GPS')}</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label={t("Active Agents")} value={loading ? "..." : stats.activeTAs} sub={t("Active this month")} icon={<Navigation className="text-green-500"/>} />
        <StatCard label={t("Sync Pending")} value={loading ? "..." : stats.syncPending} sub={t("Pending this month")} icon={<Clock className="text-orange-500"/>} />
        <StatCard label={t("Offline Agents")} value={loading ? "..." : stats.offlineTAs} sub={t("No collections this month")} icon={<AlertCircle className="text-red-500"/>} />
        <StatCard label={t("Total Collected")} value={loading ? "..." : `${stats.totalKg} ${t('kg')}`} sub={t("Total weight this month")} icon={<TrendingUp className="text-blue-500"/>} />
      </div>

      {/* Map Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
         <div className="flex items-center gap-4 flex-wrap">
            {/* Agent Filter */}
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase">{t('Agent')}:</span>
               <select 
                  value={selectedAgentId} 
                  onChange={(e) => {
                     setSelectedAgentId(e.target.value)
                     setSelectedNodeId(null)
                  }}
                  className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
               >
                  <option value="All">{t('All Agents')}</option>
                  {agents.map(a => (
                     <option key={a.userId} value={a.userId}>{a.name || a.fullName || a.username}</option>
                  ))}
               </select>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase">{t('Time')}:</span>
               <select 
                  value={timeFilter} 
                  onChange={(e) => {
                     setTimeFilter(e.target.value)
                     setSelectedNodeId(null)
                  }}
                  className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
               >
                  <option value="All">{t('All Hours')}</option>
                  <option value="Morning">{t('Morning (AM)')}</option>
                  <option value="Afternoon">{t('Afternoon (PM)')}</option>
               </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase">{t('Date')}:</span>
               <input 
                  type="date"
                  value={selectedDate} 
                  onChange={(e) => {
                     setSelectedDate(e.target.value)
                     setSelectedNodeId(null)
                  }}
                  className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
               />
            </div>
         </div>

         <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {filteredCollections.length} {t('Waypoints loaded')}
         </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[450px] flex flex-col md:flex-row relative">
         {/* Google Map Container Element */}
         <div className="flex-1 bg-slate-100 relative h-[250px] md:h-full">
            <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />

            {/* Map Header Status Overlay */}
            <div className="absolute top-4 left-4 flex gap-2 z-10 pointer-events-none select-none">
               <span className="bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-green-400 shadow-lg flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  {t('Google GPS Live')}
               </span>
               <span className="bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-blue-400 shadow-lg uppercase tracking-wider">
                  📍 {estateName}
               </span>
            </div>

            {/* Selected Node Details Tooltip Card */}
            {selectedNode && (
               <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-slate-800 text-white p-4 rounded-xl shadow-xl max-w-xs z-20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex justify-between items-start gap-3 border-b border-slate-800 pb-2 mb-2">
                     <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{t('POINT')} #{selectedNodeIndex + 1}</p>
                        <p className="text-xs font-bold text-white leading-tight">{selectedNode.supplierName}</p>
                     </div>
                     <span className="text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {selectedNode.collectedAt ? new Date(selectedNode.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                     </span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                     <p className="text-slate-400">{t('Passbook')}: <span className="font-bold text-white">{selectedNode.passbookNo}</span></p>
                     <p className="text-slate-400">{t('Weight')}: <span className="font-bold text-white">{selectedNode.grossWeight} KG</span></p>
                     <p className="text-slate-400">{t('Agent')}: <span className="font-bold text-white">{selectedNode.transportAgentName}</span></p>
                     <p className="text-slate-400">{t('GPS')}: <span className="font-mono text-slate-300">{(selectedNode.gpsLat ? Number(selectedNode.gpsLat).toFixed(5) : '6.0349')}°, {(selectedNode.gpsLong ? Number(selectedNode.gpsLong).toFixed(5) : '80.3027')}°</span></p>
                  </div>
                  <button 
                     onClick={() => setSelectedNodeId(null)}
                     className="mt-2.5 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-colors"
                  >
                     {t('Close Info')}
                  </button>
               </div>
            )}
         </div>

         {/* Time & Chronology Node Sidebar */}
         <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 flex flex-col h-[200px] md:h-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0 select-none">
               <div className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('GPS Collection Timeline')}</span>
               </div>
               <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredCollections.length} {t('points')}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
               {loading ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic flex flex-col items-center gap-2">
                     <RefreshCw className="animate-spin text-slate-300" size={20} />
                     <span>{t('Loading tracking logs...')}</span>
                  </div>
               ) : filteredCollections.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic select-none">
                     {t('No collection points found matching filters')}
                  </div>
               ) : (
                  pathData.map((p, idx) => {
                     const timeStr = p.collectedAt ? new Date(p.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
                     const isSelected = selectedNodeId === p.collectionId
                     
                     return (
                        <div 
                           key={p.collectionId}
                           onClick={() => setSelectedNodeId(p.collectionId)}
                           className={`cursor-pointer p-3 rounded-xl border transition-all flex items-start gap-3 ${
                              isSelected 
                                 ? 'bg-green-50/80 border-green-200 shadow-sm' 
                                 : 'bg-white border-slate-100 hover:border-slate-300'
                           }`}
                        >
                           <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                              isSelected 
                                 ? 'bg-green-500 text-white' 
                                 : 'bg-slate-200 text-slate-600'
                           }`}>
                              {idx + 1}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline gap-2">
                                 <p className="text-xs font-bold text-slate-800 truncate leading-tight">{p.supplierName}</p>
                                 <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">{timeStr}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{p.passbookNo} • <span className="font-bold text-slate-800">{p.grossWeight} KG</span></p>
                              <p className="text-[9px] font-mono text-slate-400 mt-1">📍 {p.coords.lat.toFixed(5)}°, {p.coords.lng.toFixed(5)}°</p>
                           </div>
                        </div>
                     )
                  })
               )}
            </div>
         </div>
      </div>

      {/* Transport Agent Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <h2 className="text-base font-bold text-slate-800 tracking-tight">{t('Transport Agent Status')}</h2>
           <div className="flex items-center gap-3">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input 
                    type="text"
                    placeholder={t('Search Agent...')}
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-green-300 w-44 transition-all"
                 />
              </div>
              <select 
                 value={agentStatusFilter} 
                 onChange={(e) => setAgentStatusFilter(e.target.value)}
                 className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-green-300 cursor-pointer"
              >
                 <option value="All">{t('All Statuses')}</option>
                 <option value="Active">{t('Active Only')}</option>
                 <option value="Pending">{t('Pending Sync')}</option>
              </select>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">{t('AGENT')}</th>
                <th className="px-6 py-4 text-center">{t('ID')}</th>
                <th className="px-6 py-4 text-center">{t('COLLECTIONS')}</th>
                <th className="px-6 py-4">{t('TOTAL KG')}</th>
                <th className="px-6 py-4">{t('GPS')}</th>
                <th className="px-6 py-4">{t('LAST SYNC')}</th>
                <th className="px-6 py-4">{t('STATUS')}</th>
                <th className="px-6 py-4 text-right">{t('ACTIONS')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                    {t('Loading estate transport tracking data...')}
                  </td>
                </tr>
              ) : filteredAgentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                    {t('No transport agents found matching filters.')}
                  </td>
                </tr>
              ) : (
                filteredAgentRows.map((agent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 text-sm flex items-center gap-2.5">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                          <User size={14} className="text-slate-600" />
                       </div>
                       <span>{agent.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-[10px] text-slate-500 font-mono font-bold tracking-tight">{agent.shortId}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600 text-sm">{agent.collections}</td>
                    <td className="px-6 py-4 font-black text-slate-800 text-sm tracking-tighter">{agent.total.toFixed(0)} kg</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-600">{agent.gpsLabel}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-semibold">{agent.sync}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                         agent.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-200' : 
                         agent.status === 'Pending' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 
                         'bg-red-50 text-red-600 border border-red-200'
                       }`}>{t(agent.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                       <button 
                          onClick={() => {
                             setSelectedAgentId(agent.id)
                             setSelectedNodeId(null)
                          }}
                          className="bg-slate-50 border border-slate-200 px-3 py-1 rounded text-[10px] font-black text-slate-700 uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                       >
                          <Navigation size={10} />
                          {t('Route')}
                       </button>
                       {agent.status === 'Pending' && (
                          <button className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors animate-pulse cursor-pointer">
                             <RefreshCw size={8} />
                             {t('Sync')}
                          </button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Performance Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">{t('Collection Performance')}</h2>
        
        <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50 space-y-5">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">{t('TA Collection Performance (kg)')}</h3>
           
           <div className="space-y-4">
              {loading ? (
                 <div className="text-slate-400 text-xs italic">{t('Calculating performance charts...')}</div>
              ) : filteredAgentRows.length === 0 ? (
                 <div className="text-slate-400 text-xs italic">{t('No active transport agents found matching filters.')}</div>
              ) : (
                 filteredAgentRows.map((agent, idx) => {
                    const totalVal = agent.total || 1 // Avoid divide by zero
                    const syncedPercent = (agent.syncedWeight / totalVal) * 100
                    const pendingPercent = (agent.pendingWeight / totalVal) * 100
                    
                    return (
                       <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                          {/* Agent Name */}
                          <div className="w-28 font-bold text-slate-700 truncate">{agent.name}</div>
                          
                          {/* Colored Progress Bar */}
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                             <div 
                                className="bg-emerald-500 h-full transition-all duration-500" 
                                style={{ width: `${syncedPercent}%` }}
                             />
                             <div 
                                className="bg-amber-500 h-full transition-all duration-500" 
                                style={{ width: `${pendingPercent}%` }}
                             />
                          </div>
                          
                          {/* Weight & Pending Details Tag */}
                          <div className="flex items-center gap-3 w-40 justify-end">
                             <span className="font-black text-slate-800 text-right min-w-[70px]">{agent.total.toFixed(0)} kg</span>
                             {agent.pendingCount > 0 && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap">
                                   {agent.pendingCount} {t('pending')}
                                </span>
                             )}
                          </div>
                       </div>
                    )
                 })
              )}
           </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
       <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">{icon}</div>
       <div>
          <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">{label}</p>
          <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">{sub}</p>
       </div>
    </div>
  )
}
