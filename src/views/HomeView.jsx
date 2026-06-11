// src/views/HomeView.jsx
import React, { useState, useMemo } from 'react';
import { 
  Plus, Sparkles, Layers, Gamepad2, List, LayoutGrid, 
  Archive, MapPin, GripHorizontal 
} from 'lucide-react';

export default function HomeView({ ctx }) {
  const [filterType, setFilterType] = useState('ALL');
  const [viewMode, setViewMode] = useState('list'); 
  const [reorgMode, setReorgMode] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');

  // On ne garde que les bouteilles en stock
  const cellarItems = ctx.scanHistory.filter(item => item.stock > 0);

  const filteredItems = useMemo(() => {
    return cellarItems.filter(item => {
      return filterType === 'ALL' || item.data?.type_simplifie === filterType;
    });
  }, [cellarItems, filterType]);

  const existingLocations = useMemo(() => {
    return Array.from(new Set(ctx.scanHistory.map(s => s.location).filter(Boolean))).sort();
  }, [ctx.scanHistory]);

  const groupedByLocation = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const loc = item.location && item.location.trim() !== '' ? item.location.trim() : 'Vins non rangés';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleDragStart = (e, bottle) => { 
    e.dataTransfer.setData('text/plain', bottle.id); 
  };
  
  const handleDrop = (e, targetShelf) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;
    ctx.genericUpdate(draggedId, { location: targetShelf });
  };

  const handleMoveBottleClick = (locName) => {
    if (selectedBottle) { 
      ctx.genericUpdate(selectedBottle.id, { location: locName }); 
      setSelectedBottle(null); 
      setNewShelfName(''); 
      ctx.showToast("Bouteille déplacée !"); 
    }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-32 relative select-none overflow-y-auto">

      {/* 1. OUTILS RAPIDES EN HAUT */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button onClick={() => ctx.setView('manualEntry')} className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] border border-[#333] rounded-2xl active:scale-95 transition-all shadow-sm">
          <Plus className="w-6 h-6 text-[#D4AF37] mb-2" />
          <span className="font-bold text-[11px] uppercase text-slate-300 tracking-wider">Ajouter</span>
        </button>
        <button onClick={() => ctx.setView('recommendation')} className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] border border-[#333] rounded-2xl active:scale-95 transition-all shadow-sm">
          <Sparkles className="w-6 h-6 text-[#D4AF37] mb-2" />
          <span className="font-bold text-[11px] uppercase text-slate-300 tracking-wider">Sommelier</span>
        </button>
        <button onClick={() => { if (!ctx.requireTier('AMATEUR')) ctx.setView('compare'); }} className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] border border-[#333] rounded-2xl active:scale-95 transition-all shadow-sm">
          <Layers className="w-6 h-6 text-[#D4AF37] mb-2" />
          <span className="font-bold text-[11px] uppercase text-slate-300 tracking-wider">Comparer</span>
        </button>
        <button onClick={() => ctx.setView('quiz')} className="flex flex-col items-center justify-center p-4 bg-[#1A1A1A] border border-[#333] rounded-2xl active:scale-95 transition-all shadow-sm">
          <Gamepad2 className="w-6 h-6 text-[#D4AF37] mb-2" />
          <span className="font-bold text-[11px] uppercase text-slate-300 tracking-wider">Mini-Jeu</span>
        </button>
      </div>

      {/* 2. FILTRES DE CAVE SCROLLABLES */}
      <div className="px-4 pb-2 sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-md pt-2 border-b border-[#333]">
        <div className="flex justify-between items-center w-full">
          <div className="flex-1 overflow-x-auto touch-pan-x pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mr-3">
            <div className="flex items-center space-x-2 w-max">
              {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${filterType === t ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>
                  {t === 'ALL' ? 'Tous' : t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#333] shrink-0 shadow-[-10px_0_15px_#0a0a0a]">
            <button onClick={() => { setViewMode('list'); setReorgMode(false); }} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-[#333] text-[#D4AF37]' : 'text-slate-600'}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md ${viewMode === 'shelves' ? 'bg-[#333] text-[#D4AF37]' : 'text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* 3. AFFICHAGE DES CONTENUS */}
      <div className="flex-1 p-4 space-y-4">
        {viewMode === 'shelves' && (
          <div className="flex justify-between items-center bg-[#1A1A1A] border border-[#333] rounded-xl p-3 mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase"><b className="text-[#D4AF37]">Rangement :</b> Sur smartphone, utilisez :</p>
            <button onClick={() => { setReorgMode(!reorgMode); setSelectedBottle(null); }} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${reorgMode ? 'bg-[#D4AF37] text-black border-[#D4AF37] animate-pulse' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}><GripHorizontal className="w-3 h-3" /><span>Tactile</span></button>
          </div>
        )}
        
        {filteredItems.length === 0 && (
          <div className="text-center p-6 opacity-50 mt-10">
            <Archive className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="font-medium text-slate-400">Aucun vin ne correspond.</p>
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div key={item.id} onClick={() => ctx.openExistingWine(item, 'home')} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden flex items-stretch cursor-pointer">
                <div className="flex-1 p-5">
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif text-[#F5F5F5] text-lg font-bold line-clamp-1">{item.data?.nom}</h3>
                    <span className="text-emerald-400 font-bold bg-emerald-900/30 px-2 py-0.5 rounded-lg text-xs shrink-0 ml-2">{item.data?.prix_unitaire_nombre}€</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.data?.annee} • {item.data?.region}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10 mt-6">
            {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
              <div key={shelfName} className="mb-8">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center"><MapPin className="w-5 h-5 mr-2 text-[#D4AF37]" /> {shelfName}</h3>
                  <span className="bg-[#1A1A1A] border border-[#333] text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{bottles.length} bouteilles</span>
                </div>
                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)} className="grid grid-cols-3 gap-4 bg-[#1A1A1A]/50 p-4 rounded-3xl border border-[#333] shadow-inner min-h-[200px]">
                  {bottles.map(bottle => (
                    <div key={bottle.id} draggable={!reorgMode} onDragStart={(e) => handleDragStart(e, bottle)} onClick={() => { if (reorgMode) setSelectedBottle(bottle); else ctx.openExistingWine(bottle, 'home'); }} className={`relative flex flex-col bg-[#1A1A1A] rounded-2xl p-3 shadow-md border border-[#333] cursor-pointer ${reorgMode ? 'ring-2 ring-[#D4AF37] animate-pulse' : ''}`}>
                      <div className="relative h-28 w-full mb-3 flex items-center justify-center bg-[#0a0a0a] rounded-xl border border-[#222]">
                        <img src={bottle.image || fallbackImg} className="max-h-full object-contain" alt="" loading="lazy" />
                        {bottle.stock > 1 && <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold">x{bottle.stock}</span>}
                      </div>
                      <div className="flex flex-col items-center text-center mt-1">
                        <h4 className="text-[11px] font-bold text-[#F5F5F5] leading-tight line-clamp-2">{bottle.data?.nom}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] text-slate-400">{bottle.data?.annee}</span>
                          <span className="text-[10px] font-bold text-emerald-400">{bottle.data?.prix_unitaire_nombre}€</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div onDragOver={(e)=>e.preventDefault()} onDrop={(e) => { e.preventDefault(); const newName = window.prompt("Nom de la nouvelle étagère ?"); if (newName && newName.trim() !== '') handleDrop(e, newName); }} className="mt-8 border-2 border-dashed border-[#333] rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer">
              <Plus className="w-8 h-8 mb-2" /><p className="font-bold text-xs uppercase tracking-wider text-center">Glissez un vin ici pour créer une étagère</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODALE DE RANGEMENT MANUEL SANS GLISSER (MOBILE-TOUCH) */}
      {selectedBottle && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] w-full max-w-sm rounded-3xl p-6 shadow-2xl mb-safe border border-[#333]">
            <h3 className="font-serif text-2xl font-bold text-white mb-1">Ranger la bouteille</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-6 mt-4">
              {existingLocations.map(loc => <button key={loc} onClick={() => handleMoveBottleClick(loc)} className="w-full text-left p-4 rounded-2xl bg-[#0a0a0a] border border-[#333] text-[#F5F5F5] font-bold"><MapPin className="w-4 h-4 inline mr-3 text-[#D4AF37]" /> {loc}</button>)}
              <button onClick={() => handleMoveBottleClick('')} className="w-full text-left p-4 rounded-2xl bg-[#0a0a0a] border border-[#333] text-slate-500 italic">Retirer de l'étagère</button>
            </div>
            <div className="flex space-x-2 border-t border-[#333] pt-6">
              <input type="text" border-none placeholder="Nouvelle étagère..." value={newShelfName} onChange={(e) => setNewShelfName(e.target.value)} className="flex-1 bg-[#0a0a0a] border border-[#333] text-white rounded-2xl px-4 py-4 outline-none focus:border-[#D4AF37] font-medium" />
              <button onClick={() => handleMoveBottleClick(newShelfName)} disabled={!newShelfName.trim()} className="px-6 py-4 bg-[#D4AF37] text-black rounded-2xl font-bold disabled:opacity-50">Créer</button>
            </div>
            <button onClick={() => { setSelectedBottle(null); setNewShelfName(''); }} className="mt-4 w-full py-4 text-slate-400 font-bold rounded-2xl">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}