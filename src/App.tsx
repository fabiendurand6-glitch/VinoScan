// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe, X, Trophy, TrendingUp, BarChart3, Target, Focus 
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
  // Nouveaux liens Unsplash fiables avec les bons paramètres d'API
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; 
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
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-[#f8f5f2] overflow-hidden">
    <div className="absolute -top-32 -left-32 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
    <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
    
    <div className="text-center space-y-4 relative z-10">
      <div className="mx-auto w-28 h-28 bg-gradient-to-br from-rose-800 to-rose-950 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
        <Wine className="w-14 h-14 text-rose-100" />
      </div>
      <h1 className="text-5xl font-serif text-slate-800 tracking-tight font-bold">VinoScan</h1>
      <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">L'assistant ultime de votre cave.</p>
    </div>

    <div className="w-full max-w-sm space-y-3 pt-2 relative z-10">
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-slate-900 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all">
        <Camera className="w-6 h-6" /><span className="font-bold text-lg">Scanner une bouteille</span>
      </button>

      {/* NOUVEAU : LE SCAN DE FACTURE */}
      <button onClick={() => ctx.startCamera('receipt')} className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-900 text-slate-900 p-4 rounded-2xl shadow-md active:scale-95 transition-all">
        <Receipt className="w-6 h-6" /><span className="font-bold text-lg">Scanner un ticket / facture</span>
      </button>
      
      <div className="flex space-x-3 pt-2">
        <button onClick={() => ctx.setView('menuConfig')} className="flex-1 flex items-center justify-center space-x-2 bg-white border border-slate-200 text-amber-700 p-4 rounded-2xl shadow-sm active:scale-95">
          <BookOpen className="w-5 h-5" /><span className="font-bold text-xs uppercase">Carte Vins</span>
        </button>
        <button onClick={() => ctx.setView('quiz')} className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-4 rounded-2xl shadow-sm active:scale-95">
          <Gamepad2 className="w-5 h-5" /><span className="font-bold text-xs uppercase">Mini-Jeu</span>
        </button>
      </div>

      <div className="flex space-x-3">
        <label className="flex-1 flex flex-col items-center justify-center space-y-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-2xl cursor-pointer shadow-sm active:scale-95">
          <ImageIcon className="w-5 h-5 text-slate-400" /><span className="font-bold text-[10px] uppercase">Galerie</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'bottle')} />
        </label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-2xl shadow-sm active:scale-95">
          <Search className="w-5 h-5 text-slate-400" /><span className="font-bold text-[10px] uppercase">Recherche</span>
        </button>
      </div>
    </div>
  </div>
);

