// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe, X, Trophy, TrendingUp, BarChart3, Target, Focus, Settings, Trash2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc 
} from 'firebase/firestore';

// =========================================================================
// CONFIGURATION SÉCURISÉE
// =========================================================================
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
    return null;
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
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a]">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Oups, un problème technique</h2>
          <p className="text-sm text-slate-400 mb-6">L'application a rencontré une erreur inattendue.</p>
          <button 
            onClick={() => { this.setState({hasError: false}); this.props.onReset(); }} 
            className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold shadow-md hover:bg-[#AA7C11]"
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
    case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; 
  }
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
// OUTILS D'AFFILIATION (MONÉTISATION)
// =========================================================================

const getAmazonAffiliateLink = (query) => {
  const trackingTag = "vinoscan-21"; 
  const baseUrl = "https://www.amazon.fr/s?k=";
  const searchTerms = encodeURIComponent(query);
  return `${baseUrl}${searchTerms}&tag=${trackingTag}`;
};

const getRecommendedAccessory = (type) => {
  switch(type) {
    case 'ROUGE': return { name: "Carafe à décanter en cristal", search: "carafe à decanter vin rouge cristal" };
    case 'BLANC': return { name: "Seau à glace design", search: "seau à glace vin inox" };
    case 'PETILLANT': return { name: "Coffret de flûtes à Champagne", search: "verres flûtes champagne cristal" };
    default: return { name: "Tire-bouchon sommelier pro", search: "tire bouchon sommelier professionnel" };
  }
};

// =========================================================================
// VUES DE L'APPLICATION
// =========================================================================

