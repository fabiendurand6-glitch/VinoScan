// src/views/CompareView.jsx
import React, { useState } from 'react';
import { ChevronLeft, Scale, ArrowRight, Wine, AlertCircle } from 'lucide-react';
import { getGenericImageForType } from '../utils/wineHelpers';

export default function CompareView({ ctx }) {
  const [wineA, setWineA] = useState(null);
  const [wineB, setWineB] = useState(null);
  const [selectorTarget, setSelectorTarget] = useState(null); // 'A' | 'B' | null

  // On liste toutes les références uniques présentes en cave ou historique
  const availableWines = ctx.scanHistory;

  const handleSelectWine = (wine) => {
    if (selectorTarget === 'A') setWineA(wine);
    if (selectorTarget === 'B') setWineB(wine);
    setSelectorTarget(null);
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-24 overflow-y-auto select-none">
      
      {/* HEADER */}
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] shadow-sm sticky top-0 z-30 flex items-center">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Comparateur</h1>
          <p className="text-slate-500 text-xs mt-0.5">Confrontez deux flacons</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* DUEL : GRILLE DE SÉLECTION */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* EMPLACEMENT VIN A */}
          <div 
            onClick={() => setSelectorTarget('A')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition-all min-h-[160px] flex flex-col justify-center items-center ${wineA ? 'bg-[#1a1a1a] border-[#333]' : 'bg-[#1a1a1a]/40 border-dashed border-[#444] hover:border-[#D4AF37]'}`}
          >
            {wineA ? (
              <>
                <img src={wineA.image || getGenericImageForType(wineA.data?.type_simplifie)} className="h-20 object-contain mb-2" alt="" />
                <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight">{wineA.data?.nom}</h3>
                <span className="text-[10px] text-[#D4AF37] font-bold mt-1">{wineA.data?.annee}</span>
              </>
            ) : (
              <>
                <Wine className="w-6 h-6 text-slate-600 mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Choisir Vin A</p>
              </>
            )}
          </div>

          {/* EMPLACEMENT VIN B */}
          <div 
            onClick={() => setSelectorTarget('B')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition-all min-h-[160px] flex flex-col justify-center items-center ${wineB ? 'bg-[#1a1a1a] border-[#333]' : 'bg-[#1a1a1a]/40 border-dashed border-[#444] hover:border-[#D4AF37]'}`}
          >
            {wineB ? (
              <>
                <img src={wineB.image || getGenericImageForType(wineB.data?.type_simplifie)} className="h-20 object-contain mb-2" alt="" />
                <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight">{wineB.data?.nom}</h3>
                <span className="text-[10px] text-[#D4AF37] font-bold mt-1">{wineB.data?.annee}</span>
              </>
            ) : (
              <>
                <Wine className="w-6 h-6 text-slate-600 mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Choisir Vin B</p>
              </>
            )}
          </div>

        </div>

        {/* AFFICHAGE DE LA CONFRONTATION DES DONNÉES */}
        {wineA && wineB ? (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-4 space-y-4 animate-fadeIn">
            
            {/* MATCH PRIX */}
            <div className="border-b border-[#262626] pb-3">
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-500 text-center mb-1">Prix Estimé</p>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className={parseFloat(wineA.data?.prix_unitaire_nombre) > parseFloat(wineB.data?.prix_unitaire_nombre) ? 'text-emerald-400 font-black' : 'text-white'}>
                  {wineA.data?.prix_unitaire_nombre ? `${wineA.data.prix_unitaire_nombre}€` : 'N.C'}
                </span>
                <Scale className="w-4 h-4 text-slate-600" />
                <span className={parseFloat(wineB.data?.prix_unitaire_nombre) > parseFloat(wineA.data?.prix_unitaire_nombre) ? 'text-emerald-400 font-black' : 'text-white'}>
                  {wineB.data?.prix_unitaire_nombre ? `${wineB.data.prix_unitaire_nombre}€` : 'N.C'}
                </span>
              </div>
            </div>

            {/* MATCH APOGÉE / GARDE */}
            <div className="border-b border-[#262626] pb-3">
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-500 text-center mb-1">Apogée optimale</p>
              <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                <span className="w-2/5 text-left truncate">{wineA.data?.apogee || 'N.C'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="w-2/5 text-right truncate">{wineB.data?.apogee || 'N.C'}</span>
              </div>
            </div>

            {/* MATCH RÉGION */}
            <div className="border-b border-[#262626] pb-3">
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-500 text-center mb-1">Région & Origine</p>
              <div className="flex justify-between items-center text-xs font-bold text-white">
                <span className="w-2/5 text-left truncate">{wineA.data?.region || 'Inconnue'}</span>
                <span className="text-slate-700">vs</span>
                <span className="w-2/5 text-right truncate">{wineB.data?.region || 'Inconnue'}</span>
              </div>
            </div>

            {/* MATCH TYPE SIMPLIFIÉ */}
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-500 text-center mb-1">Profil & Robe</p>
              <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                <span>{wineA.data?.type_simplifie}</span>
                <span>{wineB.data?.type_simplifie}</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#1a1a1a]/50 border border-[#222] rounded-2xl p-6 text-center text-slate-500 flex flex-col items-center justify-center">
            <AlertCircle className="w-5 h-5 text-slate-600 mb-2" />
            <p className="text-xs">Sélectionnez deux flacons pour activer le module de comparaison d'arômes et de garde.</p>
          </div>
        )}

      </div>

      {/* COMPOSANT TIERS : SÉLECTEUR / BOTTOM SHEET FLOTTANTE */}
      {selectorTarget && (
        <div className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#333] w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex justify-between items-center border-b border-[#333] pb-3 mb-4">
              <h3 className="font-serif text-lg font-bold text-white">Sélectionner un flacon ({selectorTarget})</h3>
              <button onClick={() => setSelectorTarget(null)} className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fermer</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {availableWines.map(wine => (
                <div 
                  key={wine.id}
                  onClick={() => handleSelectWine(wine)}
                  className="p-3 bg-[#0a0a0a] border border-[#222] rounded-xl flex items-center justify-between active:bg-[#151515] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center p-1 border border-[#333]">
                      <img src={wine.image || getGenericImageForType(wine.data?.type_simplifie)} className="h-full object-contain" alt="" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{wine.data?.nom}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{wine.data?.region} · {wine.data?.annee}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#1a1a1a] border border-[#333] px-2 py-0.5 rounded text-slate-400 font-bold">x{wine.stock}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}