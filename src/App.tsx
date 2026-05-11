// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe, X, Trophy 
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc 
} from 'firebase/firestore';

// =========================================================================
// CONFIGURATION SÉCURISÉE
// =========================================================================
// Récupère la clé depuis les variables d'environnement (StackBlitz local ou Vercel Prod)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

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

const checkGlobalCache = async (wineKey) => {
  try {
    const id = wineKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const snap = await getDoc(doc(db, "global_wine_cache", id));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null; // Si Firebase bloque, on ignore et on continue
  }
};

const saveToGlobalCache = async (wineKey, data) => {
  try {
    const id = wineKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "global_wine_cache", id), data);
  } catch (e) {}
};

// =========================================================================
// FILET DE SÉCURITÉ ANTI-CRASH
// =========================================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: String(error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oups, un problème technique</h2>
          <p className="text-sm text-slate-600 mb-6">L'application a rencontré une erreur inattendue.</p>
          <button 
            onClick={() => { this.setState({hasError: false}); this.props.onReset(); }} 
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium shadow-md hover:bg-slate-800"
          >
            Retourner à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// =========================================================================
// MOTEUR IA INTELLIGENT
// =========================================================================
const callGemini = async (prompt, b64Data = null) => {
  const model = 'gemini-2.5-flash'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt }];
  if (b64Data) parts.push({ inlineData: { mimeType: "image/jpeg", data: b64Data } });
  
  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Erreur serveur (${response.status}) : ${errData.error?.message || 'Inconnue'}`);
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message);
  }
};

const extractJSON = (text) => {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) return JSON.parse(match[1]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("Impossible de lire les données JSON.");
  }
};

const extractPrice = (priceStr) => {
  if (!priceStr) return 0;
  const match = String(priceStr).match(/\d+([.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : 0;
};

const getGenericImageForType = (type) => {
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1557682204-e53b55fd740c?auto=format&fit=crop&w=800";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800"; 
  }
};

const getColorForType = (type) => {
  if(type === 'ROUGE') return 'bg-red-900';
  if(type === 'BLANC') return 'bg-amber-200';
  if(type === 'ROSE') return 'bg-pink-300';
  if(type === 'PETILLANT') return 'bg-yellow-400';
  return 'bg-slate-500';
};

const safeString = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch(e) { return fallback; }
  }
  return String(val);
};

// =========================================================================
// MOTEUR DE TEMPS (Calcul dynamique des apogées)
// =========================================================================
const recalculateDates = (anneeStr, baseGardeMin = 2, baseGardeMax = 5) => {
  const currentYear = new Date().getFullYear();
  const millesimeMatch = String(anneeStr).match(/\d{4}/);
  
  if (!millesimeMatch) {
    return {
      potentiel_garde: "À consommer rapidement",
      apogee: "Prêt à boire",
      declin: "Dans les 2-3 ans",
      statut_apogee: "APOGEE"
    };
  }

  const annee = parseInt(millesimeMatch[0], 10);
  const apogeeStart = annee + baseGardeMin;
  const apogeeEnd = annee + baseGardeMax;
  const declinYear = apogeeEnd + 1;

  let statut = "APOGEE";
  if (currentYear < apogeeStart) statut = "A_GARDER";
  else if (currentYear >= declinYear) statut = "DECLIN";

  return {
    potentiel_garde: `${baseGardeMin} à ${baseGardeMax} ans`,
    apogee: `${apogeeStart} - ${apogeeEnd}`,
    declin: `À partir de ${declinYear}`,
    statut_apogee: statut
  };
};

const normalizeData = (data) => {
  if (!data || typeof data !== 'object') data = {};
  
  try {
    let safeAccordsMets = [];
    if (Array.isArray(data.accords_mets)) {
      safeAccordsMets = data.accords_mets.filter(Boolean).map(item => String(item));
    } else if (data.accords_mets) {
      safeAccordsMets = [String(data.accords_mets)];
    }

    let nom = data.nom ? String(data.nom) : "Vin inconnu";
    let annee = data.annee ? String(data.annee) : "N.M.";
    let region = data.region ? String(data.region) : "Région inconnue";
    let type = data.type ? String(data.type) : "Vin";
    let description = data.description ? String(data.description) : "Un excellent vin.";
    
    let gardeMin = 2;
    let gardeMax = 5;
    const gardeMatches = String(data.potentiel_garde || "").match(/\d+/g);
    if (gardeMatches && gardeMatches.length >= 1) {
       gardeMin = parseInt(gardeMatches[0], 10);
       if (gardeMatches.length >= 2) gardeMax = parseInt(gardeMatches[1], 10);
       else gardeMax = gardeMin + 3;
    }
    const dynamicDates = recalculateDates(annee, gardeMin, gardeMax);

    let strToSearch = (String(data.type_simplifie || "") + ' ' + type).toUpperCase();
    let type_simplifie = 'AUTRE';
    if (strToSearch.includes('ROUGE')) type_simplifie = 'ROUGE';
    else if (strToSearch.includes('BLANC')) type_simplifie = 'BLANC';
    else if (strToSearch.includes('ROSE') || strToSearch.includes('ROSÉ')) type_simplifie = 'ROSE';
    else if (strToSearch.includes('CHAMPAGNE') || strToSearch.includes('PETILLANT') || strToSearch.includes('PÉTILLANT') || strToSearch.includes('EFFERVESCENT') || strToSearch.includes('CRÉMANT') || strToSearch.includes('CREMANT') || strToSearch.includes('BULLE')) type_simplifie = 'PETILLANT';
    
    // SÉCURITÉ ACCORDS METS
    if (safeAccordsMets.length === 0) {
      if (type_simplifie === 'ROUGE') safeAccordsMets = ['Viande rouge grillée', 'Plateau de fromages affinés', 'Plats en sauce'];
      else if (type_simplifie === 'BLANC') safeAccordsMets = ['Poissons et fruits de mer', 'Volaille à la crème', 'Fromage de chèvre'];
      else if (type_simplifie === 'ROSE') safeAccordsMets = ['Apéritif', 'Grillades estivales', 'Salades composées'];
      else if (type_simplifie === 'PETILLANT') safeAccordsMets = ['Apéritif', 'Desserts légers', 'Coquilles Saint-Jacques'];
      else safeAccordsMets = ['Plats conviviaux à partager'];
    }

    let accord_parfait = data.accord_parfait ? String(data.accord_parfait) : safeAccordsMets[0];
    let safeTagsAccords = Array.isArray(data.tags_accords) ? data.tags_accords.filter(Boolean).map(item => String(item)) : [];
    
    let safeComparateur = [];
    if (Array.isArray(data.comparateur)) {
      safeComparateur = data.comparateur.filter(Boolean).map(c => {
        if (typeof c === 'object') return { site: String(c.site || 'Marchand'), prix: String(c.prix || '?') };
        return { site: 'Marchand', prix: String(c) };
      });
    }

    let prix_unitaire_nombre = Number(data.prix_unitaire_nombre) || extractPrice(data.prix_moyen) || 0;

    return { 
      nom, annee, region, type,
      type_simplifie, prix_unitaire_nombre, description, accord_parfait,
      accords_mets: safeAccordsMets, tags_accords: safeTagsAccords, comparateur: safeComparateur,
      baseGardeMin: gardeMin, baseGardeMax: gardeMax,
      ...dynamicDates
    };
  } catch (e) {
    return { nom: 'Erreur d\'analyse', type_simplifie: 'AUTRE', accords_mets: ['Aucun accord trouvé'], tags_accords: [], comparateur: [] };
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
// VUES DE L'APPLICATION
// =========================================================================

const NavigationBar = ({ ctx }) => (
  <div className="absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 h-16">
    <button onClick={() => ctx.setView('home')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['home', 'manualSearch', 'menuConfig'].includes(ctx.view) ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <Home className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Scanner</span>
    </button>
    <button onClick={() => ctx.setView('cellar')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'cellar' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <Archive className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Cave</span>
    </button>
    <button onClick={() => ctx.setView('recommendation')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['recommendation', 'recommendationList'].includes(ctx.view) ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Conseil</span>
    </button>
    <button onClick={() => ctx.setView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'history' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <History className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Histo</span>
    </button>
    <button onClick={() => ctx.setView('account')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'account' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
      <User className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Profil</span>
    </button>
  </div>
);

const HomeView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-slate-50 overflow-hidden">
    <div className="absolute -top-32 -left-32 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
    <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>

    <div className="text-center space-y-4 relative z-10">
      <div className="mx-auto w-28 h-28 bg-gradient-to-br from-rose-800 to-rose-950 rounded-full flex items-center justify-center shadow-xl shadow-rose-900/30 border-4 border-white">
        <Wine className="w-14 h-14 text-rose-100" />
      </div>
      <h1 className="text-5xl font-serif text-slate-800 tracking-tight font-bold">VinoScan</h1>
      <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">Gérez votre cave, analysez vos vins et découvrez leur apogée parfaite.</p>
    </div>

    <div className="w-full max-w-sm space-y-4 pt-6 relative z-10">
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white p-5 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95">
        <Camera className="w-6 h-6" /><span className="font-medium text-lg">Scanner une bouteille</span>
      </button>
      
      <button onClick={() => ctx.setView('menuConfig')} className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-5 rounded-2xl shadow-xl shadow-amber-600/30 transition-all active:scale-95">
        <BookOpen className="w-6 h-6" /><span className="font-medium text-lg">Scanner une carte des vins</span>
      </button>

      <div className="flex space-x-4 pt-2">
        <label className="flex-1 flex flex-col items-center justify-center space-y-2 bg-white border border-slate-100 text-slate-700 hover:bg-slate-50 p-4 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm">
          <ImageIcon className="w-6 h-6 text-slate-400" /><span className="font-medium text-sm">Galerie</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'bottle')} />
        </label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-2 bg-white border border-slate-100 text-slate-700 hover:bg-slate-50 p-4 rounded-2xl shadow-sm transition-all active:scale-95">
          <Search className="w-6 h-6 text-slate-400" /><span className="font-medium text-sm">Recherche</span>
        </button>
      </div>
    </div>
  </div>
);

// NOUVELLE VUE : Configuration du Scanner de Menu
const MenuConfigView = ({ ctx }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20">
      <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Le bon choix</h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Scanner un menu de restaurant</p>
        </div>
      </div>
      
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex space-x-3 shadow-sm">
          <Info className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 font-medium">Prenez en photo la carte des vins du restaurant, l'IA vous trouvera le Top 3 des meilleurs rapports qualité/prix selon votre plat !</p>
        </div>

        {/* Choix du plat */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center space-x-2"><Utensils className="w-5 h-5 text-amber-600" /><span>Que mangez-vous ?</span></h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: 'ALL'})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === 'ALL' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍽️ Peu importe</button>
            <button onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: 'APERITIF'})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === 'APERITIF' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🥂 Apéro/Tapas</button>
            <button onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: 'VIANDE_ROUGE'})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === 'VIANDE_ROUGE' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🥩 Viande rouge</button>
            <button onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: 'VIANDE_BLANCHE'})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === 'VIANDE_BLANCHE' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍗 Volaille/Porc</button>
            <button onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: 'POISSON'})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === 'POISSON' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🐟 Poisson/Mer</button>
            <button onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: 'FROMAGE'})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.food === 'FROMAGE' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🧀 Fromage</button>
          </div>
        </div>
        
        {/* Choix du vin */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center space-x-2"><Wine className="w-5 h-5 text-rose-800" /><span>Une préférence ?</span></h3>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (
              <button key={type} onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, type})} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${ctx.menuPrefs.type === type ? 'bg-rose-900 text-white border-rose-900 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {type === 'ALL' ? 'Laissez faire le sommelier' : type === 'PETILLANT' ? 'Bulles' : type}
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="pt-6 space-y-3">
          <button onClick={() => ctx.startCamera('menu')} className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
            <Camera className="w-5 h-5" /><span>Scanner la carte des vins</span>
          </button>
          
          <label className="w-full flex items-center justify-center space-x-2 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 active:scale-95 transition-all cursor-pointer">
            <ImageIcon className="w-5 h-5 text-slate-400" /><span>Ou importer une photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'menu')} />
          </label>
        </div>
      </div>
    </div>
  );
};

const quizQuestions = [
  { q: "Quel cépage donne souvent des arômes de litchi et de rose ?", options: ["Chardonnay", "Gewürztraminer", "Sauvignon Blanc"], ans: "Gewürztraminer" },
  { q: "Quelle région est célèbre pour son 'Vin Jaune' ?", options: ["Bourgogne", "Alsace", "Jura"], ans: "Jura" },
  { q: "Qu'appelle-t-on la 'Part des Anges' ?", options: ["Le vin évaporé", "Le vin offert au clergé", "Le fond de la bouteille"], ans: "Le vin évaporé" },
  { q: "Quel est le cépage rouge emblématique de la Bourgogne ?", options: ["Merlot", "Pinot Noir", "Syrah"], ans: "Pinot Noir" }
];

const ManualSearchView = ({ ctx }) => {
  const [query, setQuery] = useState('');
  const [gameState, setGameState] = useState('idle'); 
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); 

  const handleSearch = (e) => { e.preventDefault(); if(query.trim()) ctx.searchWineText(query); };
  
  const startGame = () => { setGameState('playing'); setQIndex(0); setScore(0); setFeedback(null); };
  const handleAnswer = (option) => {
    if (feedback) return;
    const correct = option === quizQuestions[qIndex].ans;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      if (qIndex + 1 < quizQuestions.length) setQIndex(i => i + 1);
      else setGameState('end');
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20">
      <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-slate-900">Ajouter un vin</h1><p className="text-slate-500 text-xs mt-1">Recherche mondiale</p></div>
      </div>
      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex: Château Margaux 2015" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 shadow-sm text-lg"/>
          </div>
          <button type="submit" disabled={!query.trim()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-medium shadow-lg disabled:opacity-50">
            Rechercher ce vin
          </button>
        </form>

        {/* SECTION MINI JEU */}
        <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-100 rounded-full mix-blend-multiply opacity-50"></div>
          
          {gameState === 'idle' && (
            <div className="text-center space-y-4 relative z-10">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto"><Gamepad2 className="w-8 h-8 text-amber-600"/></div>
              <h3 className="font-serif text-xl font-bold text-slate-900">Le Quiz du Sommelier</h3>
              <p className="text-sm text-slate-500">Testez vos connaissances en attendant votre prochaine dégustation.</p>
              <button onClick={startGame} className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform">Jouer maintenant</button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                <span>Question {qIndex + 1}/{quizQuestions.length}</span>
                <span>Score : {score}</span>
              </div>
              <p className="font-serif text-lg font-bold text-slate-900 min-h-[60px]">{quizQuestions[qIndex].q}</p>
              <div className="space-y-2">
                {quizQuestions[qIndex].options.map(opt => {
                  let btnClass = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
                  if (feedback && opt === quizQuestions[qIndex].ans) btnClass = "bg-emerald-500 border-emerald-500 text-white";
                  else if (feedback === 'wrong' && opt !== quizQuestions[qIndex].ans) btnClass = "bg-slate-100 text-slate-300 opacity-50";
                  return (
                    <button key={opt} onClick={() => handleAnswer(opt)} className={`w-full p-4 rounded-xl border font-bold text-left transition-colors ${btnClass}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {gameState === 'end' && (
            <div className="text-center space-y-4 relative z-10">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-8 h-8 text-emerald-600"/></div>
              <h3 className="font-serif text-xl font-bold text-slate-900">Terminé !</h3>
              <p className="text-lg font-bold text-slate-700">Score: {score} / {quizQuestions.length}</p>
              <button onClick={() => setGameState('idle')} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl">Rejouer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CellarView = ({ ctx }) => {
  const [cellarTab, setCellarTab] = useState('STOCK');
  const [filterType, setFilterType] = useState('ALL');
  const [filterApogee, setFilterApogee] = useState('ALL');
  const [filterFood, setFilterFood] = useState('ALL');
  const [viewMode, setViewMode] = useState('list');
  
  const [reorgMode, setReorgMode] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');

  const cellarItems = ctx.scanHistory.filter(item => {
    if (cellarTab === 'STOCK') return item.stock > 0;
    return item.wishlist === true;
  });
  
  const filteredItems = useMemo(() => {
    return cellarItems.filter(item => {
      const matchType = filterType === 'ALL' || item.data.type_simplifie === filterType;
      const matchApogee = filterApogee === 'ALL' || item.data.statut_apogee === filterApogee;
      
      const accordsStr = (item.data.accord_parfait + " " + (item.data.accords_mets || []).join(" ")).toUpperCase();
      let matchFood = true;
      if (filterFood === 'VIANDE') matchFood = accordsStr.includes('VIANDE');
      else if (filterFood === 'POISSON') matchFood = accordsStr.includes('POISSON') || accordsStr.includes('MER');
      else if (filterFood === 'FROMAGE') matchFood = accordsStr.includes('FROMAGE');
      else if (filterFood === 'APERITIF') matchFood = accordsStr.includes('APÉRITIF') || accordsStr.includes('APERITIF');
      
      return matchType && matchApogee && matchFood;
    });
  }, [cellarItems, filterType, filterApogee, filterFood]);

  const existingLocations = Array.from(new Set(ctx.scanHistory.map(s => s.location).filter(Boolean))).sort();

  const groupedByLocation = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const loc = item.location && item.location.trim() !== '' ? item.location.trim() : 'Vins non rangés';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
    return groups;
  }, [filteredItems]);

  const totalBottles = cellarTab === 'STOCK' ? filteredItems.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0) : filteredItems.length;
  const totalValue = filteredItems.reduce((acc, curr) => acc + ((curr.data.prix_unitaire_nombre || 0) * (cellarTab === 'STOCK' ? (parseInt(curr.stock) || 0) : 1)), 0);
  const declinAlerts = cellarTab === 'STOCK' ? filteredItems.filter(i => i.data.statut_apogee === 'DECLIN') : [];

  const handleMoveBottle = (locName) => {
    if (selectedBottle) {
      ctx.genericUpdate(selectedBottle.id, { location: locName });
      setSelectedBottle(null);
      setNewShelfName('');
      ctx.showToast("Bouteille déplacée !");
    }
  };

  const getApogeeBadge = (statut) => {
    switch(statut) {
      case 'A_GARDER': return <div className="flex items-center space-x-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-medium"><Clock className="w-3 h-3" /><span>À garder</span></div>;
      case 'DECLIN': return <div className="flex items-center space-x-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-medium"><TrendingDown className="w-3 h-3" /><span>Déclin</span></div>;
      default: return <div className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium"><CheckCircle className="w-3 h-3" /><span>Apogée</span></div>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20 relative">
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Mes Vins</h1>
            <p className="text-slate-500 text-sm mt-1">{totalBottles} {cellarTab === 'STOCK' ? 'bouteilles' : 'souhaits'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Valeur Estimée</p>
            <div className="flex items-center justify-end space-x-1 text-emerald-700"><span className="text-2xl font-bold">{totalValue.toFixed(0)}</span><Euro className="w-5 h-5 mb-0.5" /></div>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'STOCK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>En Cave</button>
          <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'WISHLIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Liste d'Achats</button>
        </div>

        <div className="space-y-3 relative">
          <div className="absolute right-0 top-0 h-full flex items-center bg-gradient-to-l from-white via-white to-transparent pl-4 pr-1">
            <div className="flex bg-slate-100 rounded-lg p-0.5 shadow-inner">
               <button onClick={() => { setViewMode('list'); setReorgMode(false); }} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-4 h-4" /></button>
               <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'shelves' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pr-24 scrollbar-hide">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (
              <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border border-transparent ${filterType === type ? 'bg-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {type === 'ALL' ? 'Tous' : type === 'PETILLANT' ? 'Bulles' : type}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide mt-2">
            <Utensils className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            {['ALL', 'VIANDE', 'POISSON', 'FROMAGE', 'APERITIF'].map(f => (
              <button key={f} onClick={() => setFilterFood(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${filterFood === f ? 'bg-amber-600 text-white shadow-md border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {f === 'ALL' ? 'Tous plats' : f}
              </button>
            ))}
          </div>

        </div>
        
        {viewMode === 'shelves' && cellarTab === 'STOCK' && (
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => { setReorgMode(!reorgMode); setSelectedBottle(null); }} 
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors ${reorgMode ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <GripHorizontal className="w-4 h-4" />
              <span>{reorgMode ? 'Terminer Réorganisation' : 'Réorganiser'}</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50 mt-10">
            {cellarTab === 'STOCK' ? <Archive className="w-16 h-16 mb-4 text-slate-300" /> : <Heart className="w-16 h-16 mb-4 text-slate-300" />}
            <p className="text-slate-500 font-medium">Aucun vin trouvé.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div onClick={() => ctx.openExistingWine(item, 'cellar')} className="p-4 flex items-start space-x-4 active:bg-slate-50 cursor-pointer">
                  <div className="w-16 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 shadow-inner">
                    <img src={item.image} alt="Miniature" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.data.type_simplifie}</span>
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded">{item.data.annee}</span>
                    </div>
                    <h3 className="font-serif text-slate-900 truncate font-bold leading-tight mb-1">{item.data.nom}</h3>
                    {item.location && <p className="text-xs text-slate-500 font-medium flex items-center mt-1"><MapPin className="w-3 h-3 mr-1"/> {item.location}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      {getApogeeBadge(item.data.statut_apogee)}
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{item.data.prix_unitaire_nombre}€</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
             {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                <div key={shelfName} className="bg-slate-800 rounded-2xl overflow-hidden shadow-lg border-b-8 border-amber-900/80">
                   <div className="bg-slate-900 px-5 py-4 text-amber-50 font-serif font-bold flex justify-between items-center border-b border-slate-700/50">
                      <span className="flex items-center text-lg"><MapPin className="w-5 h-5 mr-2 opacity-50"/> {shelfName}</span>
                      <span className="text-xs bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider font-sans">{bottles.length} bot.</span>
                   </div>
                   <div className="p-5 flex flex-wrap gap-x-5 gap-y-8 justify-center bg-gradient-to-b from-slate-800 to-slate-900 min-h-[160px] items-end pb-4">
                      {bottles.map(bottle => (
                         <div 
                            key={bottle.id} 
                            onClick={() => {
                              if (reorgMode) setSelectedBottle(bottle);
                              else ctx.openExistingWine(bottle, 'cellar');
                            }} 
                            className={`relative cursor-pointer group transition-all ${reorgMode ? 'animate-pulse hover:-translate-y-2' : 'active:scale-95 hover:-translate-y-1'}`}
                         >
                            <div className={`w-14 h-36 bg-slate-950 rounded-t-2xl rounded-b-md overflow-hidden border-2 relative shadow-2xl ${reorgMode ? 'border-amber-400 ring-4 ring-amber-400/30' : 'border-slate-700/50'}`}>
                               <img src={bottle.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {cellarTab === 'STOCK' && bottle.stock > 1 && (
                              <span className="absolute -top-3 -right-3 bg-rose-600 border-2 border-slate-800 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-lg z-10">x{bottle.stock}</span>
                            )}
                            <p className="text-[10px] text-center text-slate-300 mt-3 truncate w-16 mx-auto font-medium">{String(bottle.data?.nom || 'Vin').split(' ')[0]}</p>
                         </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* MODAL TIROIR POUR RÉORGANISATION */}
      {selectedBottle && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl mb-safe animate-in slide-in-from-bottom-4">
             <h3 className="font-serif text-2xl font-bold text-slate-900 mb-1">Déplacer</h3>
             <p className="text-slate-500 text-sm mb-6">Où voulez-vous ranger <b>{selectedBottle.data.nom}</b> ?</p>
             <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-2">
               {existingLocations.length > 0 ? existingLocations.map(loc => (
                 <button key={loc} onClick={() => handleMoveBottle(loc)} className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 font-bold transition-colors shadow-sm">
                   <MapPin className="w-4 h-4 inline mr-3 opacity-50" /> {loc}
                 </button>
               )) : <p className="text-slate-400 text-sm italic text-center py-4 bg-slate-50 rounded-xl">Aucune étagère existante.</p>}
               <button onClick={() => handleMoveBottle('')} className="w-full text-left p-4 rounded-2xl bg-slate-50 border text-slate-500 italic">Retirer de l'étagère</button>
             </div>
             <div className="flex space-x-2 border-t border-slate-100 pt-6">
               <input type="text" placeholder="Nouvelle étagère..." value={newShelfName} onChange={(e) => setNewShelfName(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-rose-200 transition-all font-medium" />
               <button onClick={() => handleMoveBottle(newShelfName)} disabled={!newShelfName.trim()} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold disabled:opacity-50">Créer</button>
             </div>
             <button onClick={() => { setSelectedBottle(null); setNewShelfName(''); }} className="mt-4 w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryView = ({ ctx }) => {
  const historyItems = ctx.scanHistory.filter(item => item.in_history !== false);

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20">
      <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 border-b border-slate-100">
        <h1 className="text-3xl font-serif font-bold text-slate-900">Historique</h1>
        <p className="text-slate-500 text-xs mt-1 font-medium uppercase tracking-wider">{historyItems.length} bouteilles analysées</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
            <History className="w-16 h-16 mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">Aucun historique.</p>
          </div>
        ) : (
          historyItems.map((item) => (
            <div key={item.id} onClick={() => ctx.openExistingWine(item, 'history')} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center space-x-4 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden hover:shadow-md">
              <div className="w-14 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 opacity-90 shadow-inner">
                <img src={item.image} alt="Miniature" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-slate-400 font-medium">{String(item.dateStr || '').split(' ')[0]}</span>
                  {item.stock > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">En cave</span>}
                </div>
                <h3 className="font-serif text-slate-900 truncate font-bold text-base leading-tight">{item.data.nom}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AccountView = ({ ctx }) => {
  const [showBadges, setShowBadges] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const historyLen = ctx.scanHistory.filter(i => i.in_history !== false).length;
  
  const calculateLevel = (length) => {
    if (length >= 50) return { name: "Maître Sommelier", iconColor: "text-purple-600", bgColor: "bg-purple-100", bar: "bg-purple-500" };
    if (length >= 20) return { name: "Grand Connaisseur", iconColor: "text-rose-600", bgColor: "bg-rose-100", bar: "bg-rose-500" };
    if (length >= 5) return { name: "Amateur Éclairé", iconColor: "text-amber-600", bgColor: "bg-amber-100", bar: "bg-amber-500" };
    return { name: "Novice Curieux", iconColor: "text-emerald-600", bgColor: "bg-emerald-100", bar: "bg-emerald-500" };
  };
  const level = calculateLevel(historyLen);

  const bordeauxCount = ctx.scanHistory.filter(i => i.data.region?.toLowerCase().includes('bordeaux')).length;
  const bourgogneCount = ctx.scanHistory.filter(i => i.data.region?.toLowerCase().includes('bourgogne')).length;
  const rougeCount = ctx.scanHistory.filter(i => i.data.type_simplifie === 'ROUGE').length;
  const bullesCount = ctx.scanHistory.filter(i => i.data.type_simplifie === 'PETILLANT').length;

  const collectionBadges = [
    { id: 'bordeaux', name: 'Baron de Bordeaux', desc: 'Scanner 3 vins de Bordeaux', req: 3, count: bordeauxCount, icon: '🍷' },
    { id: 'bourgogne', name: 'Duc de Bourgogne', desc: 'Scanner 3 vins de Bourgogne', req: 3, count: bourgogneCount, icon: '🍇' },
    { id: 'rouge', name: 'Sang de la Vigne', desc: 'Scanner 10 vins Rouges', req: 10, count: rougeCount, icon: '🥩' },
    { id: 'bulles', name: 'Maître des Bulles', desc: 'Scanner 5 Pétillants', req: 5, count: bullesCount, icon: '🥂' }
  ];

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setAuthError("Erreur : Vérifiez vos identifiants ou le mot de passe (min 6 caractères)."); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    try { await signInAnonymously(auth); } catch (e) {}
    ctx.setView('home');
  };

  if (!ctx.user || ctx.user.isAnonymous) {
    return (
      <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto p-6">
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30 transform rotate-3">
            <ShieldCheck className="w-12 h-12 text-white transform -rotate-3" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3 text-center">Sauvegardez votre cave</h2>
          <p className="text-sm text-slate-500 text-center mb-8 font-medium">Créez un compte gratuitement pour retrouver vos précieux nectars sur tous vos appareils.</p>
          {authError && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl w-full mb-6 text-center font-medium border border-red-100">{authError}</div>}
          <form onSubmit={handleAuth} className="w-full space-y-4">
            <input type="email" placeholder="Adresse email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent font-medium shadow-sm" required />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent font-medium shadow-sm" required />
            <button type="submit" className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95">
              {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-8 text-slate-500 text-sm font-medium hover:text-slate-800 transition-colors">
            {authMode === 'login' ? "Nouveau ici ? Créer un compte" : "Déjà membre ? Se connecter"}
          </button>
        </div>
      </div>
    );
  }

  const exportToCSV = () => { /* Reste identique */ };

  const itemsInStock = ctx.scanHistory.filter(i => i.stock > 0);
  const totalBottles = itemsInStock.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const totalValue = itemsInStock.reduce((acc, curr) => acc + ((curr.data.prix_unitaire_nombre || 0) * (curr.stock || 0)), 0);
  
  const countType = (type) => itemsInStock.filter(i => i.data.type_simplifie === type).reduce((acc, curr) => acc + curr.stock, 0);
  const red = countType('ROUGE');
  const white = countType('BLANC');
  const rose = countType('ROSE');
  const spark = countType('PETILLANT');
  const getPct = (val) => totalBottles === 0 ? 0 : Math.round((val / totalBottles) * 100);

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto relative">
      <div className="bg-white pt-12 pb-6 px-6 shadow-sm z-10 flex items-center justify-between border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Mon Profil</h1>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Cloud Activé</p>
        </div>
        <div className={`w-12 h-12 rounded-full ${level.bgColor} flex items-center justify-center shadow-inner border border-white`}>
          <Award className={`w-6 h-6 ${level.iconColor}`} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* GAMIFICATION CARD CLIQUABLE */}
        <div onClick={() => setShowBadges(true)} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-4 right-4 text-slate-300"><Info className="w-5 h-5"/></div>
          <div className="flex justify-between items-end mb-3">
             <div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Niveau Actuel</p>
               <h3 className={`font-serif text-xl font-bold ${level.iconColor}`}>{level.name}</h3>
             </div>
             <p className="text-sm font-bold text-slate-700">{historyLen} <span className="text-xs text-slate-400 font-normal">scans</span></p>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className={`h-full ${level.bar} rounded-full transition-all duration-1000`} style={{width: `${Math.min(100, (historyLen/50)*100)}%`}}></div>
          </div>
        </div>

        {/* DASHBOARD CARD COMPLET */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-serif text-xl font-bold text-slate-900 flex items-center mb-5"><PieChart className="w-5 h-5 mr-2 text-indigo-500"/> Ma Cave</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Bouteilles</p>
              <p className="text-3xl font-bold text-slate-800">{totalBottles}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Valeur Estimée</p>
              <p className="text-3xl font-bold text-emerald-700">{totalValue.toFixed(0)}€</p>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Répartition</p>
          <div className="h-4 w-full flex rounded-full overflow-hidden mb-4 shadow-inner">
            {red > 0 && <div style={{width: `${getPct(red)}%`}} className="bg-rose-800 h-full transition-all"></div>}
            {white > 0 && <div style={{width: `${getPct(white)}%`}} className="bg-amber-100 h-full transition-all border-r border-slate-200"></div>}
            {rose > 0 && <div style={{width: `${getPct(rose)}%`}} className="bg-pink-300 h-full transition-all"></div>}
            {spark > 0 && <div style={{width: `${getPct(spark)}%`}} className="bg-yellow-400 h-full transition-all"></div>}
            {totalBottles === 0 && <div className="bg-slate-200 h-full w-full"></div>}
          </div>
          
          <div className="grid grid-cols-2 gap-y-3 text-sm font-medium">
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-800 mr-3 shadow-sm"></div><span className="text-slate-700">Rouges ({getPct(red)}%)</span></div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-100 mr-3 shadow-sm border border-slate-200"></div><span className="text-slate-700">Blancs ({getPct(white)}%)</span></div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-pink-300 mr-3 shadow-sm"></div><span className="text-slate-700">Rosés ({getPct(rose)}%)</span></div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-400 mr-3 shadow-sm"></div><span className="text-slate-700">Pétillants ({getPct(spark)}%)</span></div>
          </div>
        </div>

        {/* ACTIONS CARD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Paramètres du compte</p>
          <div className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-2xl flex items-center break-all border border-slate-100">
            <Mail className="w-5 h-5 mr-3 text-slate-400 shrink-0"/> {ctx.user.email}
          </div>
          
          <button onClick={exportToCSV} className="w-full flex items-center p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-100 transition-colors border border-indigo-100">
            <Download className="w-5 h-5 mr-3" /> Exporter ma cave (.csv)
          </button>

          <button onClick={handleLogout} className="w-full flex items-center p-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors border border-slate-200">
            <LogOut className="w-5 h-5 mr-3" /> Se déconnecter
          </button>
        </div>
      </div>

      {/* MODAL DES BADGES ET COLLECTIONS */}
      {showBadges && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative shadow-2xl max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowBadges(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X className="w-5 h-5"/></button>
            <h3 className="font-serif text-2xl font-bold mb-6 text-center text-slate-900">Trophées & Collections</h3>
            
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collections Régionales & Types</p>
              {collectionBadges.map((badge) => {
                const unlocked = badge.count >= badge.req;
                return (
                  <div key={badge.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${unlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-70 grayscale'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{badge.icon}</div>
                      <div>
                        <h4 className={`font-bold ${unlocked ? 'text-amber-900' : 'text-slate-700'}`}>{badge.name}</h4>
                        <p className="text-xs text-slate-500">{badge.desc}</p>
                      </div>
                    </div>
                    {unlocked ? (
                      <CheckCircle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{badge.count}/{badge.req}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CameraView = ({ ctx }) => (
  <div className="relative h-full w-full bg-black flex flex-col">
    <button onClick={() => { ctx.stopCamera(); ctx.setView('home'); }} className="absolute top-6 left-6 z-10 p-3 bg-black/50 backdrop-blur text-white rounded-full"><ChevronLeft className="w-6 h-6" /></button>
    <div className="relative flex-1 overflow-hidden flex items-center justify-center">
      <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-3xl flex flex-col justify-between p-6 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between"><div className="w-10 h-10 border-t-4 border-l-4 border-rose-500 rounded-tl-xl"></div><div className="w-10 h-10 border-t-4 border-r-4 border-rose-500 rounded-tr-xl"></div></div>
          <ScanLine className="w-16 h-16 text-white/40 self-center animate-pulse" />
          <div className="flex justify-between"><div className="w-10 h-10 border-b-4 border-l-4 border-rose-500 rounded-bl-xl"></div><div className="w-10 h-10 border-b-4 border-r-4 border-rose-500 rounded-br-xl"></div></div>
        </div>
      </div>
    </div>
    <div className="h-32 bg-black pb-8 pt-4 flex items-center justify-center">
      <button onClick={ctx.capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-90 transition-transform">
        <div className="w-16 h-16 bg-white rounded-full border-2 border-rose-500"></div>
      </button>
    </div>
    <canvas ref={ctx.canvasRef} className="hidden" />
  </div>
);

const AnalyzingView = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-rose-50/50 to-white/50"></div>
    <div className="relative w-40 h-40 flex items-center justify-center mb-8 z-10">
      <div className="absolute inset-0 border-4 border-rose-100 rounded-full animate-[spin_3s_linear_infinite]"></div>
      <div className="absolute inset-2 border-4 border-rose-400 rounded-full border-t-transparent animate-[spin_1.5s_linear_infinite]"></div>
      <Wine className="w-14 h-14 text-rose-900 animate-pulse" />
    </div>
    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3 z-10">Analyse en cours</h2>
    <p className="text-slate-500 text-sm mt-2 text-center font-medium z-10">Notre sommelier travaille sur votre demande...</p>
  </div>
);

const ErrorView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50">
    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-8 shadow-inner"><AlertCircle className="w-12 h-12" /></div>
    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Erreur</h2>
    <p className="text-slate-600 mb-10 font-medium">{ctx.errorMsg}</p>
    <button onClick={ctx.goBack} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg">Retourner à l'accueil</button>
  </div>
);

const RecommendationView = ({ ctx }) => {
  const [recMode, setRecMode] = useState('menu'); // 'menu', 'buy', 'cellar'
  const [filterType, setFilterType] = useState('ALL');
  const [filterApogee, setFilterApogee] = useState('ALL');
  const [filterFood, setFilterFood] = useState('ALL');
  const [filterPrice, setFilterPrice] = useState('ALL');
  
  // States pour la Killer App
  const [pairingDish, setPairingDish] = useState('');
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const handleRecommend = () => { ctx.fetchAIRecommendation(filterType, filterApogee, filterFood, filterPrice); };

  const handleAskCellarSommelier = async () => {
    if (!pairingDish.trim()) return;
    setIsPairingLoading(true);
    
    try {
      const inStockWines = ctx.scanHistory.filter(w => w.stock > 0);
      if (inStockWines.length === 0) {
        ctx.setErrorMsg("Votre cave est vide ! Ajoutez des vins avant de demander conseil.");
        ctx.setView('error');
        return;
      }
      
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} ${w.data.annee} (${w.data.type_simplifie})`).join('\n');
      
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}".
      Voici les vins EXACTS dans sa cave :
      ${inventoryString}
      
      Choisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat.
      Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;

      // On utilise ctx pour appeler callGemini indirectement si besoin, 
      // ou si callGemini est global dans le fichier on l'appelle directement.
      const result = await callGemini(prompt);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractJSON(text);
      
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur de sélection de l'IA.");

      // On affiche le résultat en ouvrant la bouteille avec une note dans le contexte
      ctx.showToast(`L'IA recommande : ${chosenWine.data.nom} !`);
      ctx.openExistingWine(chosenWine, 'recommendation');
    } catch (e) {
      ctx.setErrorMsg("Impossible de trouver l'accord parfait pour le moment.");
      ctx.setView('error');
    } finally {
      setIsPairingLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-amber-50 to-white pb-20 overflow-y-auto">
      <div className="bg-white/80 backdrop-blur-md pt-12 pb-6 px-6 shadow-sm z-10 sticky top-0 border-b border-amber-100 flex items-center">
        {recMode !== 'menu' && (
          <button onClick={() => setRecMode('menu')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button>
        )}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-200 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50 transform -rotate-3"><Sparkles className="w-6 h-6 text-amber-900" /></div>
          <div><h1 className="text-3xl font-serif font-bold text-slate-900">Le Sommelier</h1><p className="text-slate-500 text-sm font-medium">Laissez l'IA vous conseiller</p></div>
        </div>
      </div>

      <div className="p-6 space-y-10">
        
        {/* MENU PRINCIPAL */}
        {recMode === 'menu' && (
          <div className="space-y-6 mt-4">
            <button onClick={() => setRecMode('buy')} className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex items-center space-x-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shrink-0"><ShoppingCart className="w-8 h-8 text-emerald-600" /></div>
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-900">Acheter un vin</h3>
                <p className="text-sm text-slate-500">L'IA vous recommande le meilleur vin à acheter selon votre repas et votre budget.</p>
              </div>
            </button>

            <button onClick={() => setRecMode('cellar')} className="w-full bg-gradient-to-r from-indigo-800 to-purple-900 text-white rounded-3xl p-6 shadow-lg active:scale-95 transition-all text-left flex items-center space-x-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500 rounded-full mix-blend-screen filter blur-xl opacity-50"></div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-md"><Archive className="w-8 h-8 text-white" /></div>
              <div className="relative z-10">
                <h3 className="font-serif text-xl font-bold text-white flex items-center">Que boire ce soir ? <Sparkles className="w-4 h-4 ml-2 text-yellow-300"/></h3>
                <p className="text-sm text-indigo-200">Dites au sommelier ce que vous mangez, il trouvera la bouteille parfaite dans votre cave.</p>
              </div>
            </button>
          </div>
        )}

        {/* KILLER APP : SOMMELIER DE CAVE */}
        {recMode === 'cellar' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-center">
              <Utensils className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="font-serif text-2xl font-bold text-slate-900 mb-2">Que mangez-vous ?</h3>
              <p className="text-sm text-slate-600 mb-6">Le sommelier va analyser votre cave pour trouver l'accord parfait.</p>
              <input autoFocus type="text" placeholder="Ex: Magret de canard, Lasagnes..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-4 shadow-sm" />
              <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center">
                {isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Trouver la pépite dans ma cave"}
              </button>
            </div>
          </div>
        )}

        {/* RECOMMANDATION CLASSIQUE (ACHAT) */}
        {recMode === 'buy' && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-slate-900 flex items-center space-x-2"><Euro className="w-5 h-5 text-emerald-600" /><span>Budget</span></h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterPrice('ALL')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterPrice === 'ALL' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Peu importe</button>
                <button onClick={() => setFilterPrice('BUDGET')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterPrice === 'BUDGET' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Abordable ({"<"} 20€)</button>
                <button onClick={() => setFilterPrice('MEDIUM')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterPrice === 'MEDIUM' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Plaisir (20-50€)</button>
                <button onClick={() => setFilterPrice('PREMIUM')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterPrice === 'PREMIUM' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Exception ({">"} 50€)</button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-slate-900 flex items-center space-x-2"><Utensils className="w-5 h-5 text-amber-600" /><span>Pour quel repas ?</span></h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterFood('ALL')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === 'ALL' ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍽️ Peu importe</button>
                <button onClick={() => setFilterFood('APERITIF')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === 'APERITIF' ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🥂 Apéro & Tapas</button>
                <button onClick={() => setFilterFood('VIANDE_ROUGE')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === 'VIANDE_ROUGE' ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🥩 Viande rouge</button>
                <button onClick={() => setFilterFood('VIANDE_BLANCHE')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === 'VIANDE_BLANCHE' ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍗 Viande blanche</button>
                <button onClick={() => setFilterFood('POISSON')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === 'POISSON' ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🐟 Poisson & Mer</button>
                <button onClick={() => setFilterFood('FROMAGE')} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === 'FROMAGE' ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🧀 Fromage</button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-slate-900 flex items-center space-x-2"><Wine className="w-5 h-5 text-rose-800" /><span>Type de vin</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterType === type ? 'bg-rose-900 text-white border-rose-900 shadow-md scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {type === 'ALL' ? 'Surprenez-moi' : type === 'PETILLANT' ? 'Bulles' : type}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleRecommend} className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-amber-500/30 hover:scale-[1.02] transition-all active:scale-95 flex justify-center items-center space-x-3 mt-8">
              <Sparkles className="w-6 h-6" /><span>Trouver la perle rare</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

const RecommendationListView = ({ ctx }) => {
  const [sortOrder, setSortOrder] = useState('asc');
  const sortedList = useMemo(() => {
    if (!ctx.recommendationList) return [];
    return [...ctx.recommendationList].sort((a, b) => {
      const priceA = a.prix_unitaire_nombre || 0;
      const priceB = b.prix_unitaire_nombre || 0;
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });
  }, [ctx.recommendationList, sortOrder]);

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20">
      <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center">
          <button onClick={() => ctx.setView('recommendation')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-serif font-bold text-slate-900">La Sélection</h1><p className="text-slate-500 text-xs mt-1 font-medium">{sortedList.length} vins trouvés</p></div>
        </div>
        <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
          <ArrowDownUp className="w-4 h-4" /><span>{sortOrder === 'asc' ? 'Prix croissant' : 'Prix décroissant'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedList.map((wine, index) => {
           const imgUrl = getGenericImageForType(wine.type_simplifie);
           return (
             <div key={index} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex space-x-5 hover:shadow-md transition-shadow">
               <div className="w-24 h-32 bg-slate-100 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                  <img src={imgUrl} alt="Bouteille" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 min-w-0 flex flex-col justify-between">
                 <div>
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{wine.type_simplifie === 'PETILLANT' ? 'Pétillant' : (wine.type_simplifie || 'VIN')}</span>
                     <div className="flex items-end space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                       <span className="text-lg leading-none">{wine.prix_unitaire_nombre || '?'}</span><span className="text-xs">€</span>
                     </div>
                   </div>
                   <h3 className="font-serif text-slate-900 text-lg leading-tight mb-1 font-bold line-clamp-2">{wine.nom}</h3>
                   <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2 font-medium">
                     <span className="text-rose-800 font-bold">{wine.annee}</span><span>•</span><span className="truncate">{wine.region}</span>
                   </div>
                   <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">{wine.description}</p>
                 </div>
                 <button onClick={() => ctx.processRecommendationSelection(wine)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-colors">
                   Découvrir ce vin
                 </button>
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

const ResultsView = ({ ctx }) => {
  let currentScanObj = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  if (!currentScanObj && ctx.analysisResult) {
    currentScanObj = ctx.scanHistory.find(s => s.data?.nom === ctx.analysisResult.nom && s.data?.annee === ctx.analysisResult.annee);
  }
  
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

  useEffect(() => {
    setTempType(displayData.type_simplifie || '');
    setTempLocation(currentScanObj?.location || '');
    setTempNotes(currentScanObj?.notes || '');
    setTempAnnee(displayData.annee || '');
    setTempPrix(displayData.prix_unitaire_nombre || '');
  }, [currentScanObj?.id, displayData]);

  const handleYearChange = (newYear) => {
    setTempAnnee(newYear);
    if (!scanIdToUse) return;
    
    ctx.updateDataField(scanIdToUse, 'annee', newYear);
    const baseMin = displayData.baseGardeMin || 2;
    const baseMax = displayData.baseGardeMax || 5;
    const newDates = recalculateDates(newYear, baseMin, baseMax);
    
    ctx.genericUpdate(scanIdToUse, {
      data: { ...displayData, annee: newYear, ...newDates }
    });
  };

  const handleTypeChange = (newType) => {
    setTempType(newType);
    
    let newAccords = [];
    if (newType === 'ROUGE') newAccords = ['Viande rouge grillée', 'Plateau de fromages affinés', 'Plats en sauce'];
    else if (newType === 'BLANC') newAccords = ['Poissons et fruits de mer', 'Volaille à la crème', 'Fromage de chèvre'];
    else if (newType === 'ROSE') newAccords = ['Apéritif', 'Grillades estivales', 'Salades composées'];
    else if (newType === 'PETILLANT') newAccords = ['Apéritif', 'Desserts légers', 'Coquilles Saint-Jacques'];
    else newAccords = ['Plats conviviaux à partager'];

    const newParfait = newAccords[0];

    ctx.setAnalysisResult(prev => prev ? {
       ...prev,
       type_simplifie: newType,
       accords_mets: newAccords,
       accord_parfait: newParfait
    } : prev);

    if (scanIdToUse) {
       ctx.genericUpdate(scanIdToUse, {
          data: { ...displayData, type_simplifie: newType, accords_mets: newAccords, accord_parfait: newParfait }
       });
    }
  };

  const existingLocations = Array.from(new Set(ctx.scanHistory.map(s => s.location).filter(Boolean))).sort();
  const { nom, region, description, potentiel_garde, apogee, declin, statut_apogee, comparateur, accords_mets, accord_parfait } = displayData;
  const safeAccordsMets = Array.isArray(accords_mets) ? accords_mets : [];
  const safeComparateur = Array.isArray(comparateur) ? comparateur : [];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-8">
      <div className="relative h-[30vh] bg-slate-900 overflow-hidden shrink-0 rounded-b-[40px] shadow-sm">
        <img src={ctx.imageSrc} alt="Scanned bottle blur" className="w-full h-full object-cover opacity-40 blur-md scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
        <div className="absolute inset-0 flex items-center justify-center p-6 pt-12">
          <img src={ctx.imageSrc} alt="Scanned bottle clear" className="max-h-full rounded-xl shadow-2xl border-2 border-white/10" />
        </div>
        <button onClick={ctx.goBack} className="absolute top-6 left-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors z-20"><ChevronLeft className="w-6 h-6" /></button>
        
        {currentScanObj && (
          <button onClick={() => ctx.handleShare(currentScanObj)} className="absolute top-6 right-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors z-20">
            <Share2 className="w-5 h-5" />
          </button>
        )}

        {ctx.toastMsg && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 border border-slate-700">
            {ctx.toastMsg}
          </div>
        )}
      </div>
      
      <div className="px-5 -mt-8 relative z-10 space-y-5">
        
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="relative">
              <select 
                value={tempType} 
                onChange={(e) => handleTypeChange(e.target.value)}
                className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg outline-none cursor-pointer appearance-none pr-8 transition-colors hover:bg-rose-100"
              >
                <option value="ROUGE">VIN ROUGE</option>
                <option value="BLANC">VIN BLANC</option>
                <option value="ROSE">VIN ROSÉ</option>
                <option value="PETILLANT">PÉTILLANT</option>
                <option value="AUTRE">AUTRE</option>
              </select>
              <ChevronDown className="w-3 h-3 text-rose-800 absolute right-2.5 top-2 pointer-events-none" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{region}</span>
          </div>

          <h2 className="text-3xl font-serif font-bold text-slate-900 leading-tight mb-3">{nom}</h2>
          
          <div className="flex items-center text-slate-500 font-medium mb-5 bg-slate-50 p-2 rounded-xl border border-slate-100 w-max">
            <span className="text-sm ml-2">Millésime :</span>
            <div className="relative flex items-center ml-2">
              <input 
                type="text" 
                value={tempAnnee} 
                onChange={(e) => setTempAnnee(e.target.value)} 
                onKeyDown={ctx.handleKeyDown}
                onBlur={() => handleYearChange(tempAnnee)}
                className="bg-white border border-slate-200 text-rose-900 px-3 py-1.5 rounded-lg w-24 outline-none focus:ring-2 focus:ring-rose-200 font-bold text-lg text-center shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-start space-x-3 text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed font-medium">{description}</p>
          </div>
        </div>

        {currentScanObj && (
          <div className="bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/20 p-6 text-white border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full mix-blend-screen filter blur-2xl opacity-50"></div>
            
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div><h3 className="font-serif text-xl font-bold text-slate-50">Dans ma cave</h3></div>
              <div className="flex items-center space-x-3 bg-slate-800/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-700">
                <button onClick={() => ctx.handleDirectStockChange(scanIdToUse, Math.max(0, stock - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors"><Minus className="w-5 h-5" /></button>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={stock} onChange={(e) => ctx.handleDirectStockChange(scanIdToUse, e.target.value)} onBlur={(e) => { if(e.target.value === '') ctx.handleDirectStockChange(scanIdToUse, '0') }} onKeyDown={ctx.handleKeyDown} className="w-12 h-12 text-center text-2xl font-bold bg-transparent text-white outline-none focus:bg-slate-700 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button onClick={() => ctx.handleDirectStockChange(scanIdToUse, stock + 1)} className="w-12 h-12 flex items-center justify-center bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-lg shadow-rose-900/50"><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            {stock === 0 ? (
              <button onClick={() => ctx.genericUpdate(scanIdToUse, { wishlist: !isWishlist })} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all border relative z-10 ${isWishlist ? 'bg-pink-900/60 border-pink-700 text-pink-100 shadow-inner' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}>
                <Heart className={`w-5 h-5 ${isWishlist ? 'fill-current text-pink-400' : ''}`} />
                <span>{isWishlist ? 'Retirer de la liste d\'achats' : 'Ajouter à la liste d\'achats'}</span>
              </button>
            ) : (
              <div className="space-y-3 mt-5 pt-5 border-t border-slate-800 relative z-10">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><MapPin className="w-4 h-4 mr-2"/> Emplacement exact</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={tempLocation} 
                    onChange={(e) => setTempLocation(e.target.value)} 
                    onKeyDown={ctx.handleKeyDown} 
                    onBlur={() => ctx.genericUpdate(scanIdToUse, { location: tempLocation })} 
                    list="shelf-suggestions"
                    placeholder="Ex: Étagère du haut, Cave à vin..." 
                    className="w-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-white rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder-slate-500" 
                  />
                  <datalist id="shelf-suggestions">
                    {existingLocations.map(loc => <option key={loc} value={loc} />)}
                  </datalist>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3"><div className="p-2 bg-rose-50 rounded-lg"><Edit3 className="w-5 h-5 text-rose-800" /></div><h3 className="font-serif text-xl font-bold text-slate-900">Notes & Avis</h3></div>
            <div className="flex space-x-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => ctx.genericUpdate(scanIdToUse, { rating: star })} className="p-1 hover:scale-110 transition-transform">
                  <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea 
            value={tempNotes} 
            onChange={(e) => setTempNotes(e.target.value)} 
            onKeyDown={ctx.handleKeyDown}
            onBlur={() => ctx.genericUpdate(scanIdToUse, { notes: tempNotes })}
            placeholder="Arômes ressentis, occasion, personnes présentes..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:bg-white transition-all placeholder-slate-400"
          />
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl shadow-sm border border-amber-100 p-6 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
          
          <div className="flex items-center space-x-4 mb-5 relative z-10">
            <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center shadow-sm border border-amber-300/50 transform rotate-3">
              <Star className="w-6 h-6 text-amber-800 fill-amber-800/20" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-amber-950">L'Accord Parfait</h3>
          </div>
          <p className="text-amber-900 font-bold text-lg leading-relaxed relative z-10 bg-white/40 p-4 rounded-2xl border border-amber-100/50 backdrop-blur-sm">{accord_parfait}</p>
          
          {safeAccordsMets.length > 0 && (
             <div className="mt-6 pt-5 border-t border-amber-200/60 relative z-10">
               <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-800/60 mb-4">Autres suggestions divines</h4>
               <div className="flex flex-wrap gap-2">
                 {safeAccordsMets.map((plat, index) => (
                   <span key={index} className="bg-white/60 border border-amber-200/50 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                     {plat}
                   </span>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg"><Clock className="w-5 h-5 text-indigo-600" /></div>
            <h3 className="font-serif text-xl font-bold text-slate-900">Temps & Apogée</h3>
          </div>
          
          <div className="space-y-0 relative">
            <div className="absolute left-5 top-2 bottom-6 w-0.5 bg-slate-100"></div>

            <div className="flex items-start relative z-10 pb-8">
              <div className="w-10 flex flex-col items-center shrink-0">
                <div className={`w-4 h-4 rounded-full border-4 border-white ${statut_apogee === 'A_GARDER' ? 'bg-indigo-500 shadow-[0_0_0_2px_rgba(99,102,241,0.2)] scale-125' : 'bg-slate-300'} transition-all`}></div>
              </div>
              <div className="-mt-1 ml-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full">
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${statut_apogee === 'A_GARDER' ? 'text-indigo-600' : 'text-slate-500'}`}>Garde estimée</p>
                <p className="text-base font-bold text-slate-800">{potentiel_garde}</p>
              </div>
            </div>

            <div className="flex items-start relative z-10 pb-8">
              <div className="w-10 flex flex-col items-center shrink-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-4 border-white ${statut_apogee === 'APOGEE' ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)] scale-125' : 'bg-slate-300'} transition-all`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
              </div>
              <div className="-mt-1.5 ml-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 w-full shadow-sm">
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${statut_apogee === 'APOGEE' ? 'text-emerald-700' : 'text-slate-500'}`}>Apogée parfaite</p>
                <p className="text-lg font-bold text-emerald-900">Entre {apogee}</p>
              </div>
            </div>

            <div className="flex items-start relative z-10">
              <div className="w-10 flex flex-col items-center shrink-0">
                <div className={`w-4 h-4 rounded-full border-4 border-white ${statut_apogee === 'DECLIN' ? 'bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)] scale-125' : 'bg-slate-300'} transition-all`}></div>
              </div>
              <div className="-mt-1 ml-4 w-full pl-2">
                <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${statut_apogee === 'DECLIN' ? 'text-red-600' : 'text-slate-400'}`}>Déclin du vin</p>
                <p className="text-sm font-medium text-slate-600">{declin}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-800">Tarif Marchand</h3>
          </div>
          
          <div className="flex items-end space-x-2 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-max">
            <div className="relative flex items-center">
              <input 
                type="number" 
                value={tempPrix} 
                onChange={(e) => setTempPrix(e.target.value)} 
                onKeyDown={ctx.handleKeyDown}
                onBlur={() => ctx.updateDataField(scanIdToUse, 'prix_unitaire_nombre', Number(tempPrix))}
                className="text-4xl font-bold text-slate-900 bg-white border border-slate-200 rounded-xl w-24 outline-none focus:ring-2 focus:ring-emerald-200 text-center shadow-sm py-1"
              />
              <Edit3 className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
            <span className="text-4xl font-bold text-slate-900 mb-1">€</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2">/ Bouteille</span>
          </div>

          <a 
            href={`https://www.google.com/search?q=${encodeURIComponent('prix vin ' + nom + ' ' + tempAnnee)}&tbm=shop`}
            target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center space-x-2 py-4 mt-6 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Search className="w-5 h-5" />
            <span>Chercher le prix exact sur le web</span>
          </a>

          {safeComparateur.length > 0 && (
            <div className="space-y-3 pt-6 mt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Estimations historiques IA</h4>
              {safeComparateur.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white rounded-md shadow-sm"><ShoppingCart className="w-4 h-4 text-slate-400" /></div>
                    <span className="font-bold text-slate-700 text-sm">{item.site}</span>
                  </div>
                  <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">{item.prix}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-3 pt-4">
           {currentScanObj && currentScanObj.in_history !== false && (
             <button onClick={() => ctx.setScanAction({id: scanIdToUse, type: 'history'})} className="w-full flex items-center justify-center space-x-2 py-4 bg-white text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-colors border border-slate-200"><EyeOff className="w-5 h-5" /><span>Retirer de l'historique</span></button>
           )}
           {currentScanObj && currentScanObj.stock > 0 && (
             <button onClick={() => ctx.setScanAction({id: scanIdToUse, type: 'cellar'})} className="w-full flex items-center justify-center space-x-2 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors border border-red-100"><Archive className="w-5 h-5" /><span>Sortir définitivement de la cave</span></button>
           )}
        </div>

      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [view, setView] = useState('home'); 
  const [previousView, setPreviousView] = useState('home');
  const [imageSrc, setImageSrc] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [scanHistory, setScanHistory] = useState([]);
  const [scanAction, setScanAction] = useState(null); 
  const [recommendationList, setRecommendationList] = useState(null); 
  
  const [toastMsg, setToastMsg] = useState('');
  const [currentScanId, setCurrentScanId] = useState(null);
  
  const [cameraMode, setCameraMode] = useState('bottle');
  const [menuPrefs, setMenuPrefs] = useState({ food: 'ALL', type: 'ALL' });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof (window).__initial_auth_token !== 'undefined' && (window).__initial_auth_token) {
          await signInWithCustomToken(auth, (window).__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.log(err); }
      setIsAuthLoading(false);
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setScanHistory([]);
      return;
    }

    const scansRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scans');
    const unsubscribeDb = onSnapshot(scansRef, 
      (snapshot) => {
        const scans = [];
        snapshot.forEach(doc => {
          const itemData = doc.data();
          if (!itemData.data) return;
          scans.push({ 
            id: String(doc.id), 
            ...itemData, 
            in_history: itemData.in_history !== false,
            wishlist: itemData.wishlist || false,
            location: String(itemData.location || ''),
            rating: Number(itemData.rating || 0),
            notes: String(itemData.notes || ''),
            dateStr: String(itemData.dateStr || new Date().toLocaleDateString('fr-FR')),
            data: normalizeData(itemData.data) 
          });
        });
        scans.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setScanHistory(scans);
      }, 
      (error) => console.error("Erreur DB:", error)
    );

    return () => unsubscribeDb();
  }, [user]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const startCamera = async (mode = 'bottle') => {
    try {
      setCameraMode(mode);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setView('camera');
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      setErrorMsg("Impossible d'accéder à la caméra. Vérifiez vos autorisations.");
      setView('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const mapCtx = canvas.getContext('2d');
      mapCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();
      
      const compressedImg = await compressImage(dataUrl);
      setImageSrc(compressedImg);
      
      if (cameraMode === 'menu') analyzeMenu(compressedImg);
      else analyzeImage(compressedImg);
    }
  };

  const handleFileUpload = async (e, mode = 'bottle') => {
    const file = e.target.files[0];
    if (file) {
      setCameraMode(mode);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressedImg = await compressImage(reader.result);
        setImageSrc(compressedImg);
        if (mode === 'menu') analyzeMenu(compressedImg);
        else analyzeImage(compressedImg);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => { return () => stopCamera(); }, []);

  const SYSTEM_PROMPT = `Expert Sommelier. Réponds UNIQUEMENT en JSON. 
  Format: {"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}`;
  const processAIResult = async (aiText, sourceImage, defaultImageFallback, isWishlist = false) => {
    const parsedData = normalizeData(extractJSON(aiText));
    setAnalysisResult(parsedData);
    
    let finalImage = sourceImage || defaultImageFallback || getGenericImageForType(parsedData.type_simplifie);
    setImageSrc(finalImage);

    const tempId = 'temp_' + Date.now();
    const newScanObj = {
      id: tempId,
      image: finalImage,
      data: parsedData,
      stock: 0,
      in_history: !isWishlist,
      wishlist: isWishlist,
      location: '',
      rating: 0,
      notes: '',
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })
    };

    setScanHistory(prev => [newScanObj, ...prev]);
    setCurrentScanId(tempId);
    setView('results');

    if (auth.currentUser) {
      try {
        const scansRef = collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans');
        const docRef = await addDoc(scansRef, newScanObj);
        setCurrentScanId(docRef.id);
        setScanHistory(prev => prev.map(item => item.id === tempId ? { ...item, id: docRef.id } : item));
      } catch (err) { console.error(err); }
    }
  };

  const analyzeImage = async (base64Img) => {
    setView('analyzing');
    try {
      const b64Data = base64Img.split(',')[1];
      
      // 1. Identification rapide
      const firstCall = await callGemini(
        "Identifie le vin sur cette photo. Si ce n'est pas une bouteille de vin ou une étiquette lisible, réponds {\"nom\": \"INCONNU\"}. Sinon réponds {\"nom\": \"NOM_DU_VIN\"}", 
        b64Data
      );
      
      // On extrait et on parse proprement la réponse de l'IA
      const firstText = firstCall.candidates?.[0]?.content?.parts?.[0]?.text;
      const identified = extractJSON(firstText);
      
      // Sécurité Anti-Gaspillage corrigée
      if (!identified || !identified.nom || identified.nom === 'INCONNU') {
        setErrorMsg("Le sommelier n'a pas reconnu de bouteille. Assurez-vous que l'étiquette est bien visible.");
        setView('error');
        return; 
      }
      
      let finalDataText = "";
      let finalDataObj = await checkGlobalCache(identified.nom);
      
      if (!finalDataObj) {
        // Si pas en cache, analyse complète
        const secondCall = await callGemini(SYSTEM_PROMPT, b64Data);
        finalDataText = secondCall.candidates?.[0]?.content?.parts?.[0]?.text;
        finalDataObj = extractJSON(finalDataText);
        await saveToGlobalCache(finalDataObj.nom, finalDataObj);
      } else {
        // Si en cache, on le re-transforme en texte pour processAIResult
        finalDataText = JSON.stringify(finalDataObj);
      }
      
      await processAIResult(finalDataText, base64Img);
    } catch (err) {
      console.error(err);
      setErrorMsg(`Erreur technique : ${err.message}`); // 👈 On affiche le vrai message !
      setView('error');
    }
  };

  const analyzeMenu = async (base64Img) => {
    setView('analyzing');
    setPreviousView('menuConfig');
    try {
      const b64Data = base64Img.split(',')[1];
      const prompt = `Trouve les 3 meilleurs vins sur cette carte. Budget: ${menuPrefs.food}. 
      Réponds en JSON avec une propriété "vins" (tableau). 
      Structure par vin : ${SYSTEM_PROMPT}`; // Changement ici

      const result = await callGemini(prompt, b64Data);
      let parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      let vins = parsed.vins || (Array.isArray(parsed) ? parsed : []);
      
      const normalizedVins = vins.map(v => normalizeData(v));
      setRecommendationList(normalizedVins);
      setView('recommendationList');
    } catch (err) {
      setErrorMsg(err.message);
      setView('error');
    }
  };

  const searchWineText = async (textQuery) => {
    if (!textQuery || textQuery.length < 3) return;
    
    setView('analyzing');
    setPreviousView('home');
    try {
      let finalDataText = "";
      let finalDataObj = await checkGlobalCache(textQuery);
      
      if (!finalDataObj) {
        const prompt = `Recherche le vin : "${textQuery}". Si ce vin n'existe pas ou est absurde, réponds {"nom": "INCONNU"}. Sinon utilise ce format : \n${SYSTEM_PROMPT}`;
        const result = await callGemini(prompt);
        
        // On extrait proprement
        finalDataText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        finalDataObj = extractJSON(finalDataText);
        
        // Sécurité corrigée
        if (!finalDataObj || finalDataObj.nom === 'INCONNU') {
          setErrorMsg("Nous n'avons trouvé aucun vin correspondant à votre recherche. Vérifiez l'orthographe !");
          setView('error');
          return;
        }
        
        await saveToGlobalCache(finalDataObj.nom, finalDataObj);
      } else {
        finalDataText = JSON.stringify(finalDataObj);
      }
      
      await processAIResult(finalDataText, null);
    } catch (err) {
      console.error(err);
      setErrorMsg(`Erreur technique : ${err.message}`);
      setView('error');
    }
  };

  const fetchAIRecommendation = async (type, apogee, food, price) => {
    setView('analyzing');
    setPreviousView('recommendation');
    try {
      const prompt = `Sommelier: trouve 3 vins. Type: ${type}, Repas: ${food}, Budget: ${price}.
      JSON avec propriété "vins". Structure par vin : ${SYSTEM_PROMPT}`; // Changement ici

      const result = await callGemini(prompt);
      let parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      let vins = parsed.vins || (Array.isArray(parsed) ? parsed : []);
      
      const normalizedVins = vins.map(v => normalizeData(v));
      setRecommendationList(normalizedVins);
      setView('recommendationList');
    } catch (err) {
      setErrorMsg(err.message);
      setView('error');
    }
  };

  const processRecommendationSelection = async (wineData) => {
    await processAIResult(JSON.stringify(wineData), null, getGenericImageForType(wineData.type_simplifie), true); 
  };

  const genericUpdate = async (id, fields) => {
    setScanHistory(prev => prev.map(item => item.id === id ? { ...item, ...fields } : item));
    if (auth.currentUser && !id.startsWith('temp_')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans', id);
        await updateDoc(docRef, fields);
      } catch(e) {}
    }
  };

  const updateDataField = async (id, fieldName, value) => {
    const currentItem = scanHistory.find(item => item.id === id);
    if (!currentItem) return;
    const newData = { ...currentItem.data, [fieldName]: value };

    setScanHistory(prev => prev.map(item => item.id === id ? { ...item, data: newData } : item));

    if (auth.currentUser && !id.startsWith('temp_')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans', id);
        await updateDoc(docRef, { [`data.${fieldName}`]: value });
      } catch(e) { }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleShare = async (wine) => {
    const shareText = `Découverte sur VinoScan 🍷\n${wine.data.nom} (${wine.data.annee})\nEstimation: ${wine.data.prix_unitaire_nombre}€\nIdéal avec : ${wine.data.accord_parfait} !`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Mon vin VinoScan', text: shareText }); } catch(e) {}
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); showToast("Copié dans le presse-papier !"); } catch(e) {}
      document.body.removeChild(textArea);
    }
  };

  const executeAction = async () => {
    if (!scanAction) return;
    const { id, type } = scanAction;
    const currentScanObj = scanHistory.find(s => s.id === id);
    if (!currentScanObj) { setScanAction(null); return; }

    let newStock = parseInt(currentScanObj.stock) || 0;
    let newInHistory = currentScanObj.in_history !== false;

    if (type === 'history') newInHistory = false;
    if (type === 'cellar') newStock = 0;

    if (newStock === 0 && !newInHistory && !currentScanObj.wishlist) {
      setScanHistory(prev => prev.filter(item => item.id !== id));
      setView(previousView === 'cellar' ? 'cellar' : 'history');
    } else {
      setScanHistory(prev => prev.map(item => item.id === id ? { ...item, stock: newStock, in_history: newInHistory } : item));
      if (type === 'history' && previousView === 'history') setView('history'); 
    }
    setScanAction(null);

    if (auth.currentUser && !id.startsWith('temp_')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans', id);
        if (newStock === 0 && !newInHistory && !currentScanObj.wishlist) await deleteDoc(docRef);
        else await updateDoc(docRef, { stock: newStock, in_history: newInHistory });
      } catch (e) { }
    }
  };

  const updateStock = async (scanId, currentStock, change) => {
    const newStock = Math.max(0, parseInt(currentStock) + change);
    setScanHistory(prev => prev.map(item => item.id === scanId ? { ...item, stock: newStock } : item));

    if (auth.currentUser && !scanId.startsWith('temp_')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans', scanId);
        const currentScanObj = scanHistory.find(s => s.id === scanId);
        const inHistory = currentScanObj ? currentScanObj.in_history !== false : true;
        if (newStock === 0 && !inHistory) {
           await deleteDoc(docRef);
           setScanHistory(prev => prev.filter(item => item.id !== scanId));
        } else {
           await updateDoc(docRef, { stock: newStock });
        }
      } catch (e) { }
    }
  };

  const handleDirectStockChange = async (scanId, val) => {
    let newStock = val === '' ? '' : parseInt(val, 10);
    if (isNaN(newStock) && val !== '') newStock = 0;
    if (newStock < 0) newStock = 0;

    setScanHistory(prev => prev.map(item => item.id === scanId ? { ...item, stock: newStock } : item));

    if (val !== '' && auth.currentUser && !scanId.startsWith('temp_')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'scans', scanId);
        const currentScanObj = scanHistory.find(s => s.id === scanId);
        const inHistory = currentScanObj ? currentScanObj.in_history !== false : true;
        if (newStock === 0 && !inHistory && !currentScanObj.wishlist) {
           await deleteDoc(docRef);
           setScanHistory(prev => prev.filter(item => item.id !== scanId));
        } else {
           await updateDoc(docRef, { stock: newStock });
        }
      } catch (e) { }
    }
  };

  const goBack = () => {
    setImageSrc(null);
    setAnalysisResult(null);
    setCurrentScanId(null);
    setErrorMsg('');
    setView(previousView);
  };

  const openExistingWine = (item, originView) => {
    setImageSrc(item.image);
    setAnalysisResult(item.data);
    setCurrentScanId(item.id);
    setPreviousView(originView);
    setView('results');
  };

  const ctx = {
    user, view, setView, previousView, setPreviousView,
    imageSrc, setImageSrc, analysisResult, setAnalysisResult,
    errorMsg, setErrorMsg, scanHistory, setScanHistory,
    scanAction, setScanAction, recommendationList, setRecommendationList,
    currentScanId, setCurrentScanId, toastMsg, setToastMsg,
    startCamera, stopCamera, capturePhoto, handleFileUpload,
    analyzeImage, analyzeMenu, searchWineText, fetchAIRecommendation, processRecommendationSelection,
    genericUpdate, updateDataField, handleShare, executeAction, updateStock, handleDirectStockChange, goBack, openExistingWine,
    videoRef, canvasRef, showToast, handleKeyDown,
    cameraMode, setCameraMode, menuPrefs, setMenuPrefs
  };

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-white sm:border-x sm:border-slate-200 overflow-hidden relative shadow-2xl text-slate-900 font-sans">
        {view === 'home' && <HomeView ctx={ctx} />}
        {view === 'manualSearch' && <ManualSearchView ctx={ctx} />}
        {view === 'menuConfig' && <MenuConfigView ctx={ctx} />}
        {view === 'recommendation' && <RecommendationView ctx={ctx} />}
        {view === 'recommendationList' && <RecommendationListView ctx={ctx} />}
        {view === 'cellar' && <CellarView ctx={ctx} />}
        {view === 'history' && <HistoryView ctx={ctx} />}
        {view === 'account' && <AccountView ctx={ctx} />}
        {view === 'camera' && <CameraView ctx={ctx} />}
        {view === 'analyzing' && <AnalyzingView />}
        {view === 'results' && <ResultsView ctx={ctx} />}
        {view === 'error' && <ErrorView ctx={ctx} />}
        {['home', 'cellar', 'history', 'account', 'recommendation', 'recommendationList', 'menuConfig'].includes(view) && <NavigationBar ctx={ctx} />}

        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-red-600" /></div>
              <h3 className="text-2xl font-serif font-bold text-center text-slate-900 mb-2">{scanAction.type === 'history' ? "Retirer de l'historique ?" : "Retirer de la cave ?"}</h3>
              <p className="text-slate-500 font-medium text-center mb-8">{scanAction.type === 'history' ? "Ce vin n'apparaîtra plus dans votre historique de scans." : "Le stock de ce vin passera à 0 et il n'apparaîtra plus dans votre cave."}</p>
              <div className="flex space-x-3">
                <button onClick={() => setScanAction(null)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Annuler</button>
                <button onClick={executeAction} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-md hover:bg-red-700 transition-colors">Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}