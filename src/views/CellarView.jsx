// src/views/CellarView.jsx
import React, { useState } from 'react';
import { 
  Search, SlidersHorizontal, Grid, Layers, Wine, 
  Sparkles, Calendar, Euro, MapPin, Inbox 
} from 'lucide-react';
import { getGenericImageForType } from '../utils/wineHelpers';

export default function CellarView({ ctx }) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [wineType, setWineType] = useState('ALL');
  const [sortBy, setSortBy] = useState('RECENT');
  const [displayMode, setDisplayMode] = useState('GRID'); // 'GRID' | 'SHELF'

  // Filtrer uniquement les vins en stock
  const inStockWines = ctx.scanHistory.filter(item => item.stock > 0);

  // Statistiques de la cave
  const totalBottles = inStockWines.reduce((sum, item) => sum + (item.stock || 0), 0);
  const estimatedValue = inStockWines.reduce((sum, item) => {
    const price = parseFloat(item.data?.prix_unitaire_nombre) || 0;
    return sum + (price * (item.stock || 0));
  }, 0);

  // Filtrage et recherche
  const filteredWines = inStockWines.filter(item => {
    const matchType = wineType === 'ALL' || item.data?.type_simplifie === wineType;
    const matchSearch = !search.trim() || 
      item.data?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      item.data?.region?.toLowerCase().includes(search.toLowerCase()) ||
      item.data?.annee?.toString().includes(search);
    return matchType && matchSearch;
  });

  // Tri des résultats
  const sortedWines = [...filteredWines].sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return (parseFloat(a.data?.prix_unitaire_nombre) || 0) - (parseFloat(b.data?.prix_unitaire_nombre) || 0);
    if (sortBy === 'PRICE_DESC') return (parseFloat(b.data?.prix_unitaire_nombre) || 0) - (parseFloat(a.data?.prix_unitaire_nombre) || 0);
    if (sortBy === 'NAME') return (a.data?.nom || '').localeCompare(b.data?.nom || '');
    return b.timestamp - a.timestamp; // RECENT
  });

  // Rangement par étagères (si mode SHELF activé)
  const shelves = {};
  if (displayMode === 'SHELF') {
    sortedWines.forEach(wine => {
      const shelfName = wine.shelf || "Non rangé";
      if (!shelves[shelfName]) shelves[shelfName] = [];
      shelves[shelfName].push(wine);
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-24 overflow-y-auto select-none">
      
      {/* HEADER & COMPTEURS */}
      <div className="bg-[#1a1a1a] pt-12 pb-6 px-6 border-b border-[#333] sticky top-0 z-30">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Ma Cave</h1>
            <p className="text-slate-500 text-xs mt-0.5">Gestion de vos flacons précieux</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setDisplayMode('GRID')} 
              className={`p-2.5 rounded-xl border transition-all ${displayMode === 'GRID' ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDisplayMode('SHELF')} 
              className={`p-2.5 rounded-xl border transition-all ${displayMode === 'SHELF' ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded-2xl flex items-center space-x-3">
            <Wine className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Bouteilles</p>
              <p className="text-lg font-black text-white">{totalBottles}</p>
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded-2xl flex items-center space-x-3">
            <Euro className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Valeur Est.</p>
              <p className="text-lg font-black text-white">{estimatedValue.toFixed(0)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE & FILTRES */}
      <div className="p-6 space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Rechercher un vin, région..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none text-sm focus:border-[#D4AF37] transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`p-3.5 border rounded-xl transition-all ${showFilters ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#1a1a1a] border-[#333] text-slate-400'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 space-y-4 animate-fadeIn">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Type de vin</label>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'ROUGE', 'BLANC', 'ROSE', 'PETILLANT'].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setWineType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${wineType === t ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}
                  >
                    {t === 'ALL' ? 'Tous' : t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Trier par</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'RECENT', label: 'Ajouts récents' },
                  { id: 'NAME', label: 'Nom' },
                  { id: 'PRICE_ASC', label: 'Prix croissant' },
                  { id: 'PRICE_DESC', label: 'Prix décroissant' }
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSortBy(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sortBy === s.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AFFICHAGE GRILLE */}
        {displayMode === 'GRID' && (
          sortedWines.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {sortedWines.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => ctx.openExistingWine(item, 'cellar')}
                  className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-md active:scale-[0.98] transition-all flex flex-col"
                >
                  <div className="h-32 bg-[#0d0d0d] relative flex items-center justify-center p-4 border-b border-[#262626]">
                    <img 
                      src={item.img || getGenericImageForType(item.data?.type_simplifie)} 
                      className="h-full object-contain max-w-full" 
                      alt="Bouteille" 
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 border border-[#333] text-[10px] font-black text-[#D4AF37] rounded-md">
                      x{item.stock}
                    </span>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-white text-sm line-clamp-1">{item.data?.nom}</h4>
                      <p className="text-slate-500 text-[11px] font-medium truncate mt-0.5">{item.data?.region || 'Région inconnue'}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#262626]">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0a0a0a] border border-[#333] text-slate-400">
                        {item.data?.annee || 'N.C'}
                      </span>
                      <span className="text-xs font-black text-[#D4AF37]">
                        {item.data?.prix_unitaire_nombre ? `${item.data.prix_unitaire_nombre}€` : '--€'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )
        )}

        {/* AFFICHAGE ÉTAGÈRES */}
        {displayMode === 'SHELF' && (
          sortedWines.length > 0 ? (
            <div className="space-y-6">
              {Object.keys(shelves).map(shelf => (
                <div key={shelf} className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-[#262626]">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">{shelf}</h3>
                    <span className="text-[10px] text-slate-600 font-bold">({shelves[shelf].length} réf.)</span>
                  </div>
                  <div className="space-y-2">
                    {shelves[shelf].map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => ctx.openExistingWine(item, 'cellar')}
                        className="bg-[#0a0a0a] border border-[#222] p-3 rounded-xl flex items-center justify-between active:bg-[#151515] transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center p-1 border border-[#333]">
                            <img src={item.img || getGenericImageForType(item.data?.type_simplifie)} className="h-full object-contain" alt="" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{item.data?.nom}</h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.data?.region} · {item.data?.annee}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-[#D4AF37] px-2.5 py-1 bg-[#1a1a1a] border border-[#333] rounded-md">
                          x{item.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )
        )}

      </div>
    </div>
  );
}

// Sous-composant d'état vide interne pour éviter la répétition
function EmptyState() {
  return (
    <div className="text-center py-16 bg-[#1a1a1a] border border-[#333] rounded-3xl p-6">
      <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <h3 className="text-slate-400 text-sm font-bold">Aucune bouteille trouvée</h3>
      <p className="text-slate-600 text-xs mt-1">Modifiez vos filtres ou ajoutez un nouveau vin.</p>
    </div>
  );
}