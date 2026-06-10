// src/views/MenuConfigView.jsx
import React, { useState } from 'react';
import { ChevronLeft, UtensilsCrossed, Euro, Sparkles } from 'lucide-react';

export default function MenuConfigView({ ctx }) {
  // On récupère les valeurs précédentes si elles existent
  const [platChoisi, setPlatChoisi] = useState(ctx.menuPrefs?.plat || '');
  const [budgetMax, setBudgetMax] = useState(ctx.menuPrefs?.budget || '');

  const lancerAnalyseMenu = () => {
    // 1. On sauvegarde le plat et le budget dans l'état global (App.jsx)
    ctx.setMenuPrefs({
      plat: platChoisi.trim(),
      budget: budgetMax ? parseFloat(budgetMax) : null
    });
    // 2. On lance enfin la caméra
    ctx.startCamera('menu');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-24 overflow-y-auto select-none">
      
      {/* HEADER */}
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] shadow-sm sticky top-0 z-30 flex items-center">
        <button 
          onClick={() => ctx.setView('scanSelector')} 
          className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Option Menu</h1>
          <p className="text-slate-500 text-xs mt-0.5">Affinez les conseils de l'IA</p>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          
          {/* CONFIGURATION DU PLAT */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center">
              <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
              Qu'allez-vous manger ? (Optionnel)
            </label>
            <input 
              type="text" 
              placeholder="Ex: Entrecôte frites, Poisson grillé..." 
              value={platChoisi}
              onChange={e => setPlatChoisi(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none text-sm focus:border-[#D4AF37] transition-colors"
            />
            <p className="text-[10px] text-slate-600 italic">Permet à l'IA de trier en priorité les meilleurs accords mets-vins.</p>
          </div>

          {/* CONFIGURATION DU BUDGET */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center">
              <Euro className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
              Budget max par bouteille (Optionnel)
            </label>
            <div className="relative">
              <input 
                type="number" 
                inputMode="decimal"
                placeholder="Ex: 45" 
                value={budgetMax}
                onChange={e => setBudgetMax(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none text-sm focus:border-[#D4AF37] transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">€</span>
            </div>
            <p className="text-[10px] text-slate-600 italic">Masque ou alerte sur les flacons hors de votre budget.</p>
          </div>

        </div>

        {/* BOUTON DE SOUUMISSION */}
        <button 
          onClick={lancerAnalyseMenu}
          className="w-full mt-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg active:scale-[0.99] transition-transform"
        >
          <Sparkles className="w-4 h-4" />
          <span>Analyser la carte des vins</span>
        </button>

      </div>
    </div>
  );
}