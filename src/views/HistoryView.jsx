// src/views/HistoryView.jsx
import React from 'react';
import { History, ChevronRight, Wine, Inbox } from 'lucide-react';
import { getGenericImageForType } from '../utils/wineHelpers';

export default function HistoryView({ ctx }) {
  // Filtrer les éléments qui font partie de l'historique actif
  const historyItems = ctx.scanHistory.filter(item => item.in_history !== false);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      {/* HEADER */}
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <History className="w-6 h-6 text-[#D4AF37]" />
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Historique</h1>
            <p className="text-slate-500 text-xs mt-0.5">Vos analyses et scans mémorisés</p>
          </div>
        </div>
      </div>

      {/* LISTE DES SCANS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyItems.length > 0 ? (
          historyItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => ctx.openExistingWine(item, 'history')} 
              className="bg-[#1A1A1A] rounded-3xl border border-[#333] p-4 flex items-center space-x-4 cursor-pointer hover:bg-[#222] transition-colors active:scale-[0.99]"
            >
              {/* Vignette bouteille */}
              <div className="w-16 h-16 bg-black rounded-2xl p-2 flex items-center justify-center shrink-0 border border-[#222]">
                <img 
                  src={item.image || getGenericImageForType(item.data?.type_simplifie)} 
                  className="max-h-full object-contain" 
                  alt="wine" 
                  loading="lazy"
                />
              </div>

              {/* Infos textuelles */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-serif font-bold text-base truncate">
                  {item.data?.nom || 'Vin inconnu'}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-slate-400">
                    {item.data?.annee || 'N.M.'} · {item.data?.region || 'Région inconnue'}
                  </span>
                </div>
                {item.dateStr && (
                  <p className="text-[10px] text-slate-600 mt-1 font-medium">
                    Analysé le {item.dateStr}
                  </p>
                )}
              </div>

              {/* Statut Stock & Flèche */}
              <div className="flex items-center space-x-3 shrink-0">
                {item.stock > 0 && (
                  <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded-md font-bold">
                    En cave ({item.stock})
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 opacity-50">
            <Inbox className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="font-medium text-slate-400">Aucun scan dans votre historique.</p>
          </div>
        )}
      </div>
    </div>
  );
}