// src/views/CameraView.jsx
import React from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';

// --- VUE COMPOSANTE : L'INTERFACE CAMÉRA ---
export default function CameraView({ ctx }) {
  return (
    <div className="relative h-full w-full bg-black flex flex-col overflow-hidden select-none">
      {/* BOUTON RETOUR */}
      <button 
        onClick={() => { ctx.stopCamera(); ctx.setView('home'); }} 
        className="absolute top-12 left-6 z-20 p-3 bg-black/50 text-white rounded-full border border-white/10 active:scale-90 transition-transform"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      {/* BOUTON BASCULE CAMÉRA (AVANT / ARRIÈRE) */}
      <button 
        onClick={ctx.toggleCamera} 
        className="absolute top-12 right-6 z-20 p-3 bg-black/50 text-white rounded-full border border-white/10 hover:bg-[#D4AF37] hover:text-black active:scale-90 transition-all"
      >
        <RefreshCw className="w-6 h-6" />
      </button>
      
      {/* FLUX VIDÉO LIVE */}
      <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover flex-1" />
      
      {/* ZONE DÉCLENCHEUR */}
      <div className="absolute bottom-0 w-full h-32 bg-black/90 flex items-center justify-center pb-8 z-20">
        <button 
          onClick={ctx.capturePhoto} 
          className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 bg-[#D4AF37] rounded-full shadow-lg"></div>
        </button>
      </div>
      
      {/* CANVAS CACHÉ POUR CAPTURER LA FRAME */}
      <canvas ref={ctx.canvasRef} className="hidden" />
    </div>
  );
}

// --- VUE COMPOSANTE : L'ÉCRAN D'ANALYSE IA (CHARGEMENT) ---
export function AnalyzingView() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] select-none relative overflow-hidden">
      <div className="relative z-10 text-center space-y-3">
        <div className="w-16 h-16 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#D4AF37]/30 animate-spin border-t-transparent"></div>
        <h2 className="text-xl font-serif font-bold text-white">Analyse oenologique...</h2>
      </div>
    </div>
  );
}