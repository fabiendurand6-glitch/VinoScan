// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc
} from 'firebase/firestore';

// =========================================================================
// CONFIGURATION SÉCURISÉE
// =========================================================================
let apiKey = "";
try {
  // Tentative de récupération via Vite (StackBlitz)
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
} catch (e) {
  apiKey = ""; 
}

const firebaseConfig = { 
  apiKey: "AIzaSyA1SP_DboqzXPzSuYJmrYxWhd-lqBpml20", 
  authDomain: "vinoscan-app-8d4af.firebaseapp.com", 
  projectId: "vinoscan-app-8d4af", 
  storageBucket: "vinoscan-app-8d4af.firebasestorage.app", 
  messagingSenderId: "757406434839", 
  appId: "1:757406434839:web:7d531655bcae02b5cbfe52", 
  measurementId: "G-6EX8K29ZZK" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'vinoscan-app-8d4af';

// =========================================================================
// UTILS & MOTEURS LOGIQUES
// =========================================================================

const extractJSON = (text) => {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) return JSON.parse(match[1]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("Format de données invalide.");
  }
};

const extractPrice = (priceStr) => {
  if (!priceStr) return 0;
  const match = String(priceStr).match(/\d+([.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : 0;
};

const recalculateDates = (anneeStr, baseGardeMin = 2, baseGardeMax = 5) => {
  const currentYear = new Date().getFullYear();
  const millesimeMatch = String(anneeStr).match(/\d{4}/);
  if (!millesimeMatch) return { potentiel_garde: "À consommer rapidement", apogee: "Prêt à boire", declin: "Dans les 2-3 ans", statut_apogee: "APOGEE" };
  const annee = parseInt(millesimeMatch[0], 10);
  const apogeeStart = annee + baseGardeMin;
  const apogeeEnd = annee + baseGardeMax;
  const declinYear = apogeeEnd + 1;
  let statut = "APOGEE";
  if (currentYear < apogeeStart) statut = "A_GARDER";
  else if (currentYear >= declinYear) statut = "DECLIN";
  return { potentiel_garde: `${baseGardeMin} à ${baseGardeMax} ans`, apogee: `${apogeeStart} - ${apogeeEnd}`, declin: `À partir de ${declinYear}`, statut_apogee: statut };
};

const normalizeData = (data) => {
  if (!data || typeof data !== 'object') data = {};
  try {
    let safeAccordsMets = Array.isArray(data.accords_mets) ? data.accords_mets.filter(Boolean).map(item => String(item)) : data.accords_mets ? [String(data.accords_mets)] : [];
    let nom = data.nom ? String(data.nom) : "Vin inconnu";
    let annee = data.annee ? String(data.annee) : "N.M.";
    let region = data.region ? String(data.region) : "Région inconnue";
    let type = data.type ? String(data.type) : "Vin";
    let description = data.description ? String(data.description) : "Un excellent vin.";
    let gardeMin = 2, gardeMax = 5;
    const gardeMatches = String(data.potentiel_garde || "").match(/\d+/g);
    if (gardeMatches && gardeMatches.length >= 1) {
       gardeMin = parseInt(gardeMatches[0], 10);
       gardeMax = gardeMatches.length >= 2 ? parseInt(gardeMatches[1], 10) : gardeMin + 3;
    }
    const dynamicDates = recalculateDates(annee, gardeMin, gardeMax);
    let strToSearch = (String(data.type_simplifie || "") + ' ' + type).toUpperCase();
    let type_simplifie = 'AUTRE';
    if (strToSearch.includes('ROUGE')) type_simplifie = 'ROUGE';
    else if (strToSearch.includes('BLANC')) type_simplifie = 'BLANC';
    else if (strToSearch.includes('ROSE') || strToSearch.includes('ROSÉ')) type_simplifie = 'ROSE';
    else if (strToSearch.includes('CHAMPAGNE') || strToSearch.includes('PETILLANT') || strToSearch.includes('PÉTILLANT') || strToSearch.includes('EFFERVESCENT') || strToSearch.includes('CRÉMANT') || strToSearch.includes('CREMANT') || strToSearch.includes('BULLE')) type_simplifie = 'PETILLANT';
    if (safeAccordsMets.length === 0) {
      if (type_simplifie === 'ROUGE') safeAccordsMets = ['Viande rouge grillée', 'Plateau de fromages affinés', 'Plats en sauce'];
      else if (type_simplifie === 'BLANC') safeAccordsMets = ['Poissons et fruits de mer', 'Volaille à la crème', 'Fromage de chèvre'];
      else if (type_simplifie === 'ROSE') safeAccordsMets = ['Apéritif', 'Grillades estivales', 'Salades composées'];
      else if (type_simplifie === 'PETILLANT') safeAccordsMets = ['Apéritif', 'Desserts légers', 'Coquilles Saint-Jacques'];
      else safeAccordsMets = ['Plats conviviaux à partager'];
    }
    let accord_parfait = data.accord_parfait ? String(data.accord_parfait) : safeAccordsMets[0];
    let safeTagsAccords = Array.isArray(data.tags_accords) ? data.tags_accords.filter(Boolean).map(item => String(item)) : [];
    let safeComparateur = Array.isArray(data.comparateur) ? data.comparateur.filter(Boolean).map(c => typeof c === 'object' ? { site: String(c.site || 'Marchand'), prix: String(c.prix || '?') } : { site: 'Marchand', prix: String(c) }) : [];
    let prix_unitaire_nombre = Number(data.prix_unitaire_nombre) || extractPrice(data.prix_moyen) || 0;
    return { nom, annee, region, type, type_simplifie, prix_unitaire_nombre, description, accord_parfait, accords_mets: safeAccordsMets, tags_accords: safeTagsAccords, comparateur: safeComparateur, baseGardeMin: gardeMin, baseGardeMax: gardeMax, ...dynamicDates };
  } catch (e) { return { nom: 'Erreur d\'analyse', type_simplifie: 'AUTRE', accords_mets: ['Aucun accord trouvé'], tags_accords: [], comparateur: [] }; }
};

const getGenericImageForType = (type) => {
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1595914041793-11b0e00d7fb4?q=80&w=800&auto=format&fit=crop";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?q=80&w=800&auto=format&fit=crop";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?q=80&w=800&auto=format&fit=crop";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop"; 
  }
};

const compressImage = (base64Str, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

// =========================================================================
// COMPOSANTS DE VUE (DÉFINIS AVANT APP)
// =========================================================================

const NavigationBar = ({ ctx }) => (
  <div className="absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 h-16">
    <button onClick={() => ctx.setView('home')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['home', 'manualSearch', 'menuConfig'].includes(ctx.view) ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <Home className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-wider">Scanner</span>
    </button>
    <button onClick={() => ctx.setView('cellar')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'cellar' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <Archive className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-wider">Cave</span>
    </button>
    <button onClick={() => ctx.setView('recommendation')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['recommendation', 'recommendationList'].includes(ctx.view) ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <Sparkles className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-wider">Conseil</span>
    </button>
    <button onClick={() => ctx.setView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'history' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <History className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-wider">Histo</span>
    </button>
    <button onClick={() => ctx.setView('account')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'account' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <User className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-wider">Profil</span>
    </button>
  </div>
);

const HomeView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-slate-50 overflow-hidden">
    <div className="absolute -top-32 -left-32 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
    <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
    <div className="text-center space-y-4 relative z-10 w-full flex flex-col items-center">
      <div className="relative">
        <div className="mx-auto w-28 h-28 bg-gradient-to-br from-rose-800 to-rose-950 rounded-full flex items-center justify-center shadow-xl shadow-rose-900/30 border-4 border-white">
          <Wine className="w-14 h-14 text-rose-100" />
        </div>
        {ctx.isOffline && (
          <div className="absolute -bottom-2 -right-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center shadow-lg border-2 border-white animate-bounce">
            <WifiOff className="w-3 h-3 mr-1 text-amber-500" /> Sous-sol
          </div>
        )}
      </div>
      <h1 className="text-5xl font-serif text-slate-800 tracking-tight font-bold">VinoScan</h1>
      <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">Gérez votre cave, analysez vos vins et découvrez leur apogée.</p>
    </div>
    <div className="w-full max-w-sm space-y-3 relative z-10">
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white p-5 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95">
        <Camera className="w-6 h-6" /><span className="font-medium text-lg">Scanner une bouteille</span>
      </button>
      <div className="flex space-x-3">
        <button onClick={() => ctx.setView('menuConfig')} className="flex-1 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-95">
          <BookOpen className="w-6 h-6" /><span className="font-medium text-sm text-center">Menu Resto</span>
        </button>
        <button onClick={() => ctx.startCamera('receipt')} className="flex-1 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
          <Receipt className="w-6 h-6" /><span className="font-medium text-sm text-center">Ticket Caisse</span>
        </button>
      </div>
      <div className="flex space-x-3">
        <label className="flex-1 flex flex-col items-center justify-center space-y-1 bg-white border border-slate-100 text-slate-600 p-3 rounded-2xl cursor-pointer transition-all shadow-sm">
          <ImageIcon className="w-5 h-5 text-slate-400" /><span className="font-medium text-xs">Galerie</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'bottle')} />
        </label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-1 bg-white border border-slate-100 text-slate-600 p-3 rounded-2xl shadow-sm transition-all">
          <Search className="w-5 h-5 text-slate-400" /><span className="font-medium text-xs">Recherche</span>
        </button>
      </div>
    </div>
  </div>
);

const MenuConfigView = ({ ctx }) => (
  <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto">
    <div className="bg-white pt-12 pb-4 px-6 shadow-sm sticky top-0 flex items-center z-20">
      <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
      <div><h1 className="text-2xl font-serif font-bold text-slate-900">Le bon choix</h1><p className="text-slate-500 text-xs mt-1 font-medium">Scanner un menu de restaurant</p></div>
    </div>
    <div className="p-6 space-y-8">
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex space-x-3 shadow-sm">
        <Info className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900 font-medium">L'IA vous trouvera le Top 3 meilleur rapport qualité/prix selon votre plat !</p>
      </div>
      <div className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center space-x-2"><Utensils className="w-5 h-5 text-amber-600" /><span>Que mangez-vous ?</span></h3>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(f => (
            <button key={f} onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: f})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === f ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}>{f === 'ALL' ? 'Tout' : f.replace('_', ' ')}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center space-x-2"><Wine className="w-5 h-5 text-rose-800" /><span>Type de vin</span></h3>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(t => (
            <button key={t} onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, type: t})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.type === t ? 'bg-rose-900 text-white border-rose-900 shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}>{t === 'ALL' ? 'Tout' : t}</button>
          ))}
        </div>
      </div>
      <div className="pt-6 space-y-3">
        <button onClick={() => ctx.startCamera('menu')} className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20">
          <Camera className="w-5 h-5" /><span>Scanner la carte des vins</span>
        </button>
        <label className="w-full flex items-center justify-center space-x-2 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 cursor-pointer">
          <ImageIcon className="w-5 h-5 text-slate-400" /><span>Importer une photo</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'menu')} />
        </label>
      </div>
    </div>
  </div>
);

