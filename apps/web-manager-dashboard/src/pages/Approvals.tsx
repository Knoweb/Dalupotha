import { CheckCircle2, XCircle, Eye, FileText } from 'lucide-react'

export default function ApprovalsPage() {
  const mockRequests = [
    { id: 'REQ-001', supplier: 'Bandara, S.K.', type: 'Advance', amount: 'Rs. 15,000', date: '22 Feb 2026', debt: 'Rs. 7,800', status: 'Pending' },
    { id: 'REQ-002', supplier: 'Perera, A.M.', type: 'Fertilizer', amount: '50 kg', date: '22 Feb 2026', debt: 'Rs. 2,100', status: 'Pending' },
    { id: 'REQ-003', supplier: 'Jayasekara, R.', type: 'Machine Rent', amount: '2 days', date: '21 Feb 2026', debt: 'Rs. 0', status: 'Pending' },
    { id: 'REQ-004', supplier: 'Wijesekara, P.', type: 'Advance', amount: 'Rs. 25,000', date: '21 Feb 2026', debt: 'Rs. 18,400', status: 'Pending' },
    { id: 'REQ-005', supplier: 'Rajapaksa, D.', type: 'Fertilizer', amount: '25 kg', date: '20 Feb 2026', debt: 'Rs. 4,500', status: 'In Review' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Requests & Approvals</h1>
           <p className="text-slate-500 text-sm">Financial and service request management</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
           <StatusTab label="5 Pending" color="bg-orange-100 text-orange-600" active />
           <StatusTab label="1 Under Review" color="bg-blue-100 text-blue-600" />
           <StatusTab label="1 Approved Today" color="bg-green-100 text-green-600" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">REQUEST ID</th>
              <th className="px-8 py-4">SUPPLIER</th>
              <th className="px-8 py-4">TYPE</th>
              <th className="px-8 py-4">AMOUNT / QTY</th>
              <th className="px-8 py-4">REQUESTED</th>
              <th className="px-8 py-4">EXISTING DEBT</th>
              <th className="px-8 py-4">STATUS</th>
              <th className="px-8 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockRequests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-900 text-sm">{req.id}</td>
                <td className="px-8 py-5">
                   <p className="font-bold text-slate-700 text-sm">{req.supplier}</p>
                   <p className="text-[10px] text-slate-400 font-mono">SH-1042</p>
                </td>
                <td className="px-8 py-5">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     req.type === 'Advance' ? 'bg-green-50 text-green-600 border border-green-200' : 
                     req.type === 'Fertilizer' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
                     'bg-purple-50 text-purple-600 border border-purple-200'
                   }`}>{req.type}</span>
                </td>
                <td className="px-8 py-5 font-black text-slate-700 text-sm">{req.amount}</td>
                <td className="px-8 py-5 text-slate-500 text-xs font-medium">{req.date}</td>
                <td className="px-8 py-5 text-red-500 text-xs font-bold font-mono">{req.debt}</td>
                <td className="px-8 py-5">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     req.status === 'Pending' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
                   }`}>{req.status}</span>
                </td>
                <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                   <button className="p-2 text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100 rounded-lg"><Eye size={16}/></button>
                   <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200/50"><CheckCircle2 size={16}/></button>
                   <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200/50"><XCircle size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <section>
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recently Approved</h3>
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex justify-between items-center opacity-70">
            <div className="flex items-center gap-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                    <CheckCircle2 size={20}/>
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-900">REQ-000 • Kumarainghe, P.</p>
                   <p className="text-[10px] text-slate-400">Approved by MG-001 • Today 11:30</p>
                </div>
            </div>
            <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">Rs. 10,000 Advance</p>
            <span className="text-[10px] font-bold bg-green-50 text-green-600 px-3 py-1 rounded-full uppercase">Approved</span>
         </div>
      </section>
    </div>
  );
}

function StatusTab({ label, color, active }: any) {
  return (
    <button className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-white shadow-sm ' + color : 'text-slate-400'
    }`}>
      {label}
    </button>
  );
}
