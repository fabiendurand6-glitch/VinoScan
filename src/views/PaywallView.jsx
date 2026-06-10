// src/views/PaywallView.jsx
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function PaywallView({ ctx }) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] justify-center p-6 text-center select-none relative overflow-y-auto">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl"></div>
      <div className="relative z-10 space-y-6 pb-10">
        <div className="w-20 h-20 bg-[#1a1a1a] border-2 border-[#D4AF37] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(212,175,55,0.2)]">
          <Sparkles className="w-10 h-10 text-[#D4AF37] animate-pulse" />
        </div>
        <h2 className="text-3xl font-serif font-black text-white">Passez au niveau supérieur</h2>
        <p className="text-sm text-slate-400 mx-auto pb-4">
          Débloquez la pleine puissance de votre sommelier de poche.
        </p>

        <div className="space-y-4">
          {/* TIER AMATEUR */}
          <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded-3xl text-left relative">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-white text-xl">Amateur</h4>
                <p className="text-xs text-slate-500">L'essentiel pour passionnés</p>
              </div>
              <div className="text-right">
                <span className="font-black text-white text-xl">3,99 €</span><span className="text-xs text-slate-500"> / mois</span>
              </div>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 mb-5">
              <li>✅ Scans IA & Sommelier illimités</li>
              <li>✅ Menus au restaurant (4/mois)</li>
              <li>✅ Comparateur au rayon (4/mois)</li>
              <li>✅ 5 Scans API Expert / mois</li>
            </ul>
            <button onClick={() => ctx.showToast("Paiement sécurisé en cours de liaison...")} className="w-full bg-[#333] text-white font-bold py-3 rounded-xl hover:bg-[#444] transition-colors">
              Choisir ce forfait
            </button>
          </div>

          {/* TIER COLLECTIONNEUR */}
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37] p-5 rounded-3xl text-left relative shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <span className="absolute -top-3 right-6 bg-[#D4AF37] text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Le choix Ultime</span>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-[#D4AF37] text-xl">Collectionneur</h4>
                <p className="text-xs text-slate-400">Pour les vrais puristes</p>
              </div>
              <div className="text-right">
                <span className="font-black text-[#D4AF37] text-xl">9,99 €</span><span className="text-xs text-slate-500"> / mois</span>
              </div>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 mb-5">
              <li>⚡ <b className="text-white">Tout l'abonnement Amateur</b></li>
              <li>⚡ Scan de factures illimité</li>
              <li>⚡ Comparateur au rayon illimité</li>
              <li>⚡ Scans API Expert illimités</li>
            </ul>
            <button onClick={() => ctx.showToast("Paiement sécurisé en cours de liaison...")} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
              Devenir Collectionneur
            </button>
          </div>
        </div>

        <button onClick={() => ctx.setView(ctx.previousView !== 'paywall' ? ctx.previousView : 'home')} className="text-xs text-slate-500 font-bold uppercase tracking-wider hover:text-white pt-4">
          Plus tard, rester en gratuit
        </button>
      </div>
    </div>
  );
}