const AnalyzingView = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50 relative overflow-hidden">
    <div className="relative w-40 h-40 flex items-center justify-center mb-8 z-10">
      <div className="absolute inset-0 border-4 border-rose-100 rounded-full animate-[spin_3s_linear_infinite]"></div>
      <div className="absolute inset-2 border-4 border-rose-400 rounded-full border-t-transparent animate-[spin_1.5s_linear_infinite]"></div>
      <Wine className="w-14 h-14 text-rose-900 animate-pulse" />
    </div>
    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3 z-10">Analyse en cours</h2>
    <p className="text-slate-500 text-sm mt-2 text-center font-medium z-10">Veuillez patienter quelques secondes...</p>
  </div>
);

const ErrorView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50">
    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-8 shadow-inner"><AlertCircle className="w-12 h-12" /></div>
    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Erreur</h2>
    <p className="text-slate-600 mb-10 font-medium">{ctx.errorMsg}</p>
    <button onClick={ctx.goBack} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg">Retour</button>
  </div>
);

const CameraView = ({ ctx }) => (
  <div className="relative h-full w-full bg-black flex flex-col">
    <button onClick={() => { ctx.stopCamera(); ctx.setView(ctx.previousView); }} className="absolute top-6 left-6 z-10 p-3 bg-black/50 backdrop-blur text-white rounded-full"><ChevronLeft className="w-6 h-6" /></button>
    <div className="relative flex-1 overflow-hidden flex items-center justify-center">
      <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {ctx.cameraMode === 'receipt' ? (
          <div className="w-5/6 h-3/4 border-2 border-dashed border-indigo-500/50 rounded-lg flex flex-col items-center justify-center bg-indigo-500/10">
            <Receipt className="w-16 h-16 text-indigo-200/50 animate-pulse" />
            <p className="text-indigo-200 mt-4 font-bold text-center px-4">Placez le ticket ici</p>
          </div>
        ) : ctx.cameraMode === 'menu' ? (
          <div className="w-5/6 h-5/6 border-2 border-amber-500/50 rounded-lg flex flex-col items-center justify-center bg-amber-500/10">
             <BookOpen className="w-16 h-16 text-amber-200/50 animate-pulse" />
             <p className="text-amber-200 mt-4 font-bold text-center px-4">Placez le menu ici</p>
          </div>
        ) : (
          <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-3xl flex flex-col justify-between p-6 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between"><div className="w-10 h-10 border-t-4 border-l-4 border-rose-500 rounded-tl-xl"></div><div className="w-10 h-10 border-t-4 border-r-4 border-rose-500 rounded-tr-xl"></div></div>
            <ScanLine className="w-16 h-16 text-white/40 self-center animate-pulse" />
            <div className="flex justify-between"><div className="w-10 h-10 border-b-4 border-l-4 border-rose-500 rounded-bl-xl"></div><div className="w-10 h-10 border-b-4 border-r-4 border-rose-500 rounded-br-xl"></div></div>
          </div>
        )}
      </div>
    </div>
    <div className="h-32 bg-black pb-8 pt-4 flex items-center justify-center">
      <button onClick={ctx.capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center active:scale-90 transition-transform">
        <div className={`w-16 h-16 bg-white rounded-full border-2 ${ctx.cameraMode === 'receipt' ? 'border-indigo-500' : ctx.cameraMode === 'menu' ? 'border-amber-500' : 'border-rose-500'}`}></div>
      </button>
    </div>
    <canvas ref={ctx.canvasRef} className="hidden" />
  </div>
);

const BlindTastingView = ({ ctx }) => {
  const currentScanObj = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  const [step, setStep] = useState(0); 
  if (!currentScanObj) return null;
  return (
    <div className="flex flex-col h-full bg-slate-900 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-20 filter blur-sm"></div>
      <div className="relative z-10 pt-12 pb-4 px-6 flex items-center">
        <button onClick={() => ctx.setView('results')} className="mr-4 p-2 bg-white/10 text-white rounded-full"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-serif font-bold text-white">À l'aveugle</h1>
      </div>
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-32 h-48 bg-slate-800 border-4 border-slate-700 rounded-xl relative overflow-hidden shadow-2xl flex items-center justify-center">
           {step === 3 ? <img src={currentScanObj.image} className="w-full h-full object-cover" /> : <span className="text-6xl">❓</span>}
        </div>
        {step < 3 ? (
          <div className="space-y-4 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-6">Faites deviner ce vin !</h2>
            {step >= 1 ? (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] uppercase text-amber-400 font-bold mb-1">Indice 1 : Région</p>
                <p className="text-lg text-white font-serif">{currentScanObj.data.region}</p>
              </div>
            ) : <button onClick={() => setStep(1)} className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold">Révéler Indice 1</button>}
            {step >= 2 ? (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] uppercase text-amber-400 font-bold mb-1">Indice 2 : Année & Type</p>
                <p className="text-lg text-white font-serif">{currentScanObj.data.annee} - {currentScanObj.data.type_simplifie}</p>
              </div>
            ) : step === 1 ? <button onClick={() => setStep(2)} className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold">Révéler Indice 2</button> : null}
            {step === 2 && <button onClick={() => setStep(3)} className="w-full py-5 mt-4 bg-amber-500 text-slate-900 rounded-2xl font-black text-xl animate-pulse">Révéler la bouteille !</button>}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-4xl font-serif font-bold text-white mb-2">{currentScanObj.data.nom}</h2>
            <button onClick={() => ctx.setView('results')} className="w-full py-4 mt-8 bg-white/20 text-white rounded-2xl font-bold">Retour à la fiche</button>
          </div>
        )}
      </div>
    </div>
  );
};

const ResultsView = ({ ctx }) => {
  let currentScanObj = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  if (!currentScanObj && ctx.analysisResult) currentScanObj = ctx.scanHistory.find(s => s.data?.nom === ctx.analysisResult.nom && s.data?.annee === ctx.analysisResult.annee);
  const scanIdToUse = currentScanObj ? currentScanObj.id : ctx.currentScanId;
  const stock = currentScanObj ? currentScanObj.stock : 0;
  const isWishlist = currentScanObj ? currentScanObj.wishlist : false;
  const rating = currentScanObj ? currentScanObj.rating : 0;
  const displayData = currentScanObj && currentScanObj.data ? currentScanObj.data : ctx.analysisResult;
  if (!displayData) return null;
  const [tempType, setTempType] = useState('');
  const [tempAnnee, setTempAnnee] = useState('');
  const [tempPrix, setTempPrix] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [tasteProfile, setTasteProfile] = useState({ acidite: 5, tanins: 5, fruit: 5, puissance: 5 });
  const [recipe, setRecipe] = useState(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  useEffect(() => {
    setTempType(displayData.type_simplifie || '');
    setTempLocation(currentScanObj?.location || '');
    setTempNotes(currentScanObj?.notes || '');
    setTempAnnee(displayData.annee || '');
    setTempPrix(displayData.prix_unitaire_nombre || '');
    if (currentScanObj?.tasteProfile) setTasteProfile(currentScanObj.tasteProfile);
  }, [currentScanObj?.id, displayData]);
  const handleYearChange = (newYear) => {
    setTempAnnee(newYear); if (!scanIdToUse) return;
    ctx.updateDataField(scanIdToUse, 'annee', newYear);
    const newDates = recalculateDates(newYear, displayData.baseGardeMin || 2, displayData.baseGardeMax || 5);
    ctx.genericUpdate(scanIdToUse, { data: { ...displayData, annee: newYear, ...newDates } });
  };
  const handleTypeChange = (newType) => {
    setTempType(newType);
    let newAccords = newType === 'ROUGE' ? ['Viande rouge', 'Fromage'] : newType === 'BLANC' ? ['Poisson', 'Volailles'] : ['Apéritif'];
    ctx.setAnalysisResult(prev => prev ? { ...prev, type_simplifie: newType, accords_mets: newAccords, accord_parfait: newAccords[0] } : prev);
    if (scanIdToUse) ctx.genericUpdate(scanIdToUse, { data: { ...displayData, type_simplifie: newType, accords_mets: newAccords, accord_parfait: newAccords[0] } });
  };
  const handleTasteChange = (attr, val) => {
    const newProfile = { ...tasteProfile, [attr]: parseInt(val) };
    setTasteProfile(newProfile);
    if (scanIdToUse) ctx.genericUpdate(scanIdToUse, { tasteProfile: newProfile });
  };
  const generateRecipe = async () => {
    setIsGeneratingRecipe(true);
    try {
      const prompt = `Crée une recette JSON pour : "${displayData.accord_parfait}". Structure: { "titre": "...", "temps": "...", "ingredients": [], "etapes": [] }`;
      const result = await ctx.callGemini(prompt);
      setRecipe(extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text));
    } catch (e) { ctx.showToast("Erreur IA"); }
    setIsGeneratingRecipe(false);
  };
  const existingLocations = Array.from(new Set(ctx.scanHistory.map(s => s.location).filter(Boolean))).sort();
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-8">
      <div className="relative h-[30vh] bg-slate-900 rounded-b-[40px] shrink-0">
        <img src={ctx.imageSrc} className="w-full h-full object-cover opacity-40 blur-md scale-110" />
        <div className="absolute inset-0 flex items-center justify-center p-6 pt-12"><img src={ctx.imageSrc} className="max-h-full rounded-xl shadow-2xl border-2 border-white/10" /></div>
        <button onClick={ctx.goBack} className="absolute top-6 left-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-full"><ChevronLeft className="w-6 h-6" /></button>
      </div>
      <div className="px-5 -mt-8 relative z-10 space-y-5">
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100">
          <div className="flex justify-between mb-3">
            <div className="relative"><select value={tempType} onChange={(e) => handleTypeChange(e.target.value)} className="text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg appearance-none outline-none"><option value="ROUGE">ROUGE</option><option value="BLANC">BLANC</option><option value="ROSE">ROSE</option><option value="PETILLANT">BULLES</option></select><ChevronDown className="w-3 h-3 text-rose-800 absolute right-2 top-2 pointer-events-none"/></div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">{displayData.region}</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-4">{displayData.nom}</h2>
          <div className="flex items-center text-slate-500 font-medium mb-5 bg-slate-50 p-2 rounded-xl w-max border border-slate-100"><span className="text-sm ml-2">Année :</span><input type="text" value={tempAnnee} onChange={(e) => setTempAnnee(e.target.value)} onBlur={() => handleYearChange(tempAnnee)} className="bg-white border border-slate-200 text-rose-900 px-3 py-1.5 rounded-lg w-20 ml-2 font-bold shadow-sm outline-none"/></div>
          <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">{displayData.description}</p>
        </div>
        <div className="bg-slate-900 rounded-3xl shadow-xl p-6 text-white border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-5 relative z-10"><h3 className="font-serif text-xl font-bold">Dans ma cave</h3><div className="flex items-center space-x-3 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700"><button onClick={() => ctx.handleDirectStockChange(scanIdToUse, Math.max(0, stock - 1))} className="p-3 hover:bg-slate-700 rounded-xl"><Minus className="w-5 h-5"/></button><span className="text-2xl font-bold w-8 text-center">{stock}</span><button onClick={() => ctx.handleDirectStockChange(scanIdToUse, stock + 1)} className="p-3 bg-rose-600 rounded-xl"><Plus className="w-5 h-5"/></button></div></div>
          {stock === 0 ? <button onClick={() => ctx.genericUpdate(scanIdToUse, { wishlist: !isWishlist })} className={`w-full py-4 rounded-2xl font-bold border flex items-center justify-center space-x-2 ${isWishlist ? 'bg-pink-900/60 border-pink-700 text-pink-100' : 'bg-slate-800 border-slate-700 text-slate-200'}`}><Heart className={`w-5 h-5 ${isWishlist ? 'fill-current text-pink-400' : ''}`}/><span>{isWishlist ? 'Dans mes envies' : 'Ajouter aux envies'}</span></button> : <input type="text" value={tempLocation} onChange={(e) => setTempLocation(e.target.value)} onBlur={() => ctx.genericUpdate(scanIdToUse, { location: tempLocation })} placeholder="Emplacement..." className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-1 focus:ring-rose-500" list="loc-list"/>}
          <datalist id="loc-list">{existingLocations.map(l => <option key={l} value={l}/>)}</datalist>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5"><div className="flex items-center space-x-3"><div className="p-2 bg-rose-50 rounded-lg"><Edit3 className="w-5 h-5 text-rose-800"/></div><h3 className="font-serif text-xl font-bold text-slate-900">Avis</h3></div><div className="flex space-x-1">{[1,2,3,4,5].map(s => <button key={s} onClick={() => ctx.genericUpdate(scanIdToUse, { rating: s })}><Star className={`w-5 h-5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}/></button>)}</div></div>
          <textarea value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} onBlur={() => ctx.genericUpdate(scanIdToUse, { notes: tempNotes })} placeholder="Notes personnelles..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium h-24 outline-none focus:ring-2 focus:ring-rose-200"/>
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-4">
            {['acidite', 'tanins', 'fruit', 'puissance'].map(attr => (
              <div key={attr} className="space-y-1"><div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase"><span>Min</span><span>{attr}</span><span>Max</span></div><input type="range" min="0" max="10" value={tasteProfile[attr] || 5} onChange={(e) => handleTasteChange(attr, e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none accent-rose-600"/></div>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-sm border border-amber-100 p-6 relative">
          <div className="flex items-center space-x-3 mb-4"><div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center"><Star className="w-5 h-5 text-amber-800"/></div><h3 className="font-serif text-xl font-bold text-amber-950">Accord Parfait</h3></div>
          <p className="text-amber-900 font-bold bg-white/40 p-4 rounded-2xl border border-amber-100/50 backdrop-blur-sm mb-4">{displayData.accord_parfait}</p>
          <button onClick={generateRecipe} disabled={isGeneratingRecipe} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold shadow-md flex justify-center items-center space-x-2">
            {isGeneratingRecipe ? <RefreshCw className="w-4 h-4 animate-spin"/> : <ChefHat className="w-4 h-4"/>}<span>Générer la recette</span>
          </button>
        </div>
        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-200">
           {currentScanObj && <button onClick={() => ctx.setView('blindTasting')} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg"><Gamepad2 className="w-5 h-5 inline mr-2"/>Jeu "À l'aveugle"</button>}
        </div>
      </div>
      {recipe && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
             <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center"><ChefHat className="w-6 h-6" /></div><button onClick={() => setRecipe(null)} className="p-2 bg-slate-100 rounded-full"><Minus className="w-4 h-4" /></button></div>
             <h3 className="font-serif text-2xl font-bold text-slate-900 mb-2">{recipe.titre}</h3>
             <p className="text-sm font-bold text-amber-600 mb-6">Temps : {recipe.temps}</p>
             <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Ingrédients</h4><ul className="list-disc pl-5 mb-6 text-sm text-slate-600">{(recipe.ingredients || []).map((ing, i) => <li key={i}>{ing}</li>)}</ul>
             <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Étapes</h4><ol className="list-decimal pl-5 text-sm text-slate-600 space-y-2">{(recipe.etapes || []).map((e, i) => <li key={i}>{e}</li>)}</ol>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MAIN APP COMPONENT
// =========================================================================

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [view, setView] = useState('home'); 
  const [previousView, setPreviousView] = useState('home');
  const [imageSrc, setImageSrc] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanHistory, setScanHistory] = useState(() => {
    try { const cached = localStorage.getItem('vinoscan_cache'); return cached ? JSON.parse(cached) : []; } catch(e) { return []; }
  });
  const [scanAction, setScanAction] = useState(null); 
  const [recommendationList, setRecommendationList] = useState(null); 
  const [toastMsg, setToastMsg] = useState('');
  const [currentScanId, setCurrentScanId] = useState(null);
  const [cameraMode, setCameraMode] = useState('bottle');
  const [menuPrefs, setMenuPrefs] = useState({ food: 'ALL', type: 'ALL' });
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null);

  useEffect(() => { if (scanHistory.length > 0) localStorage.setItem('vinoscan_cache', JSON.stringify(scanHistory)); }, [scanHistory]);
  useEffect(() => {
    const checkStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', checkStatus); window.addEventListener('offline', checkStatus); checkStatus();
    return () => { window.removeEventListener('online', checkStatus); window.removeEventListener('offline', checkStatus); };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) { }
      setIsAuthLoading(false);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || isOffline) return;
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), 
      (snapshot) => {
        const scans = [];
        snapshot.forEach(doc => {
          const itemData = doc.data(); if (!itemData.data) return;
          scans.push({ id: String(doc.id), ...itemData, in_history: itemData.in_history !== false, data: normalizeData(itemData.data) });
        });
        scans.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setScanHistory(scans);
      });
    return () => unsub();
  }, [user, isOffline]);

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };
  const startCamera = async (mode = 'bottle') => {
    try {
      setCameraMode(mode); const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream; setView('camera');
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) { setErrorMsg("Caméra inaccessible."); setView('error'); }
  };
  const stopCamera = () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } };
  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current, c = canvasRef.current;
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.8); stopCamera();
      const compressedImg = await compressImage(dataUrl); setImageSrc(compressedImg);
      if (cameraMode === 'menu') analyzeMenu(compressedImg);
      else if (cameraMode === 'receipt') analyzeReceipt(compressedImg);
      else analyzeImage(compressedImg);
    }
  };
  const handleFileUpload = async (e, mode = 'bottle') => {
    const file = e.target.files[0];
    if (file) {
      setCameraMode(mode); const reader = new FileReader();
      reader.onloadend = async () => { const compressedImg = await compressImage(reader.result); setImageSrc(compressedImg);
        if (mode === 'menu') analyzeMenu(compressedImg); else if (mode === 'receipt') analyzeReceipt(compressedImg); else analyzeImage(compressedImg);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Img) => {
    setView('analyzing'); setPreviousView('home');
    try {
      const prompt = `Sommelier expert. Analyse étiquette. Retourne JSON complet. Structure: { "nom": "...", "type": "...", "annee": "...", "region": "...", "description": "...", "prix_moyen": "...", "prix_unitaire_nombre": 0, "potentiel_garde": "...", "apogee": "...", "declin": "...", "statut_apogee": "...", "accord_parfait": "...", "accords_mets": [] }`;
      const result = await callGemini(prompt, base64Img.split(',')[1]);
      await processAIResult(result.candidates?.[0]?.content?.parts?.[0]?.text, base64Img);
    } catch (err) { setErrorMsg(err.message); setView('error'); }
  };

  const analyzeMenu = async (base64Img) => {
    setView('analyzing'); setPreviousView('menuConfig');
    try {
      const prompt = `Maître Sommelier. Carte des vins. Trouve Top 3 rapport qualité/prix. Plat: ${menuPrefs.food}. Retourne JSON { "vins": [...] } avec structure complète pour chaque vin.`;
      const result = await callGemini(prompt, base64Img.split(',')[1]);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      setRecommendationList((parsed.vins || parsed).map(v => normalizeData(v))); setView('recommendationList');
    } catch (err) { setErrorMsg(err.message); setView('error'); }
  };

  const analyzeReceipt = async (base64Img) => {
    setView('analyzing'); setPreviousView('home');
    try {
      const prompt = `Ticket de caisse. Extrais bouteilles de vin achetées. JSON { "vins": [...] } avec structure complète.`;
      const result = await callGemini(prompt, base64Img.split(',')[1]);
      const vins = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text).vins || [];
      const newItems = vins.map(v => ({ id: 'temp_' + Math.random().toString(36).substring(7), image: getGenericImageForType(normalizeData(v).type_simplifie), data: normalizeData(v), stock: 1, timestamp: Date.now(), dateStr: new Date().toLocaleDateString('fr-FR') }));
      setScanHistory(prev => [...newItems, ...prev]); showToast(`${newItems.length} vins ajoutés !`); setView('cellar');
    } catch (err) { setErrorMsg(err.message); setView('error'); }
  };

  const processAIResult = async (aiText, sourceImage, defaultImageFallback, isWishlist = false) => {
    const parsedData = normalizeData(extractJSON(aiText)); setAnalysisResult(parsedData);
    let finalImage = sourceImage || defaultImageFallback || getGenericImageForType(parsedData.type_simplifie); setImageSrc(finalImage);
    const tempId = 'temp_' + Date.now();
    const newScanObj = { id: tempId, image: finalImage, data: parsedData, stock: 0, in_history: !isWishlist, wishlist: isWishlist, location: '', rating: 0, notes: '', tasteProfile: { acidite: 5, tanins: 5, fruit: 5, puissance: 5 }, timestamp: Date.now(), dateStr: new Date().toLocaleDateString('fr-FR') };
    setScanHistory(prev => [newScanObj, ...prev]); setCurrentScanId(tempId); setView('results');
    if (auth.currentUser && !isOffline) { try { const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans'), newScanObj); setCurrentScanId(docRef.id); setScanHistory(prev => prev.map(item => item.id === tempId ? { ...item, id: docRef.id } : item)); } catch (err) { } }
  };

  const genericUpdate = async (id, fields) => {
    setScanHistory(prev => prev.map(item => item.id === id ? { ...item, ...fields } : item));
    if (auth.currentUser && !id.startsWith('temp_') && !isOffline) { try { await updateDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans', id), fields); } catch(e) {} }
  };

  const updateDataField = (id, f, v) => {
    const current = scanHistory.find(i => i.id === id); if (!current) return;
    const newData = { ...current.data, [f]: v }; genericUpdate(id, { data: newData });
  };

  const handleShare = async (wine) => {
    const txt = `${wine.data.nom} (${wine.data.annee}) sur VinoScan 🍷`;
    if (navigator.share) await navigator.share({ title: 'Mon vin', text: txt });
    else { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast("Copié !"); }
  };

  const executeAction = async () => {
    if (!scanAction) return; const { id, type } = scanAction; const current = scanHistory.find(s => s.id === id); if (!current) { setScanAction(null); return; }
    let nextStock = current.stock, nextHistory = current.in_history; if (type === 'history') nextHistory = false; if (type === 'cellar') nextStock = 0;
    if (nextStock === 0 && !nextHistory && !current.wishlist) { setScanHistory(prev => prev.filter(i => i.id !== id)); setView('cellar'); }
    else { genericUpdate(id, { stock: nextStock, in_history: nextHistory }); }
    setScanAction(null);
  };

  const ctx = { user, view, setView, previousView, setPreviousView, imageSrc, setImageSrc, analysisResult, setAnalysisResult, errorMsg, setErrorMsg, scanHistory, setScanHistory, scanAction, setScanAction, recommendationList, setRecommendationList, currentScanId, setCurrentScanId, toastMsg, setToastMsg, startCamera, stopCamera, capturePhoto, handleFileUpload, genericUpdate, updateDataField, handleShare, executeAction, goBack: () => setView(previousView), showToast, handleKeyDown: (e) => e.key === 'Enter' && e.target.blur(), handleDirectStockChange: (id, v) => genericUpdate(id, { stock: v === '' ? 0 : Math.max(0, parseInt(v)) }), cameraMode, menuPrefs, setMenuPrefs, isOffline, callGemini, videoRef, canvasRef, processRecommendationSelection };

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Wine className="w-10 h-10 text-rose-600 animate-bounce" /></div>;

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-white sm:border-x sm:border-slate-200 overflow-hidden relative shadow-2xl text-slate-900 font-sans">
        {view === 'home' && <HomeView ctx={ctx} />}
        {view === 'menuConfig' && <MenuConfigView ctx={ctx} />}
        {view === 'manualSearch' && <ManualSearchView ctx={ctx} />}
        {view === 'cellar' && <CellarView ctx={ctx} />}
        {view === 'history' && <HistoryView ctx={ctx} />}
        {view === 'account' && <AccountView ctx={ctx} />}
        {view === 'camera' && <CameraView ctx={ctx} />}
        {view === 'results' && <ResultsView ctx={ctx} />}
        {view === 'recommendation' && <RecommendationView ctx={ctx} />}
        {view === 'recommendationList' && <RecommendationListView ctx={ctx} />}
        {view === 'blindTasting' && <BlindTastingView ctx={ctx} />}
        {view === 'analyzing' && <AnalyzingView />}
        {view === 'error' && <ErrorView ctx={ctx} />}
        {['home', 'cellar', 'history', 'account', 'recommendation', 'recommendationList', 'menuConfig'].includes(view) && <NavigationBar ctx={ctx} />}
        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"><h3 className="text-xl font-serif font-bold mb-4">Confirmer ?</h3><div className="flex space-x-3"><button onClick={() => setScanAction(null)} className="flex-1 py-3 bg-slate-100 rounded-xl">Annuler</button><button onClick={executeAction} className="flex-1 py-3 bg-red-600 text-white rounded-xl">Confirmer</button></div></div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}