// 1. RECHERCHE MANUELLE (Sans le jeu, juste la barre de recherche)
const ManualSearchView = ({ ctx }) => {
  const [query, setQuery] = useState('');
  const handleSearch = (e) => { e.preventDefault(); if(query.trim()) ctx.searchWineText(query); };
  
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
            Rechercher dans la base
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. LE JEU DU SOMMELIER (Vue dédiée)
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
  { q: "Laquelle de ces maladies attaque la vigne ?", options: ["Le Phylloxéra", "La Rouille", "Le Mildiou Noir"], ans: "Le Phylloxéra" },
  { q: "Quelle température est idéale pour servir un grand vin rouge ?", options: ["12-14°C", "16-18°C", "20-22°C"], ans: "16-18°C" },
  { q: "Quel cépage est majoritaire dans un Châteauneuf-du-Pape rouge ?", options: ["Syrah", "Grenache", "Mourvèdre"], ans: "Grenache" },
  { q: "Dans quelle région se trouve l'appellation Sancerre ?", options: ["Vallée de la Loire", "Bordeaux", "Alsace"], ans: "Vallée de la Loire" },
  { q: "Comment appelle-t-on la mousse qui se forme à la surface du champagne servi ?", options: ["La collerette", "Le cordon", "La couronne"], ans: "Le cordon" },
  { q: "Quel pays est le plus grand producteur de vin au monde (en volume, moyenne) ?", options: ["France", "Espagne", "Italie"], ans: "Italie" },
  { q: "Quel type de vin produit l'appellation Sauternes ?", options: ["Principalement du rouge", "Principalement du blanc", "Du vin effervescent"], ans: "Principalement du blanc" },
  { q: "Quel cépage donne les grands vins de la Vallée du Rhône Nord (ex: Côte-Rôtie) ?", options: ["Grenache", "Syrah", "Carignan"], ans: "Syrah" },
  { q: "Qu'est-ce que le 'carafage' d'un vin ?", options: ["Séparer le dépôt du vin", "Aérer un vin jeune", "Refroidir un vin"], ans: "Aérer un vin jeune" },
  { q: "Quelle est la contenance d'un Magnum ?", options: ["1.5 Litre", "3 Litres", "4.5 Litres"], ans: "1.5 Litre" },
  { q: "Où produit-on le vin de Tokaj ?", options: ["En Russie", "En Hongrie", "En Roumanie"], ans: "En Hongrie" },
  { q: "Qu'est-ce que le 'Botrytis cinerea' ?", options: ["Un insecte", "La pourriture noble", "Un type de levure"], ans: "La pourriture noble" },
  { q: "Lequel n'est pas un cépage autorisé en Champagne ?", options: ["Pinot Meunier", "Chardonnay", "Riesling"], ans: "Riesling" },
  { q: "Quel vin associe-t-on classiquement au Roquefort ?", options: ["Un vin blanc sec", "Un vin rouge puissant", "Un vin liquoreux"], ans: "Un vin blanc sec" },
  { q: "Quelle appellation est connue pour ses sols de 'galets roulés' ?", options: ["Pomerol", "Châteauneuf-du-Pape", "Corton-Charlemagne"], ans: "Châteauneuf-du-Pape" },
  { q: "Qu'est-ce que les 'larmes' ou 'jambes' d'un vin ?", options: ["Le dépôt au fond", "Les traces coulantes sur le verre", "Le bord du vin dans le verre"], ans: "Les traces coulantes sur le verre" },
  { q: "Que signifie un vin 'bouchonné' ?", options: ["Il a un goût de liège moisi", "Il est fermé hermétiquement", "Il a été élevé en fût de chêne"], ans: "Il a un goût de liège moisi" },
  { q: "Dans quelle région se trouve Saint-Émilion ?", options: ["Bourgogne", "Bordeaux", "Vallée du Rhône"], ans: "Bordeaux" },
  { q: "Quel célèbre vin pétillant vient d'Espagne ?", options: ["Le Prosecco", "Le Cava", "L'Asti"], ans: "Le Cava" },
  { q: "Comment appelle-t-on le récipient en bois pour élever le vin ?", options: ["Un fût (ou barrique)", "Une dame-jeanne", "Un foudre en inox"], ans: "Un fût (ou barrique)" },
  { q: "Quel vin est réputé pour accompagner le foie gras poêlé ?", options: ["Un blanc liquoreux", "Un rosé sec", "Un rouge léger"], ans: "Un blanc liquoreux" },
  { q: "Quel est le grand cépage rouge du Piémont en Italie ?", options: ["Sangiovese", "Nebbiolo", "Barbera"], ans: "Nebbiolo" },
  { q: "Que signifie 'AOC' ?", options: ["Appellation d'Origine Contrôlée", "Association des Œnologues Certifiés", "Appellation d'Origine Commune"], ans: "Appellation d'Origine Contrôlée" },
  { q: "Quel pays est le berceau du cépage Malbec aujourd'hui ?", options: ["L'Argentine", "Le Chili", "L'Afrique du Sud"], ans: "L'Argentine" },
  { q: "Quel est le nom du célèbre domaine produisant la Romanée-Conti ?", options: ["Bordeaux", "Bourgogne", "Alsace"], ans: "Bourgogne" }, 
  { q: "Combien y a-t-il de crus classés en 1855 dans le Médoc ?", options: ["61", "88", "102"], ans: "61" },
  { q: "Quel vin blanc est typique de la région de Chablis ?", options: ["Chardonnay", "Sauvignon", "Riesling"], ans: "Chardonnay" },
  { q: "Que signifie l'ouillage ?", options: ["Remplir les fûts pour compenser l'évaporation", "Filtrer le vin", "Mettre le vin en bouteille"], ans: "Remplir les fûts pour compenser l'évaporation" },
  { q: "Quel est le synonyme du cépage Syrah en Australie ?", options: ["Shiraz", "Sirac", "Zinfandel"], ans: "Shiraz" },
  { q: "Comment appelle-t-on l'opération de taille de la vigne en hiver ?", options: ["Le palissage", "L'ébourgeonnage", "La taille sèche"], ans: "La taille sèche" },
  { q: "Quel vin accompagne idéalement des huîtres ?", options: ["Chablis", "Bordeaux Rouge", "Côtes de Provence"], ans: "Chablis" }
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
    <div className="flex flex-col h-full bg-slate-50 pb-20">
      <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-slate-900">Le Nez du Sommelier</h1><p className="text-slate-500 text-xs mt-1">Défiez vos connaissances</p></div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          
          {gameState === 'idle' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto"><Gamepad2 className="w-10 h-10 text-amber-600"/></div>
              <h3 className="font-serif text-2xl font-bold text-slate-900">Prêt à jouer ?</h3>
              <p className="text-slate-500 font-medium">4 questions aléatoires pour tester votre palais.</p>
              <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform text-lg">Démarrer le Quiz</button>
            </div>
          )}

          {/* SÉCURITÉ : On vérifie bien que currentQuiz[qIndex] existe avant d'afficher pour éviter l'écran blanc */}
          {gameState === 'playing' && currentQuiz.length > 0 && currentQuiz[qIndex] && (
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Question {qIndex + 1}/{currentQuiz.length}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score : {score}</span>
              </div>
              <p className="font-serif text-xl font-bold text-slate-900 min-h-[80px] leading-snug">{currentQuiz[qIndex].q}</p>
              <div className="space-y-3">
                {currentQuiz[qIndex].options.map(opt => {
                  let btnClass = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
                  if (feedback && opt === currentQuiz[qIndex].ans) btnClass = "bg-emerald-500 border-emerald-500 text-white";
                  else if (feedback === 'wrong' && opt !== currentQuiz[qIndex].ans) btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                  return (
                    <button key={opt} onClick={() => handleAnswer(opt)} className={`w-full p-5 rounded-2xl border-2 font-bold text-left transition-all ${btnClass}`}>{opt}</button>
                  );
                })}
              </div>
            </div>
          )}

          {gameState === 'end' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-10 h-10 text-emerald-600"/></div>
              <h3 className="font-serif text-3xl font-bold text-slate-900">Terminé !</h3>
              <p className="text-2xl font-black text-emerald-600">{score} / {currentQuiz.length}</p>
              <div className="flex space-x-3">
                <button onClick={startGame} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl">Rejouer</button>
                <button onClick={() => ctx.setView('home')} className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl">Quitter</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. SCANNER DE CARTE DE RESTAURANT (Rétabli !)
const MenuConfigView = ({ ctx }) => {
  // Petit traducteur pour avoir un bel affichage au lieu des clés techniques
  const getFoodLabel = (f) => {
    const labels = {
      'ALL': 'Peu importe', 'APERITIF': 'Apéritif & Tapas',
      'VIANDE_ROUGE': 'Viande Rouge', 'VIANDE_BLANCHE': 'Volaille & Porc',
      'POISSON': 'Poisson & Mer', 'FROMAGE': 'Fromage'
    };
    return labels[f] || f;
  };

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
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center space-x-2"><Utensils className="w-5 h-5 text-amber-600" /><span>Que mangez-vous ?</span></h3>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(f => (
              <button 
                key={f} 
                onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: f})} 
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${ctx.menuPrefs.food === f ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {getFoodLabel(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-6 space-y-3">
          <button onClick={() => ctx.startCamera('menu')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-transform"><Camera className="inline w-5 h-5 mr-2" />Scanner la carte</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Assure-toi que la ligne juste en dessous de ce commentaire est bien : 

// CAVE MODERNE ET ÉLÉGANTE (LISIBILITÉ MAXIMALE & DRAG AND DROP)
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
    // Tri pour que l'ordre du glisser-déposer soit respecté
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (b.customOrder || b.timestamp) - (a.customOrder || a.timestamp));
    });
    return groups;
  }, [filteredItems]);

  const totalBottles = cellarTab === 'STOCK' ? filteredItems.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0) : filteredItems.length;
  const totalValue = filteredItems.reduce((acc, curr) => acc + ((curr.data.prix_unitaire_nombre || 0) * (cellarTab === 'STOCK' ? (parseInt(curr.stock) || 0) : 1)), 0);

  // --- LOGIQUE DRAG AND DROP ---
  const handleDragStart = (e, bottle) => {
    e.dataTransfer.setData('text/plain', bottle.id);
    setDraggedBottle(bottle.id);
  };

  const handleDrop = (e, targetShelf, targetBottleId = null) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    setDraggedBottle(null);

    if (!draggedId || draggedId === targetBottleId) return;
    const draggedItem = ctx.scanHistory.find(b => b.id === draggedId);
    if (!draggedItem) return;

    if (targetBottleId) {
      // Échange sur la même étagère
      const targetItem = ctx.scanHistory.find(b => b.id === targetBottleId);
      if (targetItem) {
        const targetOrder = targetItem.customOrder || targetItem.timestamp || Date.now();
        const draggedOrder = draggedItem.customOrder || draggedItem.timestamp || Date.now();
        ctx.genericUpdate(draggedId, { location: targetShelf, customOrder: targetOrder + 1 });
        ctx.genericUpdate(targetBottleId, { customOrder: draggedOrder - 1 });
      }
    } else {
      // Déplacement vers une étagère vide
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
      Voici les vins dans sa cave :
      ${inventoryString}
      Choisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat.
      Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;

      const result = await callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur IA");

      setPairingResult({ wine: chosenWine, explication: parsed.explication });
    } catch (e) {
      ctx.setErrorMsg("Impossible de trouver l'accord."); ctx.setView('error');
    } finally { setIsPairingLoading(false); }
  };

  const getApogeeBadge = (statut) => {
    switch(statut) {
      case 'A_GARDER': return <div className="flex items-center space-x-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-medium"><Clock className="w-3 h-3" /><span>À garder</span></div>;
      case 'DECLIN': return <div className="flex items-center space-x-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-medium"><TrendingDown className="w-3 h-3" /><span>Déclin</span></div>;
      default: return <div className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium"><CheckCircle className="w-3 h-3" /><span>Apogée</span></div>;
    }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop";

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20 relative">
      <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-end mb-4">
          <div><h1 className="text-3xl font-serif font-bold text-slate-900">Mes Vins</h1><p className="text-slate-500 text-sm mt-1">{totalBottles} bouteilles</p></div>
          <div className="text-right"><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valeur Estimée</p><div className="text-emerald-700"><span className="text-2xl font-bold">{totalValue.toFixed(0)}</span>€</div></div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'STOCK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>En Cave</button>
          <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'WISHLIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Liste d'Achats</button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trier & Filtrer</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5 shadow-inner">
               <button onClick={() => { setViewMode('list'); setReorgMode(false); }} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-4 h-4" /></button>
               <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'shelves' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-full text-xs font-medium border ${filterType === t ? 'bg-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}>{t === 'ALL' ? 'Tous' : t}</button>
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
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {cellarTab === 'STOCK' && totalBottles > 0 && (
          <button onClick={() => {setShowPairingModal(true); setPairingResult(null); setPairingDish('');}} className="w-full bg-gradient-to-r from-indigo-800 to-purple-900 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between active:scale-95 transition-transform mb-4">
            <div className="text-left">
              <h3 className="font-bold text-lg flex items-center"><Sparkles className="w-5 h-5 mr-2 text-yellow-300"/> Que boire ce soir ?</h3>
              <p className="text-xs text-indigo-200">Demander au sommelier d'explorer votre cave</p>
            </div>
            <ChevronRight className="w-6 h-6 text-indigo-300" />
          </button>
        )}

        {viewMode === 'shelves' && cellarTab === 'STOCK' && (
          <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
            <p className="text-[10px] text-amber-800 font-bold uppercase"><b className="text-amber-900">Astuce :</b> Glissez une bouteille pour l'organiser.</p>
            <button 
              onClick={() => { setReorgMode(!reorgMode); setSelectedBottle(null); }} 
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${reorgMode ? 'bg-rose-600 text-white shadow-md' : 'bg-white border border-slate-300 text-slate-700'}`}
            >
              <GripHorizontal className="w-3 h-3" />
              <span>{reorgMode ? 'Terminer' : 'Sur Mobile ?'}</span>
            </button>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center p-6 opacity-50 mt-10"><Archive className="w-16 h-16 mx-auto mb-4 text-slate-300" /><p className="font-medium">Aucun vin ne correspond.</p></div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div onClick={() => ctx.openExistingWine(item, 'cellar')} className="p-4 flex items-start space-x-4 active:bg-slate-50 cursor-pointer">
                  <div className="w-16 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                    <img src={item.image} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt="Miniature" className="max-w-full max-h-full object-contain drop-shadow-md" />
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
          <div className="space-y-10 mt-6">
             {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                <div key={shelfName} className="mb-8">
                   
                   {/* En-tête de l'étagère Épurée */}
                   <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-serif text-xl font-bold text-slate-800 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-amber-600" />
                        {shelfName}
                      </h3>
                      <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                        {bottles.length} bouteilles
                      </span>
                   </div>
                   
                   {/* Grille Moderne (3 colonnes) */}
                   <div 
                     className="grid grid-cols-3 gap-4 bg-slate-100/50 p-4 rounded-3xl border border-slate-200/60 shadow-inner min-h-[200px]"
                     onDragOver={handleDragOver}
                     onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)}
                   >
                      {bottles.map(bottle => (
                         <div 
                            key={bottle.id}
                            draggable={!reorgMode}
                            onDragStart={(e) => handleDragStart(e, bottle)}
                            onDragEnd={() => setDraggedBottle(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName, bottle.id)}
                            onClick={() => {
                              if (reorgMode) setSelectedBottle(bottle);
                              else ctx.openExistingWine(bottle, 'cellar');
                            }} 
                            className={`relative flex flex-col bg-white rounded-2xl p-3 shadow-sm border border-slate-100 cursor-pointer transition-all duration-300 group ${draggedBottle === bottle.id ? 'opacity-40 scale-95' : 'hover:-translate-y-1 hover:shadow-md'} ${reorgMode ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                         >
                            {/* Image de la Bouteille */}
                            <div className="relative h-28 w-full mb-3 flex items-center justify-center">
                               <img 
                                  src={bottle.image} 
                                  onError={(e) => { e.target.onerror = null; e.target.src = fallbackImg; }}
                                  className="max-h-full max-w-full object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-transform duration-500" 
                                  alt={bottle.data.nom}
                               />
                               {cellarTab === 'STOCK' && bottle.stock > 1 && (
                                 <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-md z-10 border-2 border-white">x{bottle.stock}</span>
                               )}
                            </div>

                            {/* Texte lisible */}
                            <div className="flex flex-col items-center text-center">
                               <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${bottle.data.type_simplifie === 'ROUGE' ? 'text-rose-800' : bottle.data.type_simplifie === 'BLANC' ? 'text-amber-600' : bottle.data.type_simplifie === 'PETILLANT' ? 'text-yellow-600' : 'text-pink-500'}`}>
                                 {bottle.data.type_simplifie}
                               </span>
                               <h4 className="text-xs font-bold text-slate-800 leading-tight line-clamp-2 mb-1">
                                 {bottle.data.nom}
                               </h4>
                               <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 mt-1">
                                 {bottle.data.annee}
                               </span>
                            </div>
                         </div>
                      ))}
                      
                      {/* Espaces de drop vides et élégants */}
                      {Array.from({length: Math.max(0, 3 - (bottles.length % 3 === 0 && bottles.length > 0 ? 3 : bottles.length % 3))}).map((_, i) => (
                        <div 
                          key={`empty-${i}`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 min-h-[160px]"
                        >
                           <div className="w-8 h-8 rounded-full border-2 border-slate-200"></div>
                        </div>
                      ))}
                   </div>
                </div>
             ))}

             {/* Zone Création de nouvelle étagère */}
             <div 
               onDragOver={handleDragOver}
               onDrop={(e) => {
                 e.preventDefault();
                 setDraggedBottle(null);
                 const newName = window.prompt("Nom de la nouvelle étagère ? (ex: Cave à vin, Salon...)");
                 if (newName && newName.trim() !== '') handleDrop(e, newName);
               }}
               className="mt-8 border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-all cursor-pointer shadow-sm"
             >
               <Plus className="w-8 h-8 mb-2" />
               <p className="font-bold text-xs uppercase tracking-wider text-center">Glissez un vin ici pour<br/>créer une étagère</p>
             </div>
          </div>
        )}
      </div>

      {/* MODAL POUR SMARTPHONE (REORG MODE) */}
      {selectedBottle && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl mb-safe animate-in slide-in-from-bottom-4">
             <h3 className="font-serif text-2xl font-bold text-slate-900 mb-1">Déplacer</h3>
             <p className="text-slate-500 text-sm mb-6">Où voulez-vous ranger <b>{selectedBottle.data.nom}</b> ?</p>
             <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-2">
               {existingLocations.length > 0 ? existingLocations.map(loc => (
                 <button key={loc} onClick={() => handleMoveBottleClick(loc)} className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 font-bold transition-colors shadow-sm">
                   <MapPin className="w-4 h-4 inline mr-3 opacity-50" /> {loc}
                 </button>
               )) : <p className="text-slate-400 text-sm italic text-center py-4 bg-slate-50 rounded-xl">Aucune étagère existante.</p>}
               <button onClick={() => handleMoveBottleClick('')} className="w-full text-left p-4 rounded-2xl bg-slate-50 border text-slate-500 italic hover:bg-slate-100">Retirer de l'étagère</button>
             </div>
             <div className="flex space-x-2 border-t border-slate-100 pt-6">
               <input type="text" placeholder="Nouvelle étagère..." value={newShelfName} onChange={(e) => setNewShelfName(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-rose-200 transition-all font-medium" />
               <button onClick={() => handleMoveBottleClick(newShelfName)} disabled={!newShelfName.trim()} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold disabled:opacity-50">Créer</button>
             </div>
             <button onClick={() => { setSelectedBottle(null); setNewShelfName(''); }} className="mt-4 w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL KILLER APP (SOMMELIER DE CAVE) */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
            <button onClick={() => setShowPairingModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X className="w-5 h-5"/></button>
            
            {!pairingResult ? (
              <div className="space-y-4 mt-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2"><Utensils className="w-8 h-8 text-indigo-600"/></div>
                <h3 className="font-serif text-2xl font-bold text-center text-slate-900">Que mangez-vous ?</h3>
                <p className="text-sm text-center text-slate-500">Dites au sommelier ce que vous avez prévu, il trouvera la bouteille parfaite dans votre stock.</p>
                <input autoFocus type="text" placeholder="Ex: Magret de canard..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center">
                  {isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Explorer ma cave"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 mt-4 animate-in slide-in-from-bottom-4">
                <h3 className="font-serif text-xl font-bold text-center text-indigo-900">Voici le choix parfait !</h3>
                <div onClick={() => {setShowPairingModal(false); ctx.openExistingWine(pairingResult.wine, 'cellar');}} className="border border-indigo-100 bg-indigo-50 rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white">
                    <img src={pairingResult.wine.image} onError={(e) => {e.target.onerror=null; e.target.src=fallbackImg;}} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{pairingResult.wine.data.type_simplifie}</span>
                    <h4 className="font-bold text-slate-900 leading-tight mb-2">{pairingResult.wine.data.nom}</h4>
                    <p className="text-xs text-slate-600 italic">"{pairingResult.explication}"</p>
                  </div>
                </div>
                {pairingResult.wine.location && <p className="text-xs text-center font-bold text-slate-500 uppercase"><MapPin className="w-3 h-3 inline mr-1" />{pairingResult.wine.location}</p>}
                <button onClick={() => setShowPairingModal(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl mt-4">Fermer</button>
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

  // LES 8 BADGES DIVERSIFIÉS
  const bordeauxCount = ctx.scanHistory.filter(i => i.data.region?.toLowerCase().includes('bordeaux')).length;
  const bourgogneCount = ctx.scanHistory.filter(i => i.data.region?.toLowerCase().includes('bourgogne')).length;
  const rhoneCount = ctx.scanHistory.filter(i => i.data.region?.toLowerCase().includes('rhône') || i.data.region?.toLowerCase().includes('rhone')).length;
  const loireCount = ctx.scanHistory.filter(i => i.data.region?.toLowerCase().includes('loire')).length;
  
  const rougeCount = ctx.scanHistory.filter(i => i.data.type_simplifie === 'ROUGE').length;
  const blancCount = ctx.scanHistory.filter(i => i.data.type_simplifie === 'BLANC').length;
  const bullesCount = ctx.scanHistory.filter(i => i.data.type_simplifie === 'PETILLANT').length;
  const premiumCount = ctx.scanHistory.filter(i => i.data.prix_unitaire_nombre >= 50).length;

  const collectionBadges = [
    { id: 'bordeaux', name: 'Baron de Bordeaux', desc: '3 vins de Bordeaux', req: 3, count: bordeauxCount, icon: '🍷' },
    { id: 'bourgogne', name: 'Duc de Bourgogne', desc: '3 vins de Bourgogne', req: 3, count: bourgogneCount, icon: '🍇' },
    { id: 'rhone', name: 'Prince du Rhône', desc: '3 vins du Rhône', req: 3, count: rhoneCount, icon: '☀️' },
    { id: 'loire', name: 'Seigneur de la Loire', desc: '3 vins de la Loire', req: 3, count: loireCount, icon: '🏰' },
    { id: 'rouge', name: 'Sang de la Vigne', desc: '10 vins Rouges', req: 10, count: rougeCount, icon: '🥩' },
    { id: 'blanc', name: "L'Or Blanc", desc: '5 vins Blancs', req: 5, count: blancCount, icon: '🧀' },
    { id: 'bulles', name: 'Maître des Bulles', desc: '5 Pétillants', req: 5, count: bullesCount, icon: '🥂' },
    { id: 'premium', name: 'Le Grand Cru', desc: '3 vins > 50€', req: 3, count: premiumCount, icon: '💎' }
  ];

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setAuthError("Erreur : Vérifiez vos identifiants ou le mot de passe."); }
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
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg transform rotate-3">
            <ShieldCheck className="w-12 h-12 text-white transform -rotate-3" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3 text-center">Sauvegardez votre cave</h2>
          <form onSubmit={handleAuth} className="w-full space-y-4 mt-8">
            <input type="email" placeholder="Adresse email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 rounded-2xl border outline-none focus:ring-2" required />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 rounded-2xl border outline-none focus:ring-2" required />
            <button type="submit" className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-bold">{authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-8 text-slate-500 text-sm font-medium">{authMode === 'login' ? "Nouveau ici ? Créer un compte" : "Déjà membre ? Se connecter"}</button>
        </div>
      </div>
    );
  }

  const itemsInStock = ctx.scanHistory.filter(i => i.stock > 0);
  const totalBottles = itemsInStock.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const totalValue = itemsInStock.reduce((acc, curr) => acc + ((curr.data.prix_unitaire_nombre || 0) * (curr.stock || 0)), 0);
  const countType = (type) => itemsInStock.filter(i => i.data.type_simplifie === type).reduce((acc, curr) => acc + curr.stock, 0);
  const getPct = (val) => totalBottles === 0 ? 0 : Math.round((val / totalBottles) * 100);

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto relative">
      <div className="bg-white pt-12 pb-6 px-6 shadow-sm z-10 flex items-center justify-between border-b border-slate-100">
        <div><h1 className="text-3xl font-serif font-bold text-slate-900">Mon Profil</h1></div>
        <div className={`w-12 h-12 rounded-full ${level.bgColor} flex items-center justify-center border border-white`}><Award className={`w-6 h-6 ${level.iconColor}`} /></div>
      </div>

      <div className="p-4 space-y-4">
        <div onClick={() => setShowBadges(true)} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md relative overflow-hidden">
          <div className="absolute top-4 right-4 text-slate-300"><Info className="w-5 h-5"/></div>
          <div className="flex justify-between items-end mb-3">
             <div><p className="text-xs text-slate-400 font-bold uppercase">Niveau Actuel</p><h3 className={`font-serif text-xl font-bold ${level.iconColor}`}>{level.name}</h3></div>
             <p className="text-sm font-bold text-slate-700">{historyLen} scans</p>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${level.bar} rounded-full`} style={{width: `${Math.min(100, (historyLen/50)*100)}%`}}></div></div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-serif text-xl font-bold text-slate-900 mb-5 flex items-center"><PieChart className="w-5 h-5 mr-2 text-indigo-500"/> Ma Cave</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Bouteilles</p><p className="text-3xl font-bold text-slate-800">{totalBottles}</p></div>
            <div className="bg-slate-50 p-4 rounded-2xl border"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Valeur Estimée</p><p className="text-3xl font-bold text-emerald-700">{totalValue.toFixed(0)}€</p></div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Répartition par type</p>
          <div className="h-4 w-full flex rounded-full overflow-hidden mb-4">
            {countType('ROUGE') > 0 && <div style={{width: `${getPct(countType('ROUGE'))}%`}} className="bg-rose-800 h-full"></div>}
            {countType('BLANC') > 0 && <div style={{width: `${getPct(countType('BLANC'))}%`}} className="bg-amber-100 h-full"></div>}
            {countType('ROSE') > 0 && <div style={{width: `${getPct(countType('ROSE'))}%`}} className="bg-pink-300 h-full"></div>}
            {countType('PETILLANT') > 0 && <div style={{width: `${getPct(countType('PETILLANT'))}%`}} className="bg-yellow-400 h-full"></div>}
            {totalBottles === 0 && <div className="bg-slate-200 h-full w-full"></div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Paramètres</p>
          <button onClick={handleLogout} className="w-full flex items-center p-4 bg-slate-100 text-slate-700 rounded-2xl font-bold"><LogOut className="w-5 h-5 mr-3" /> Se déconnecter</button>
        </div>
      </div>

      {showBadges && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative shadow-2xl max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowBadges(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X className="w-5 h-5"/></button>
            <h3 className="font-serif text-2xl font-bold mb-6 text-center text-slate-900">Trophées & Collections</h3>
            <div className="space-y-3">
              {collectionBadges.map((badge) => {
                const unlocked = badge.count >= badge.req;
                return (
                  <div key={badge.id} className={`p-4 rounded-2xl border flex items-center justify-between ${unlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{badge.icon}</div>
                      <div>
                        <h4 className={`font-bold ${unlocked ? 'text-amber-900' : 'text-slate-700'}`}>{badge.name}</h4>
                        <p className="text-xs text-slate-500">{badge.desc}</p>
                      </div>
                    </div>
                    {unlocked ? <CheckCircle className="w-5 h-5 text-amber-500" /> : <span className="text-xs font-bold text-slate-400">{badge.count}/{badge.req}</span>}
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
    
    {/* OVERLAY AR */}
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
      <div className="absolute top-24 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
        <span className="text-white text-xs font-bold uppercase tracking-widest opacity-80">Analyse IA Active</span>
      </div>

      {/* Cadre de visée animé */}
      <div className="relative w-4/5 h-1/2 mt-10">
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-rose-500 rounded-tl-3xl"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-rose-500 rounded-tr-3xl"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-rose-500 rounded-bl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-rose-500 rounded-br-3xl"></div>
        
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
        <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/20 animate-[spin_4s_linear_infinite]" />
      </div>

      {/* Données flottantes */}
      <div className="absolute bottom-40 flex space-x-6 text-white/60 text-[10px] font-mono uppercase tracking-widest">
        <div className="flex flex-col items-center"><ScanLine className="w-4 h-4 mb-1 text-emerald-400"/><span>Forme</span></div>
        <div className="flex flex-col items-center"><Focus className="w-4 h-4 mb-1 text-amber-400 animate-pulse"/><span>Étiquette</span></div>
      </div>
    </div>

    <div className="relative flex-1">
      <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover" />
    </div>
    
    <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex items-center justify-center pb-8">
      <button onClick={ctx.capturePhoto} className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/30 flex items-center justify-center active:scale-90 transition-transform hover:bg-white/20 group">
        <div className="w-14 h-14 bg-white rounded-full group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.5)]"></div>
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
  
  const [activeTab, setActiveTab] = useState('infos');
  const [showBlindTasting, setShowBlindTasting] = useState(false);
  
  const [protocol, setProtocol] = useState(null);
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(false);
  
  const [blindNotes, setBlindNotes] = useState({ robe: '', nez: '', bouche: '' });
  const [blindResult, setBlindResult] = useState(null);
  const [isBlindLoading, setIsBlindLoading] = useState(false);

  const [tempType, setTempType] = useState('');
  const [tempAnnee, setTempAnnee] = useState('');
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

  const fetchProtocol = async () => {
    if (protocol) return;
    setIsLoadingProtocol(true);
    try {
      const prompt = `Agis comme un Maître Sommelier. Donne le protocole de service parfait pour ce vin : "${displayData.nom} ${displayData.annee}".
      Réponds en JSON strict : {"temperature": "ex: 16°C", "carafage": "ex: Oui, 2h avant", "verre": "ex: Verre type Bordeaux", "conseil": "Une phrase d'expert"}`;
      const res = await callGemini(prompt);
      setProtocol(extractJSON(res.candidates?.[0]?.content?.parts?.[0]?.text));
    } catch(e) {
      setProtocol({ temperature: "A température ambiante ou frais", carafage: "Non nécessaire", verre: "Verre classique", conseil: "Profitez de ce vin."});
    }
    setIsLoadingProtocol(false);
  };

  const finishBlindTasting = async () => {
    setIsBlindLoading(true);
    try {
      const prompt = `Le vin réel est : "${displayData.nom} ${displayData.annee} (${displayData.type_simplifie})". 
      Voici les notes de l'invité qui le déguste à l'aveugle : Robe=${blindNotes.robe}, Nez=${blindNotes.nez}, Bouche=${blindNotes.bouche}.
      Agis comme un jury de sommelier ludique. Compare ses notes avec la réalité de ce vin et donne une note sur 10 à l'invité.
      Réponds en JSON strict : {"note": "ex: 8/10", "commentaire": "Ton verdict pour l'invité en 25 mots max, sois fun."}`;
      const res = await callGemini(prompt);
      setBlindResult(extractJSON(res.candidates?.[0]?.content?.parts?.[0]?.text));
    } catch(e) {
      setBlindResult({ note: "?/10", commentaire: "Le sommelier IA a perdu sa voix, mais j'espère que c'était bon !" });
    }
    setIsBlindLoading(false);
  };

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
  const { nom, region, description, potentiel_garde, apogee, declin, statut_apogee, comparateur, accords_mets, accord_parfait } = displayData;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-8 relative">
      
      {/* MODE : FAIRE DÉGUSTER CE VIN (MODAL PLEIN ÉCRAN ULTRA ROBUSTE) */}
      {showBlindTasting && (
        <div className="fixed inset-0 bg-gradient-to-b from-[#1A100C] to-[#2D1B13] z-[100] flex flex-col p-6 animate-in fade-in overflow-y-auto">
          <button onClick={() => setShowBlindTasting(false)} className="absolute top-8 left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><ChevronLeft className="w-6 h-6"/></button>
          
          <div className="mt-16 text-center flex-1 max-w-sm mx-auto w-full pb-10">
            <div className="w-20 h-20 bg-rose-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
              <EyeOff className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-white mb-3">Dégustation Mystère</h2>
            <p className="text-rose-200/80 text-sm mb-8">Cachez ce téléphone et faites goûter ce vin à un ami. L'IA notera son palais !</p>

            {!blindResult ? (
              <div className="space-y-5 text-left">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center mb-3"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div>L'Œil (La Robe)</label>
                  <input type="text" placeholder="Ex: Jaune paille, rubis profond..." value={blindNotes.robe} onChange={e=>setBlindNotes({...blindNotes, robe: e.target.value})} className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 transition-colors" />
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center mb-3"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div>Le Nez (Arômes)</label>
                  <input type="text" placeholder="Ex: Fruits rouges, boisé, agrumes..." value={blindNotes.nez} onChange={e=>setBlindNotes({...blindNotes, nez: e.target.value})} className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 transition-colors" />
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center mb-3"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div>La Bouche</label>
                  <input type="text" placeholder="Ex: Tanins fondus, belle acidité..." value={blindNotes.bouche} onChange={e=>setBlindNotes({...blindNotes, bouche: e.target.value})} className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 transition-colors" />
                </div>
                <button onClick={finishBlindTasting} disabled={!blindNotes.robe || isBlindLoading} className="w-full py-5 mt-4 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/50 active:scale-95 transition-transform text-lg">
                  {isBlindLoading ? <RefreshCw className="w-6 h-6 animate-spin"/> : "Révéler la bouteille et la note"}
                </button>
              </div>
            ) : (
              <div className="bg-white/10 border border-white/20 p-8 rounded-3xl animate-in zoom-in shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-300 mb-2">Note du Sommelier IA</p>
                <div className="text-6xl mb-6 font-black text-white drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">{blindResult.note}</div>
                <div className="bg-black/40 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-white/60 mb-1">Le vin mystère était :</p>
                  <h3 className="text-xl font-bold text-amber-400">{nom}</h3>
                </div>
                <p className="text-white text-lg italic leading-relaxed mb-8">"{blindResult.commentaire}"</p>
                <button onClick={() => setShowBlindTasting(false)} className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-colors">Fermer la dégustation</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER IMAGE STANDARD */}
      <div className="relative h-64 bg-slate-900 overflow-hidden shrink-0 rounded-b-[40px] shadow-sm">
        <img src={ctx.imageSrc} alt="Scanned bottle blur" className="w-full h-full object-cover opacity-40 blur-md scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
        <div className="absolute inset-0 flex items-center justify-center p-6 pt-8">
          <img src={ctx.imageSrc} alt="Scanned bottle clear" className="max-h-full rounded-xl shadow-2xl border-2 border-white/10" />
        </div>
        
        <button onClick={ctx.goBack} className="absolute top-6 left-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors z-20"><ChevronLeft className="w-6 h-6" /></button>
        
        {currentScanObj && (
          <button onClick={() => ctx.handleShare(currentScanObj)} className="absolute top-6 right-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors z-20"><Share2 className="w-5 h-5" /></button>
        )}
      </div>
      
      <div className="px-5 -mt-6 relative z-10 space-y-5 pb-10">
        
        {/* EN-TÊTE PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="relative">
              <select value={tempType} onChange={(e) => handleTypeChange(e.target.value)} className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg outline-none cursor-pointer appearance-none pr-8 hover:bg-rose-100">
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
          
          <div className="flex items-center text-slate-500 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100 w-max">
            <span className="text-sm ml-2">Millésime :</span>
            <div className="relative flex items-center ml-2">
              <input type="text" value={tempAnnee} onChange={(e) => setTempAnnee(e.target.value)} onKeyDown={ctx.handleKeyDown} onBlur={() => handleYearChange(tempAnnee)} className="bg-white border border-slate-200 text-rose-900 px-3 py-1.5 rounded-lg w-24 outline-none focus:ring-2 focus:ring-rose-200 font-bold text-lg text-center shadow-sm" />
            </div>
          </div>
        </div>

        {/* LE GROS BOUTON INMANQUABLE : FAIRE DÉGUSTER */}
        <button onClick={() => setShowBlindTasting(true)} className="w-full bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl p-4 shadow-lg shadow-rose-600/30 flex items-center justify-between active:scale-95 transition-transform border border-rose-400/50">
          <div className="flex items-center">
             <div className="bg-white/20 p-2.5 rounded-full mr-3"><EyeOff className="w-6 h-6"/></div>
             <div className="text-left">
               <h3 className="font-bold text-lg leading-none mb-1">Faire déguster ce vin</h3>
               <p className="text-[10px] text-rose-200 uppercase tracking-widest font-bold">Test à l'aveugle ludique</p>
             </div>
          </div>
          <ChevronRight className="w-6 h-6 text-rose-300" />
        </button>

        {/* ONGLETS */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button onClick={() => setActiveTab('infos')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'infos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Fiche Technique</button>
          <button onClick={() => { setActiveTab('service'); fetchProtocol(); }} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Service & Accords</button>
        </div>

        {/* ONGLET SERVICE */}
        {activeTab === 'service' && (
          <div className="animate-in fade-in space-y-5">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm min-h-[200px]">
               {isLoadingProtocol ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                   <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                   <p className="font-bold">Le Sommelier prépare le service...</p>
                 </div>
               ) : protocol ? (
                 <div className="space-y-6">
                   <h3 className="font-serif text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Protocole de Service</h3>
                   <div className="flex items-start space-x-4">
                     <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0"><Clock className="w-6 h-6 text-indigo-600"/></div>
                     <div><p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Température & Aération</p><p className="font-bold text-slate-800">{protocol.temperature}</p><p className="text-sm text-slate-600">{protocol.carafage}</p></div>
                   </div>
                   <div className="flex items-start space-x-4">
                     <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center shrink-0"><Wine className="w-6 h-6 text-amber-600"/></div>
                     <div><p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Choix du Verre</p><p className="font-bold text-slate-800">{protocol.verre}</p></div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 border-l-4 border-l-amber-500 italic text-sm text-slate-700">"{protocol.conseil}"</div>
                 </div>
               ) : null}
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl shadow-sm border border-amber-100 p-6 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
              <div className="flex items-center space-x-4 mb-5 relative z-10">
                <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center shadow-sm border border-amber-300/50 transform rotate-3"><Star className="w-6 h-6 text-amber-800 fill-amber-800/20" /></div>
                <h3 className="text-2xl font-serif font-bold text-amber-950">L'Accord Parfait</h3>
              </div>
              <p className="text-amber-900 font-bold text-lg leading-relaxed relative z-10 bg-white/40 p-4 rounded-2xl border border-amber-100/50 backdrop-blur-sm">{accord_parfait}</p>
              {Array.isArray(accords_mets) && accords_mets.length > 0 && (
                 <div className="mt-6 pt-5 border-t border-amber-200/60 relative z-10">
                   <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-800/60 mb-4">Autres suggestions</h4>
                   <div className="flex flex-wrap gap-2">{accords_mets.map((plat, index) => <span key={index} className="bg-white/60 border border-amber-200/50 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{plat}</span>)}</div>
                 </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET INFOS TECHNIQUES */}
        {activeTab === 'infos' && (
          <div className="animate-in fade-in space-y-5">
            <div className="flex items-start space-x-3 text-slate-600 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" /><p className="text-sm leading-relaxed font-medium">{description}</p></div>

            {currentScanObj && (
              <div className="bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/20 p-6 text-white border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full mix-blend-screen filter blur-2xl opacity-50"></div>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <div><h3 className="font-serif text-xl font-bold text-slate-50">Dans ma cave</h3></div>
                  <div className="flex items-center space-x-3 bg-slate-800/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-700">
                    <button onClick={() => ctx.handleDirectStockChange(scanIdToUse, Math.max(0, stock - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors"><Minus className="w-5 h-5" /></button>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" value={stock} onChange={(e) => ctx.handleDirectStockChange(scanIdToUse, e.target.value)} onBlur={(e) => { if(e.target.value === '') ctx.handleDirectStockChange(scanIdToUse, '0') }} className="w-12 h-12 text-center text-2xl font-bold bg-transparent text-white outline-none focus:bg-slate-700 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => ctx.handleDirectStockChange(scanIdToUse, stock + 1)} className="w-12 h-12 flex items-center justify-center bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-lg shadow-rose-900/50"><Plus className="w-5 h-5" /></button>
                  </div>
                </div>
                {stock === 0 ? (
                  <button onClick={() => ctx.genericUpdate(scanIdToUse, { wishlist: !isWishlist })} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all border relative z-10 ${isWishlist ? 'bg-pink-900/60 border-pink-700 text-pink-100 shadow-inner' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}><Heart className={`w-5 h-5 ${isWishlist ? 'fill-current text-pink-400' : ''}`} /><span>{isWishlist ? 'Retirer de la liste d\'achats' : 'Ajouter à la liste d\'achats'}</span></button>
                ) : (
                  <div className="space-y-3 mt-5 pt-5 border-t border-slate-800 relative z-10">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><MapPin className="w-4 h-4 mr-2"/> Emplacement exact</label>
                    <input type="text" value={tempLocation} onChange={(e) => setTempLocation(e.target.value)} onBlur={() => ctx.genericUpdate(scanIdToUse, { location: tempLocation })} list="shelf-suggestions" placeholder="Ex: Étagère du haut, Cave à vin..." className="w-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-white rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder-slate-500" />
                    <datalist id="shelf-suggestions">{existingLocations.map(loc => <option key={loc} value={loc} />)}</datalist>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center space-x-3 mb-6"><div className="p-2 bg-indigo-50 rounded-lg"><Clock className="w-5 h-5 text-indigo-600" /></div><h3 className="font-serif text-xl font-bold text-slate-900">Temps & Apogée</h3></div>
              <div className="space-y-0 relative">
                <div className="absolute left-5 top-2 bottom-6 w-0.5 bg-slate-100"></div>
                <div className="flex items-start relative z-10 pb-8">
                  <div className="w-10 flex flex-col items-center shrink-0"><div className={`w-4 h-4 rounded-full border-4 border-white ${statut_apogee === 'A_GARDER' ? 'bg-indigo-500 shadow-[0_0_0_2px_rgba(99,102,241,0.2)] scale-125' : 'bg-slate-300'} transition-all`}></div></div>
                  <div className="-mt-1 ml-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full"><p className={`text-xs font-bold uppercase tracking-wider mb-1 ${statut_apogee === 'A_GARDER' ? 'text-indigo-600' : 'text-slate-500'}`}>Garde estimée</p><p className="text-base font-bold text-slate-800">{potentiel_garde}</p></div>
                </div>
                <div className="flex items-start relative z-10 pb-8">
                  <div className="w-10 flex flex-col items-center shrink-0"><div className={`w-5 h-5 rounded-full flex items-center justify-center border-4 border-white ${statut_apogee === 'APOGEE' ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)] scale-125' : 'bg-slate-300'} transition-all`}><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div></div>
                  <div className="-mt-1.5 ml-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 w-full shadow-sm"><p className={`text-xs font-bold uppercase tracking-wider mb-1 ${statut_apogee === 'APOGEE' ? 'text-emerald-700' : 'text-slate-500'}`}>Apogée parfaite</p><p className="text-lg font-bold text-emerald-900">Entre {apogee}</p></div>
                </div>
                <div className="flex items-start relative z-10">
                  <div className="w-10 flex flex-col items-center shrink-0"><div className={`w-4 h-4 rounded-full border-4 border-white ${statut_apogee === 'DECLIN' ? 'bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)] scale-125' : 'bg-slate-300'} transition-all`}></div></div>
                  <div className="-mt-1 ml-4 w-full pl-2"><p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${statut_apogee === 'DECLIN' ? 'text-red-600' : 'text-slate-400'}`}>Déclin du vin</p><p className="text-sm font-medium text-slate-600">{declin}</p></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3"><div className="p-2 bg-rose-50 rounded-lg"><Edit3 className="w-5 h-5 text-rose-800" /></div><h3 className="font-serif text-xl font-bold text-slate-900">Notes & Avis</h3></div>
                <div className="flex space-x-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  {[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => ctx.genericUpdate(scanIdToUse, { rating: star })} className="p-1 hover:scale-110 transition-transform"><Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-300'}`} /></button>)}
                </div>
              </div>
              <textarea value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} onBlur={() => ctx.genericUpdate(scanIdToUse, { notes: tempNotes })} placeholder="Arômes ressentis, occasion, personnes présentes..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:bg-white transition-all placeholder-slate-400" />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center space-x-2 mb-4"><Tag className="w-5 h-5 text-emerald-600" /><h3 className="text-lg font-semibold text-slate-800">Tarif Marchand</h3></div>
              <div className="flex items-end space-x-2 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-max">
                <div className="relative flex items-center">
                  <input type="number" value={tempPrix} onChange={(e) => setTempPrix(e.target.value)} onBlur={() => ctx.updateDataField(scanIdToUse, 'prix_unitaire_nombre', Number(tempPrix))} className="text-4xl font-bold text-slate-900 bg-white border border-slate-200 rounded-xl w-24 outline-none focus:ring-2 focus:ring-emerald-200 text-center shadow-sm py-1" />
                  <Edit3 className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-4xl font-bold text-slate-900 mb-1">€</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2">/ Bouteille</span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3 pt-4">
               {currentScanObj && currentScanObj.in_history !== false && <button onClick={() => ctx.setScanAction({id: scanIdToUse, type: 'history'})} className="w-full flex items-center justify-center space-x-2 py-4 bg-white text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-colors border border-slate-200"><EyeOff className="w-5 h-5" /><span>Retirer de l'historique</span></button>}
               {currentScanObj && currentScanObj.stock > 0 && <button onClick={() => ctx.setScanAction({id: scanIdToUse, type: 'cellar'})} className="w-full flex items-center justify-center space-x-2 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors border border-red-100"><Archive className="w-5 h-5" /><span>Sortir de la cave</span></button>}
            </div>
          </div>
        )}

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

  // 1. ON RÉPARE L'AIGUILLAGE DE L'APPAREIL PHOTO
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

      // Le fameux aiguillage corrigé :
      if (cameraMode === 'receipt') {
        analyzeReceipt(compressedImg);
      } else if (cameraMode === 'menu') {
        analyzeMenu(compressedImg); // 👈 Maintenant, il part au bon endroit !
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
        // Par défaut depuis la galerie, on analyse une bouteille
        analyzeImage(compressedImg); 
      }; 
      reader.readAsDataURL(file); 
    }
  };

  const SYSTEM_PROMPT = `Expert Sommelier. Réponds UNIQUEMENT en JSON. Format: {"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}`;

  // 2. LE NOUVEAU CERVEAU "SPÉCIAL MENU DE RESTAURANT"
  const analyzeMenu = async (base64Img) => {
    setView('analyzing');
    try {
      const b64Data = base64Img.split(',')[1];
      
      // On traduit la préférence technique en langage naturel pour l'IA
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
      {
        "nom": "Le nom exact du vin tel qu'écrit sur la carte",
        "type_simplifie": "ROUGE|BLANC|ROSE|PETILLANT",
        "annee": "L'année (ou N.M)",
        "region": "La région",
        "description": "Explique pourquoi ce vin est incroyable avec ${foodPrefText} (max 20 mots)",
        "prix_unitaire_nombre": LE_PRIX_INDIQUÉ_SUR_LA_CARTE,
        "accord_parfait": "Idéal avec ${foodPrefText}"
      }`;

      const result = await callGemini(prompt, b64Data);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedData = normalizeData(extractJSON(text));
      
      setAnalysisResult(parsedData);
      const finalImage = getGenericImageForType(parsedData.type_simplifie);
      setImageSrc(finalImage);

      const tempId = 'temp_' + Date.now();
      const newScanObj = {
        id: tempId,
        image: finalImage,
        data: parsedData,
        stock: 0, // Stock à 0 car c'est un vin bu au restaurant, on ne l'a pas en cave !
        in_history: true,
        wishlist: false,
        location: 'Dégusté au restaurant',
        timestamp: Date.now()
      };

      setScanHistory(prev => [newScanObj, ...prev]);
      
      // Permet à la vue Résultat de cibler le bon vin
      if (typeof setCurrentScanId === 'function') setCurrentScanId(tempId);
      
      setView('results');
    } catch(err) {
      setErrorMsg("Erreur lors de la lecture du menu. Vérifiez la netteté de la photo.");
      setView('error');
    }
  };

  // NOUVEAU : LE MOTEUR D'ANALYSE DE FACTURES
  const analyzeReceipt = async (base64Img) => {
    setView('analyzing');
    try {
      const b64Data = base64Img.split(',')[1];
      const prompt = `Extrait tous les vins de ce ticket de caisse ou de cette facture.
      Réponds UNIQUEMENT par un tableau JSON pur.
      Format attendu pour chaque vin : [{"nom":"Nom du vin", "annee":"2020", "prix_unitaire_nombre":15.5, "type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT", "region":"Bordeaux"}]`;

      const result = await callGemini(prompt, b64Data);
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsedArr = extractJSON(text);

      if (!Array.isArray(parsedArr) || parsedArr.length === 0) {
        setErrorMsg("Aucun vin trouvé sur cette facture.");
        setView('error');
        return;
      }

      let newScans = [];
      for (let item of parsedArr) {
        const norm = normalizeData(item);
        const tempId = 'temp_' + Date.now() + Math.random().toString(36).substr(2, 5);
        newScans.push({
          id: tempId,
          image: getGenericImageForType(norm.type_simplifie),
          data: norm,
          stock: 1,
          in_history: true,
          wishlist: false,
          location: '',
          timestamp: Date.now()
        });
      }

      setScanHistory(prev => [...newScans, ...prev]);
      showToast(`${newScans.length} vins ajoutés à la cave !`);
      setView('cellar'); // Redirige directement vers la cave pour voir l'import masssif
    } catch(err) {
      setErrorMsg("Erreur de lecture de la facture. Assurez-vous que l'image est nette.");
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