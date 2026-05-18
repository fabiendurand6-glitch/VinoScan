// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe, X, Trophy, TrendingUp, BarChart3, Target, Focus, Settings, Trash2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

// =========================================================================
// CONFIGURATION ET SECURITE
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

// --- MOTEUR DE CACHE GLOBAL & AFFILIATION ---
const checkGlobalCache = async (wineKey) => {
  try {
    const id = wineKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const snap = await getDoc(doc(db, "global_wine_cache", id));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return null; }
};

const saveToGlobalCache = async (wineKey, data) => {
  try {
    const id = wineKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "global_wine_cache", id), data);
  } catch (e) {}
};

const getAmazonAffiliateLink = (query) => {
  const baseUrl = "https://www.amazon.fr/s?k=";
  return `${baseUrl}${encodeURIComponent(query)}&tag=vinoscan-21`;
};

const getRecommendedAccessory = (type) => {
  switch(type) {
    case 'ROUGE': return { name: "Carafe à décanter en cristal", search: "carafe a decanter vin rouge cristal" };
    case 'BLANC': return { name: "Seau à glace design", search: "seau a glace vin inox" };
    case 'PETILLANT': return { name: "Coffret de flûtes à Champagne", search: "verres flutes champagne cristal" };
    default: return { name: "Tire-bouchon sommelier professionnel", search: "tire bouchon sommelier professionnel" };
  }
};

const getGenericImageForType = (type) => {
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?auto=format&fit=crop&w=800&q=80";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800&q=80";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800&q=80";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80"; 
  }
};

// --- MOTEUR DE TEMPS (CALCUL DES APOGEES INITIALES REHABILITE) ---
const recalculateDates = (anneeStr, baseGardeMin = 2, baseGardeMax = 5) => {
  const currentYear = new Date().getFullYear();
  const millesimeMatch = String(anneeStr).match(/\d{4}/);
  
  if (!millesimeMatch) {
    return { potentiel_garde: "À consommer rapidement", apogee: "Prêt à boire", declin: "Dans les 2-3 ans", statut_apogee: "APOGEE" };
  }

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
    
    let gardeMin = 2; let gardeMax = 5;
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
    else if (strToSearch.includes('ROSE')) type_simplifie = 'ROSE';
    else if (strToSearch.includes('CHAMPAGNE') || strToSearch.includes('PETILLANT')) type_simplifie = 'PETILLANT';
    
    if (safeAccordsMets.length === 0) {
      if (type_simplifie === 'ROUGE') safeAccordsMets = ['Viande rouge grillée', 'Plateau de fromages', 'Plats en sauce'];
      else if (type_simplifie === 'BLANC') safeAccordsMets = ['Poissons et fruits de mer', 'Volaille', 'Fromage de chèvre'];
      else if (type_simplifie === 'ROSE') safeAccordsMets = ['Apéritif', 'Grillades estivales', 'Salades'];
      else if (type_simplifie === 'PETILLANT') safeAccordsMets = ['Apéritif', 'Desserts légers', 'Saint-Jacques'];
      else safeAccordsMets = ['Plats conviviaux'];
    }

    return { nom, annee, region, type, type_simplifie, prix_unitaire_nombre: Number(data.prix_unitaire_nombre) || 0, description, accord_parfait: data.accord_parfait || safeAccordsMets[0], accords_mets: safeAccordsMets, baseGardeMin: gardeMin, baseGardeMax: gardeMax, ...dynamicDates };
  } catch (e) {
    return { nom: 'Erreur d\'analyse', type_simplifie: 'AUTRE', accords_mets: ['Aucun accord trouvé'] };
  }
};

const compressImage = (base64Str, maxWidth = 800) => new Promise((resolve) => {
  const img = new window.Image(); img.src = base64Str;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let width = img.width, height = img.height;
    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6));
  };
});

// =========================================================================
// MOTEUR IA GEMINI SECURISE
// =========================================================================
const callGemini = async (prompt, b64Data = null) => {
  if (!apiKey || apiKey === "") {
    const isList = prompt.includes("propriété \"vins\"");
    const mockWine = { nom: "Château Exemple Premium", annee: "2021", type_simplifie: "ROUGE", region: "Bordeaux", description: "Mode démo activé. Veuillez configurer VITE_GEMINI_API_KEY sur votre serveur Vercel.", prix_unitaire_nombre: 25, potentiel_garde: "3-8 ans", apogee: "2024 - 2029", declin: "Dès 2030", statut_apogee: "APOGEE", accord_parfait: "Filet de bœuf rôti" };
    return { candidates: [{ content: { parts: [{ text: JSON.stringify(isList ? { vins: [mockWine, mockWine, mockWine] } : mockWine) }] } }] };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
  if (b64Data) payload.contents[0].parts.push({ inlineData: { mimeType: "image/jpeg", data: b64Data } });
  
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Erreur de communication avec l'intelligence artificielle.");
  return await response.json();
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a] text-white"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-bold">Erreur Système</h2><button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-full mt-4">Redémarrer l'App</button></div>;
    return this.props.children;
  }
}

