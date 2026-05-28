import React, { useState, useEffect } from 'react'
import { BookOpen, Search, Filter, Plus, FileText, Send, RefreshCw, X, Link } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../hooks/useToast'

const API_URL = '/api/notifications/tri-circulars';

export default function CircularsPage() {
  const { t } = useLanguage()
  const { success, error: toastError } = useToast()
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [circulars, setCirculars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newCircular, setNewCircular] = useState({
    id: '',
    title: '',
    date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    url: ''
  });

  // Fetch circulars on mount
  useEffect(() => {
    fetchCirculars();
  }, []);

  const fetchCirculars = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch circulars');
      const data = await response.json();
      setCirculars(data);
    } catch (error) {
      console.error('Error fetching circulars:', error);
      // Fallback to default circulars if API fails
      setCirculars([
        { id: 'LU 01', title: t('Guidelines on Land Suitability Classification for Tea'), date: 'Oct 2002', url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_LU01e.pdf' },
        { id: 'LU 02', title: t('Field Categorization in Tea Lands'), date: 'Sep 2003', url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_LU02e.pdf' },
        { id: 'PN 01', title: t('The Suitability of Tea Clones for the Different Regions'), date: 'Dec 2002', url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_PN01e.pdf' },
        { id: 'PN 02', title: t('Tea Nursery Management'), date: 'Nov 2009', url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_Advisory_Ciculars_PN_02.pdf' },
        { id: 'SP 01', title: t('Fertilizer Recommendations for Nursery Tea'), date: 'Jul 2000', url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_SP01e.pdf' },
        { id: 'SP 02', title: t('Fertilizer Recommendations for Immature Tea'), date: 'Jul 2000', url: 'https://www.tri.lk/wp-content/uploads/2020/02/TRI_SP02e.pdf' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircular.id || !newCircular.title || !newCircular.url) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newCircular.id,
          title: newCircular.title,
          url: newCircular.url,
          targetAudience: 'SMALL_HOLDERS'
        })
      });

      if (!response.ok) throw new Error('Failed to create circular');
      
      // Refresh circulars list
      await fetchCirculars();
      success(t('Circular distributed successfully!'));
      
      setNewCircular({
        id: '',
        title: '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        url: ''
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating circular:', error);
      toastError(t('Failed to distribute circular. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = circulars.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{t('TRI Circulars')}</h1>
           <p className="text-slate-950 text-sm">{t('Official Tea Research Institute advisory registry')}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold"
        >
          <Plus size={18} />
          <span>{t('Distribute New Circular')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900" size={18} />
            <input 
              type="text" 
              placeholder={t("Search circulars...")} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest">
              <th className="px-8 py-4">{t('CIRCULAR NO.')}</th>
              <th className="px-8 py-4">{t('TITLE')}</th>
              <th className="px-8 py-4 text-center">{t('ISSUED IN')}</th>
              <th className="px-8 py-4 text-right">{t('ACTIONS')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 font-bold text-slate-900 text-sm">{c.id}</td>
                <td className="px-8 py-6 font-bold text-slate-700 text-sm">{c.title}</td>
                <td className="px-8 py-6 text-center text-slate-900 text-xs font-medium">{c.date}</td>
                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                   <a href={c.url} target="_blank" rel="noopener noreferrer" className="bg-slate-50 border border-slate-100 px-3 py-1 rounded text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100">{t('View')}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 text-center text-slate-500 font-medium">
            {t('No circulars found matching your search.')}
          </div>
        )}
      </div>

      {/* View All Portal */}
      <div className="text-center py-4">
        <a 
          href="https://www.tri.lk/view-all-publications/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-900 font-bold hover:text-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>{t('Want to see more? Click here')}</span>
          <Plus size={16} />
        </a>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('Distribute New Circular')}</h2>
                <p className="text-slate-500 text-xs mt-0.5">{t('Add a new official advisory to the registry')}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleDistribute} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('CIRCULAR NO.')}</label>
                  <input 
                    required
                    placeholder="e.g. SP 03"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                    value={newCircular.id}
                    onChange={e => setNewCircular({...newCircular, id: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('ISSUED IN')}</label>
                  <input 
                    required
                    placeholder="e.g. May 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                    value={newCircular.date}
                    onChange={e => setNewCircular({...newCircular, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('TITLE')}</label>
                <input 
                  required
                  placeholder={t('Enter circular title...')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                  value={newCircular.title}
                  onChange={e => setNewCircular({...newCircular, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('DIRECT PDF LINK')}</label>
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required
                    type="url"
                    placeholder="https://tri.lk/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                    value={newCircular.url}
                    onChange={e => setNewCircular({...newCircular, url: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-2 px-10 py-3 bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-xl text-sm font-bold shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>{t('Distribute Circular')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
