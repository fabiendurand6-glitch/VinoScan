// src/views/CompareView.jsx
import React from 'react';
import { ChevronLeft, Camera, Sparkles, Award, X } from 'lucide-react';

export default function CompareView({ ctx }) {

  const handleAddClick = () => {
    if (ctx.userTier === 'FREE' && ctx.compareBasket.length >= 2) { 
      ctx.showToast("Gratuit : 2 bouteilles max."); 
      return; 
    }
    if (ctx.userTier === 'AMATEUR' && ctx.compareBasket.length >= 4) { 
      ctx.showToast("Amateur : 4 bouteilles max."); 
      return; 
    }
    // On lance la caméra interne avec le mode "compare"
    ctx.startCamera('compare');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] pb-32 overflow-y-auto select-none p-5">
      <div className="flex items-center mb-6 pt-6 border-b border-[#333] pb-4 sticky top-0 bg-[#0a0a0a] z-10">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#1A1A1A] border border-[#333] rounded-full text-slate-400 hover:text-[#D4AF37]">
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#D4AF37]">Comparateur</h2>
          <p className="text-slate-500 text-xs mt-0.5">Scannez vos options en rayon</p>
        </div>
      </div>

      {ctx.compareResult ? (
        <div className="animate-in slide-in-from-top-4 mb-6">
          <button 
            onClick={() => ctx.processRecommendationSelection({
              nom: ctx.compareResult.gagnant, 
              description: ctx.compareResult.justification,
              type_simplifie: "ROUGE",
              stock: 1 // Ajoute 1 en stock directement
            })}
            className="w-full text-left bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] p-6 rounded-3xl mb-4 shadow-xl active:scale-95 transition-transform"
          >
            <h3 className="font-black text-xl mb-3 flex items-center text-black">
              <Award className="w-6 h-6 mr-2 text-black"/> 
              {ctx.compareResult.gagnant}
            </h3>
            <div className="bg-black/10 p-3 rounded-xl mb-3">
              <p className="text-sm font-black text-black mb-1">Le verdict :</p>
              <p className="text-sm font-semibold text-black leading-snug">{ctx.compareResult.justification}</p>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-xs text-black/80 font-bold uppercase tracking-wider mb-2">Autres options détectées :</p>
              {ctx.compareResult.alternatives?.map((alt, index) => (
                <div 
                  key={index} 
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.processRecommendationSelection({ nom: alt.nom, description: alt.avis, type_simplifie: "ROUGE", stock: 1 });
                  }}
                  className="bg-black/5 border border-black/10 p-3 rounded-xl active:scale-95 transition-transform"
                >
                  <p className="text-sm font-bold text-black">{alt.nom}</p>
                  <p className="text-xs text-black/80 font-medium">{alt.avis}</p>
                </div>
              ))}
            </div>
          </button>

          <button 
            onClick={() => { ctx.setCompareResult(null); ctx.setCompareBasket([]); ctx.setCompareContext(''); }} 
            className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#333]"
          >
            Nouvelle comparaison
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-6">Prenez en photo les bouteilles qui vous font hésiter en magasin. L'IA choisira la pépite pour vous.</p>
          
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] mb-6 shadow-lg">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quel plat pour ce vin ?</label>
            <input 
              type="text" 
              value={ctx.compareContext} 
              onChange={(e) => ctx.setCompareContext(e.target.value)} 
              placeholder="Ex: Barbecue, Poisson, Cadeau..." 
              className="w-full bg-black border border-[#333] text-white rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-colors" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {ctx.compareBasket.map((imgBase64, index) => (
              <div key={index} className="relative h-40 bg-black rounded-2xl border border-[#333] overflow-hidden shadow-md">
                <img src={imgBase64} className="w-full h-full object-cover opacity-80" alt={`Vin ${index + 1}`} />
                <button 
                  onClick={() => ctx.removeCompareImage(index)} 
                  className="absolute top-2 right-2 bg-red-500/90 text-white p-2 rounded-full shadow-lg active:scale-90"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <button 
             onClick={handleAddClick}
             className="h-40 flex flex-col items-center justify-center bg-[#1A1A1A] border-2 border-dashed border-[#333] rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 transition-colors text-slate-400 hover:text-[#D4AF37] shadow-inner"
             >
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider text-center px-2">Ajouter<br/>une étiquette</span>
            </button>
          </div>

          <button 
            onClick={ctx.launchComparison} 
            disabled={ctx.compareBasket.length < 2} 
            className={`w-full py-5 font-black text-lg rounded-full shadow-lg flex items-center justify-center space-x-3 transition-all ${ctx.compareBasket.length >= 2 ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black hover:scale-[1.02]' : 'bg-[#1A1A1A] text-slate-600 border border-[#333]'}`}
          >
            <Sparkles className="w-6 h-6" />
            <span>Analyser la sélection ({ctx.compareBasket.length})</span>
          </button>
        </>
      )}
    </div>
  );
}