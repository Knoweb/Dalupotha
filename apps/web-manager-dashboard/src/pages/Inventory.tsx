import { Package, AlertTriangle, Plus, History, RefreshCw } from 'lucide-react'

export default function InventoryPage() {
  const mockInventory = [
    { item: 'Urea Fertilizer', category: 'Fertilizer', stock: '1420 kg', reorder: '1000 kg', status: 'Low Stock' },
    { item: 'TSP Fertilizer', category: 'Fertilizer', stock: '950 kg', reorder: '500 kg', status: 'OK' },
    { item: 'MOP Fertilizer', category: 'Fertilizer', stock: '430 kg', reorder: '300 kg', status: 'OK' },
    { item: 'Standard 5kg Bags', category: 'Bags', stock: '840 bags', reorder: '500 bags', status: 'OK' },
    { item: 'Large 10kg Bags', category: 'Bags', stock: '400 bags', reorder: '200 bags', status: 'OK' },
    { item: 'Pruning Machine', category: 'Machinery', stock: '3 units', reorder: '1 unit', status: 'OK' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
           <p className="text-slate-500 text-sm">Factory stores and equipment tracking</p>
        </div>
        <button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold">
          <Plus size={18} />
          <span>Add Item</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard label="Total Fertilizer Stock" value="2800 kg" sub="Urea • TSP • MOP" icon={<Package className="text-green-500"/>}/>
         <StatCard label="Total Leaf Bags" value="1240 bags" sub="Standard • Large" icon={<Package className="text-blue-500"/>}/>
         <StatCard label="Low Stock Alerts" value="1" sub="Urea Fertilizer" icon={<AlertTriangle className="text-red-500"/>}/>
         <StatCard label="Machinery Units" value="3 units" sub="Reserved: ITA-003" icon={<Settings className="text-orange-500"/>}/>
      </div>

      <div className="bg-[#fffbeb] border border-orange-100 rounded-xl p-4 flex items-center gap-4">
         <AlertTriangle className="text-orange-500" size={20} />
         <p className="text-sm font-bold text-slate-900 flex-1">Urea Fertilizer stock is below reorder level (1420 kg remaining, reorder at 2000 kg).</p>
         <button className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Reorder Now</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">ITEM</th>
              <th className="px-8 py-4">CATEGORY</th>
              <th className="px-8 py-4">STOCK</th>
              <th className="px-8 py-4">REORDER LEVEL</th>
              <th className="px-8 py-4">STATUS</th>
              <th className="px-8 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockInventory.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                   <p className="font-bold text-slate-700 text-sm">{item.item}</p>
                </td>
                <td className="px-8 py-5 text-slate-500 text-xs font-medium">{item.category}</td>
                <td className="px-8 py-5 font-bold text-slate-700 text-sm">{item.stock}</td>
                <td className="px-8 py-5 text-slate-400 text-xs font-bold">{item.reorder}</td>
                <td className="px-8 py-5">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     item.status === 'Low Stock' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                   }`}>{item.status}</span>
                </td>
                <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                   <button className="p-2 text-slate-400 hover:text-slate-600"><History size={16}/></button>
                   <button className="text-green-600 font-bold text-[10px] uppercase tracking-widest px-3 py-1 bg-green-50 rounded border border-green-100 hover:bg-green-100">Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">{icon}</div>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-[10px] text-slate-300 font-medium">{sub}</p>
    </div>
  );
}