// =========================================================================
// INTERFACES ET COMPOSANTS VISUELS (100% SOMBRE & OR)
// =========================================================================
const NavigationBar = ({ ctx }) => (
  <div className="absolute bottom-0 w-full bg-[#1a1a1a] border-t border-[#333] flex justify-around items-center pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20 h-16 select-none">
    {[{id:'home', i:Home, text:'Scanner'},{id:'cellar', i:Archive, text:'Cave'},{id:'recommendation', i:Sparkles, text:'Conseil'},{id:'history', i:History, text:'Histo'},{id:'account', i:User, text:'Profil'}].map(item => {
      const active = ctx.view.includes(item.id) || (item.id === 'home' && ['manualSearch', 'menuConfig', 'quiz'].includes(ctx.view)) || (item.id === 'recommendation' && ctx.view === 'recommendationList');
      return (
        <button key={item.id} onClick={() => ctx.setView(item.id)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${active ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-300'}`}>
          <item.i className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-wider">{item.text}</span>
        </button>
      );
    })}
  </div>
);

const AuthView = ({ auth }) => {
  const [mode, setMode] = useState('signup'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const handleAuth = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { if (mode === 'login') await signInWithEmailAndPassword(auth, email, password); else await createUserWithEmailAndPassword(auth, email, password); } 
    catch (x) { setError("Erreur de connexion. Vérifiez vos identifiants."); } finally { setLoading(false); }
  };
  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] flex flex-col relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center mb-8 border border-[#D4AF37]/30"><Wine className="w-12 h-12 text-[#D4AF37]" /></div>
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] mb-2 drop-shadow-sm">VinoScan</h2>
        <p className="text-[#D4AF37]/60 text-xs font-bold uppercase tracking-widest text-center mb-12">Accès Privé Réservé</p>
        <form onSubmit={handleAuth} className="w-full space-y-5">
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Adresse Email</label>
            <input type="email" value={email} onChange={x=>setEmail(x.target.value)} className="w-full bg-transparent text-white outline-none font-medium" required />
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={x=>setPassword(x.target.value)} className="w-full bg-transparent text-white outline-none font-medium" required />
          </div>
          {error && <p className="text-red-500 text-xs text-center font-bold bg-red-950/20 py-2 rounded-lg border border-red-900/50">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all flex justify-center disabled:opacity-50">
            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (mode === 'login' ? 'Ouvrir la cave' : 'Créer ma cave privée')}
          </button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-12 text-slate-400 text-sm font-medium hover:text-[#D4AF37] transition-colors">
          {mode === 'login' ? "Nouveau membre ? Créer un compte gratuit" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
};

const HomeView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-[#0a0a0a] overflow-hidden select-none">
    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#D4AF37]/10 to-transparent pointer-events-none"></div>
    <div className="text-center space-y-4 relative z-10 mt-10">
      <div className="mx-auto w-32 h-32 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-[#D4AF37]/30">
        <Wine className="w-14 h-14 text-[#D4AF37]" />
      </div>
      <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] drop-shadow-sm">VinoScan</h1>
      <p className="text-[#D4AF37]/60 max-w-sm mx-auto text-sm font-medium uppercase tracking-widest">Le Sommelier dans votre poche</p>
    </div>
    <div className="w-full max-w-sm space-y-4 pt-8 relative z-10">
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black p-5 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all hover:bg-[#AA7C11]">
        <Camera className="w-6 h-6" /><span className="font-black text-xl">Scanner une bouteille</span>
      </button>
      <button onClick={() => ctx.startCamera('receipt')} className="w-full flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#F5F5F5] p-5 rounded-full active:scale-95 transition-all hover:border-[#D4AF37]/50">
        <Receipt className="w-6 h-6 text-slate-400" /><span className="font-bold text-lg">Scanner une facture</span>
      </button>
      <div className="flex space-x-4 pt-2">
        <button onClick={() => ctx.setView('menuConfig')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-5 rounded-full shadow-sm active:scale-95 hover:border-[#D4AF37]/50 transition-colors">
          <BookOpen className="w-5 h-5" /><span className="font-bold text-xs uppercase">Carte Vins</span>
        </button>
        <button onClick={() => ctx.setView('quiz')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-5 rounded-full shadow-sm active:scale-95 hover:border-[#D4AF37]/50 transition-colors">
          <Gamepad2 className="w-5 h-5" /><span className="font-bold text-xs uppercase">Mini-Jeu</span>
        </button>
      </div>
      <div className="flex space-x-4">
        <label className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl cursor-pointer shadow-sm active:scale-95 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-colors">
          <ImageIcon className="w-6 h-6 mb-1" /><span className="font-bold text-[10px] uppercase">Galerie</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e)} />
        </label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl shadow-sm active:scale-95 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-colors">
          <Search className="w-6 h-6 mb-1" /><span className="font-bold text-[10px] uppercase">Recherche</span>
        </button>
      </div>
    </div>
  </div>
);

const ManualSearchView = ({ ctx }) => {
  const [query, setQuery] = useState('');
  const handleSearch = (e) => { e.preventDefault(); if(query.trim()) ctx.searchWineText(query); };
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Recherche Manuelle</h1><p className="text-slate-500 text-xs mt-1">Trouver un grand cru par son nom</p></div>
      </div>
      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex: Château Margaux 2015" className="w-full pl-12 pr-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-2xl outline-none focus:border-[#D4AF37] text-lg"/>
          </div>
          <button type="submit" disabled={!query.trim()} className="w-full py-4 bg-[#D4AF37] text-black rounded-full font-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 hover:bg-[#AA7C11] transition-all">Rechercher</button>
        </form>
      </div>
    </div>
  );
};

const MenuConfigView = ({ ctx }) => {
  const getFoodLabel = (f) => {
    const labels = { 'ALL': 'Peu importe', 'APERITIF': 'Apéritif & Tapas', 'VIANDE_ROUGE': 'Viande Rouge', 'VIANDE_BLANCHE': 'Volaille & Porc', 'POISSON': 'Poisson & Mer', 'FROMAGE': 'Fromage' };
    return labels[f] || f;
  };
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le bon choix</h1><p className="text-slate-400 text-xs mt-1">Scanner la carte des vins d'un restaurant</p></div>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Que mangez-vous ce soir ?</span></h3>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(f => (
              <button key={f} onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: f})} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${ctx.menuPrefs.food === f ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md' : 'bg-[#1a1a1a] text-slate-400 border-[#333] hover:text-white'}`}>{getFoodLabel(f)}</button>
            ))}
          </div>
        </div>
        <button onClick={() => ctx.startCamera('menu')} className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black rounded-full shadow-lg"><Camera className="inline w-5 h-5 mr-2" />Scanner le Menu</button>
      </div>
    </div>
  );
};

