import { Plus, User, Search, MoreVertical, Edit2, ShieldAlert } from 'lucide-react'

export default function UsersPage() {
  const mockUsers = [
    { id: 'M-001', name: 'A. Wickramasinghe', role: 'Manager', status: 'Active', active: 'Today 13:02' },
    { id: 'TA-001', name: 'Kumara Perera', role: 'Transport Agent', status: 'Active', active: 'Today 13:00' },
    { id: 'TA-002', name: 'Roshan Mendis', role: 'Transport Agent', status: 'Active', active: 'Today 12:45' },
    { id: 'TA-003', name: 'Nishantha De Silva', role: 'Transport Agent', status: 'Pending', active: 'Today 11:30' },
    { id: 'ACC-001', name: 'Priyadarshani K.', role: 'Accountant', status: 'Active', active: 'Today 11:20' },
    { id: 'SH-1042', name: 'Bandara, S.K.', role: 'Small Holder', status: 'Active', active: 'Today 09:14' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
           <p className="text-slate-500 text-sm">Control system access and role assignments</p>
        </div>
        <button className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold">
          <Plus size={18} />
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">USER ID</th>
              <th className="px-8 py-4">NAME</th>
              <th className="px-8 py-4 text-center">ROLE</th>
              <th className="px-8 py-4 text-center">STATUS</th>
              <th className="px-8 py-4">LAST ACTIVE</th>
              <th className="px-8 py-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockUsers.map((user, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5 font-mono text-xs font-bold text-slate-400">{user.id}</td>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                         <User size={16} />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{user.name}</span>
                   </div>
                </td>
                <td className="px-8 py-5 text-center">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     user.role === 'Manager' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                     user.role === 'Transport Agent' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                     user.role === 'Accountant' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                     'bg-orange-50 text-orange-600 border border-orange-200'
                   }`}>{user.role}</span>
                </td>
                <td className="px-8 py-5 text-center">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                     user.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                   }`}>{user.status}</span>
                </td>
                <td className="px-8 py-5 text-slate-400 text-xs font-medium">{user.active}</td>
                <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                   <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">
                      <Edit2 size={12} />
                      Profile
                   </button>
                   <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 border border-transparent hover:border-red-100 transition-all">
                      <ShieldAlert size={12} />
                      Deactivate
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
