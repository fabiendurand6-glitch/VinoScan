// src/views/ScanSelectorView.jsx
import React from 'react';

export default function ScanSelectorView({ ctx }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-[#0a0a0a] text-[#F5F5F5] space-y-4 select-none">
      <h2 className="text-xl font-bold text-[#D4AF37] mb-6">Ajouter à la cave</h2>

      {/* RECONNAISSANCE BOUTEILLE */}
      <button 
        onClick={() => ctx.startCamera('bottle')} 
        className="w-full bg-[#1A1A1A] border border-[#333] p-5 rounded-2xl active:scale-95 flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-full flex items-center justify-center text-2xl border border-[#333] shrink-0">🍾</div>
        <div className="text-left">
          <p className="font-bold">Scanner une Bouteille</p>
          <p className="text-[10px] text-slate-400">Reconnaissance IA de l'étiquette</p>
        </div>
      </button>

      {/* RECHERCHE TEXTE */}
      <button 
        onClick={() => ctx.setView('aiSearch')} 
        className="w-full bg-[#1A1A1A] border border-[#333] p-5 rounded-2xl active:scale-95 flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-full flex items-center justify-center text-2xl border border-[#333] shrink-0">⌨️</div>
        <div className="text-left">
          <p className="font-bold">Recherche IA par texte</p>
          <p className="text-[10px] text-slate-400">Trouvez un vin avec son nom</p>
        </div>
      </button>

      {/* SCAN DE MENU */}
       <button 
         onClick={() => { if (!ctx.requireTier('AMATEUR')) ctx.setView('menuConfig'); }} 
         className="w-full bg-[#1A1A1A] border border-[#333] p-5 rounded-2xl active:scale-95 flex items-center space-x-4"
       >
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-full flex items-center justify-center text-2xl border border-[#D4AF37]/50 shrink-0">📖</div>
        <div className="text-left">
          <p className="font-bold">Scanner un Menu</p>
          <p className="text-[10px] text-[#D4AF37]">Conseil accord mets-vins</p>
        </div>
      </button>

      {/* SCAN DE FACTURE */}
      <button 
        onClick={() => { if (!ctx.requireTier('AMATEUR')) ctx.startCamera('receipt'); }} 
        className="w-full bg-[#1A1A1A] border border-[#333] p-5 rounded-2xl active:scale-95 flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-full flex items-center justify-center text-2xl border border-[#D4AF37]/50 shrink-0">🧾</div>
        <div className="text-left">
          <p className="font-bold">Scanner une Facture</p>
          <p className="text-[10px] text-[#D4AF37]">Import multiple rapide</p>
        </div>
      </button>

      {/* BOUTON ANNULER */}
      <button 
        onClick={() => ctx.setView('home')} 
        className="mt-6 text-gray-500 font-bold p-4 active:scale-95 uppercase tracking-wider text-xs"
      >
        ✕ Annuler
      </button>
    </div>
  );
}