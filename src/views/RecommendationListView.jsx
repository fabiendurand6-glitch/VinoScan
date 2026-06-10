// src/views/RecommendationListView.jsx
import React, { useMemo } from 'react';
import { ChevronLeft, ThumbsUp, AlertTriangle, Wine, DollarSign } from 'lucide-react';

export default function RecommendationListView({ ctx }) {
  const { menuAnalysisResult, menuConfig } = ctx;

  // Filtrer et trier les recommandations selon la configuration utilisateur
  const processedRecommendations = useMemo(() => {
    if (!menuAnalysisResult || !menuAnalysisResult.recommandations) return [];

    let list = [...menuAnalysisResult.recommandations];

    // Si un budget max est défini, on marque les bouteilles hors budget
    if (menuConfig?.budget) {
      list = list.map(item => ({
        ...item,
        isOverBudget: item.prix > menuConfig.budget
      }));
    }

    // Tri subsidiaire : mettre en avant les meilleurs accords ("Excellent")
    return list.sort((a, b) => {
      if (a.accord === 'Excellent' && b.accord !== 'Excellent') return -1;
      if (a.accord !== 'Excellent' && b.accord === 'Excellent') return 1;
      return (a.prix || 0) - (b.prix || 0);
    });
  }, [menuAnalysisResult, menuConfig]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-24 overflow-y-auto select-none">
      
      {/* HEADER */}
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] shadow-sm sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => ctx.setView('menuConfig')} 
            className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Suggestions</h1>
            <p className="text-slate-500 text-xs mt-0.5">La sélection de votre sommelier</p>
          </div>
        </div>
      </div>

      {/* CONTEXTE DE RECHERCHE RAFFINÉ */}
      {menuConfig && (menuConfig.plat || menuConfig.budget) && (
        <div className="mx-4 mt-4 p-3 bg-[#1A1A1A]/60 border border-[#222] rounded-xl flex items-center space-x-4 text-xs text-slate-400">
          {menuConfig.plat && <p>🍽️ Plat : <b className="text-white">{menuConfig.plat}</b></p>}
          {menuConfig.budget && <p>💰 Budget max : <b className="text-white">{menuConfig.budget}€</b></p>}
        </div>
      )}

      {/* LISTE DES RECOMMANDATIONS */}
      <div className="p-4 space-y-4">
        {processedRecommendations.length > 0 ? (
          processedRecommendations.map((item, index) => (
            <div 
             key={index}
               onClick={() => ctx.processRecommendationSelection({ 
               nom: item.nom, 
              description: item.commentaire, 
              type_simplifie: item.type === 'VIN' ? 'ROUGE' : item.type, 
                stock: 1 
             })}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      {item.type || 'VIN'}
                    </span>
                    {item.accord === 'Excellent' && (
                      <span className="text-[9px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wide flex items-center">
                        <ThumbsUp className="w-2.5 h-2.5 mr-1" /> Accord Top
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-serif font-bold text-base mt-1 truncate">
                    {item.nom}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.annee || 'N.M.'} · {item.region || 'Région non spécifiée'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-base font-black ${item.isOverBudget ? 'text-red-400 line-through' : 'text-[#D4AF37]'}`}>
                    {item.prix ? `${item.prix}€` : 'N.C.'}
                  </span>
                </div>
              </div>

              {/* JUSTIFICATION DE L'IA */}
              {item.commentaire && (
                <div className="mt-3 pt-3 border-t border-[#262626] text-xs text-slate-400 leading-relaxed italic">
                  "{item.commentaire}"
                </div>
              )}

              {/* ADVERTISSEMENT DE BUDGET ÉLEVÉ */}
              {item.isOverBudget && (
                <div className="absolute inset-x-0 bottom-0 bg-red-950/40 border-t border-red-900/30 px-4 py-1.5 flex items-center space-x-2 text-[10px] text-red-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Dépasse le budget configuré de {menuConfig.budget}€</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16 opacity-50">
            <Wine className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">Aucune suggestion disponible pour cette carte.</p>
          </div>
        )}
      </div>

    </div>
  );
}