// NAVIGATION 100% NOIR & OR (DESIGN LUXE PRESTIGE)
const NavigationBar = ({ ctx }) => (
  <div className="absolute bottom-0 w-full bg-[#1a1a1a] border-t border-[#333] flex justify-around items-center pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20 h-16">
    <button onClick={() => ctx.setView('home')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['home', 'manualSearch', 'menuConfig'].includes(ctx.view) ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-[#D4AF37]/50'}`}>
      <Home className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Scanner</span>
    </button>
    <button onClick={() => ctx.setView('cellar')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'cellar' ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-[#D4AF37]/50'}`}>
      <Archive className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Cave</span>
    </button>
    <button onClick={() => ctx.setView('recommendation')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['recommendation', 'recommendationList'].includes(ctx.view) ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-[#D4AF37]/50'}`}>
      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Conseil</span>
    </button>
    <button onClick={() => ctx.setView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'history' ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-[#D4AF37]/50'}`}>
      <History className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Histo</span>
    </button>
    <button onClick={() => ctx.setView('account')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view === 'account' ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-[#D4AF37]/50'}`}>
      <User className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Profil</span>
    </button>
  </div>
);

// NOUVEAU COMPOSANT : Le bouton vocal du sommelier
const SommelierButton = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const lireTexte = (e) => {
    e.stopPropagation(); 
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <button 
      onClick={lireTexte} 
      className={`p-2 rounded-full border transition-all shadow-md ${isSpeaking ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-105' : 'bg-[#1A1A1A] border-[#333] text-[#D4AF37] hover:border-[#D4AF37]/50'}`}
    >
      {isSpeaking ? <EyeOff className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
    </button>
  );
};

const HomeView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-[#0a0a0a] overflow-hidden">
    {/* Effets de lumière dorée en arrière-plan */}
    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#D4AF37]/10 to-transparent pointer-events-none"></div>
    <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
    
    {/* Titre Serif Élégant (Prestige) */}
    <div className="text-center space-y-4 relative z-10 mt-10">
      <div className="mx-auto w-32 h-32 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-[#D4AF37]/30 relative">
        <div className="absolute inset-0 rounded-full border border-[#D4AF37]/10 animate-[spin_4s_linear_infinite]"></div>
        <Wine className="w-14 h-14 text-[#D4AF37]" />
      </div>
      <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] drop-shadow-sm">VinoScan</h1>
      <p className="text-[#D4AF37]/60 max-w-sm mx-auto text-sm font-medium uppercase tracking-widest">Le Sommelier dans votre poche</p>
    </div>

    {/* BOUTONS D'ACTION NOIR & OR (DESIGN LUXE PRESTIGE) */}
    <div className="w-full max-w-sm space-y-4 pt-8 relative z-10">
      
      {/* Bouton Principal - Pilule dorée */}
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black p-5 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all hover:bg-[#AA7C11]">
        <Camera className="w-6 h-6" /><span className="font-black text-xl">Scanner une bouteille</span>
      </button>

      {/* Bouton Secondaire - Pilule sombre */}
      <button onClick={() => ctx.startCamera('receipt')} className="w-full flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#F5F5F5] p-5 rounded-full shadow-md active:scale-95 transition-all hover:border-[#D4AF37]/50">
        <Receipt className="w-6 h-6 text-slate-400" /><span className="font-bold text-lg">Scanner une facture</span>
      </button>
      
      {/* Ligne de boutons 50/50 */}
      <div className="flex space-x-4 pt-2">
        <button onClick={() => ctx.setView('menuConfig')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-5 rounded-full shadow-sm active:scale-95 hover:border-[#D4AF37]/50 transition-colors">
          <BookOpen className="w-5 h-5" /><span className="font-bold text-xs uppercase">Carte Vins</span>
        </button>
        <button onClick={() => ctx.setView('quiz')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-5 rounded-full shadow-sm active:scale-95 hover:border-[#D4AF37]/50 transition-colors">
          <Gamepad2 className="w-5 h-5" /><span className="font-bold text-xs uppercase">Mini-Jeu</span>
        </button>
      </div>

      {/* Galerie et Recherche (Boutons carrés arrondis) */}
      <div className="flex space-x-4">
        <label className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl cursor-pointer shadow-sm active:scale-95 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-colors">
          <ImageIcon className="w-6 h-6 mb-1" /><span className="font-bold text-[10px] uppercase">Galerie</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'bottle')} />
        </label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl shadow-sm active:scale-95 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-colors">
          <Search className="w-6 h-6 mb-1" /><span className="font-bold text-[10px] uppercase">Recherche</span>
        </button>
      </div>
    </div>
  </div>
);

// 1. RECHERCHE MANUELLE
const ManualSearchView = ({ ctx }) => {
  const [query, setQuery] = useState('');
  const handleSearch = (e) => { e.preventDefault(); if(query.trim()) ctx.searchWineText(query); };
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Recherche Manuelle</h1><p className="text-slate-500 text-xs mt-1">Recherche mondiale de vins</p></div>
      </div>
      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex: Château Margaux 2015" className="w-full pl-12 pr-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-2xl outline-none focus:border-[#D4AF37] shadow-sm text-lg"/>
          </div>
          <button type="submit" disabled={!query.trim()} className="w-full py-4 bg-[#D4AF37] text-black rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-[#AA7C11]">
            Rechercher dans la base
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. LE JEU DU SOMMELIER
const allQuestions = [
  { q: "Quel cépage donne souvent des arômes de litchi et de rose ?", options: ["Chardonnay", "Gewürztraminer", "Sauvignon Blanc"], ans: "Gewürztraminer" },
  { q: "Quelle région est célèbre pour son 'Vin Jaune' ?", options: ["Bourgogne", "Alsace", "Jura"], ans: "Jura" },
  { q: "Qu'appelle-t-on la 'Part des Anges' ?", options: ["Le vin évaporé en fût", "Le vin offert au clergé", "Le fond de la bouteille"], ans: "Le vin évaporé en fût" },
  { q: "Quel est le cépage rouge emblématique de la Bourgogne ?", options: ["Merlot", "Pinot Noir", "Syrah"], ans: "Pinot Noir" },
  { q: "Comment s'appelle l'art d'assembler différents vins ?", options: ["Le soutirage", "Le coupage", "L'assemblage"], ans: "L'assemblage" },
  { q: "Lequel de ces cépages est blanc ?", options: ["Cabernet Franc", "Viognier", "Gamay"], ans: "Viognier" },
  { q: "Quel vin est traditionnellement muté à l'alcool ?", options: ["Le Porto", "Le Champagne", "Le Beaujolais"], ans: "Le Porto" },
  { q: "Que signifie 'Blanc de Blancs' pour un Champagne ?", options: ["Fait avec du raisin blanc", "Sans ajout de sucre", "Vieilli en cuve inox"], ans: "Fait avec du raisin blanc" },
  { q: "Quel est le grand cépage rouge de la rive droite à Bordeaux ?", options: ["Cabernet Sauvignon", "Merlot", "Malbec"], ans: "Merlot" },
  { q: "Laquelle de ces maladies attaque la vigne ?", options: ["Le Phylloxéra", "La Rouille", "Le Mildiou Noir"], ans: "Le Phylloxéra" }
];

const QuizView = ({ ctx }) => {
  const [gameState, setGameState] = useState('idle'); 
  const [currentQuiz, setCurrentQuiz] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); 

  const startGame = () => { 
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    setCurrentQuiz(shuffled.slice(0, 4));
    setScore(0); 
    setQIndex(0); 
    setFeedback(null); 
    setGameState('playing'); 
  };

  const handleAnswer = (option) => {
    if (feedback) return;
    const correct = option === currentQuiz[qIndex].ans;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      if (qIndex + 1 < currentQuiz.length) setQIndex(i => i + 1);
      else setGameState('end');
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le Nez du Sommelier</h1><p className="text-slate-500 text-xs mt-1">Défiez vos connaissances</p></div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-[#1a1a1a] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          
          {gameState === 'idle' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center mx-auto"><Gamepad2 className="w-10 h-10 text-[#D4AF37]"/></div>
              <h3 className="font-serif text-2xl font-bold text-[#F5F5F5]">Prêt à jouer ?</h3>
              <p className="text-slate-400 font-medium">4 questions aléatoires pour tester votre palais.</p>
              <button onClick={startGame} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl shadow-lg active:scale-95 transition-transform text-lg hover:bg-[#AA7C11]">Démarrer le Quiz</button>
            </div>
          )}

          {gameState === 'playing' && currentQuiz.length > 0 && currentQuiz[qIndex] && (
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-xl border border-[#333]">
                <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Question {qIndex + 1}/{currentQuiz.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score : {score}</span>
              </div>
              <p className="font-serif text-xl font-bold text-[#F5F5F5] min-h-[80px] leading-snug">{currentQuiz[qIndex].q}</p>
              <div className="space-y-3">
                {currentQuiz[qIndex].options.map(opt => {
                  let btnClass = "bg-[#0a0a0a] border-[#333] text-slate-300 hover:border-[#D4AF37]/50";
                  if (feedback && opt === currentQuiz[qIndex].ans) btnClass = "bg-emerald-900 border-emerald-500 text-white";
                  else if (feedback === 'wrong' && opt !== currentQuiz[qIndex].ans) btnClass = "bg-[#0a0a0a] border-[#333] text-slate-600 opacity-50";
                  return (
                    <button key={opt} onClick={() => handleAnswer(opt)} className={`w-full p-5 rounded-2xl border flex items-center font-bold text-left transition-all ${btnClass}`}>{opt}</button>
                  );
                })}
              </div>
            </div>
          )}

          {gameState === 'end' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-emerald-900/30 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-10 h-10 text-emerald-400"/></div>
              <h3 className="font-serif text-3xl font-bold text-[#F5F5F5]">Terminé !</h3>
              <p className="text-2xl font-black text-emerald-400">{score} / {currentQuiz.length}</p>
              <div className="flex space-x-3">
                <button onClick={startGame} className="flex-1 py-4 bg-[#D4AF37] text-black font-bold rounded-2xl hover:bg-[#AA7C11]">Rejouer</button>
                <button onClick={() => ctx.setView('home')} className="flex-1 py-4 bg-[#0a0a0a] border border-[#333] text-slate-300 font-bold rounded-2xl hover:bg-[#1a1a1a]">Quitter</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. SCANNER DE CARTE DE RESTAURANT
const MenuConfigView = ({ ctx }) => {
  const getFoodLabel = (f) => {
    const labels = {
      'ALL': 'Peu importe', 'APERITIF': 'Apéritif & Tapas',
      'VIANDE_ROUGE': 'Viande Rouge', 'VIANDE_BLANCHE': 'Volaille & Porc',
      'POISSON': 'Poisson & Mer', 'FROMAGE': 'Fromage'
    };
    return labels[f] || f;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le bon choix</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">Scanner un menu de restaurant</p>
        </div>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Que mangez-vous ?</span></h3>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(f => (
              <button 
                key={f} 
                onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: f})} 
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${ctx.menuPrefs.food === f ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md' : 'bg-[#1a1a1a] text-slate-400 border-[#333] hover:text-white'}`}
              >
                {getFoodLabel(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-6 space-y-3">
          <button onClick={() => ctx.startCamera('menu')} className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-bold active:scale-95 transition-transform hover:bg-[#AA7C11]"><Camera className="inline w-5 h-5 mr-2" />Scanner la carte</button>
        </div>
      </div>
    </div>
  );
};

// CAVE MODERNE ET ÉLÉGANTE (100% NIGHT & GOLD)
const CellarView = ({ ctx }) => {
  const [cellarTab, setCellarTab] = useState('STOCK');
  const [filterType, setFilterType] = useState('ALL');
  const [filterApogee, setFilterApogee] = useState('ALL');
  const [filterFood, setFilterFood] = useState('ALL');
  const [viewMode, setViewMode] = useState('shelves'); 
  
  const [reorgMode, setReorgMode] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');
  
  const [draggedBottle, setDraggedBottle] = useState(null);

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingDish, setPairingDish] = useState('');
  const [pairingResult, setPairingResult] = useState(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const cellarItems = ctx.scanHistory.filter(item => cellarTab === 'STOCK' ? item.stock > 0 : item.wishlist === true);
  
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
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (b.customOrder || b.timestamp) - (a.customOrder || a.timestamp));
    });
    return groups;
  }, [filteredItems]);

  const totalBottles = cellarTab === 'STOCK' ? filteredItems.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0) : filteredItems.length;
  const totalValue = filteredItems.reduce((acc, curr) => acc + ((curr.data.prix_unitaire_nombre || 0) * (cellarTab === 'STOCK' ? (parseInt(curr.stock) || 0) : 1)), 0);

  const handleDragStart = (e, bottle) => { e.dataTransfer.setData('text/plain', bottle.id); setDraggedBottle(bottle.id); };
  const handleDrop = (e, targetShelf, targetBottleId = null) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    setDraggedBottle(null);
    if (!draggedId || draggedId === targetBottleId) return;
    const draggedItem = ctx.scanHistory.find(b => b.id === draggedId);
    if (!draggedItem) return;
    if (targetBottleId) {
      const targetItem = ctx.scanHistory.find(b => b.id === targetBottleId);
      if (targetItem) {
        const targetOrder = targetItem.customOrder || targetItem.timestamp || Date.now();
        const draggedOrder = draggedItem.customOrder || draggedItem.timestamp || Date.now();
        ctx.genericUpdate(draggedId, { location: targetShelf, customOrder: targetOrder + 1 });
        ctx.genericUpdate(targetBottleId, { customOrder: draggedOrder - 1 });
      }
    } else {
      ctx.genericUpdate(draggedId, { location: targetShelf });
    }
  };
  const handleDragOver = (e) => { e.preventDefault(); };

  const handleMoveBottleClick = (locName) => {
    if (selectedBottle) {
      ctx.genericUpdate(selectedBottle.id, { location: locName });
      setSelectedBottle(null);
      setNewShelfName('');
      ctx.showToast("Bouteille déplacée !");
    }
  };

  const handleAskCellarSommelier = async () => {
    if (!pairingDish.trim()) return;
    setIsPairingLoading(true);
    try {
      const inStockWines = ctx.scanHistory.filter(w => w.stock > 0);
      if (inStockWines.length === 0) throw new Error("Cave vide");
      
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} ${w.data.annee} (${w.data.type_simplifie})`).join('\n');
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}".
      Voici les vins EXACTS dans sa cave :
      ${inventoryString}
      Choisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat.
      Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;

      const result = await callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur IA");

      setPairingResult({ wine: chosenWine, explication: parsed.explication });
    } catch (e) {
      ctx.setErrorMsg("Impossible de trouver un accord dans votre cave."); 
      ctx.setView('error');
    } finally { setIsPairingLoading(false); }
  };

  const getApogeeBadge = (statut) => {
    switch(statut) {
      case 'A_GARDER': return <div className="flex items-center space-x-1 text-xs text-indigo-400 bg-indigo-900/30 border border-indigo-800/50 px-2 py-1 rounded font-medium"><Clock className="w-3 h-3" /><span>À garder</span></div>;
      case 'DECLIN': return <div className="flex items-center space-x-1 text-xs text-red-400 bg-red-900/30 border border-red-800/50 px-2 py-1 rounded font-medium"><TrendingDown className="w-3 h-3" /><span>Déclin</span></div>;
      default: return <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-1 rounded font-medium"><CheckCircle className="w-3 h-3" /><span>Apogée</span></div>;
    }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 relative">
      <div className="bg-[#1A1A1A] pt-12 pb-4 px-4 shadow-xl border-b border-[#333] z-10 sticky top-0">
        <div className="flex justify-between items-end mb-4">
          <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Mes Vins</h1><p className="text-slate-400 text-sm mt-1">{totalBottles} bouteilles</p></div>
          <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valeur Estimée</p><div className="text-emerald-500"><span className="text-2xl font-bold">{totalValue.toFixed(0)}</span>€</div></div>
        </div>

        <div className="flex bg-[#0a0a0a] p-1 rounded-xl mb-4 border border-[#333]">
          <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'STOCK' ? 'bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>En Cave</button>
          <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'WISHLIST' ? 'bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Liste d'Achats</button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-[#333] pb-2 mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trier & Filtrer</span>
            <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-[#333]">
               <button onClick={() => { setViewMode('list'); setReorgMode(false); }} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#1A1A1A] text-[#F5F5F5]' : 'text-slate-600'}`}><List className="w-4 h-4" /></button>
               <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'shelves' ? 'bg-[#1A1A1A] text-[#F5F5F5]' : 'text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-full text-xs font-medium border ${filterType === t ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t === 'ALL' ? 'Tous' : t}</button>
            ))}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide mt-2">
            <Utensils className="w-4 h-4 text-slate-500 shrink-0 mr-1" />
            {['ALL', 'VIANDE', 'POISSON', 'FROMAGE', 'APERITIF'].map(f => (
              <button key={f} onClick={() => setFilterFood(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${filterFood === f ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>
                {f === 'ALL' ? 'Tous plats' : f}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {cellarTab === 'STOCK' && totalBottles > 0 && (
          <button onClick={() => {setShowPairingModal(true); setPairingResult(null); setPairingDish('');}} className="w-full bg-[#1A1A1A] border border-[#D4AF37]/30 text-white rounded-3xl p-6 shadow-lg flex items-center justify-between active:scale-95 transition-transform mb-4">
            <div className="text-left flex-1 pr-4">
              <h3 className="font-serif text-xl font-bold flex items-center mb-1"><Sparkles className="w-5 h-5 mr-2 text-[#D4AF37]"/> Que boire ce soir ?</h3>
              <p className="text-xs text-slate-400">Demandez au sommelier d'explorer votre cave.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-[#333] flex items-center justify-center shrink-0">
              <ChevronRight className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </button>
        )}

        {/* NOUVELLE CARTE D'APERÇU DES VINS (DESIGN "DISCOVERY" INVERSÉ - PRESTIGE NOIR & OR) */}
        <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden hover:border-[#D4AF37]/50 transition-colors group">
                <div onClick={() => ctx.openExistingWine(item, 'cellar')} className="flex items-stretch cursor-pointer">
                  
                  {/* TEXTE À GAUCHE */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-2 py-1 rounded">{item.data.type_simplifie === 'PETILLANT' ? 'Pétillant' : (item.data.type_simplifie || 'VIN')}</span>
                        <span className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-1 rounded-md border border-[#333]">{item.data.annee}</span>
                      </div>
                      
                      {/* Titre Serif Élégant */}
                      <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-2 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#AA7C11] transition-all duration-300 font-bold">{item.data.nom}</h3>
                      {item.location && <p className="text-xs text-slate-500 font-medium flex items-center mt-2"><MapPin className="w-3 h-3 mr-1 text-slate-600"/> {item.location}</p>}
                    </div>
                    
                    {/* Apogée et Prix */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#333]">
                      <span className={`flex items-center space-x-1 text-xs font-medium text-[#D4AF37]`}><Star className="w-3 h-3 text-[#D4AF37]" /><span>{item.data.apogee}</span></span>
                      <span className="text-sm font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-1 rounded">{item.data.prix_unitaire_nombre}€</span>
                    </div>
                  </div>
                  
                  {/* IMAGE DE LA BOUTEILLE À DROITE */}
                  <div className="w-24 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-2.5">
                    <img src={item.image || fallbackImg} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt={item.data.nom} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    {item.stock > 1 && <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md z-10 border border-black">x{item.stock}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

        {filteredItems.length === 0 ? (
          <div className="text-center p-6 opacity-50 mt-10"><Archive className="w-16 h-16 mx-auto mb-4 text-slate-600" /><p className="font-medium text-slate-400">Aucun vin ne correspond.</p></div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-[#1A1A1A] rounded-2xl shadow-md border border-[#333] overflow-hidden hover:border-[#D4AF37]/50 transition-colors">
                <div onClick={() => ctx.openExistingWine(item, 'cellar')} className="p-4 flex items-start space-x-4 cursor-pointer">
                  <div className="w-16 h-24 bg-[#0a0a0a] rounded-lg overflow-hidden shrink-0 shadow-inner flex items-center justify-center border border-[#333]">
                    <img src={item.image} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt="Miniature" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0a0a0a] border border-[#333] px-2 py-0.5 rounded">{item.data.type_simplifie}</span>
                      <span className="text-xs font-bold text-rose-400 bg-rose-950/30 border border-rose-900/50 px-2 py-0.5 rounded">{item.data.annee}</span>
                    </div>
                    <h3 className="font-serif text-[#F5F5F5] truncate font-bold leading-tight mb-1">{item.data.nom}</h3>
                    {item.location && <p className="text-xs text-slate-500 font-medium flex items-center mt-1"><MapPin className="w-3 h-3 mr-1 text-slate-600"/> {item.location}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      {getApogeeBadge(item.data.statut_apogee)}
                      <span className="text-sm font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-0.5 rounded">{item.data.prix_unitaire_nombre}€</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10 mt-6">
             {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                <div key={shelfName} className="mb-8">
                   <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-[#D4AF37]" /> {shelfName}
                      </h3>
                      <span className="bg-[#1A1A1A] border border-[#333] text-slate-400 text-xs font-bold px-3 py-1 rounded-full">
                        {bottles.length} bouteilles
                      </span>
                   </div>
                   <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)} className="grid grid-cols-3 gap-4 bg-[#1A1A1A]/50 p-4 rounded-3xl border border-[#333] shadow-inner min-h-[200px]">
                      {bottles.map(bottle => (
                         <div key={bottle.id} draggable={!reorgMode} onDragStart={(e) => handleDragStart(e, bottle)} onDragEnd={() => setDraggedBottle(null)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName, bottle.id)} onClick={() => { if (reorgMode) setSelectedBottle(bottle); else ctx.openExistingWine(bottle, 'cellar'); }} className={`relative flex flex-col bg-[#1A1A1A] rounded-2xl p-3 shadow-md border border-[#333] cursor-pointer transition-all duration-300 group ${draggedBottle === bottle.id ? 'opacity-40 scale-95' : 'hover:-translate-y-1 hover:border-[#D4AF37]/50'} ${reorgMode ? 'ring-2 ring-[#D4AF37] animate-pulse' : ''}`}>
                            <div className="relative h-28 w-full mb-3 flex items-center justify-center bg-[#0a0a0a] rounded-xl border border-[#222]">
                               <img src={bottle.image} onError={(e) => { e.target.onerror = null; e.target.src = fallbackImg; }} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" alt={bottle.data.nom} />
                               {cellarTab === 'STOCK' && bottle.stock > 1 && <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-md z-10 border border-black">x{bottle.stock}</span>}
                            </div>
                            <div className="flex flex-col items-center text-center">
                               <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${bottle.data.type_simplifie === 'ROUGE' ? 'text-rose-400' : bottle.data.type_simplifie === 'BLANC' ? 'text-amber-200' : bottle.data.type_simplifie === 'PETILLANT' ? 'text-yellow-400' : 'text-pink-400'}`}>{bottle.data.type_simplifie}</span>
                               <h4 className="text-xs font-bold text-[#F5F5F5] leading-tight line-clamp-2 mb-1">{bottle.data.nom}</h4>
                               <span className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-0.5 rounded-md border border-[#333] mt-1">{bottle.data.annee}</span>
                            </div>
                         </div>
                      ))}
                      {Array.from({length: Math.max(0, 3 - (bottles.length % 3 === 0 && bottles.length > 0 ? 3 : bottles.length % 3))}).map((_, i) => (
                        <div key={`empty-${i}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)} className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] rounded-2xl bg-[#0a0a0a]/50 min-h-[160px]">
                           <div className="w-8 h-8 rounded-full border-2 border-[#333]"></div>
                        </div>
                      ))}
                   </div>
                </div>
             ))}

             <div onDragOver={handleDragOver} onDrop={(e) => { e.preventDefault(); setDraggedBottle(null); const newName = window.prompt("Nom de la nouvelle étagère ?"); if (newName && newName.trim() !== '') handleDrop(e, newName); }} className="mt-8 border-2 border-dashed border-[#333] rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:border-[#D4AF37] hover:bg-[#1A1A1A] hover:text-[#D4AF37] transition-all cursor-pointer shadow-sm">
               <Plus className="w-8 h-8 mb-2" />
               <p className="font-bold text-xs uppercase tracking-wider text-center">Glissez un vin ici pour<br/>créer une étagère</p>
             </div>
          </div>
        )}
      </div>

      {/* MODAL SMARTPHONE REORGANISATION */}
      {selectedBottle && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] w-full max-w-sm rounded-3xl p-6 shadow-2xl mb-safe border border-[#333]">
             <h3 className="font-serif text-2xl font-bold text-white mb-1">Ranger la bouteille</h3>
             <p className="text-slate-400 text-sm mb-6">Où déplacer <b>{selectedBottle.data.nom}</b> ?</p>
             <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-2">
               {existingLocations.length > 0 ? existingLocations.map(loc => (
                 <button key={loc} onClick={() => handleMoveBottleClick(loc)} className="w-full text-left p-4 rounded-2xl bg-[#0a0a0a] border border-[#333] text-[#F5F5F5] font-bold transition-colors">
                   <MapPin className="w-4 h-4 inline mr-3 text-[#D4AF37]" /> {loc}
                 </button>
               )) : <p className="text-slate-500 text-sm italic text-center py-4 bg-[#0a0a0a] rounded-xl border border-[#333]">Aucune étagère.</p>}
               <button onClick={() => handleMoveBottleClick('')} className="w-full text-left p-4 rounded-2xl bg-[#0a0a0a] border border-[#333] text-slate-500 italic">Retirer de l'étagère</button>
             </div>
             <div className="flex space-x-2 border-t border-[#333] pt-6">
               <input type="text" placeholder="Nouvelle étagère..." value={newShelfName} onChange={(e) => setNewShelfName(e.target.value)} className="flex-1 bg-[#0a0a0a] border border-[#333] text-white rounded-2xl px-4 py-4 outline-none focus:border-[#D4AF37] font-medium" />
               <button onClick={() => handleMoveBottleClick(newShelfName)} disabled={!newShelfName.trim()} className="px-6 py-4 bg-[#D4AF37] text-black rounded-2xl font-bold disabled:opacity-50">Créer</button>
             </div>
             <button onClick={() => { setSelectedBottle(null); setNewShelfName(''); }} className="mt-4 w-full py-4 text-slate-400 font-bold hover:bg-[#222] rounded-2xl transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL DU SOMMELIER DE CAVE */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 w-full max-w-sm relative shadow-2xl text-white">
            <button onClick={() => setShowPairingModal(false)} className="absolute top-4 right-4 p-2 bg-[#0a0a0a] border border-[#333] rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            
            {!pairingResult ? (
              <div className="space-y-4 mt-4">
                <div className="w-16 h-16 bg-[#0a0a0a] border border-[#D4AF37]/40 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg"><Utensils className="w-8 h-8 text-[#D4AF37]"/></div>
                <h3 className="font-serif text-2xl font-bold text-center text-[#F5F5F5]">Que mangez-vous ?</h3>
                <p className="text-sm text-center text-slate-400">Le sommelier va fouiller votre stock pour dégoter la bouteille idéale.</p>
                <input autoFocus type="text" placeholder="Ex: Côte de bœuf, Risotto..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-4 bg-[#0a0a0a] border border-[#333] text-white rounded-xl focus:border-[#D4AF37] outline-none shadow-inner" />
                <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50 hover:bg-[#AA7C11] transition-colors">
                  {isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Fouiller ma cave"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 mt-4 animate-in slide-in-from-bottom-4">
                <h3 className="font-serif text-xl font-bold text-center text-[#D4AF37]">L'accord parfait !</h3>
                <div onClick={() => {setShowPairingModal(false); ctx.openExistingWine(pairingResult.wine, 'cellar');}} className="border border-[#333] bg-[#0a0a0a] rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:border-[#D4AF37]/50 transition-all shadow-xl">
                  <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-[#1A1A1A] border border-[#222]">
                    <img src={pairingResult.wine.image} onError={(e) => {e.target.onerror=null; e.target.src=fallbackImg;}} className="max-w-full max-h-full object-contain" alt="Selected Wine" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#333]">{pairingResult.wine.data.type_simplifie}</span>
                    <h4 className="font-bold text-white leading-tight mb-2 truncate mt-1">{pairingResult.wine.data.nom}</h4>
                    <p className="text-xs text-slate-400 italic">"{pairingResult.explication}"</p>
                  </div>
                </div>
                {pairingResult.wine.location && <p className="text-xs text-center font-bold text-slate-500 uppercase tracking-wider"><MapPin className="w-3 h-3 inline mr-1 text-[#D4AF37]" />{pairingResult.wine.location}</p>}
                <button onClick={() => setShowPairingModal(false)} className="w-full py-3 bg-[#333] text-white font-bold rounded-xl mt-4 border border-[#444] hover:bg-[#444] transition-colors">Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryView = ({ ctx }) => {
  const historyItems = ctx.scanHistory.filter(item => item.in_history !== false);
  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20">
      
      {/* HEADER */}
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 border-b border-[#333]">
        <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Historique</h1>
        <p className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">{historyItems.length} bouteilles analysées</p>
      </div>
      
      {/* LISTE DES CARTES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
            <History className="w-16 h-16 mb-4 text-slate-500" />
            <p className="text-slate-400 font-medium">Aucun historique.</p>
          </div>
        ) : (
          historyItems.map((item) => (
            
            /* NOUVELLE CARTE D'APERÇU DES VINS (DESIGN "DISCOVERY" INVERSÉ - PRESTIGE NOIR & OR) */
            <div key={item.id} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden hover:border-[#D4AF37]/50 transition-colors group">
              <div onClick={() => ctx.openExistingWine(item, 'history')} className="flex items-stretch cursor-pointer">
                
                {/* TEXTE À GAUCHE */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-2 py-1 rounded">
                        {item.data.type_simplifie === 'PETILLANT' ? 'PÉTILLANT' : (item.data.type_simplifie || 'VIN')}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-1 rounded-md border border-[#333]">
                        {item.data.annee}
                      </span>
                    </div>
                    
                    {/* Titre Serif Élégant */}
                    <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-2 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#AA7C11] transition-all duration-300 font-bold">
                      {item.data.nom}
                    </h3>
                    
                    {/* Badge si en cave */}
                    {item.stock > 0 && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-0.5 rounded-full mt-1 inline-block">En cave</span>}
                  </div>
                  
                  {/* Date du scan et Prix */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#333]">
                    <span className="text-xs text-slate-500 font-medium">{String(item.dateStr || '').split(' ')[0]}</span>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-1 rounded">
                      {item.data.prix_unitaire_nombre}€
                    </span>
                  </div>
                </div>
                
                {/* IMAGE DE LA BOUTEILLE À DROITE */}
                <div className="w-28 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-2.5">
                  <img src={item.image || fallbackImg} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt={item.data.nom} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg" />
                </div>
                
              </div>
            </div>

          ))
        )}
      </div>
    </div>
  );
};

const AccountView = ({ ctx }) => {
  const [showBadges, setShowBadges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const historyItems = ctx.scanHistory.filter(i => i.in_history !== false);
  const historyLen = historyItems.length;
  const itemsInStock = ctx.scanHistory.filter(i => i.stock > 0);
  const totalBottles = itemsInStock.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0);
  const totalValue = itemsInStock.reduce((acc, curr) => acc + ((curr.data?.prix_unitaire_nombre || 0) * (parseInt(curr.stock) || 0)), 0);
  
  const countType = (type) => itemsInStock.filter(i => i.data?.type_simplifie === type).reduce((acc, curr) => acc + parseInt(curr.stock || 0), 0);
  const getPct = (val) => totalBottles === 0 ? 0 : Math.round((val / totalBottles) * 100);

  const getPremiumProfile = (len) => {
    if (len >= 50) return { name: "Maître Sommelier", level: 4, color: "#D4AF37", bg: "bg-[#1a1a1a]", bar: "bg-[#D4AF37]", req: 50 };
    if (len >= 20) return { name: "Grand Connaisseur", level: 3, color: "#D4AF37", bg: "bg-[#1a1a1a]", bar: "bg-[#D4AF37]", req: 20 };
    if (len >= 5) return { name: "Amateur Éclairé", level: 2, color: "#D4AF37", bg: "bg-[#1a1a1a]", bar: "bg-[#D4AF37]", req: 5 };
    return { name: "Novice Curieux", level: 1, color: "#F5F5F5", bg: "bg-[#1a1a1a]", bar: "bg-slate-400", req: 0 };
  };

  const premium = getPremiumProfile(historyLen);
  const getCount = (r) => ctx.scanHistory.filter(i => String(i.data?.region || '').toLowerCase().includes(r)).length;
  
  const collectionBadges = [
    { id: 'bx', name: 'Baron de Bordeaux', req: 3, count: getCount('bordeaux'), icon: '🍷' },
    { id: 'bg', name: 'Duc de Bourgogne', req: 3, count: getCount('bourgogne'), icon: '🍇' },
    { id: 'rh', name: 'Prince du Rhône', req: 3, count: getCount('rhone'), icon: '☀️' },
    { id: 'lo', name: 'Seigneur de la Loire', req: 3, count: getCount('loire'), icon: '🏰' },
    { id: 'rg', name: 'Sang de la Vigne', req: 10, count: countType('ROUGE'), icon: '🥩' },
    { id: 'bl', name: "L'Or Blanc", req: 5, count: countType('BLANC'), icon: '🧀' },
    { id: 'bu', name: 'Maître des Bulles', req: 5, count: countType('PETILLANT'), icon: '🥂' },
    { id: 'pr', name: 'Le Grand Cru', req: 3, count: ctx.scanHistory.filter(i => i.data?.prix_unitaire_nombre >= 50).length, icon: '💎' }
  ];

  const handleLogout = async () => {
    await signOut(auth);
    try { await signInAnonymously(auth); } catch (e) {}
    ctx.setView('home');
  };

  const handleClearHistory = () => {
    ctx.scanHistory.forEach(item => {
      ctx.genericUpdate(item.id, { in_history: false }); 
    });
    setShowDeleteConfirm(false);
    if(ctx.showToast) ctx.showToast("Historique nettoyé. Votre cave est intacte.");
  };

  const exportToCSV = () => { if(ctx.showToast) ctx.showToast("Fonction d'export bientôt disponible !"); };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto relative">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 shadow-xl border-b border-[#333] flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Tableau de Bord</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> SAUVEGARDE CLOUD</p>
        </div>
        <div className={`w-14 h-14 rounded-full ${premium.bg} flex items-center justify-center border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]`}>
          <Award className="w-7 h-7" style={{color: premium.color}} />
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div onClick={() => setShowBadges(true)} className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] cursor-pointer hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Votre Profil Œnologique</p>
            <ChevronRight className="w-5 h-5 text-slate-600"/>
          </div>
          <h3 className="font-serif text-3xl font-bold mb-4" style={{color: premium.color}}>{premium.name}</h3>
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-medium text-white">{historyLen} vins découverts</span>
            <span className="text-xs font-bold text-slate-500">Palier : {premium.req === 50 ? 'Max' : premium.req === 0 ? 5 : premium.req === 5 ? 20 : 50}</span>
          </div>
          <div className="h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden border border-[#333]">
              <div className={`h-full ${premium.bar} rounded-full`} style={{width: `${Math.min(100, (historyLen / (premium.req === 50 ? 50 : premium.req === 0 ? 5 : premium.req === 5 ? 20 : 50)) * 100)}%`}}></div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20"><BarChart3 className="w-5 h-5 text-[#D4AF37]"/></div>
            <h3 className="font-serif text-xl font-bold text-[#F5F5F5]">Valeur & Contenu</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#333]">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">En Cave</p>
              <p className="text-4xl font-extrabold text-[#F5F5F5]">{totalBottles}</p>
            </div>
            <div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-900/30">
              <p className="text-[10px] text-emerald-500 uppercase font-bold mb-1">Capital Estimé</p>
              <p className="text-4xl font-extrabold text-emerald-400">{totalValue.toFixed(0)}€</p>
            </div>
          </div>
          <div>
            <div className="h-2 w-full flex rounded-full overflow-hidden mb-4 bg-[#0a0a0a] border border-[#333]">
              {countType('ROUGE') > 0 && <div style={{width: `${getPct(countType('ROUGE'))}%`}} className="bg-rose-600 h-full"></div>}
              {countType('BLANC') > 0 && <div style={{width: `${getPct(countType('BLANC'))}%`}} className="bg-amber-200 h-full"></div>}
              {countType('ROSE') > 0 && <div style={{width: `${getPct(countType('ROSE'))}%`}} className="bg-pink-400 h-full"></div>}
              {countType('PETILLANT') > 0 && <div style={{width: `${getPct(countType('PETILLANT'))}%`}} className="bg-yellow-500 h-full"></div>}
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs font-medium text-slate-400">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-600 mr-2"></div>Rouges ({getPct(countType('ROUGE'))}%)</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-200 mr-2"></div>Blancs ({getPct(countType('BLANC'))}%)</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-pink-400 mr-2"></div>Rosés ({getPct(countType('ROSE'))}%)</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>Bulles ({getPct(countType('PETILLANT'))}%)</div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl border border-[#333] overflow-hidden shadow-lg">
          <div className="p-4 space-y-2">
            <button onClick={exportToCSV} className="w-full flex items-center p-4 hover:bg-[#222] rounded-2xl text-[#F5F5F5] font-bold transition-colors">
              <Download className="w-5 h-5 mr-4 text-[#D4AF37]" /> Exporter ma cave (.csv)
            </button>
            <button onClick={handleLogout} className="w-full flex items-center p-4 hover:bg-[#222] rounded-2xl text-[#F5F5F5] font-bold transition-colors">
              <LogOut className="w-5 h-5 mr-4 text-[#D4AF37]" /> Se déconnecter
            </button>
            <div className="border-t border-[#333] my-2"></div>
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center p-4 text-red-400 hover:bg-red-950/20 rounded-2xl font-bold transition-colors">
              <Trash2 className="w-5 h-5 mr-4" /> Nettoyer l'historique
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nettoyer l'historique ?</h3>
            <p className="text-slate-400 text-sm mb-6">Les vins de votre cave ne seront pas effacés, seul l'onglet Historique sera vidé.</p>
            <div className="space-y-3">
              <button onClick={handleClearHistory} className="w-full py-3 bg-red-600/20 border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white transition-colors font-bold rounded-xl">Oui, nettoyer</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 bg-[#333] text-white font-bold rounded-xl hover:bg-[#444]">Annuler</button>
            </div>
          </div>
        </div>
      )}
      
      {showBadges && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowBadges(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-6 h-6"/></button>
            <h3 className="font-serif text-2xl font-bold mb-6 text-center text-[#D4AF37]">Trophées</h3>
            <div className="space-y-3">
              {collectionBadges.map((badge) => {
                const unlocked = badge.count >= badge.req;
                return (
                  <div key={badge.id} className={`p-4 rounded-xl flex items-center justify-between ${unlocked ? 'bg-[#1A1A1A] border border-[#D4AF37]/30 shadow-md' : 'bg-[#0a0a0a] border border-[#333] opacity-50 grayscale'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <h4 className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-slate-500'}`}>{badge.name}</h4>
                        <p className="text-[10px] text-slate-500">{badge.req} requis</p>
                      </div>
                    </div>
                    {unlocked && <CheckCircle className="w-5 h-5 text-[#D4AF37]" />}
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
  <div className="relative h-full w-full bg-black flex flex-col overflow-hidden">
    <button onClick={() => { ctx.stopCamera(); ctx.setView('home'); }} className="absolute top-12 left-6 z-20 p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors border border-white/10"><ChevronLeft className="w-6 h-6" /></button>
    
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
      <div className="absolute top-24 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
        <span className="text-white text-xs font-bold uppercase tracking-widest opacity-80">Analyse IA Active</span>
      </div>

      <div className="relative w-4/5 h-1/2 mt-10">
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-rose-500 rounded-tl-3xl"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-rose-500 rounded-tr-3xl"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-rose-500 rounded-bl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-rose-500 rounded-br-3xl"></div>
        
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
        <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/20 animate-[spin_4s_linear_infinite]" />
      </div>

      <div className="absolute bottom-40 flex space-x-6 text-white/60 text-[10px] font-mono uppercase tracking-widest">
        <div className="flex flex-col items-center"><ScanLine className="w-4 h-4 mb-1 text-emerald-400"/><span>Forme</span></div>
        <div className="flex flex-col items-center"><Focus className="w-4 h-4 mb-1 text-amber-400 animate-pulse"/><span>Étiquette</span></div>
      </div>
    </div>

    <div className="relative flex-1">
      <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover" />
    </div>
    
    <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex items-center justify-center pb-8">
      <button onClick={ctx.capturePhoto} className="w-20 h-20 bg-[#1a1a1a]/10 backdrop-blur-md rounded-full border-2 border-white/30 flex items-center justify-center active:scale-90 transition-transform hover:bg-[#1a1a1a]/20 group">
        <div className="w-14 h-14 bg-[#1a1a1a] rounded-full group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.5)]"></div>
      </button>
    </div>
    <canvas ref={ctx.canvasRef} className="hidden" />
  </div>
);

const AnalyzingView = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 bg-[#0a0a0a] relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-rose-900/20 to-transparent"></div>
    <div className="relative w-40 h-40 flex items-center justify-center mb-8 z-10">
      <div className="absolute inset-0 border-4 border-rose-900/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
      <div className="absolute inset-2 border-4 border-[#D4AF37]/50 rounded-full border-t-transparent animate-[spin_1.5s_linear_infinite]"></div>
      <Wine className="w-14 h-14 text-[#D4AF37] animate-pulse" />
    </div>
    <h2 className="text-3xl font-serif font-bold text-[#F5F5F5] mb-3 z-10">Analyse en cours</h2>
    <p className="text-slate-400 text-sm mt-2 text-center font-medium z-10">Notre sommelier travaille sur votre demande...</p>
  </div>
);

const ErrorView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a]">
    <div className="w-24 h-24 bg-red-950/30 border border-red-900/50 text-red-500 rounded-full flex items-center justify-center mb-8 shadow-inner"><AlertCircle className="w-12 h-12" /></div>
    <h2 className="text-3xl font-serif font-bold text-[#F5F5F5] mb-4">Erreur</h2>
    <p className="text-slate-400 mb-10 font-medium">{ctx.errorMsg}</p>
    <button onClick={ctx.goBack} className="px-8 py-4 bg-[#D4AF37] text-black rounded-2xl font-bold hover:bg-[#AA7C11] transition-colors shadow-lg">Retourner à l'accueil</button>
  </div>
);

const RecommendationView = ({ ctx }) => {
  const [recMode, setRecMode] = useState('menu'); 
  const [filterType, setFilterType] = useState('ALL');
  const [filterApogee, setFilterApogee] = useState('ALL');
  const [filterFood, setFilterFood] = useState('ALL');
  const [filterPrice, setFilterPrice] = useState('ALL');
  
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

      const result = await callGemini(prompt);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractJSON(text);
      
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur de sélection de l'IA.");

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
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 shadow-xl border-b border-[#333] flex items-center sticky top-0 z-10">
        {recMode !== 'menu' && (
          <button onClick={() => setRecMode('menu')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        )}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#0a0a0a] border border-[#D4AF37]/50 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)] transform -rotate-3"><Sparkles className="w-6 h-6 text-[#D4AF37]" /></div>
          <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Le Sommelier</h1><p className="text-slate-400 text-sm font-medium">Laissez l'IA vous conseiller</p></div>
        </div>
      </div>

      <div className="p-6 space-y-10">
        
        {/* MENU PRINCIPAL */}
        {recMode === 'menu' && (
          <div className="space-y-6 mt-4">
            <button onClick={() => setRecMode('buy')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg hover:border-[#D4AF37]/50 transition-all active:scale-95 text-left flex items-center space-x-5 group">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] group-hover:border-[#D4AF37]/50 rounded-full flex items-center justify-center shrink-0 transition-colors"><ShoppingCart className="w-6 h-6 text-[#D4AF37]" /></div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Acheter un vin</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Le meilleur vin à acheter selon votre repas et votre budget.</p>
              </div>
            </button>

            <button onClick={() => setRecMode('cellar')} className="w-full bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-[0_0_20px_rgba(212,175,55,0.1)] active:scale-95 transition-all text-left flex items-center space-x-5 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl opacity-50"></div>
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center shrink-0 relative z-10"><Archive className="w-6 h-6 text-[#D4AF37]" /></div>
              <div className="relative z-10">
                <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center mb-1">Que boire ce soir ? <Sparkles className="w-4 h-4 ml-2 text-[#D4AF37]"/></h3>
                <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">Trouvez la bouteille parfaite parmi celles déjà dans votre cave.</p>
              </div>
            </button>

            <button onClick={() => setRecMode('boutique')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg hover:border-[#D4AF37]/50 transition-all active:scale-95 text-left flex items-center space-x-5 group">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] group-hover:border-[#D4AF37]/50 rounded-full flex items-center justify-center shrink-0 transition-colors"><Wine className="w-6 h-6 text-[#D4AF37]" /></div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">La Boutique</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Carafes, verres, conservation... Équipez-vous comme un pro.</p>
              </div>
            </button>
          </div>
        )}

        {/* SECTION RECHERCHE CAVE */}
        {recMode === 'cellar' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-8 text-center shadow-lg">
              <div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333]">
                <Utensils className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#F5F5F5] mb-3">Que mangez-vous ?</h3>
              <p className="text-sm text-slate-400 mb-8">Le sommelier va analyser votre cave pour trouver l'accord parfait.</p>
              <input autoFocus type="text" placeholder="Ex: Magret de canard, Lasagnes..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-5 bg-[#0a0a0a] border border-[#333] text-white rounded-xl focus:border-[#D4AF37] outline-none mb-6 shadow-inner transition-colors" />
              <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-5 bg-[#D4AF37] text-black font-bold text-lg rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:bg-[#AA7C11] disabled:opacity-50 flex items-center justify-center transition-colors">
                {isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Explorer ma cave"}
              </button>
            </div>
          </div>
        )}

        {/* SECTION RECOMMANDATION ACHAT */}
        {recMode === 'buy' && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Euro className="w-5 h-5 text-[#D4AF37]" /><span>Budget</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'BUDGET', 'MEDIUM', 'PREMIUM'].map(price => {
                  const labels = { ALL: 'Peu importe', BUDGET: 'Abordable (< 20€)', MEDIUM: 'Plaisir (20-50€)', PREMIUM: 'Exception (> 50€)' };
                  return (
                    <button key={price} onClick={() => setFilterPrice(price)} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterPrice === price ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-[#F5F5F5]'}`}>{labels[price]}</button>
                  )
                })}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Pour quel repas ?</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(food => {
                  const labels = { ALL: '🍽️ Peu importe', APERITIF: '🥂 Apéro', VIANDE_ROUGE: '🥩 Viande rouge', VIANDE_BLANCHE: '🍗 Viande blanche', POISSON: '🐟 Poisson & Mer', FROMAGE: '🧀 Fromage' };
                  return (
                    <button key={food} onClick={() => setFilterFood(food)} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterFood === food ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-[#F5F5F5]'}`}>{labels[food]}</button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Wine className="w-5 h-5 text-[#D4AF37]" /><span>Type de vin</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${filterType === type ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-[#F5F5F5]'}`}>
                    {type === 'ALL' ? 'Surprenez-moi' : type === 'PETILLANT' ? 'Bulles' : type}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleRecommend} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-all active:scale-95 flex justify-center items-center space-x-3 mt-8">
              <Sparkles className="w-6 h-6" /><span>Trouver la perle rare</span>
            </button>
          </div>
        )}

        {/* NOUVELLE BOUTIQUE ACCESSOIRES */}
        {recMode === 'boutique' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 pb-10">
            <div className="text-center mb-8">
              <h3 className="font-serif text-3xl font-bold text-[#F5F5F5] mb-2">L'Atelier</h3>
              <p className="text-sm text-slate-400">4 essentiels approuvés par nos sommeliers.</p>
            </div>

            <div className="space-y-8">
              
              <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1585652874135-c335805e7144?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="Tire-bouchon" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div>
                       <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Ouverture</span>
                       <h5 className="font-serif text-2xl font-bold text-white mt-2">Le Sommelier</h5>
                     </div>
                     <span className="font-bold text-[#D4AF37] text-xl">~25 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Le véritable limonadier professionnel à double levier. Extraction parfaite sans jamais briser le bouchon, même sur les vieux millésimes.</p>
                  <a href={getAmazonAffiliateLink("tire bouchon sommelier professionnel double levier")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1605335555198-d14f4e1f72df?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Carafe" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div>
                       <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Aération</span>
                       <h5 className="font-serif text-2xl font-bold text-white mt-2">Carafe Cristal</h5>
                     </div>
                     <span className="font-bold text-[#D4AF37] text-xl">~45 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Design à base large pour maximiser la surface d'oxygénation. Indispensable pour assouplir les tanins de vos vins jeunes.</p>
                  <a href={getAmazonAffiliateLink("carafe a decanter vin cristal")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1595982845686-2713f01b0b5f?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="Verres" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div>
                       <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Dégustation</span>
                       <h5 className="font-serif text-2xl font-bold text-white mt-2">Verres Universels</h5>
                     </div>
                     <span className="font-bold text-[#D4AF37] text-xl">~35 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Coffret de 6 verres en cristallin. Leur forme "tulipe" refermée concentre les arômes vers le nez, s'adaptant à tous les types de vins.</p>
                  <a href={getAmazonAffiliateLink("verres de degustation vin cristallin")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#1A1A1A] to-[#0a0a0a] rounded-3xl shadow-[0_0_20px_rgba(212,175,55,0.1)] border border-[#D4AF37]/30 overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Coravin" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div>
                       <span className="text-[10px] text-black font-bold uppercase tracking-widest bg-[#D4AF37] px-2 py-1 rounded shadow-md">Choix des Pros</span>
                       <h5 className="font-serif text-2xl font-bold text-white mt-2">Système Coravin</h5>
                     </div>
                     <span className="font-bold text-[#D4AF37] text-xl">~199 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">L'innovation ultime. Servez-vous un verre de vin au mois ou à l'année sans jamais retirer le bouchon, empêchant toute oxydation.</p>
                  <a href={getAmazonAffiliateLink("coravin systeme preservation vin")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold bg-[#D4AF37] text-black py-3 rounded-xl hover:bg-[#AA7C11] transition-colors shadow-lg shadow-[#D4AF37]/20">Voir ce système unique</a>
                </div>
              </div>

            </div>
            
            <p className="text-[9px] text-slate-600 text-center italic mt-8">En tant que partenaire Amazon, VinoScan perçoit une commission sur les achats éligibles.</p>
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
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center">
          <button onClick={() => ctx.setView('recommendation')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-serif font-bold text-[#F5F5F5]">La Sélection</h1><p className="text-slate-500 text-xs mt-1 font-medium">{sortedList.length} vins trouvés</p></div>
        </div>
        <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center space-x-2 bg-[#0a0a0a] border border-[#333] text-slate-400 px-3 py-2 rounded-xl text-xs font-bold hover:text-[#F5F5F5] transition-colors">
          <ArrowDownUp className="w-4 h-4" /><span>{sortOrder === 'asc' ? 'Prix croissant' : 'Prix décroissant'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedList.map((wine, index) => {
           const imgUrl = getGenericImageForType(wine.type_simplifie);
           return (
             <div key={index} className="bg-[#1a1a1a] rounded-3xl p-5 shadow-sm border border-[#333] flex space-x-5 hover:border-[#D4AF37]/50 transition-colors">
               <div className="w-24 h-32 bg-[#0a0a0a] border border-[#333] rounded-2xl overflow-hidden shrink-0 shadow-inner">
                  <img src={imgUrl} alt="Bouteille" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 min-w-0 flex flex-col justify-between">
                 <div>
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0a0a0a] border border-[#333] px-2 py-1 rounded-md">{wine.type_simplifie === 'PETILLANT' ? 'Pétillant' : (wine.type_simplifie || 'VIN')}</span>
                     <div className="flex items-end space-x-1 text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-900/50">
                       <span className="text-lg leading-none">{wine.prix_unitaire_nombre || '?'}</span><span className="text-xs">€</span>
                     </div>
                   </div>
                   <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-1 font-bold line-clamp-2">{wine.nom}</h3>
                   <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2 font-medium">
                     <span className="text-rose-400 font-bold">{wine.annee}</span><span>•</span><span className="truncate">{wine.region}</span>
                   </div>
                   <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{wine.description}</p>
                 </div>
                 <button onClick={() => ctx.processRecommendationSelection(wine)} className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-bold shadow-md hover:bg-[#AA7C11] transition-colors">
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

// === NOUVELLE FICHE RÉSULTATS / DÉCOUVERTE (DESIGN "DISCOVERY" ET NOIR & OR) ===
const ResultsView = ({ ctx }) => {
  let currentScanObj = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  if (!currentScanObj && ctx.analysisResult) {
    currentScanObj = ctx.scanHistory.find(s => s.data?.nom === ctx.analysisResult.nom && s.data?.annee === ctx.analysisResult.annee);
  }
  
  const scanIdToUse = currentScanObj ? currentScanObj.id : ctx.currentScanId;
  const stock = currentScanObj ? currentScanObj.stock : 0;
  const rating = currentScanObj ? currentScanObj.rating : 0;

  const displayData = currentScanObj && currentScanObj.data ? currentScanObj.data : ctx.analysisResult;
  
  const [activeTab, setActiveTab] = useState('discovery');
  
  const [tempAnnee, setTempAnnee] = useState('');
  const [tempType, setTempType] = useState('');
  const [tempPrix, setTempPrix] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    if(!displayData) return;
    setTempType(displayData.type_simplifie || '');
    setTempLocation(currentScanObj?.location || '');
    setTempNotes(currentScanObj?.notes || '');
    setTempAnnee(displayData.annee || '');
    setTempPrix(displayData.prix_unitaire_nombre || '');
  }, [currentScanObj?.id, displayData]);

  if (!displayData) return null;

  const handleYearChange = (newYear) => {
    setTempAnnee(newYear);
    if (!scanIdToUse) return;
    ctx.updateDataField(scanIdToUse, 'annee', newYear);
    const newDates = recalculateDates(newYear, displayData.baseGardeMin || 2, displayData.baseGardeMax || 5);
    ctx.genericUpdate(scanIdToUse, { data: { ...displayData, annee: newYear, ...newDates } });
  };

  const handleTypeChange = (newType) => {
    setTempType(newType);
    let newAccords = [];
    if (newType === 'ROUGE') newAccords = ['Viande rouge', 'Fromages affinés', 'Plats en sauce'];
    else if (newType === 'BLANC') newAccords = ['Poissons', 'Volaille à la crème', 'Fromage de chèvre'];
    else if (newType === 'ROSE') newAccords = ['Apéritif', 'Grillades', 'Salades'];
    else if (newType === 'PETILLANT') newAccords = ['Apéritif', 'Desserts', 'Coquilles Saint-Jacques'];
    else newAccords = ['Plats à partager'];
    
    ctx.setAnalysisResult(prev => prev ? { ...prev, type_simplifie: newType, accords_mets: newAccords, accord_parfait: newAccords[0] } : prev);
    if (scanIdToUse) ctx.genericUpdate(scanIdToUse, { data: { ...displayData, type_simplifie: newType, accords_mets: newAccords, accord_parfait: newAccords[0] } });
  };

  const existingLocations = Array.from(new Set(ctx.scanHistory.map(s => s.location).filter(Boolean))).sort();
  const { nom, region, description, apogee, statut_apogee, accord_parfait } = displayData;

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto">
      
      {/* HEADER : VOCAL ET FERMER */}
      <div className="bg-[#1a1a1a] p-4 flex items-center justify-between z-20 sticky top-0 border-b border-[#333]">
        <SommelierButton text={`Ce vin est un ${nom}. ${description}. Il est recommandé de le boire entre ${apogee}.`} />
        <button onClick={ctx.goBack} className="p-3 bg-[#0a0a0a] text-slate-400 rounded-full hover:bg-black/60 transition-colors border border-white/10 z-20"><X className="w-6 h-6" /></button>
      </div>

      {/* CARTE DÉCOUVERTE PRINCIPALE (IMAGE SUR LE CÔTÉ, TITRES SERIF) */}
      <div className="p-5 mt-4">
        <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
          
          <div className="flex items-stretch">
            {/* GAUCHE : TEXTE ET DONNÉES */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                {/* Titre Serif Élégant (Prestige) */}
                <h2 className="text-4xl font-serif font-bold text-[#F5F5F5] leading-tight mb-2 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#AA7C11] transition-all duration-300">{nom}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-[#0a0a0a] px-2 py-1 rounded inline-block">Cuvée Haut-Selve - 750ml</p>
                
                {/* Badges de données distincts */}
                <div className="flex flex-wrap gap-2 mt-6">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-2.5 py-1.5 rounded">{tempType}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400 bg-rose-950/30 border border-rose-900/50 px-2.5 py-1.5 rounded">{tempAnnee}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-[#0a0a0a] border border-[#333] px-2.5 py-1.5 rounded">{region}</span>
                </div>
                
                {/* Badges d'icône distincts */}
                <div className="flex flex-wrap gap-2 mt-6">
                  <div className={`flex items-center space-x-1 text-xs text-[#AA7C11] font-bold bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-3 py-1.5 rounded`}>
                     <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
                     <span>Apogée : {apogee}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-emerald-400 font-bold bg-emerald-900/30 border border-emerald-800/50 px-3 py-1.5 rounded">
                     <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                     <span>~{tempPrix} €</span>
                  </div>
                </div>
              </div>
              
              {/* Accord Parfait */}
              <div className="mt-8 pt-6 border-t border-[#333]">
                <p className="text-xs text-slate-300 leading-relaxed italic">{accord_parfait}</p>
              </div>
            </div>
            
            {/* DROITE : IMAGE DE LA BOUTEILLE */}
            <div className="w-40 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-3">
              <img src={ctx.imageSrc || fallbackImg} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt="Bottle" className="max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(212,175,55,0.15)] group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
              <SommelierButton text={`Ce vin est un ${nom}. ${description}. Il est recommandé de le boire entre ${apogee}.`} />
            </div>
          </div>
          
          {/* Bouton Doré Texturé (Pilule) */}
          <button className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all flex items-center justify-center space-x-3 mt-8 hover:bg-[#AA7C11]">
            <Sparkles className="w-5 h-5" /><span>Découvrir ce vin</span>
          </button>
        </div>
      </div>

      {/* CARTE DÉTAILS, CAVE ET NOTES (TITRE SERIF) */}
      {currentScanObj && (
        <div className="p-5 animate-in slide-in-from-bottom-4 space-y-6 pb-20">
          <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg text-white">
            <h3 className="font-serif text-3xl font-bold text-[#F5F5F5] mb-6 flex items-center space-x-3"><GripHorizontal className="w-6 h-6 text-[#D4AF37]"/><span>Détails & Cave</span></h3>
            
            {/* Contrôles de stock */}
            <div className="flex items-center justify-between bg-[#0a0a0a] p-2 rounded-xl border border-[#333] mb-6">
              <p className="text-sm ml-2">En Cave :</p>
              <div className="flex items-center space-x-3 bg-[#1A1A1A] rounded-2xl p-1.5 border border-[#333]">
                <button onClick={() => ctx.handleDirectStockChange(scanIdToUse, Math.max(0, stock - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-[#1a1a1a] rounded-xl transition-colors text-[#F5F5F5]"><Minus className="w-5 h-5" /></button>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={stock} onChange={(e) => ctx.handleDirectStockChange(scanIdToUse, e.target.value)} onBlur={(e) => { if(e.target.value === '') ctx.handleDirectStockChange(scanIdToUse, '0') }} className="w-12 h-12 text-center text-2xl font-bold bg-transparent text-[#D4AF37] outline-none focus:bg-[#1a1a1a] rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button onClick={() => ctx.handleDirectStockChange(scanIdToUse, stock + 1)} className="w-12 h-12 flex items-center justify-center bg-[#D4AF37] hover:bg-[#AA7C11] rounded-xl transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] text-black"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
            
            {/* Emplacement et Partage */}
            <div className="space-y-4 mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><MapPin className="w-4 h-4 mr-2"/> Emplacement exact</label>
              <input type="text" value={tempLocation} onChange={(e) => setTempLocation(e.target.value)} onBlur={() => ctx.genericUpdate(scanIdToUse, { location: tempLocation })} list="shelf-suggestions" placeholder="Ex: Étagère du haut, Cave à vin..." className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#D4AF37] transition-all placeholder-slate-600" />
              <datalist id="shelf-suggestions">{existingLocations.map(loc => <option key={loc} value={loc} />)}</datalist>
              <button onClick={() => ctx.handleShare(currentScanObj)} className="w-full flex items-center justify-center space-x-3 py-4 bg-[#0a0a0a] text-slate-400 rounded-2xl font-bold hover:bg-[#222] transition-colors border border-[#333]"><Share2 className="w-5 h-5" /><span>Partager</span></button>
            </div>
            
            {/* Notes et Avis */}
            <div className="space-y-4 pt-6 border-t border-[#333]">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="font-serif text-2xl font-bold text-[#F5F5F5]">Notes</h4>
                 <div className="flex space-x-1 bg-[#0a0a0a] p-1.5 rounded-xl border border-[#333]">
                   {[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => ctx.genericUpdate(scanIdToUse, { rating: star })} className="p-1 hover:scale-110 transition-transform"><Star className={`w-6 h-6 ${star <= rating ? 'fill-[#D4AF37] text-[#D4AF37] drop-shadow-sm' : 'text-[#333]'}`} /></button>)}
                 </div>
              </div>
              <textarea value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} onBlur={() => ctx.genericUpdate(scanIdToUse, { notes: tempNotes })} placeholder="Arômes ressentis, occasion, personnes présentes..." className="w-full bg-[#0a0a0a] border border-[#333] rounded-2xl p-5 text-sm font-medium text-[#F5F5F5] resize-none h-28 focus:outline-none focus:border-[#D4AF37] transition-all placeholder-slate-600" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const PaywallView = ({ ctx }) => (
  <div className="flex flex-col h-full bg-[#1A100C] text-white pb-20 overflow-y-auto relative z-[60]">
    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
    <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
    
    <button onClick={() => ctx.setView('home')} className="absolute top-6 right-6 p-2 bg-[#1a1a1a]/10 rounded-full text-white/70 hover:bg-[#1a1a1a]/20 transition-colors z-20">
      <X className="w-6 h-6"/>
    </button>
    
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 mt-8">
      <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(212,175,55,0.3)] border border-amber-200">
        <Sparkles className="w-12 h-12 text-black" />
      </div>
      
      <h2 className="text-4xl font-serif font-bold text-center mb-4">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11]">VinoScan Pro</span>
      </h2>
      <p className="text-[#D4AF37]/70 text-center mb-10 text-sm font-medium px-4 leading-relaxed">
        Vous avez atteint votre limite de scans gratuits. Passez à la vitesse supérieure pour profiter de l'expérience ultime.
      </p>
      
      <div className="w-full space-y-4 mb-10">
        <div className="flex items-center space-x-4 bg-[#1a1a1a]/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="p-2 bg-[#D4AF37]/20 rounded-xl"><Camera className="w-6 h-6 text-[#D4AF37]"/></div>
          <div><h4 className="font-bold text-white text-lg">Scans Illimités</h4><p className="text-xs text-white/50">Ne soyez plus jamais bloqué</p></div>
        </div>
        <div className="flex items-center space-x-4 bg-[#1a1a1a]/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="p-2 bg-[#D4AF37]/20 rounded-xl"><Receipt className="w-6 h-6 text-[#D4AF37]"/></div>
          <div><h4 className="font-bold text-white text-lg">Import de Factures</h4><p className="text-xs text-white/50">Ajoutez des dizaines de vins d'un coup</p></div>
        </div>
        <div className="flex items-center space-x-4 bg-[#1a1a1a]/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="p-2 bg-[#D4AF37]/20 rounded-xl"><Wine className="w-6 h-6 text-[#D4AF37]"/></div>
          <div><h4 className="font-bold text-white text-lg">Sommelier Privé</h4><p className="text-xs text-white/50">Accords mets & vins d'exception</p></div>
        </div>
      </div>
      
      <div className="text-center mb-8">
        <p className="text-4xl font-black text-white mb-1">3,99€ <span className="text-sm font-medium text-white/50">/ mois</span></p>
        <p className="text-xs text-[#D4AF37]/80 font-bold uppercase tracking-wider">Sans engagement</p>
      </div>
      
      <button onClick={() => ctx.showToast("Bientôt ! Intégration Stripe en cours...")} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all">
        Débloquer VinoScan Pro
      </button>
    </div>
  </div>
);

// === NOUVEL ÉCRAN DE CONNEXION OBLIGATOIRE ===
// === NOUVEL ÉCRAN DE CONNEXION OBLIGATOIRE (DESIGN PRESTIGE) ===
const AuthView = ({ auth }) => {
  const [authMode, setAuthMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { 
      setAuthError(authMode === 'login' ? "Identifiants incorrects." : "Erreur ou mot de passe trop faible."); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] sm:border-x sm:border-[#333] shadow-2xl flex flex-col relative overflow-hidden">
      {/* Effets de lumière dorée */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl opacity-60 animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl opacity-60"></div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-[#D4AF37]/30 relative">
          <Wine className="w-12 h-12 text-[#D4AF37]" />
        </div>
        
        {/* Titre Serif Élégant */}
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] mb-2 text-center drop-shadow-sm">VinoScan</h2>
        <p className="text-[#D4AF37]/60 text-xs font-bold uppercase tracking-widest text-center mb-12">Accès Réservé</p>
        
        <form onSubmit={handleAuth} className="w-full space-y-5">
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 mb-1 block">Adresse Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 bg-transparent text-white border-b border-[#333] outline-none focus:border-[#D4AF37] transition-colors" required />
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 mb-1 block">Mot de passe</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 bg-transparent text-white border-b border-[#333] outline-none focus:border-[#D4AF37] transition-colors" required />
          </div>
          
          {authError && <p className="text-red-500 text-xs text-center font-bold bg-red-950/20 py-2 rounded-lg border border-red-900/50">{authError}</p>}
          
          {/* Bouton Doré Texturé (Pilule) */}
          <button type="submit" disabled={isLoading} className="w-full py-5 mt-6 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all disabled:opacity-50 flex justify-center hover:bg-[#AA7C11]">
            {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (authMode === 'login' ? 'Ouvrir la cave' : 'Créer ma cave privée')}
          </button>
        </form>
        
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-12 text-slate-400 text-sm font-medium hover:text-[#D4AF37] transition-colors">
          {authMode === 'login' ? "Nouveau ? Créer un compte gratuit" : "Déjà membre ? Se connecter"}
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// APPLICATION PRINCIPALE
// =========================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [userProfile, setUserProfile] = useState({ is_premium: false, scans_this_month: 0 });

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
          // On ne fait PLUS de connexion anonyme, on attend que l'utilisateur s'inscrive
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
    if (!user || user.isAnonymous) {
      setScanHistory([]);
      setUserProfile({ is_premium: false, scans_this_month: 0 });
      return;
    }

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const currentMonth = new Date().getMonth();
        if (data.last_reset_month !== currentMonth && !data.is_premium) {
          updateDoc(profileRef, { scans_this_month: 0, last_reset_month: currentMonth });
        } else {
          setUserProfile(data);
        }
      } else {
        setDoc(profileRef, { is_premium: false, scans_this_month: 0, last_reset_month: new Date().getMonth() });
      }
    });

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

    return () => { unsubscribeDb(); unsubscribeProfile(); };
  }, [user]);

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };
  
  const canUserScan = () => {
    if (userProfile.is_premium) return true;
    if (userProfile.scans_this_month < 5) return true;
    return false;
  };

  const incrementScanCount = async () => {
    if (userProfile.is_premium || !user) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    const newCount = (userProfile.scans_this_month || 0) + 1;
    await updateDoc(profileRef, { scans_this_month: newCount });
    setUserProfile(prev => ({ ...prev, scans_this_month: newCount }));
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
      const canvas = canvasRef.current; 
      canvas.width = videoRef.current.videoWidth; 
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();
      const compressedImg = await compressImage(dataUrl); 
      setImageSrc(compressedImg);

      if (cameraMode === 'receipt') {
        analyzeReceipt(compressedImg);
      } else if (cameraMode === 'menu') {
        analyzeMenu(compressedImg);
      } else {
        analyzeImage(compressedImg);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) { 
      const reader = new FileReader(); 
      reader.onloadend = async () => { 
        const compressedImg = await compressImage(reader.result); 
        setImageSrc(compressedImg); 
        analyzeImage(compressedImg); 
      }; 
      reader.readAsDataURL(file); 
    }
  };

  const SYSTEM_PROMPT = `Expert Sommelier. Réponds UNIQUEMENT en JSON. Format: {"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}`;

  const analyzeMenu = async (base64Img) => {
    if (!canUserScan()) { setView('paywall'); return; }
    setView('analyzing');
    try {
      const b64Data = base64Img.split(',')[1];
      let foodPrefText = "un plat surprise";
      if (menuPrefs.food === 'VIANDE_ROUGE') foodPrefText = "de la viande rouge";
      else if (menuPrefs.food === 'VIANDE_BLANCHE') foodPrefText = "de la viande blanche ou volaille";
      else if (menuPrefs.food === 'POISSON') foodPrefText = "du poisson ou fruits de mer";
      else if (menuPrefs.food === 'FROMAGE') foodPrefText = "un plateau de fromages";
      else if (menuPrefs.food === 'APERITIF') foodPrefText = "des tapas pour l'apéritif";

      const prompt = `Tu es un Sommelier expert. Voici une photo de carte des vins d'un restaurant.
      Ce soir, l'utilisateur a prévu de manger : ${foodPrefText}.
      Analyse la carte et choisis le MEILLEUR vin PARMI CEUX PRÉSENTS SUR L'IMAGE pour sublimer ce plat.
      Réponds UNIQUEMENT en JSON strict avec ce format :
      { "nom": "Nom", "type_simplifie": "ROUGE|BLANC|ROSE|PETILLANT", "annee": "Année", "region": "Région", "description": "max 20 mots", "prix_unitaire_nombre": PRIX, "accord_parfait": "Idéal avec ${foodPrefText}" }`;

      const result = await callGemini(prompt, b64Data);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedData = normalizeData(extractJSON(text));
      
      if (!parsedData || !parsedData.nom || parsedData.nom === "Vin inconnu") {
        setErrorMsg("Impossible de lire la carte. Cet essai n'a pas été décompté.");
        setView('error'); return;
      }

      setAnalysisResult(parsedData);
      const finalImage = getGenericImageForType(parsedData.type_simplifie);
      setImageSrc(finalImage);

      const tempId = 'temp_' + Date.now();
      const newScanObj = { id: tempId, image: finalImage, data: parsedData, stock: 0, in_history: true, wishlist: false, location: 'Dégusté au restaurant', timestamp: Date.now() };

      setScanHistory(prev => [newScanObj, ...prev]);
      if (typeof setCurrentScanId === 'function') setCurrentScanId(tempId);
      setView('results');
      await incrementScanCount();
    } catch(err) {
      setErrorMsg("Erreur lors de la lecture du menu. Cet essai n'a pas été décompté.");
      setView('error');
    }
  };

  const analyzeReceipt = async (base64Img) => {
    if (!canUserScan()) { setView('paywall'); return; }
    setView('analyzing');
    try {
      const b64Data = base64Img.split(',')[1];
      const prompt = `Extrait tous les vins de ce ticket de caisse. Réponds UNIQUEMENT par un tableau JSON pur. Format attendu : [{"nom":"Nom", "annee":"2020", "prix_unitaire_nombre":15.5, "type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT", "region":"Bordeaux"}]`;

      const result = await callGemini(prompt, b64Data);
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsedArr = extractJSON(text);

      if (!Array.isArray(parsedArr) || parsedArr.length === 0) {
        setErrorMsg("Aucun vin trouvé sur cette facture. Cet essai n'a pas été décompté.");
        setView('error'); return; 
      }

      let newScans = [];
      for (let item of parsedArr) {
        const norm = normalizeData(item);
        const tempId = 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5);
        newScans.push({ id: tempId, image: getGenericImageForType(norm.type_simplifie), data: norm, stock: 1, in_history: true, wishlist: false, location: '', timestamp: Date.now() });
      }

      setScanHistory(prev => [...newScans, ...prev]);
      showToast(`${newScans.length} vins ajoutés à la cave !`);
      setView('cellar');
      await incrementScanCount();
    } catch(err) {
      setErrorMsg("Erreur de lecture de la facture. Cet essai n'a pas été décompté.");
      setView('error');
    }
  };
  
  const processAIResult = async (aiText, sourceImage, defaultImageFallback, isWishlist = false) => {
    const parsedData = normalizeData(extractJSON(aiText));
    setAnalysisResult(parsedData);
    
    let finalImage = sourceImage || defaultImageFallback || getGenericImageForType(parsedData.type_simplifie);
    setImageSrc(finalImage);

    const tempId = 'temp_' + Date.now();
    const newScanObj = {
      id: tempId, image: finalImage, data: parsedData, stock: 0, in_history: !isWishlist, wishlist: isWishlist, location: '', rating: 0, notes: '', timestamp: Date.now(),
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
    if (!canUserScan()) { setView('paywall'); return; }
    setView('analyzing');
    try {
      const b64Data = base64Img.split(',')[1];
      const firstCall = await callGemini("Identifie le vin sur cette photo. Si ce n'est pas lisible, réponds {\"nom\": \"INCONNU\"}. Sinon {\"nom\": \"NOM_DU_VIN\"}", b64Data);
      
      const firstText = firstCall.candidates?.[0]?.content?.parts?.[0]?.text;
      const identified = extractJSON(firstText);
      
      if (!identified || !identified.nom || identified.nom === 'INCONNU') {
        setErrorMsg("Le sommelier n'a pas reconnu de bouteille. Cet essai n'a pas été décompté.");
        setView('error'); return; 
      }
      
      let finalDataText = "";
      let finalDataObj = await checkGlobalCache(identified.nom);
      
      if (!finalDataObj) {
        const secondCall = await callGemini(SYSTEM_PROMPT, b64Data);
        finalDataText = secondCall.candidates?.[0]?.content?.parts?.[0]?.text;
        finalDataObj = extractJSON(finalDataText);
        await saveToGlobalCache(finalDataObj.nom, finalDataObj);
      } else {
        finalDataText = JSON.stringify(finalDataObj);
      }
      
      await processAIResult(finalDataText, base64Img);
      await incrementScanCount();
    } catch (err) {
      setErrorMsg(`Erreur technique : ${err.message}`);
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
        finalDataText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        finalDataObj = extractJSON(finalDataText);
        
        if (!finalDataObj || finalDataObj.nom === 'INCONNU') {
          setErrorMsg("Aucun vin correspondant à votre recherche.");
          setView('error'); return;
        }
        await saveToGlobalCache(finalDataObj.nom, finalDataObj);
      } else {
        finalDataText = JSON.stringify(finalDataObj);
      }
      
      await processAIResult(finalDataText, null);
    } catch (err) {
      setErrorMsg(`Erreur technique : ${err.message}`);
      setView('error');
    }
  };

  const fetchAIRecommendation = async (type, apogee, food, price) => {
    setView('analyzing');
    setPreviousView('recommendation');
    try {
      const prompt = `Sommelier: trouve 3 vins. Type: ${type}, Repas: ${food}, Budget: ${price}. JSON avec propriété "vins". Structure par vin : ${SYSTEM_PROMPT}`;
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

  const handleKeyDown = (e) => { if (e.key === 'Enter') e.target.blur(); };

  const handleShare = async (wine) => {
    const shareText = `Découverte sur VinoScan 🍷\n${wine.data.nom} (${wine.data.annee})\nEstimation: ${wine.data.prix_unitaire_nombre}€\nIdéal avec : ${wine.data.accord_parfait} !`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Mon vin VinoScan', text: shareText }); } catch(e) {}
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = shareText; document.body.appendChild(textArea); textArea.select();
      try { document.execCommand('copy'); showToast("Copié !"); } catch(e) {}
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
    setImageSrc(null); setAnalysisResult(null); setCurrentScanId(null); setErrorMsg(''); setView(previousView);
  };

  const openExistingWine = (item, originView) => {
    setImageSrc(item.image); setAnalysisResult(item.data); setCurrentScanId(item.id); setPreviousView(originView); setView('results');
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

  // 🚨 LE MUR DE SÉCURITÉ (AUTH WALL) 🚨
  if (isAuthLoading) {
    return <div className="h-[100dvh] w-full max-w-md mx-auto bg-[#0a0a0a] flex items-center justify-center"><Wine className="w-12 h-12 text-[#D4AF37] animate-pulse" /></div>;
  }

  if (!user || user.isAnonymous) {
    return <AuthView auth={auth} />;
  }

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] sm:border-x sm:border-[#333] overflow-hidden relative shadow-2xl text-[#F5F5F5] font-sans" style={{'--gold-primary': '#D4AF37'}}>
        
        {view === 'home' && <HomeView ctx={ctx} />}
        {view === 'paywall' && <PaywallView ctx={ctx} />}
        {view === 'manualSearch' && <ManualSearchView ctx={ctx} />}
        {view === 'quiz' && <QuizView ctx={ctx} />}
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
        
        {['home', 'cellar', 'history', 'account', 'recommendation', 'recommendationList', 'menuConfig', 'quiz'].includes(view) && <NavigationBar ctx={ctx} />}

        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-red-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-900"><AlertTriangle className="w-10 h-10 text-red-500" /></div>
              <h3 className="text-2xl font-serif font-bold text-center text-[#F5F5F5] mb-2">{scanAction.type === 'history' ? "Retirer de l'historique ?" : "Sortir de la cave ?"}</h3>
              <p className="text-slate-400 font-medium text-center mb-8">{scanAction.type === 'history' ? "Ce vin n'apparaîtra plus dans votre historique de scans." : "Le stock de ce vin passera à 0 et il n'apparaîtra plus dans votre cave."}</p>
              <div className="flex space-x-3">
                <button onClick={() => setScanAction(null)} className="flex-1 py-4 bg-[#333] text-white rounded-2xl font-bold hover:bg-[#444] transition-colors border border-[#444]">Annuler</button>
                <button onClick={executeAction} className="flex-1 py-4 bg-red-600/20 border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl font-bold shadow-md transition-colors">Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toastMsg && (
          <div className="absolute top-10 left-0 w-full flex justify-center z-[200] animate-in slide-in-from-top-4">
            <div className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-[#AA7C11] flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>{toastMsg}</span>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}