const RecommendationView = ({ ctx }) => {
  const [recMode, setRecMode] = useState('menu'); 
  const [ft, setFt] = useState('ALL'); const [ff, setFf] = useState('ALL'); const [fp, setFp] = useState('ALL');
  const [dish, setDish] = useState(''); const [ld, setLd] = useState(false);
  const handleRec = () => ctx.fetchAIRecommendation(ft, 'ALL', ff, fp);
  const handleAsk = async () => {
    if(!dish) return; setLd(true);
    try {
      const w = ctx.scanHistory.filter(i=>i.stock>0); if(!w.length) throw new Error("Cave vide");
      const list = w.map(i=>`[ID: ${i.id}] ${i.data.nom}`).join('\n');
      const res = await callGemini(`Plat: ${dish}. Vins en cave:\n${list}. Choisis le meilleur vin. Retourne UNIQUEMENT du JSON pur : {"chosen_id":"ID", "explication":"Max 15 mots"}`);
      const parsed = extractJSON(res.candidates[0].content.parts[0].text);
      const c = w.find(x=>x.id===parsed.chosen_id);
      if(!c) throw new Error("IA fail"); ctx.showToast(`Conseil du sommelier chargé !`); ctx.openExistingWine(c, 'recommendation');
    } catch(e) { ctx.setErrorMsg("Désolé, aucun accord parfait n'a pu être extrait de votre stock actuel."); ctx.setView('error'); } finally { setLd(false); }
  };

  const imgTirebouchon = "https://images.unsplash.com/photo-1585652874135-c335805e7144?auto=format&fit=crop&w=800&q=80";
  const imgCarafe = "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&w=800&q=80";
  const imgVerres = "https://images.unsplash.com/photo-1578339031418-410a566f1088?auto=format&fit=crop&w=800&q=80";
  const imgCoravin = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex items-center sticky top-0 z-10">{recMode!=='menu' && <button onClick={()=>setRecMode('menu')} className="mr-4 text-slate-400 hover:text-white"><ChevronLeft className="w-6 h-6"/></button>}<h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Le Sommelier</h1></div>
      <div className="p-6 space-y-10">
        {recMode==='menu' && (
          <div className="space-y-6 mt-4">
            <button onClick={()=>setRecMode('buy')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg hover:border-[#D4AF37]/50 text-left flex items-center space-x-5 group transition-all"><div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><ShoppingCart className="w-6 h-6 text-[#D4AF37]" /></div><div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Acheter un vin</h3><p className="text-xs text-slate-400 leading-relaxed">Trouver la perle rare selon votre repas et votre budget.</p></div></button>
            <button onClick={()=>setRecMode('cellar')} className="w-full bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-[0_0_20px_rgba(212,175,55,0.1)] text-left flex items-center space-x-5 relative overflow-hidden group transition-all"><div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><Archive className="w-6 h-6 text-[#D4AF37]" /></div><div className="relative z-10"><h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center mb-1">Que boire ce soir ? <Sparkles className="w-4 h-4 ml-2 text-[#D4AF37]"/></h3><p className="text-xs text-slate-400 leading-relaxed">L'IA fouille votre propre cave pour l'accord parfait.</p></div></button>
            <button onClick={()=>setRecMode('boutique')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg hover:border-[#D4AF37]/50 text-left flex items-center space-x-5 group transition-all"><div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><Wine className="w-6 h-6 text-[#D4AF37]" /></div><div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">La Boutique</h3><p className="text-xs text-slate-400 leading-relaxed">Accessoires premiums d'exception sélectionnés pour vous.</p></div></button>
          </div>
        )}
        {recMode==='cellar' && (
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-8 text-center shadow-lg"><div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333]"><Utensils className="w-10 h-10 text-[#D4AF37]" /></div><h3 className="font-serif text-2xl font-bold text-white mb-3">Que préparez-vous ?</h3><p className="text-sm text-slate-400 mb-6">Le sommelier va chercher la pépite correspondante dans votre cave.</p><input value={dish} onChange={e=>setDish(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#333] p-5 text-white rounded-xl focus:border-[#D4AF37] outline-none mb-6 shadow-inner" placeholder="Ex: Magret de canard, Risotto..." /><button onClick={handleAsk} disabled={!dish||ld} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-bold text-lg rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)]">{ld?"Recherche dans votre stock...":"Fouiller ma cave"}</button></div>
        )}
        {recMode==='buy' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div><h3 className="text-white mb-3 font-serif text-lg font-bold flex items-center"><Wine className="w-4 h-4 mr-2 text-[#D4AF37]"/>Couleur du vin</h3><div className="flex gap-2 flex-wrap">{[['ALL','Peu importe'],['ROUGE','Rouge'],['BLANC','Blanc'],['ROSE','Rosé'],['PETILLANT','Bulles']].map(t=><button key={t[0]} onClick={()=>setFt(t[0])} className={`px-5 py-3 rounded-full text-xs font-bold transition-all border ${ft===t[0]?'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105':'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t[1]}</button>)}</div></div>
            <div><h3 className="text-white mb-3 font-serif text-lg font-bold flex items-center"><Euro className="w-4 h-4 mr-2 text-[#D4AF37]"/>Gamme de Prix</h3><div className="flex gap-2 flex-wrap">{[['ALL','Libre'],['BUDGET','Abordable (<20€)'],['MEDIUM','Plaisir (20-50€)'],['PREMIUM','Prestige (>50€)']].map(t=><button key={t[0]} onClick={()=>setFp(t[0])} className={`px-5 py-3 rounded-full text-xs font-bold transition-all border ${fp===t[0]?'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105':'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t[1]}</button>)}</div></div>
            <div><h3 className="text-white mb-3 font-serif text-lg font-bold flex items-center"><Utensils className="w-4 h-4 mr-2 text-[#D4AF37]"/>Type de Plat</h3><div className="flex gap-2 flex-wrap">{[['ALL','Tout repas'],['VIANDE_ROUGE','Viande Rouge'],['POISSON','Poisson / Mer'],['FROMAGE','Fromages']].map(t=><button key={t[0]} onClick={()=>setFf(t[0])} className={`px-5 py-3 rounded-full text-xs font-bold transition-all border ${ff===t[0]?'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105':'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t[1]}</button>)}</div></div>
            <button onClick={handleRec} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] mt-4">Trouver la bouteille idéale</button>
          </div>
        )}
        {recMode==='boutique' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 pb-10">
            <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group"><div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0"><img src={imgTirebouchon} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="Tire-bouchon" /><div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div><div className="absolute bottom-4 left-4 right-4 flex justify-between items-end"><div><span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Ouverture</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Le Sommelier</h5></div><span className="font-bold text-[#D4AF37] text-xl">~25 €</span></div></div><div className="p-5 flex flex-col space-y-4"><p className="text-sm text-slate-400 leading-relaxed">Limonadier professionnel à double levier. Extraction parfaite sans briser le liège.</p><a href={getAmazonAffiliateLink("tire bouchon sommelier professionnel double levier")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a></div></div>
            <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group"><div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0"><img src={imgCarafe} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Carafe" /><div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div><div className="absolute bottom-4 left-4 right-4 flex justify-between items-end"><div><span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Aération</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Carafe Cristal</h5></div><span className="font-bold text-[#D4AF37] text-xl">~45 €</span></div></div><div className="p-5 flex flex-col space-y-4"><p className="text-sm text-slate-400 leading-relaxed">Oxygénation maximale à base large. Parfaite pour assouplir les tanins des crus tanniques.</p><a href={getAmazonAffiliateLink("carafe a decanter vin cristal")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a></div></div>
            <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group"><div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0"><img src={imgVerres} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="Verres" />	<div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div><div className="absolute bottom-4 left-4 right-4 flex justify-between items-end"><div><span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Dégustation</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Verres Universels</h5></div><span className="font-bold text-[#D4AF37] text-xl">~35 €</span></div></div><div className="p-5 flex flex-col space-y-4"><p className="text-sm text-slate-400 leading-relaxed">Coffret de 6 verres en cristallin de forme tulipe pour concentrer les arômes fins.</p><a href={getAmazonAffiliateLink("verres de degustation vin cristallin")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a></div></div>
            <div className="bg-gradient-to-b from-[#1A1A1A] to-[#0a0a0a] rounded-3xl shadow-[0_0_20px_rgba(212,175,55,0.1)] border border-[#D4AF37]/30 overflow-hidden group"><div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0"><img src={imgCoravin} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Coravin" /><div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent opacity-90"></div><div className="absolute bottom-4 left-4 right-4 flex justify-between items-end"><div><span className="text-[10px] text-black font-bold uppercase tracking-widest bg-[#D4AF37] px-2 py-1 rounded shadow-md">Choix Pro</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Système Coravin</h5></div><span className="font-bold text-[#D4AF37] text-xl">~199 €</span></div></div><div className="p-5 flex flex-col space-y-4"><p className="text-sm text-slate-300 leading-relaxed">Servez-vous sans jamais déboucher, préservant le vin de toute trace d'oxydation.</p><a href={getAmazonAffiliateLink("coravin systeme preservation vin")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold bg-[#D4AF37] text-black py-3 rounded-xl hover:bg-[#AA7C11] transition-colors shadow-lg shadow-[#D4AF37]/20">Découvrir le système</a></div></div>
          </div>
        )}
      </div>
    </div>
  );
};
// =========================================================================
// CAVE PRESTIGE ET ERGONOMIQUE (100% NIGHT & GOLD - LOGIQUE COMPLETE RETABLIE)
// =========================================================================
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
  
  // TOUS LES FILTRES DE CAVE RECONNECTES ENSEMBLE SANS COLLISION
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
      setSelectedBottle(null); setNewShelfName(''); ctx.showToast("Bouteille déplacée !");
    }
  };

  // LE CERVEAU SOMMELIER CONNECTÉ DIRECTEMENT SUR L'ONGLET CAVE
  const handleAskCellarSommelier = async () => {
    if (!pairingDish.trim()) return;
    setIsPairingLoading(true);
    try {
      const inStockWines = ctx.scanHistory.filter(w => w.stock > 0);
      if (inStockWines.length === 0) throw new Error("Cave vide");
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} (${w.data.type_simplifie})`).join('\n');
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}". Voici les vins de sa cave : \n${inventoryString}\nChoisis le meilleur flacon. Réponds UNIQUEMENT en JSON : {"chosen_id": "ID", "explication": "max 15 mots"}`;
      const result = await callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur");
      setPairingResult({ wine: chosenWine, explication: parsed.explication });
    } catch (e) {
      ctx.setErrorMsg("Le sommelier n'a pas pu analyser vos bouteilles pour ce plat."); ctx.setView('error');
    } finally { setIsPairingLoading(false); }
  };

  const getApogeeBadge = (statut) => {
    switch(statut) {
      case 'A_GARDER': return <div className="flex items-center space-x-1 text-xs text-indigo-400 bg-indigo-900/30 border border-indigo-800/40 px-2 py-0.5 rounded font-medium"><Clock className="w-3 h-3" /><span>À garder</span></div>;
      case 'DECLIN': return <div className="flex items-center space-x-1 text-xs text-red-400 bg-red-900/30 border border-red-800/40 px-2 py-0.5 rounded font-medium"><TrendingDown className="w-3 h-3" /><span>Déclin</span></div>;
      default: return <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded font-medium"><CheckCircle className="w-3 h-3" /><span>Apogée</span></div>;
    }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=400&auto=format&fit=crop";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 relative">
      {/* HEADER DE CAVE */}
      <div className="bg-[#1A1A1A] pt-12 pb-4 px-4 shadow-xl border-b border-[#333] z-10 sticky top-0">
        <div className="flex justify-between items-end mb-4">
          <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Mes Vins</h1><p className="text-slate-400 text-sm mt-1">{totalBottles} flacons rangés</p></div>
          <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estimation</p><div className="text-emerald-500"><span className="text-2xl font-bold">{totalValue.toFixed(0)}</span>€</div></div>
        </div>

        <div className="flex bg-[#0a0a0a] p-1 rounded-xl mb-4 border border-[#333]">
          <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'STOCK' ? 'bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/20 shadow-md' : 'text-slate-500'}`}>En Cave</button>
          <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'WISHLIST' ? 'bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/20 shadow-md' : 'text-slate-500'}`}>Liste d'Achats</button>
        </div>

        {/* FILTRES COMPLETS RETABLIS */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-[#333] pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtres de recherche</span>
            <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-[#333]">
               <button onClick={() => { setViewMode('list'); setReorgMode(false); }} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-slate-600'}`}><List className="w-4 h-4" /></button>
               <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md ${viewMode === 'shelves' ? 'bg-[#1A1A1A] text-white' : 'text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-full text-xs font-medium border ${filterType === t ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t === 'ALL' ? 'Tous' : t}</button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            {['ALL', 'A_GARDER', 'APOGEE', 'DECLIN'].map(a => {
              const lbl = { ALL: 'Toutes dates', A_GARDER: 'À garder', APOGEE: 'À boire', DECLIN: 'Déclin' };
              return <button key={a} onClick={() => setFilterApogee(a)} className={`px-3 py-1 rounded-full text-xs font-medium border ${filterApogee === a ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{lbl[a]}</button>
            })}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            <Utensils className="w-4 h-4 text-slate-500 shrink-0" />
            {['ALL', 'VIANDE', 'POISSON', 'FROMAGE', 'APERITIF'].map(f => (
              <button key={f} onClick={() => setFilterFood(f)} className={`px-3 py-1 rounded-full text-xs font-medium border ${filterFood === f ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{f === 'ALL' ? 'Tous plats' : f}</button>
            ))}
          </div>
        </div>
      </div>
      
      {/* CORPS DE LA CAVE SANS DOUBLONS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cellarTab === 'STOCK' && totalBottles > 0 && (
          <button onClick={() => {setShowPairingModal(true); setPairingResult(null); setPairingDish('');}} className="w-full bg-[#1A1A1A] border border-[#D4AF37]/30 text-white rounded-3xl p-4 shadow-lg flex items-center justify-between active:scale-95 transition-transform mb-4">
            <div className="text-left flex-1 pr-4">
              <h3 className="font-serif text-xl font-bold flex items-center mb-1"><Sparkles className="w-5 h-5 mr-2 text-[#D4AF37]"/> Que boire ce soir ?</h3>
              <p className="text-xs text-slate-400">Le sommelier trouve la bouteille idéale pour votre repas.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#D4AF37]" />
          </button>
        )}

        {viewMode === 'shelves' && cellarTab === 'STOCK' && (
          <div className="flex justify-between items-center bg-[#1A1A1A] border border-[#333] rounded-xl p-3 mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase"><b className="text-[#D4AF37]">Rangement :</b> Glissez une bouteille pour l'ordonner.</p>
            <button onClick={() => { setReorgMode(!reorgMode); setSelectedBottle(null); }} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${reorgMode ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}>
              <GripHorizontal className="w-3 h-3" /><span>{reorgMode ? 'Terminer' : 'Mobile'}</span>
            </button>
          </div>
        )}

        {/* AFFICHAGE EN MODE LISTE "DISCOVERY" ET COHÉRENT */}
        {filteredItems.length > 0 && viewMode === 'list' && (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-[#1A1A1A] rounded-3xl border border-[#333] overflow-hidden hover:border-[#D4AF37]/40 transition-colors group">
                <div onClick={() => ctx.openExistingWine(item, 'cellar')} className="flex items-stretch cursor-pointer">
                  <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded">{item.data.type_simplifie}</span>
                        <span className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-0.5 rounded-md border border-[#333]">{item.data.annee}</span>
                      </div>
                      <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-2 truncate font-bold group-hover:text-[#D4AF37] transition-colors">{item.data.nom}</h3>
                      {item.location && <p className="text-xs text-slate-500 font-medium flex items-center mt-2"><MapPin className="w-3 h-3 mr-1 text-[#D4AF37]"/> {item.location}</p>}
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#333]">
                      {getApogeeBadge(item.data.statut_apogee)}
                      <span className="text-sm font-bold text-emerald-400 bg-emerald-900/20 border border-emerald-800/40 px-2.5 py-1 rounded">{item.data.prix_unitaire_nombre}€</span>
                    </div>
                  </div>
                  {/* PROTECTIONFLEXBOX CONTRE L'ECRASEMENT DES TEXTES LONGS */}
                  <div className="w-28 shrink-0 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-2.5">
                    <img src={item.image || fallbackImg} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt={item.data.nom} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    {cellarTab === 'STOCK' && item.stock > 1 && <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border border-black shadow-md">x{item.stock}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AFFICHAGE EN ETAGE (SHELVES) AVEC LE DROPAREA FLUIDE */}
        {filteredItems.length > 0 && viewMode === 'shelves' && (
          <div className="space-y-10 mt-4">
             {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                <div key={shelfName} className="mb-4">
                   <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="font-serif text-lg font-bold text-white flex items-center"><MapPin className="w-4 h-4 mr-2 text-[#D4AF37]" /> {shelfName}</h3>
                      <span className="bg-[#1A1A1A] border border-[#333] text-slate-400 text-xs px-2.5 py-1 rounded-full">{bottles.length} bouteilles</span>
                   </div>
                   <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)} className="grid grid-cols-3 gap-3 bg-[#1A1A1A]/40 p-3 rounded-3xl border border-[#333] shadow-inner min-h-[180px]">
                      {bottles.map(bottle => (
                         <div key={bottle.id} draggable={!reorgMode} onDragStart={(e) => handleDragStart(e, bottle)} onDragEnd={() => setDraggedBottle(null)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName, bottle.id)} onClick={() => { if (reorgMode) setSelectedBottle(bottle); else ctx.openExistingWine(bottle, 'cellar'); }} className={`relative flex flex-col bg-[#1A1A1A] rounded-2xl p-2 shadow-md border border-[#333] cursor-pointer group ${draggedBottle === bottle.id ? 'opacity-40' : 'hover:border-[#D4AF37]/40'} ${reorgMode ? 'ring-1 ring-[#D4AF37] animate-pulse' : ''}`}>
                            <div className="relative h-24 w-full mb-2 flex items-center justify-center bg-[#0a0a0a] rounded-xl border border-[#222]">
                               <img src={bottle.image} onError={(e) => { e.target.onerror = null; e.target.src = fallbackImg; }} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" alt={bottle.data.nom} />
                               {cellarTab === 'STOCK' && bottle.stock > 1 && <span className="absolute -top-1.5 -right-1.5 bg-[#D4AF37] text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border border-black shadow-sm">x{bottle.stock}</span>}
                            </div>
                            <div className="text-center min-w-0">
                               <span className="text-[8px] font-bold uppercase tracking-wider block text-slate-500 mb-0.5">{bottle.data.type_simplifie}</span>
                               <h4 className="text-[11px] font-bold text-[#F5F5F5] leading-tight line-clamp-1">{bottle.data.nom}</h4>
                            </div>
                         </div>
                      ))}
                      {Array.from({length: Math.max(0, 3 - (bottles.length % 3 === 0 && bottles.length > 0 ? 3 : bottles.length % 3))}).map((_, i) => (
                        <div key={`empty-${i}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)} className="border border-dashed border-[#222] rounded-2xl bg-[#0a0a0a]/30 min-h-[120px]"></div>
                      ))}
                   </div>
                </div>
             ))}
             <div onDragOver={handleDragOver} onDrop={(e) => { e.preventDefault(); setDraggedBottle(null); const name = window.prompt("Nom du nouvel emplacement ?"); if (name) handleDrop(e, name); }} className="border border-dashed border-[#333] rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all cursor-pointer"><Plus className="w-6 h-6 mb-1" /><p className="font-bold text-[10px] uppercase tracking-wider text-center">Glisser un flacon ici pour<br/>créer une étagère</p></div>
          </div>
        )}
      </div>

      {/* POP-UP SOMMELIER DE CELLAR (RECONSTRUITE ET ENTIÈRE) */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 w-full max-w-sm relative shadow-2xl text-white">
            <button onClick={() => setShowPairingModal(false)} className="absolute top-4 right-4 p-2 bg-[#0a0a0a] border border-[#333] rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            {!pairingResult ? (
              <div className="space-y-4 mt-4">
                <div className="w-14 h-14 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center mx-auto mb-2"><Utensils className="w-6 h-6 text-[#D4AF37]"/></div>
                <h3 className="font-serif text-xl font-bold text-center text-[#F5F5F5]">Que cuisinez-vous ?</h3>
                <p className="text-xs text-center text-slate-400">Le sommelier virtuel va analyser votre stock de bouteilles privées.</p>
                <input autoFocus type="text" placeholder="Ex: Magret de canard, Risotto..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-4 bg-[#0a0a0a] border border-[#333] text-white rounded-xl focus:border-[#D4AF37] outline-none text-sm" />
                <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50 font-sans tracking-wide">{isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Fouiller mes flacons"}</button>
              </div>
            ) : (
              <div className="space-y-4 mt-4 animate-in slide-in-from-bottom-4">
                <h3 className="font-serif text-lg font-bold text-center text-[#D4AF37]">Le choix idéal dans votre stock :</h3>
                <div onClick={() => {setShowPairingModal(false); ctx.openExistingWine(pairingResult.wine, 'cellar');}} className="border border-[#333] bg-[#0a0a0a] rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:border-[#D4AF37]/40 transition-all">
                  <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-[#1A1A1A] border border-[#222]"><img src={pairingResult.wine.image} onError={(e) => {e.target.onerror=null; e.target.src=fallbackImg;}} className="max-w-full max-h-full object-contain" alt="wine" /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-[#D4AF37] uppercase bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#333]">{pairingResult.wine.data.type_simplifie}</span>
                    <h4 className="font-bold text-white leading-tight mb-1 truncate text-sm mt-1">{pairingResult.wine.data.nom}</h4>
                    <p className="text-xs text-slate-400 italic line-clamp-2">"{pairingResult.explication}"</p>
                  </div>
                </div>
                <button onClick={() => setShowPairingModal(false)} className="w-full py-3 bg-[#333] text-white font-bold rounded-xl mt-2 border border-[#444]">Fermer l'expert</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// === FICHE DÉCOUVERTE COMPLÈTE (RESULTSVIEW - LOGIQUE DE SERVICE ET ONGLETS RETABLIE) ===
const ResultsView = ({ ctx }) => {
  let currentItem = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  if (!currentItem && ctx.analysisResult) currentItem = ctx.scanHistory.find(s => s.data?.nom === ctx.analysisResult.nom);
  if (!currentItem) return null;
  
  const d = currentItem.data;
  const [activeTab, setActiveTab] = useState('infos');
  const [protocol, setProtocol] = useState(null); 
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(false);

  const [tempLocation, setTempLocation] = useState(currentItem?.location || '');
  const [tempNotes, setTempNotes] = useState(currentItem?.notes || '');
  const [tempPrix, setTempPrix] = useState(d?.prix_unitaire_nombre || '');

  const fetchProtocol = async () => {
    if (protocol) return;
    setIsLoadingProtocol(true);
    try {
      const prompt = `Agis comme un Maître Sommelier. Donne le protocole de service parfait pour ce vin : "${d.nom} ${d.annee}". Réponds en JSON strict : {"temperature": "ex: 16°C", "carafage": "ex: Oui, 2h avant", "verre": "ex: Verre type Bordeaux", "conseil": "Une phrase d'expert"}`;
      const res = await callGemini(prompt);
      setProtocol(extractJSON(res.candidates[0].content.parts[0].text));
    } catch(e) {
      setProtocol({ temperature: "14-16°C", carafage: "Non requis", verre: "Verre classique", conseil: "Prêt à servir." });
    } finally { setIsLoadingProtocol(false); }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto">
      <div className="bg-[#1a1a1a] p-4 flex justify-between z-20 sticky top-0 border-b border-[#333]">
        <SommelierButton text={`Fiche de dégustation pour ${d.nom}. ${d.description}`} />
        <button onClick={ctx.goBack} className="p-3 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-white transition-colors"><X className="w-5 h-5"/></button>
      </div>

      <div className="p-5">
        {/* LE CAPTIVANT DESIGN "DISCOVERY" INTACT */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#333] flex overflow-hidden h-60 shadow-xl group">
          <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
            <div>
              <h2 className="text-3xl font-serif font-bold text-white leading-tight truncate group-hover:text-[#D4AF37] transition-colors">{d.nom}</h2>
              <p className="text-[10px] text-[#D4AF37] uppercase font-bold tracking-widest mt-1">{d.type_simplifie} • {d.annee} • {d.region}</p>
            </div>
            <p className="text-xs text-slate-400 italic line-clamp-3 mt-4 border-t border-[#222] pt-3">Accord parfait : {d.accord_parfait}</p>
          </div>
          <div className="w-32 bg-[#0a0a0a] p-3 flex justify-center items-center border-l border-[#333] shrink-0">
            <img src={currentItem.image || fallbackImg} className="max-h-full object-contain drop-shadow-[0_10px_15px_rgba(212,175,55,0.15)] group-hover:scale-105 transition-transform duration-500" alt="wine"/>
          </div>
        </div>

        {/* REHABILITATION DES ONGLETS DE LOGIQUE EXISTANTE */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#333] mt-6">
          <button onClick={() => setActiveTab('infos')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'infos' ? 'bg-[#333] text-[#D4AF37] border border-[#D4AF37]/20 shadow-sm' : 'text-slate-500'}`}>Fiche Cru</button>
          <button onClick={() => { setActiveTab('service'); fetchProtocol(); }} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'service' ? 'bg-[#333] text-[#D4AF37] border border-[#D4AF37]/20 shadow-sm' : 'text-slate-500'}`}>Service IA</button>
          <button onClick={() => setActiveTab('cave')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'cave' ? 'bg-[#333] text-[#D4AF37] border border-[#D4AF37]/20 shadow-sm' : 'text-slate-500'}`}>Rangement</button>
        </div>

        {activeTab === 'infos' && (
          <div className="space-y-5 mt-5 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md"><p className="text-sm text-slate-300 leading-relaxed font-medium">{d.description}</p></div>
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] flex justify-between items-center shadow-md">
              <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Valeur Estimée</p><span className="text-3xl font-black text-emerald-400 mt-1 block">{d.prix_unitaire_nombre}€</span></div>
              <div className="text-right"><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Potentiel Garde</p><span className="text-sm font-bold text-[#D4AF37] mt-1 block">{d.potentiel_garde}</span></div>
            </div>
            
            {/* BOUTON DÉROULANT FLUIDE (SCROLL) VERS LA CAVE */}
            <button onClick={() => setActiveTab('cave')} className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-sm rounded-full shadow-lg flex items-center justify-center space-x-2"><Archive className="w-4 h-4"/><span>Gérer mon stock pour ce flacon</span></button>
          </div>
        )}

        {activeTab === 'service' && (
          <div className="space-y-5 mt-5 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#333] shadow-md">
              {isLoadingProtocol ? (
                <div className="text-center text-slate-400 py-6"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]"/><p className="font-bold text-xs">Le sommelier calcule le protocole...</p></div>
              ) : protocol ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 border-b border-[#222] pb-3"><div className="p-2 bg-[#0a0a0a] rounded-lg border border-[#333] text-[#D4AF37]"><Clock className="w-4 h-4"/></div><div><span className="text-[10px] text-slate-500 block uppercase font-bold">Aération optimale</span><p className="font-bold text-white text-sm">{protocol.carafage}</p></div></div>
                  <div className="flex items-center space-x-4 border-b border-[#222] pb-3"><div className="p-2 bg-[#0a0a0a] rounded-lg border border-[#333] text-[#D4AF37]"><Wine className="w-4 h-4"/></div><div><span className="text-[10px] text-slate-500 block uppercase font-bold">Verrerie idéale</span><p className="font-bold text-white text-sm">{protocol.verre}</p></div></div>
                  <div className="flex items-center space-x-4"><div className="p-2 bg-[#0a0a0a] rounded-lg border border-[#333] text-[#D4AF37]"><Tag className="w-4 h-4"/></div><div><span className="text-[10px] text-slate-500 block uppercase font-bold">Température parfaite</span><p className="font-bold text-white text-sm">{protocol.temperature}</p></div></div>
                  <div className="p-3 bg-[#0a0a0a] border-l-2 border-[#D4AF37] rounded-r-xl text-xs text-slate-400 italic">"{protocol.conseil}"</div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'cave' && (
          <div className="space-y-5 mt-5 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#333] shadow-md">
              <div className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-2xl border border-[#333]">
                <span className="text-sm font-bold text-slate-400 ml-2">Nombre de bouteilles :</span>
                <div className="flex items-center space-x-4">
                  <button onClick={() => ctx.updateStock(currentItem.id, currentItem.stock, -1)} className="w-10 h-10 bg-[#1A1A1A] border border-[#333] text-white font-bold rounded-lg flex items-center justify-center shadow-sm">-</button>
                  <span className="text-xl font-black text-[#D4AF37] w-6 text-center">{currentItem.stock}</span>
                  <button onClick={() => ctx.updateStock(currentItem.id, currentItem.stock, 1)} className="w-10 h-10 bg-[#D4AF37] text-black font-bold rounded-lg flex items-center justify-center shadow-lg">+</button>
                </div>
              </div>

              {currentItem.stock === 0 && (
                <button onClick={() => ctx.genericUpdate(currentItem.id, { wishlist: !currentItem.wishlist })} className="w-full py-4 bg-[#0a0a0a] border border-[#333] text-slate-300 rounded-2xl font-bold flex items-center justify-center mt-4 transition-all"><Heart className={`w-4 h-4 mr-2 ${currentItem.wishlist ? 'text-pink-500 fill-current' : 'text-slate-500'}`} /><span>{currentItem.wishlist ? 'Retirer des souhaits' : 'Ajouter aux souhaits d\'achat'}</span></button>
              )}

              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Ranger à l'emplacement :</label>
                <input type="text" value={tempLocation} onChange={(e) => setTempLocation(e.target.value)} onBlur={() => ctx.genericUpdate(currentItem.id, { location: tempLocation })} placeholder="Ex: Étagère du haut, Cave de droite..." className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl p-3.5 text-sm font-medium outline-none focus:border-[#D4AF37]" />
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 ml-1">Notes de dégustation privées :</label>
              <textarea value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} onBlur={() => ctx.genericUpdate(currentItem.id, { notes: tempNotes })} placeholder="Arômes ressentis, plats testés, avis personnel..." className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-2xl p-4 text-sm h-24 outline-none focus:border-[#D4AF37] resize-none" />
            </div>

            <button onClick={() => ctx.setScanAction({id: currentItem.id, type: 'history'})} className="w-full py-4 bg-red-950/20 text-red-400 font-bold rounded-2xl border border-red-900/40 hover:bg-red-900 hover:text-white transition-colors">Supprimer définitivement ce vin</button>
          </div>
        )}
      </div>
    </div>
  );
};

const CameraView = ({ ctx }) => (
  <div className="relative h-full w-full bg-black flex flex-col overflow-hidden">
    <button onClick={() => { ctx.stopCamera(); ctx.setView('home'); }} className="absolute top-12 left-6 z-20 p-3 bg-black/50 text-white rounded-full border border-white/10"><ChevronLeft className="w-6 h-6" /></button>
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center"><div className="relative w-4/5 h-1/2 mt-10 border-2 border-white/10 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"><div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#D4AF37]/70 shadow-[0_0_15px_rgba(212,175,55,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div></div></div>
    <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover flex-1" />
    <div className="absolute bottom-0 w-full h-32 bg-black/90 flex items-center justify-center pb-8 z-20"><button onClick={ctx.capturePhoto} className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center active:scale-90 transition-transform"><div className="w-14 h-14 bg-white rounded-full shadow-lg"></div></button></div>
    <canvas ref={ctx.canvasRef} className="hidden" />
  </div>
);

const AnalyzingView = () => <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] select-none"><Wine className="w-16 h-16 text-[#D4AF37] animate-pulse mb-4"/><h2 className="text-2xl font-serif font-bold text-white tracking-wide">Sommelier Virtuel actif...</h2><p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Analyse intelligente de la bouteille</p></div>;

// =========================================================================
// APPLICATION PRINCIPALE (APP CONTEXT & ROUTER SECURISE COMPLET)
// =========================================================================
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
  
  const videoRef = useRef(null); const canvasRef = useRef(null); const streamRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { setUser(u); setIsAuthLoading(false); });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) { setScanHistory([]); return; }
    const unsubDb = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), (s) => {
      let sc = []; s.forEach(d => { if(d.data().data) sc.push({id:String(d.id), ...d.data(), data: normalizeData(d.data().data)}); });
      sc.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)); setScanHistory(sc);
    }, (err) => console.log("Erreur Firestore sync:", err));
    return () => unsubDb();
  }, [user]);

  const showToast = (m) => { setToastMsg(m); setTimeout(()=>setToastMsg(''),3000); };
  
  const startCamera = async (mode = 'bottle') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setErrorMsg("L'accès caméra requiert un protocole de sécurité HTTPS complet."); setView('error'); return; }
    try { setCameraMode(mode); const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); streamRef.current = s; setView('camera'); setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100); } 
    catch(e){ setErrorMsg("Autorisation d'accès à l'appareil photo refusée."); setView('error'); }
  };
  const stopCamera = () => { if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; } };

  const capturePhoto = async () => {
    if(videoRef.current && canvasRef.current) {
      const c = canvasRef.current; c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
      c.getContext('2d').drawImage(videoRef.current,0,0); const d = c.toDataURL('image/jpeg',0.8); stopCamera();
      const img = await compressImage(d); setImageSrc(img);
      analyzeImage(img);
    }
  };

  const handleFileUpload = async (e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onloadend = async () => { const img = await compressImage(r.result); setImageSrc(img); analyzeImage(img); }; r.readAsDataURL(f); } };

  const processAIResult = async (aiText, sourceImage) => {
    const data = normalizeData(extractJSON(aiText)); setAnalysisResult(data);
    const img = sourceImage || getGenericImageForType(data.type_simplifie); setImageSrc(img);
    const obj = { id: 'temp_'+Date.now(), image: img, data, stock: 0, in_history: true, wishlist: false, location: '', rating: 0, timestamp: Date.now(), dateStr: new Date().toLocaleDateString('fr-FR') };
    setScanHistory(p=>[obj,...p]); setCurrentScanId(obj.id); setPreviousView('home'); setView('results');
    if(user){ try { const r = await addDoc(collection(db,'artifacts',appId,'users',user.uid,'scans'), obj); setCurrentScanId(r.id); setScanHistory(p=>p.map(i=>i.id===obj.id?{...i,id:r.id}:i)); } catch(e){} }
  };

  const analyzeImage = async (b64) => {
    setView('analyzing');
    try {
      const p1 = await callGemini("Identifie le vin sur cette photo. Si ce n'est pas lisible, réponds {\"nom\": \"INCONNU\"}. Sinon {\"nom\": \"NOM_DU_VIN\"}", b64.split(',')[1]);
      const iden = extractJSON(p1.candidates[0].content.parts[0].text);
      if(!iden || iden.nom==='INCONNU') { setErrorMsg("Bouteille non reconnue par le sommelier. Veuillez vous assurer que l'étiquette soit bien nette."); setView('error'); return; }
      let txt = ""; let ch = await checkGlobalCache(iden.nom);
      if(!ch){ const p2 = await callGemini(`Expert Sommelier. Réponds UNIQUEMENT en JSON strict. Format: {"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}`, b64.split(',')[1]); txt = p2.candidates[0].content.parts[0].text; const ob = extractJSON(txt); await saveToGlobalCache(ob.nom, ob); } else { txt = JSON.stringify(ch); }
      await processAIResult(txt, b64);
    } catch(e) { setErrorMsg("Erreur d'analyse IA. Serveur indisponible."); setView('error'); }
  };

  const searchWineText = async (textQuery) => {
    if (!textQuery || textQuery.length < 3) return;
    setView('analyzing'); setPreviousView('home');
    try {
      let txt = ""; let ch = await checkGlobalCache(textQuery);
      if (!ch) {
        const prompt = `Recherche le vin : "${textQuery}". Si ce vin n'existe pas ou est absurde, réponds {"nom": "INCONNU"}. Sinon utilise ce format : {"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}`;
        const result = await callGemini(prompt); txt = result.candidates[0].content.parts[0].text;
        const parsed = extractJSON(txt); if (!parsed || parsed.nom === 'INCONNU') { setErrorMsg("Aucun cru correspondant trouvé."); setView('error'); return; }
        await saveToGlobalCache(parsed.nom, parsed);
      } else { txt = JSON.stringify(ch); }
      await processAIResult(txt, null);
    } catch (err) { setErrorMsg("Erreur de recherche."); setView('error'); }
  };

  const fetchAIRecommendation = async (type, apogee, food, price) => {
    setView('analyzing'); setPreviousView('recommendation');
    try {
      const prompt = `Sommelier: trouve 3 vins. Type: ${type}, Repas: ${food}, Budget: ${price}. Réponds obligatoirement au format JSON strict avec une propriété racine "vins" : {"vins": [{"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}]}`;
      const result = await callGemini(prompt);
      let parsed = extractJSON(result.candidates[0].content.parts[0].text);
      let vins = parsed.vins || (Array.isArray(parsed) ? parsed : []);
      setRecommendationList(vins.map(v => normalizeData(v))); setView('recommendationList');
    } catch (err) { setErrorMsg("Erreur conseils."); setView('error'); }
  };

  const genericUpdate = async (id, f) => {
    setScanHistory(p=>p.map(i=>i.id===id?{...i,...f}:i));
    if(user && !id.startsWith('temp_')){ try{ await updateDoc(doc(db,'artifacts',appId,'users',user.uid,'scans',id), f); }catch(e){} }
  };
  
  const updateStock = async (id, cur, ch) => {
    const ns = Math.max(0, parseInt(cur)+ch); setScanHistory(p=>p.map(i=>i.id===id?{...i,stock:ns}:i));
    if(user && !id.startsWith('temp_')){ try{ const r=doc(db,'artifacts',appId,'users',user.uid,'scans',id); const o=scanHistory.find(s=>s.id===id); if(ns===0 && o.in_history===false){ await deleteDoc(r); setScanHistory(p=>p.filter(i=>i.id!==id)); } else await updateDoc(r,{stock:ns}); }catch(e){} }
  };

  const ctx = { user, view, setView, previousView, setPreviousView, imageSrc, setImageSrc, analysisResult, setAnalysisResult, errorMsg, setErrorMsg, scanHistory, setScanHistory, scanAction, setScanAction, recommendationList, setRecommendationList, currentScanId, setCurrentScanId, toastMsg, setToastMsg, startCamera, stopCamera, capturePhoto, handleFileUpload, analyzeImage, searchWineText, fetchAIRecommendation, processRecommendationSelection: (w)=>processAIResult(JSON.stringify(w), null), genericUpdate, updateStock, goBack:()=>setView(previousView), openExistingWine:(i,o)=>{setImageSrc(i.image);setAnalysisResult(i.data);setCurrentScanId(i.id);setPreviousView(o);setView('results');}, videoRef, canvasRef, showToast, cameraMode, setCameraMode, menuPrefs, setMenuPrefs };

  if (isAuthLoading) return <div className="h-[100dvh] bg-[#0a0a0a] flex items-center justify-center"><Wine className="w-12 h-12 text-[#D4AF37] animate-pulse" /></div>;
  if (!user) return <AuthView auth={auth} />;

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] sm:border-x sm:border-[#333] overflow-hidden relative text-[#F5F5F5] font-sans select-none" style={{'--gold-primary': '#D4AF37'}}>
        {view === 'home' && <HomeView ctx={ctx} />}
        {view === 'account' && <AccountView ctx={ctx} />}
        {view === 'history' && <HistoryView ctx={ctx} />}
        {view === 'cellar' && <CellarView ctx={ctx} />}
        {view === 'recommendation' && <RecommendationView ctx={ctx} />}
        {view === 'recommendationList' && <RecommendationListView ctx={ctx} />}
        {view === 'results' && <ResultsView ctx={ctx} />}
        {view === 'camera' && <CameraView ctx={ctx} />}
        {view === 'analyzing' && <AnalyzingView />}
        {view === 'menuConfig' && <MenuConfigView ctx={ctx} />}
        {view === 'error' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a]"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-bold text-white mb-2">Erreur</h2><p className="text-sm text-slate-400 mb-6">{errorMsg}</p><button onClick={()=>setView(previousView)} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-full shadow-lg">Retour</button></div>
        )}
        
        {['home', 'cellar', 'history', 'account', 'recommendation', 'recommendationList', 'menuConfig'].includes(view) && <NavigationBar ctx={ctx} />}
        
        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"><div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 w-full text-center shadow-2xl"><h3 className="text-xl font-bold text-white mb-2">Confirmer l'action</h3><div className="flex space-x-3 mt-6"><button onClick={()=>setScanAction(null)} className="flex-1 py-3 bg-[#333] rounded-xl font-bold border border-[#444]">Annuler</button><button onClick={()=>{ ctx.genericUpdate(scanAction.id, { in_history: false, stock: 0 }); setScanAction(null); setView('home'); ctx.showToast("Vin supprimé."); }} className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-600/40 rounded-xl font-bold">Confirmer</button></div></div></div>
        )}
        
        {toastMsg && (
          <div className="absolute top-10 left-0 w-full flex justify-center z-[200] animate-in slide-in-from-top-4"><div className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-[#AA7C11] flex items-center space-x-2"><CheckCircle className="w-4 h-4" /><span>{toastMsg}</span></div></div>
        )}
      </div>
    </ErrorBoundary>
  );
}