// src/views/AlertsView.jsx
import React from 'react';
import { ChevronLeft, Trash2, Inbox } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

export default function AlertsView({ ctx }) {
  const { alerts, user } = ctx;

  const markAllAsRead = () => {
    if (!user) return;
    alerts.forEach(a => {
      if (!a.read) {
        updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', a.id), { read: true });
      }
    });
  };

  const handleAlertClick = (alert) => {
    if (!user) return;
    updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', alert.id), { read: true });
    if (alert.scanId) {
      const wine = ctx.scanHistory.find(s => s.id === alert.scanId);
      if (wine) ctx.openExistingWine(wine, 'alerts');
    }
  };

  const deleteAlert = async (e, alertId) => {
    e.stopPropagation(); // Empêche d'ouvrir le vin au clic sur la corbeille
    if (!user) return;
    try { 
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', alertId)); 
    } catch(err) {
      console.error("Erreur suppression alerte:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] select-none overflow-y-auto pb-20">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button 
            onClick={() => ctx.setView('home')} 
            className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Notifications</h1>
        </div>
        {alerts.some(a => !a.read) && (
          <button onClick={markAllAsRead} className="text-xs text-slate-400 hover:text-[#D4AF37] font-bold">
            Tout lire
          </button>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 font-medium flex flex-col items-center justify-center p-8">
            <Inbox className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm">Aucune notification à afficher.</p>
          </div>
        ) : (
          alerts.map(a => (
            <div 
              key={a.id} 
              onClick={() => handleAlertClick(a)} 
              className={`bg-[#1A1A1A] rounded-2xl border ${a.read ? 'border-[#333]' : 'border-[#D4AF37]/50 shadow-md'} p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-[#222]`}
            >
              <div className="flex-1 pr-3">
                <h4 className="font-bold text-white text-sm">{a.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{a.message}</p>
              </div>
              <div className="flex items-center space-x-4 shrink-0">
                {!a.read && <div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div>}
                <button 
                  onClick={(e) => deleteAlert(e, a.id)} 
                  className="p-2 bg-[#0a0a0a] border border-[#333] rounded-xl text-slate-500 hover:text-red-500 hover:border-red-500/50 transition-all active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}