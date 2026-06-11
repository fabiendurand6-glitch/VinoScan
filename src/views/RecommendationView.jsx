// src/views/RecommendationView.jsx
import React, { useState } from 'react';
import { 
  ChevronLeft, Sparkles, ShoppingCart, Archive, Wine, 
  Euro, Utensils, RefreshCw, Camera
} from 'lucide-react';
import { boutiqueProducts } from '../constants/shopData';
import { getAmazonAffiliateLink, extractJSON } from '../utils/wineHelpers';

export default function RecommendationView({ ctx }) {
  const [recMode, setRecMode] = useState('menu'); // 'menu' | 'buy' | 'cellar' | 'boutique'
  const [filterType, setFilterType] = useState('ALL');
  const [filterFood, setFilterFood] = useState('ALL');
  const [filterPrice, setFilterPrice] = useState('ALL');
  const [pairingDish, setPairingDish] = useState('');
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [shopCat, setShopCat] = useState('DEGUSTATION');

  const handleRecommend = () => { 
    ctx.fetchAIRecommendation(filterType, 'ALL', filterFood, filterPrice); 
  };

  const handleAskCellarSommelier = async () => {
    if (!pairingDish.trim()) return;
    setIsPairingLoading(true);
    try {
      const inStockWines = ctx.scanHistory.filter(w => w.stock > 0);
      if (inStockWines.length === 0) throw new Error("Cave vide");
      
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} ${w.data.annee} (${w.data.type_simplifie})`).join('\n');
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}". Voici les vins dans sa cave : \n${inventoryString}\nChoisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat. Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;
      
      const result = await ctx.callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      
      if(!chosenWine) throw new Error("Erreur IA");
      ctx.showToast(`L'IA recommande : ${chosenWine.data.nom}`);
      ctx.openExistingWine(chosenWine, 'recommendation');
    } catch (e) {
      ctx.showToast("Accord introuvable ou cave vide.");
    } finally { 
      setIsPairingLoading(false); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex items-center sticky top-0 z-50">
        {recMode !== 'menu' && (
          <button onClick={() => setRecMode('menu')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#0a0a0a] border border-[#D4AF37]/50 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
            <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Le Sommelier</h1>
            <p className="text-slate-400 text-sm font-medium">Laissez l'IA vous conseiller</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-10">
        {recMode === 'menu' && (
          <div className="space-y-6 mt-4">
            <button onClick={() => setRecMode('buy')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><ShoppingCart className="w-6 h-6 text-[#D4AF37]" /></div>
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Acheter un vin</h3><p className="text-xs text-slate-400">Le meilleur vin à acheter selon votre repas.</p></div>
            </button>
            <button onClick={() => { if (!ctx.requireTier('AMATEUR')) ctx.setView('compare'); }} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0">
               <Camera className="w-6 h-6 text-[#D4AF37]" />
              </div>
             <div>
               <h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Hésitation en rayon</h3>
               <p className="text-xs text-slate-400">Scannez plusieurs étiquettes pour trouver le meilleur accord.</p>
             </div>
            </button>
            <button onClick={() => setRecMode('cellar')} className="w-full bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center shrink-0"><Archive className="w-6 h-6 text-[#D4AF37]" /></div>
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Que boire ce soir ?</h3><p className="text-xs text-slate-400">Trouvez la bouteille parfaite dans votre cave.</p></div>
            </button>
            <button onClick={() => setRecMode('boutique')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><Wine className="w-6 h-6 text-[#D4AF37]" /></div>
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">La Boutique Élite</h3><p className="text-xs text-slate-400">Accessoires professionnels.</p></div>
            </button>
          </div>
        )}

        {recMode === 'cellar' && (
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-8 text-center shadow-lg">
            <div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333]"><Utensils className="w-10 h-10 text-[#D4AF37]" /></div>
            <h3 className="font-serif text-2xl font-bold text-[#F5F5F5] mb-3">Que mangez-vous ?</h3>
            <input autoFocus type="text" placeholder="Ex: Magret de canard..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-5 bg-[#0a0a0a] border border-[#333] text-white rounded-xl focus:border-[#D4AF37] outline-none mb-6" />
            <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-full shadow-lg flex justify-center">
              {isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Explorer ma cave"}
            </button>
          </div>
        )}

        {recMode === 'buy' && (
         <div className="space-y-10">
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Euro className="w-5 h-5 text-[#D4AF37]" /><span>Budget</span></h3>
            <div className="flex flex-wrap gap-2">
              {[{id: 'ALL', label: 'Peu importe'}, {id: 'BUDGET', label: '- de 15 €'}, {id: 'MEDIUM', label: '15 € à 35 €'}, {id: 'PREMIUM', label: '+ de 35 €'}].map(p => (
               <button key={p.id} onClick={() => setFilterPrice(p.id)} className={`px-5 py-3 rounded-full text-sm font-bold border ${filterPrice === p.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Repas</span></h3>
            <div className="flex flex-wrap gap-2">
              {[{id: 'ALL', label: 'Peu importe'}, {id: 'APERITIF', label: 'Apéritif'}, {id: 'VIANDE_ROUGE', label: 'Viande Rouge'}, {id: 'POISSON', label: 'Poisson'}, {id: 'FROMAGE', label: 'Fromage'}].map(f => (
               <button key={f.id} onClick={() => setFilterFood(f.id)} className={`px-5 py-3 rounded-full text-sm font-bold border ${filterFood === f.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Wine className="w-5 h-5 text-[#D4AF37]" /><span>Type</span></h3>
            <div className="flex flex-wrap gap-2">
              {[{id: 'ALL', label: 'Tous'}, {id: 'ROUGE', label: 'Rouge'}, {id: 'BLANC', label: 'Blanc'}, {id: 'PETILLANT', label: 'Pétillant'}, {id: 'ROSE', label: 'Rosé'}].map(t => (
               <button key={t.id} onClick={() => setFilterType(t.id)} className={`px-5 py-3 rounded-full text-sm font-bold border ${filterType === t.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <button onClick={handleRecommend} className="w-full py-5 bg-[#D4AF37] text-black font-black text-lg rounded-full shadow-lg flex items-center justify-center space-x-3 mt-8">
            <Sparkles className="w-6 h-6" /><span>Trouver la perle rare</span>
          </button>
         </div>
        )}

        {recMode === 'boutique' && (
          <div className="space-y-6 pb-10">
            <div className="overflow-x-auto touch-pan-x pb-2 border-b border-[#333] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex space-x-2 w-max">
                {['DEGUSTATION', 'CONSERVATION', 'CAVE'].map(cat => (
                  <button key={cat} onClick={() => setShopCat(cat)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase border tracking-wider transition-colors ${shopCat === cat ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>
                    {cat === 'DEGUSTATION' ? 'Art du Service' : cat === 'CONSERVATION' ? 'Entretien & Gaz' : 'Agencement Cave'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {boutiqueProducts[shopCat].map((prod, idx) => (
                <div key={idx} className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-5 flex items-center justify-between shadow-md">
                  <div className="flex items-start space-x-4 min-w-0 flex-1 pr-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] border border-[#333] flex items-center justify-center text-2xl shrink-0">{prod.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <h4 className="font-serif font-bold text-white text-base truncate">{prod.name}</h4>
                        <span className="text-xs font-black text-[#D4AF37] shrink-0">{prod.price}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{prod.desc}</p>
                    </div>
                  </div>
                  <a href={getAmazonAffiliateLink(prod.query)} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-[#0a0a0a] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold rounded-xl shrink-0 active:scale-95 transition-all">Voir</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}