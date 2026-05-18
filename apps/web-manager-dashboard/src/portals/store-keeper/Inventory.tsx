import React, { useState, useEffect, useMemo, cloneElement } from 'react'
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  History, 
  RefreshCw, 
  Settings, 
  Search, 
  Download, 
  TrendingDown,
  Box,
  Layers,
  X,
  RotateCcw
} from 'lucide-react'
import { InventoryAPI, InventoryItem } from '../../services/api'
import { useLanguage } from '../../hooks/useLanguage'

export default function InventoryPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All Categories")
  const [showUpdateModal, setShowUpdateModal] = useState<InventoryItem | null>(null)
  const [updateQuantity, setUpdateQuantity] = useState<string>("")
  const [updateUnitCost, setUpdateUnitCost] = useState<string>("")
  const [updating, setUpdating] = useState(false)

  const handleOpenUpdate = (item: InventoryItem) => {
    setShowUpdateModal(item)
    setUpdateQuantity(item.quantityInStock.toString())
    setUpdateUnitCost(item.unitCost.toString())
  }

  const handleUpdateSave = async () => {
    if (!showUpdateModal) return
    setUpdating(true)
    try {
      await InventoryAPI.updateItem(showUpdateModal.itemId, {
        ...showUpdateModal,
        quantityInStock: Number(updateQuantity),
        unitCost: Number(updateUnitCost)
      })
      await loadInventory()
      setShowUpdateModal(null)
    } catch (err) {
      console.error("Failed to update item", err)
      alert(t("Failed to update item"))
    } finally {
      setUpdating(false)
    }
  }
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true)
    try {
      const data = await InventoryAPI.getItems()
      setItems(data)
    } catch (err) {
      console.error("Failed to load inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["All Categories", "Fertilizer", "Bags", "Tools"]

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase())
      const matchesCat = activeCategory === "All Categories" || 
                        (activeCategory === "Fertilizer" && item.itemCategory === "FERTILIZER") ||
                        (activeCategory === "Bags" && item.itemCategory === "LEAF_BAG") ||
                        (activeCategory === "Tools" && item.itemCategory === "TOOLS")
      return matchesSearch && matchesCat
    })
  }, [items, search, activeCategory])

  const stats = useMemo(() => {
    const fertilizerTotal = items.filter(i => i.itemCategory === 'FERTILIZER').reduce((sum, i) => sum + i.quantityInStock, 0)
    const bagsTotal = items.filter(i => i.itemCategory === 'LEAF_BAG').reduce((sum, i) => sum + i.quantityInStock, 0)
    const toolsTotal = items.filter(i => i.itemCategory === 'TOOLS').reduce((sum, i) => sum + i.quantityInStock, 0)
    const lowStockAlerts = items.filter(i => i.quantityInStock <= i.reorderLevel).length

    return { fertilizerTotal, bagsTotal, toolsTotal, lowStockAlerts }
  }, [items])

  return (
    <div className="w-full space-y-4 px-4 py-3 animate-in fade-in duration-700">
      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-5">
         <StatCard label={t("TOTAL FERTILIZER STOCK")} value={`${stats.fertilizerTotal} ${t('kg')}`} sub={t("Urea + TSP + MOP")} icon={<Package size={20} className="text-emerald-500"/>} color="border-emerald-500" />
         <StatCard label={t("TOTAL LEAF BAGS")} value={`${stats.bagsTotal} ${t('bags')}`} sub={t("Standard + Large")} icon={<Layers size={20} className="text-emerald-500"/>} color="border-emerald-500" />
         <StatCard label={t("LOW STOCK ALERTS")} value={stats.lowStockAlerts.toString()} sub={t("Items needing attention")} icon={<AlertTriangle size={20} className="text-rose-500"/>} color="border-rose-500" />
         <StatCard label={t("TOOLS UNITS")} value={`${stats.toolsTotal} ${t('units')}`} sub={t("Active Inventory")} icon={<Settings size={20} className="text-amber-500"/>} color="border-amber-500" />
      </div>

      {items.find(i => i.quantityInStock <= i.reorderLevel) && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-xs">
                 <AlertTriangle className="text-rose-500" size={20} />
              </div>
              <p className="text-[13px] text-rose-800 font-medium tracking-tight">
                 <span className="font-semibold">{items.find(i => i.quantityInStock <= i.reorderLevel)?.itemName}</span> {t('stock is below reorder level')} ({items.find(i => i.quantityInStock <= i.reorderLevel)?.quantityInStock} {items.find(i => i.quantityInStock <= i.reorderLevel)?.unit} {t('remaining')}, {t('reorder at')} {items.find(i => i.quantityInStock <= i.reorderLevel)?.reorderLevel} {items.find(i => i.quantityInStock <= i.reorderLevel)?.unit}).
              </p>
           </div>
           <button className="flex items-center gap-2 px-5 py-2 bg-white border border-rose-200 rounded-xl text-[12px] font-semibold text-rose-600 hover:bg-rose-50 transition-all shadow-sm">
              <RefreshCw size={14} /> {t('Reorder Now')}
           </button>
        </div>
      )}

      {/* Inventory Items Section */}
      <div className="space-y-4 pt-2">
         <div className="flex justify-between items-center">
         <h2 className="text-[14px] font-semibold text-slate-700 uppercase tracking-widest">{t('Inventory Items')}</h2>
         <button className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[12px] font-semibold uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm">
            <Plus size={15} /> {t('Add Item')}
         </button>
         </div>

         {/* Filters row */}
         <div className="flex items-center gap-4">
            <div className="relative w-80">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-900" size={16} />
               <input 
                  type="text" 
                  placeholder={t("Search item...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] font-medium placeholder:text-slate-900 focus:border-emerald-200 outline-none transition-all shadow-sm"
               />
            </div>
            <div className="flex items-center gap-3">
               {categories.map(c => (
                  <button 
                     key={c}
                     onClick={() => setActiveCategory(c)}
                   className={`px-5 py-1.5 rounded-full text-[12px] font-medium transition-all border ${activeCategory === c ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-white text-slate-950 border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                     {t(c)}
                  </button>
               ))}
               <button className="flex items-center gap-2 ml-1 px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                  <Download size={16} /> {t('Export')}
               </button>
            </div>
         </div>

         {/* Table */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-300">
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('ITEM')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('CATEGORY')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('AVAILABLE STOCK')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('REORDER LEVEL')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('STOCK STATUS')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('UNIT COST')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider">{t('STATUS')}</th>
                      <th className="px-6 py-4 text-[13px] font-black text-slate-900 uppercase tracking-wider text-right">{t('ACTIONS')}</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredItems.map((item) => {
                     const isLow = item.quantityInStock <= item.reorderLevel;
                     const progress = Math.min((item.quantityInStock / (item.reorderLevel * 2)) * 100, 100);
                     return (
                        <tr key={item.itemId} className="hover:bg-emerald-50/40 transition-colors border-slate-100">
                           <td className="px-6 py-5 text-[14px] font-bold text-slate-900">{item.itemName}</td>
                           <td className="px-6 py-5 text-[14px] font-semibold text-slate-800">{t(item.itemCategory.charAt(0) + item.itemCategory.slice(1).toLowerCase().replace('_', ' '))}</td>
                           <td className="px-6 py-5 text-[14px] font-bold text-emerald-700">{item.quantityInStock} <span className="text-slate-600">{t(item.unit)}</span></td>
                           <td className="px-6 py-5 text-[14px] font-bold text-slate-900">{item.reorderLevel} <span className="text-slate-600">{t(item.unit)}</span></td>
                           <td className="px-6 py-5 w-48">
                              <div className="space-y-2">
                                 <div className="flex justify-between text-[11px] font-semibold text-slate-900 uppercase tracking-wider">
                                    <span>{item.quantityInStock} {t(item.unit)} {t('Available')}</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${isLow ? 'bg-rose-500' : 'bg-emerald-600'}`} style={{ width: `${Math.min((item.quantityInStock / (item.reorderLevel * 1.5)) * 100, 100)}%` }} />
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-[14px] font-bold text-slate-900">Rs. {item.unitCost.toLocaleString()}</td>
                           <td className="px-6 py-5">
                              <span className={`px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider ${isLow ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                 {isLow ? t('Low Stock') : t('OK')}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-3">
                                 <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-slate-900 hover:bg-slate-200 transition-all border border-slate-300 hover:border-slate-400">
                                    <History size={15} /> {t('History')}
                                 </button>
                                 <button onClick={() => handleOpenUpdate(item)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 text-[12px] font-bold transition-all shadow-md">
                                    <RefreshCw size={15} /> {t('Update')}
                                 </button>
                              </div>
                           </td>
                        </tr>
                     )
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('Update Stock')}</h3>
                <button onClick={() => setShowUpdateModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-900"><X size={18} /></button>
             </div>
             <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50"><Package size={20} /></div>
                   <div>
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{t('SELECTED ITEM')}</p>
                      <p className="text-sm font-bold text-slate-900">{showUpdateModal.itemName}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">{t('New Stock')}</label>
                       <input type="number" value={updateQuantity} onChange={(e) => setUpdateQuantity(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-200 outline-none transition-all text-sm" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">{t('Unit Cost')}</label>
                       <input type="number" value={updateUnitCost} onChange={(e) => setUpdateUnitCost(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-200 outline-none transition-all text-sm" />
                    </div>
                </div>
             </div>
             <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button onClick={() => setShowUpdateModal(null)} disabled={updating} className="flex-1 py-2.5 text-xs font-bold text-slate-900">{t('Cancel')}</button>
                <button onClick={handleUpdateSave} disabled={updating} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/10">
                  {updating ? t('Saving...') : t('Save Changes')}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className={`bg-white p-6 rounded-[24px] border-t-[4px] border-x border-b border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between h-[155px] ${color}`}>
       <div className="flex justify-between items-start">
          <div className="p-2.5 bg-white border border-slate-50 rounded-xl shadow-xs">{cloneElement(icon, { size: 20 })}</div>
          <div className="w-2 h-2 rounded-full bg-slate-50" />
       </div>
       <div>
         <h3 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-1">{value}</h3>
         <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-[0.08em]">{label}</p>
         <p className="text-[11px] text-slate-900 font-normal uppercase tracking-tight">{sub}</p>
       </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
       {[...Array(9)].map((_, i) => (
         <td key={i} className="px-6 py-4"><div className="h-3 bg-slate-100 rounded w-full" /></td>
       ))}
    </tr>
  )
}
