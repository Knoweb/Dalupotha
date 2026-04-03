import { useState } from 'react'
import { Plus, ShieldCheck, ArrowLeft, RefreshCw, Lock, User, Eye, EyeOff } from 'lucide-react'

interface LoginProps {
  onLogin: (role: 'manager' | 'super-admin') => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [estateForm, setEstateForm] = useState({ name: '', code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin') {
      onLogin('super-admin');
    } else {
      onLogin('manager');
    }
  };

  const handleRegisterEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/estates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estateForm)
      });
      if (res.ok) {
        setIsRegistering(false);
        setEstateForm({ name: '', code: '' });
        alert('Estate onboarded successfully! Access cleared for management.');
      }
    } catch (err) {
      console.error(err);
      alert('Registration failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans overflow-hidden">
      {/* Left Side: Cinematic Branding (Hero) */}
      <div className="hidden lg:block relative group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#3d7a2d]/90 to-transparent z-10" />
        <img 
          src="/hero.png" 
          alt="Dalupotha Estate" 
          className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-10000"
        />
        
        <div className="absolute bottom-20 left-20 z-20 max-w-lg">
           <h1 className="text-6xl font-black text-white leading-tight tracking-tighter">
             Empowering the <span className="text-[#a7d1a0]">Tea Ecosystem</span>
           </h1>
           <p className="text-white/70 text-lg font-medium mt-6 leading-relaxed">
             The ultimate management console for smart tea estates. Centralize collections, financials, and logistics in real-time.
           </p>
           
           <div className="mt-12 flex items-center gap-8 border-t border-white/10 pt-8">
              <div>
                 <p className="text-2xl font-black text-white">4.8k+</p>
                 <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Active Suppliers</p>
              </div>
              <div>
                 <p className="text-2xl font-black text-white">12</p>
                 <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Major Estates</p>
              </div>
              <div>
                 <p className="text-2xl font-black text-white">Real-time</p>
                 <p className="text-white/50 text-xs font-bold uppercase tracking-widest">GPS Tracking</p>
              </div>
           </div>
        </div>
      </div>

      {/* Right Side: Authentication Controls */}
      <div className="flex items-center justify-center p-8 bg-slate-50 lg:bg-white relative">
        {/* Subtle Decorative Elements */}
        <div className="w-full max-w-sm relative z-10">
           <div className="mb-10 text-center flex flex-col items-center">
              <div className="w-28 h-28 mb-6 rounded-full overflow-hidden shadow-2xl hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                 <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight">දළුපොත</h2>
              <h3 className="text-sm font-semibold text-[#3d7a2d] uppercase tracking-widest mt-2">Factory Manager</h3>
           </div>

           {!isRegistering ? (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center">
                 <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
                 <p className="text-slate-500 font-medium mt-1 text-sm">Enter your credentials</p>
               </div>

               <form onSubmit={handleLogin} className="space-y-6">
                 <div className="space-y-2 group">
                   <label className="text-sm font-semibold text-slate-700 pl-1 block transition-colors group-focus-within:text-[#3d7a2d]">Email Address</label>
                   <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3d7a2d] transition-colors" size={20} />
                      <input 
                        type="email" 
                        placeholder="manager@dalupotha.com"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl px-14 py-4 focus:border-[#3d7a2d] focus:ring-4 focus:ring-[#3d7a2d]/10 outline-none transition-all text-base font-medium text-slate-900 placeholder:text-slate-400"
                        required
                      />
                   </div>
                 </div>

                 <div className="space-y-2 group">
                   <label className="text-sm font-semibold text-slate-700 pl-1 block transition-colors group-focus-within:text-[#3d7a2d]">Password</label>
                   <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3d7a2d] transition-colors" size={20} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl px-14 py-4 focus:border-[#3d7a2d] focus:ring-4 focus:ring-[#3d7a2d]/10 outline-none transition-all text-base font-medium text-slate-900 placeholder:text-slate-400"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                         {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                   </div>
                 </div>

                 <div className="pt-6 space-y-6">
                    <button 
                      type="submit"
                      className="w-full bg-[#3d7a2d] hover:bg-[#2d6a4f] text-white py-4 rounded-2xl font-bold text-lg tracking-wide transition-all shadow-xl shadow-green-900/20 active:scale-[0.98] flex items-center justify-center gap-3 border-2 border-transparent"
                    >
                      Login
                    </button>
                    
                    <div className="flex items-center gap-4 py-2">
                       <div className="h-px flex-1 bg-slate-100" />
                       <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic">System Access Control</span>
                       <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="text-center pt-2">
                       <p className="text-xs font-bold text-slate-400">
                         Are you new?{' '}
                         <button 
                           type="button" 
                           onClick={() => setIsRegistering(true)}
                           className="text-[#3d7a2d] hover:text-[#2d6a4f] underline decoration-2 underline-offset-4 transition-all font-black uppercase tracking-tighter"
                         >
                           Register your estate here
                         </button>
                       </p>
                    </div>

                    <div className="flex justify-between items-center px-2 pt-8 border-t border-slate-50">
                       <button type="button" className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">Credential Support?</button>
                       <span className="text-[9px] font-black text-slate-200 uppercase tracking-tighter italic">Dalupotha Terminal v1.2.4</span>
                    </div>
                 </div>
               </form>
             </div>
           ) : (
             <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsRegistering(false)}
                    className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all border border-slate-100"
                  >
                     <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Onboarding</h2>
                    <p className="text-xs font-bold text-[#3d7a2d] uppercase tracking-[3px]">Division Level</p>
                  </div>
               </div>

               <form onSubmit={handleRegisterEstate} className="space-y-8">
                 <div className="space-y-2 group">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block transition-colors group-focus-within:text-[#3d7a2d]">Official Estate Name</label>
                   <input 
                     type="text" 
                     placeholder="e.g. Riverside Highlands"
                     value={estateForm.name}
                     onChange={e => setEstateForm({...estateForm, name: e.target.value})}
                     className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-green-500/10 outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300"
                     required
                   />
                 </div>

                 <div className="space-y-2 group">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block transition-colors group-focus-within:text-[#3d7a2d]">Division Identification Code</label>
                   <input 
                     type="text" 
                     placeholder="RSVD-012"
                     value={estateForm.code}
                     onChange={e => setEstateForm({...estateForm, code: e.target.value})}
                     className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-green-500/10 outline-none transition-all text-sm font-mono font-black text-slate-800 uppercase tracking-widest"
                     required
                   />
                 </div>

                 <div className="pt-8 space-y-6">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={18} />}
                      <span>Execute Registration</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center font-bold uppercase italic tracking-tighter opacity-70">Security Protocol: Final approval required by Master Admin</p>
                 </div>
               </form>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
