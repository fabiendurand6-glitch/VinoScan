// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe, X, Trophy, TrendingUp, BarChart3, Target, Focus, Settings, Trash2, Bell, DollarSign, Medal, Check, Layers
} from 'lucide-react';

import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import html2canvas from 'html2canvas';

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc, query as firestoreQuery, where, orderBy, limit, getDocs } from 'firebase/firestore';
import imgTirebouchon from './assets/tirebouchon.jpg';
import imgCarafe from './assets/carafe.jpg';
import imgVerres from './assets/verres.jpg';
import imgCoravin from './assets/coravin.jpg';

// =========================================================================
// CONFIGURATION SÉCURISÉEe
// =========================================================================
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

const firebaseConfig = { 
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", 
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
// UTILITAIRES ET MOTEURS (DONNÉES, IMAGES, IA)
// =========================================================================
const getGenericImageForType = (type) => {
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?auto=format&fit=crop&w=800&q=80";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800&q=80";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800&q=80";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80"; 
  }
};

const getAmazonAffiliateLink = (searchQuery) => `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}&tag=vinoscan-21`;

const getRecommendedAccessory = (type) => {
  switch(type) {
    case 'ROUGE': return { name: "Carafe à décanter Cristal", search: "carafe a decanter vin rouge cristal" };
    case 'BLANC': return { name: "Seau à glace Design", search: "seau a glace vin inox" };
    case 'PETILLANT': return { name: "Coffret flûtes Prestige", search: "verres flutes champagne cristal" };
    default: return { name: "Tire-bouchon Sommelier", search: "tire bouchon sommelier professionnel" };
  }
};

const extractJSON = (text) => {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) return JSON.parse(match[1]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("Erreur de lecture de l'intelligence artificielle.");
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

const callGemini = async (prompt, b64Data = null) => {
  const model = 'gemini-2.5-flash'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt }];
  
  // Gère automatiquement 1 image ou un tableau de plusieurs images
  if (b64Data) {
    if (Array.isArray(b64Data)) {
      b64Data.forEach(img => parts.push({ inlineData: { mimeType: "image/jpeg", data: img } }));
    } else {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: b64Data } });
    }
  }
  
  const payload = { contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json" } };
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Erreur serveur (${response.status}) : ${errData.error?.message || 'Inconnue'}`);
    }
    return await response.json();
  } catch (err) { throw new Error(err.message); }
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
    let safeAccordsMets = Array.isArray(data.accords_mets) ? data.accords_mets.filter(Boolean).map(String) : (data.accords_mets ? [String(data.accords_mets)] : []);
    let nom = data.nom ? String(data.nom) : "Vin inconnu";
    let annee = data.annee ? String(data.annee) : "N.M.";
    let region = data.region ? String(data.region) : "Région inconnue";
    let type = data.type ? String(data.type) : "Vin";
    let description = data.description ? String(data.description) : "Un excellent vin.";
    
    let gardeMin = data.garde_min !== undefined ? Number(data.garde_min) : 2;
    let gardeMax = data.garde_max !== undefined ? Number(data.garde_max) : 5;
    if (!data.garde_min && data.potentiel_garde) {
      const gardeMatches = String(data.potentiel_garde).match(/\d+/g);
      if (gardeMatches && gardeMatches.length >= 1) {
         gardeMin = parseInt(gardeMatches[0], 10);
         gardeMax = gardeMatches.length >= 2 ? parseInt(gardeMatches[1], 10) : gardeMin + 3;
      }
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
    let safeComparateur = Array.isArray(data.comparateur) ? data.comparateur.filter(Boolean).map(c => typeof c === 'object' ? { site: String(c.site || 'Marchand'), prix: String(c.prix || '?') } : { site: 'Marchand', prix: String(c) }) : [];
    let prix_unitaire_nombre = Number(data.prix_unitaire_nombre) || extractPrice(data.prix_moyen) || 0;

    return { 
      nom, annee, region, type, type_simplifie, prix_unitaire_nombre, description, accord_parfait,
      accords_mets: safeAccordsMets, tags_accords: [], comparateur: safeComparateur, baseGardeMin: gardeMin, baseGardeMax: gardeMax, ...dynamicDates
    };
  } catch (e) {
    return { nom: 'Erreur d\'analyse', type_simplifie: 'AUTRE', accords_mets: ['Aucun accord trouvé'], tags_accords: [], comparateur: [] };
  }
};

const analyzeSensoryDNA = async (callGeminiFunc, notes) => {
  if (!notes || notes.length < 10) return null;
  try {
    const prompt = `Analyse ces notes de dégustation : "${notes}". Évalue sur une échelle de 1 à 5 les dimensions suivantes. Réponds UNIQUEMENT en JSON pur : {"tannins": 0, "acidite": 0, "corps": 0, "fruit": 0, "boise": 0}`;
    const res = await callGeminiFunc(prompt);
    const data = extractJSON(res.candidates[0].content.parts[0].text);
    return [
      { subject: 'Tannins', A: data.tannins || 1, fullMark: 5 }, { subject: 'Acidité', A: data.acidite || 1, fullMark: 5 },
      { subject: 'Corps', A: data.corps || 1, fullMark: 5 }, { subject: 'Fruit', A: data.fruit || 1, fullMark: 5 },
      { subject: 'Boisé', A: data.boise || 1, fullMark: 5 },
    ];
  } catch(e) { return null; }
};

const saveCellarValueSnapshot = async (user, totalValue) => {
  if (!user || totalValue <= 0) return;
  const now = new Date();
  const snapshotId = `${now.getFullYear()}_${now.getMonth() + 1}`;
  try {
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'value_history', snapshotId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) await setDoc(docRef, { value: totalValue, timestamp: now.getTime(), dateStr: now.toLocaleDateString('fr-FR', {month: 'short', year: '2-digit'}) });
  } catch(e) {}
};

const checkAndGenerateAlerts = async (user, scans, alerts) => {
  if (!user || !scans) return;
  const currentYear = new Date().getFullYear();
  let newAlerts = [];

  scans.forEach(item => {
    const d = item.data;
    if (!d || !item.id) return;
    if (d.statut_apogee === 'APOGEE' && item.stock > 0) {
      const alertId = `apogee_${item.id}_${currentYear}`;
      if (!alerts.some(a => a.id === alertId)) newAlerts.push({ id: alertId, type: 'APOGEE', title: 'Apogée atteinte', message: `Votre ${d.nom} ${d.annee} est prêt à être dégusté !`, scanId: item.id, wineName: d.nom, read: false, timestamp: Date.now() });
    }
    if (d.statut_apogee === 'DECLIN' && item.stock > 0) {
      const alertId = `declin_${item.id}_${currentYear}`;
      if (!alerts.some(a => a.id === alertId)) newAlerts.push({ id: alertId, type: 'DECLIN', title: 'Attention : Déclin imminent', message: `Il est temps d'ouvrir votre ${d.nom} ${d.annee} avant qu'il ne soit trop tard.`, scanId: item.id, wineName: d.nom, read: false, timestamp: Date.now() });
    }
  });

  for (let alert of newAlerts) {
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', alert.id), alert); } catch(e) {}
  }
};

// =========================================================================
// UI & COMPOSANTS VISUELS
// =========================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("Erreur interceptée:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#0a0a0a] text-center p-6 select-none text-white">
          <div className="w-24 h-24 bg-red-950/30 rounded-full flex items-center justify-center mb-6 border border-red-900/50"><AlertTriangle className="w-12 h-12 text-red-500" /></div>
          <h2 className="text-2xl font-serif font-bold text-white mb-3">Oups, un verre renversé !</h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs">L'application a rencontré une erreur d'affichage inattendue.</p>
          <button onClick={() => { this.setState({ hasError: false }); if (this.props.onReset) this.props.onReset(); }} className="px-8 py-4 bg-[#D4AF37] text-black font-bold rounded-full shadow-lg">Retourner à l'accueil</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const NavigationBar = ({ ctx }) => (
  <div className="absolute bottom-0 w-full bg-[#1a1a1a] border-t border-[#333] flex justify-around items-center pb-safe pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-[100] h-16 select-none">
    {[{id:'home', i:Home, text:'Scanner'},{id:'cellar', i:Archive, text:'Cave'},{id:'recommendation', i:Sparkles, text:'Conseil'},{id:'history', i:History, text:'Histo'},{id:'account', i:User, text:'Profil'}].map(item => {
      const active = ctx.view.includes(item.id) || (item.id === 'home' && ['manualSearch', 'menuConfig', 'quiz'].includes(ctx.view)) || (item.id === 'recommendation' && ctx.view === 'recommendationList');
      return (
        <button 
          key={item.id} 
          onClick={() => ctx.setView(item.id)} 
          /* CORRECTIONS CSS ICI : flex-1, bg-transparent, outline-none */
          className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 bg-transparent border-none outline-none focus:outline-none transition-colors ${active ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <item.i className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{item.text}</span>
        </button>
      );
    })}
  </div>
);

const SommelierButton = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lireTexte = (e) => {
    e.stopPropagation(); 
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR'; utterance.rate = 0.95; 
    
    // Tentative de forcer une voix plus naturelle
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang === 'fr-FR' && (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Thomas'))) || voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;

    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance); setIsSpeaking(true);
  };
  return (
    <button onClick={lireTexte} className={`p-2 rounded-full border transition-all shadow-md ${isSpeaking ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-105' : 'bg-[#1A1A1A] border-[#333] text-[#D4AF37] hover:border-[#D4AF37]/50'}`}>
      {isSpeaking ? <EyeOff className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
    </button>
  );
};

const InstagramShareCanvas = ({ wine, rating, notes }) => (
  <div id="vs-share-canvas" className="fixed -left-[9999px] top-0 w-[1080px] h-[1920px] bg-gradient-to-br from-[#1a1a1a] to-[#050505] text-white flex flex-col font-sans overflow-hidden">
    <div className="w-full h-full border-[12px] border-[#D4AF37] p-16 flex flex-col items-center justify-between">
      
      {/* Header */}
      <div className="flex flex-col items-center mt-12">
        <div className="w-28 h-28 bg-[#0a0a0a] rounded-full flex items-center justify-center border-4 border-[#D4AF37] mb-6">
          <Wine className="w-14 h-14 text-[#D4AF37]" />
        </div>
        <h1 className="text-6xl font-serif font-bold text-[#D4AF37]">VinoScan</h1>
      </div>

      {/* Image Bouteille */}
      <div className="flex-1 flex items-center justify-center w-full my-12 bg-white/5 rounded-[40px] p-8 border border-[#333]">
        <img crossOrigin="anonymous" src={wine.image || getGenericImageForType(wine.data.type_simplifie)} className="max-h-[800px] object-contain drop-shadow-2xl" alt="Bouteille" />
      </div>

      {/* Infos Vin */}
      <div className="w-full text-center space-y-6 bg-[#0a0a0a] p-12 rounded-[40px] border-2 border-[#D4AF37]/50 mb-12 shadow-2xl">
        <h2 className="text-6xl font-serif font-black text-white leading-tight">{wine.data.nom}</h2>
        <p className="text-4xl text-[#D4AF37] uppercase font-bold tracking-widest">{wine.data.type_simplifie} • {wine.data.annee} • {wine.data.region}</p>
        
        {rating > 0 && (
          <div className="flex items-center justify-center space-x-4 pt-6 border-t border-[#333]">
            {Array.from({length: 5}).map((_, i) => <Star key={i} className={`w-12 h-12 ${i < rating ? 'text-[#D4AF37] fill-current' : 'text-slate-600'}`} />)}
          </div>
        )}
        
        {notes && (
          <div className="pt-6 border-t border-[#333] mt-6">
            <p className="text-4xl text-slate-300 italic leading-snug">"{notes.length > 130 ? notes.substring(0, 127) + '...' : notes}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full pt-8 text-center border-t-2 border-[#D4AF37]/30">
        <p className="text-3xl text-slate-400 mb-4">Scanné avec l'IA</p>
        <p className="text-5xl text-[#D4AF37] font-black tracking-widest">VINOSCAN.COM</p>
      </div>

    </div>
  </div>
);

const generateAndShareInstagramImage = async (showToastFunc) => {
  const element = document.getElementById('vs-share-canvas');
  if (!element) return;
  showToastFunc("Génération de l'image...");
  try {
    const canvas = await html2canvas(element, { useCORS: true, scale: 1, backgroundColor: '#0a0a0a' });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'vinoscan.jpg', { type: 'image/jpeg' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Ma dégustation 🍷', text: 'Scanné avec VinoScan !' });
    } else {
      const link = document.createElement('a'); link.download = 'vinoscan.jpg'; link.href = dataUrl; link.click();
      showToastFunc("Image prête !");
    }
  } catch (e) { showToastFunc("Erreur de génération."); }
};

const AuthView = ({ auth }) => {
  const [mode, setMode] = useState('signup'); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  const handleAuth = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { 
      if (mode === 'login') await signInWithEmailAndPassword(auth, email, password); 
      else await createUserWithEmailAndPassword(auth, email, password); 
    } catch (x) { setError("Erreur de connexion."); } finally { setLoading(false); }
  };
  
  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] flex flex-col relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center mb-8 border border-[#D4AF37]/30 shadow-lg"><Wine className="w-12 h-12 text-[#D4AF37]" /></div>
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] mb-2 drop-shadow-sm">VinoScan</h2>
        <p className="text-[#D4AF37]/60 text-xs font-bold uppercase tracking-widest text-center mb-12">Accès Privé Réservé</p>
        <form onSubmit={handleAuth} className="w-full space-y-5">
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={x=>setEmail(x.target.value)} className="w-full bg-transparent text-white outline-none font-medium" required />
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={x=>setPassword(x.target.value)} className="w-full bg-transparent text-white outline-none font-medium" required />
          </div>
          {error && <p className="text-red-500 text-xs text-center font-bold bg-red-950/20 py-2 rounded-lg border border-red-900/50">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg shadow-lg active:scale-95 transition-all flex justify-center disabled:opacity-50">
            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (mode === 'login' ? 'Ouvrir la cave' : 'Créer ma cave privée')}
          </button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-12 text-slate-400 text-sm font-medium hover:text-[#D4AF37] transition-colors">
          {mode === 'login' ? "Nouveau membre ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
};

const HomeView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-[#0a0a0a] overflow-hidden select-none">
    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#D4AF37]/10 to-transparent pointer-events-none"></div>
    <div className="text-center space-y-4 relative z-10 mt-10">
      <div className="mx-auto w-32 h-32 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center shadow-lg border border-[#D4AF37]/30"><Wine className="w-14 h-14 text-[#D4AF37]" /></div>
      <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11]">VinoScan</h1>
      <p className="text-[#D4AF37]/60 max-w-sm mx-auto text-sm font-medium uppercase tracking-widest">Le Sommelier dans votre poche</p>
    </div>
    <div className="w-full max-w-sm space-y-4 pt-8 relative z-10">
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black p-5 rounded-full shadow-lg active:scale-95 transition-all hover:bg-[#AA7C11]">
        <Camera className="w-6 h-6" /><span className="font-bold text-xl">Scanner une bouteille</span>
      </button>
      
      {/* Carte des Vins en grand bouton */}
      <button onClick={() => { if (!ctx.requirePremium()) ctx.setView('menuConfig'); }} className="w-full flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#F5F5F5] p-5 rounded-full active:scale-95 transition-all hover:border-[#D4AF37]/50 shadow-md">
        <BookOpen className="w-6 h-6 text-slate-400" /><span className="font-bold text-lg">Carte des vins</span>
      </button>
      
      <div className="flex space-x-4 pt-2">
        {/* Facture en petit bouton */}
        <button onClick={() => ctx.startCamera('receipt')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-5 rounded-full shadow-sm active:scale-95 hover:border-[#D4AF37]/50 transition-colors">
          <Receipt className="w-5 h-5" /><span className="font-bold text-xs uppercase">Facture</span>
        </button>
        <button onClick={() => ctx.setView('quiz')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-5 rounded-full shadow-sm active:scale-95 hover:border-[#D4AF37]/50 transition-colors">
          <Gamepad2 className="w-5 h-5" /><span className="font-bold text-xs uppercase">Mini-Jeu</span>
        </button>
      </div>
      <div className="pt-2 pb-2">
        <button onClick={() => { if (!ctx.requireTier('AMATEUR')) ctx.setView('compare'); }} className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-slate-900 to-black border border-slate-800 text-[#D4AF37] p-5 rounded-full shadow-lg active:scale-95 transition-all hover:border-[#D4AF37]/30">
          <Layers className="w-6 h-6" /><span className="font-bold text-sm uppercase tracking-widest">Comparateur de Rayon</span>
        </button>
      </div>
      <div className="flex space-x-4">
        <label className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl cursor-pointer shadow-sm active:scale-95 hover:text-[#D4AF37] transition-colors">
          <ImageIcon className="w-6 h-6 mb-1" /><span className="font-bold text-[10px] uppercase">Galerie</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e)} />
        </label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl shadow-sm active:scale-95 hover:text-[#D4AF37] transition-colors">
          <Search className="w-6 h-6 mb-1" /><span className="font-bold text-[10px] uppercase">Recherche</span>
        </button>
      </div>
    </div>
  </div>
);

const ManualSearchView = ({ ctx }) => {
  const [searchTerms, setSearchTerms] = useState('');
  const handleSearch = (e) => { e.preventDefault(); if(searchTerms.trim()) ctx.searchWineText(searchTerms); };
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Recherche Manuelle</h1><p className="text-slate-500 text-xs mt-1">Trouver un grand cru par son nom</p></div>
      </div>
      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input autoFocus type="text" value={searchTerms} onChange={e => setSearchTerms(e.target.value)} placeholder="Ex: Château Margaux 2015" className="w-full pl-12 pr-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-2xl outline-none focus:border-[#D4AF37] text-lg transition-colors"/>
          </div>
          {/* CORRECTION ICI : Remplacement de query par searchTerms */}
          <button type="submit" disabled={!searchTerms.trim()} className="w-full py-4 bg-[#D4AF37] text-black rounded-full font-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 hover:bg-[#AA7C11] transition-all">Rechercher</button>
        </form>
      </div>
    </div>
  );
};

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
  { q: "À quelle température idéale doit-on servir un grand vin rouge liquoreux ?", options: ["6-8°C", "10-12°C", "16-18°C"], ans: "10-12°C" },
  { q: "De quel pays le Chianti est-il originaire ?", options: ["Espagne", "Italie", "Portugal"], ans: "Italie" },
  { q: "Quel cépage est roi dans l'appellation Chablis ?", options: ["Chardonnay", "Sauvignon Blanc", "Chenin Blanc"], ans: "Chardonnay" },
  { q: "Quelle maladie de la vigne a presque détruit le vignoble français au 19e siècle ?", options: ["Le Mildiou", "Le Phylloxéra", "L'Oïdium"], ans: "Le Phylloxéra" },
  { q: "Qu'est-ce qu'un vin 'Bouchonné' ?", options: ["Un vin scellé à la cire", "Un vin altéré par le TCA", "Un vin non filtré"], ans: "Un vin altéré par le TCA" },
  { q: "Dans quelle région trouve-t-on l'appellation Châteauneuf-du-Pape ?", options: ["Vallée du Rhône", "Languedoc", "Provence"], ans: "Vallée du Rhône" },
  { q: "Combien de bouteilles contient un Mathusalem ?", options: ["4", "8", "12"], ans: "8" },
  { q: "Lequel de ces vins est un grand cru de Saint-Émilion ?", options: ["Château Cheval Blanc", "Château Margaux", "Château d'Yquem"], ans: "Château Cheval Blanc" },
  { q: "Que mesure le degré Brix ?", options: ["Le taux d'alcool", "La teneur en sucre du raisin", "L'acidité du vin"], ans: "La teneur en sucre du raisin" },
  { q: "Quel est le cépage principal des vins rouges de la Rioja en Espagne ?", options: ["Tempranillo", "Grenache", "Syrah"], ans: "Tempranillo" },
  { q: "Qu'est-ce que le 'Pigeage' ?", options: ["Tailler la vigne en hiver", "Enfoncer le chapeau de marc dans le moût", "Filtrer le vin avant mise en bouteille"], ans: "Enfoncer le chapeau de marc dans le moût" }
];

const QuizView = ({ ctx }) => {
  const [gameState, setGameState] = useState('idle'); 
  const [currentQuiz, setCurrentQuiz] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); 

  const startGame = () => { 
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    setCurrentQuiz(shuffled.slice(0, 4)); setScore(0); setQIndex(0); setFeedback(null); setGameState('playing'); 
  };

  const handleAnswer = (option) => {
    if (feedback) return;
    const correct = option === currentQuiz[qIndex].ans;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => { setFeedback(null); if (qIndex + 1 < currentQuiz.length) setQIndex(i => i + 1); else setGameState('end'); }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le Nez du Sommelier</h1><p className="text-slate-500 text-xs mt-1">Défiez vos connaissances</p></div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {gameState === 'idle' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center mx-auto"><Gamepad2 className="w-10 h-10 text-[#D4AF37]"/></div>
              <h3 className="font-serif text-2xl font-bold text-[#F5F5F5]">Prêt à jouer ?</h3>
              <p className="text-slate-400 font-medium">4 questions aléatoires pour tester votre palais.</p>
              <button onClick={startGame} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl shadow-lg hover:bg-[#AA7C11]">Démarrer le Quiz</button>
            </div>
          )}
          {gameState === 'playing' && currentQuiz.length > 0 && currentQuiz[qIndex] && (
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-xl border border-[#333]"><span className="text-xs font-bold text-[#D4AF37] uppercase">Question {qIndex + 1}/{currentQuiz.length}</span><span className="text-xs font-bold text-slate-400 uppercase">Score : {score}</span></div>
              <p className="font-serif text-xl font-bold text-[#F5F5F5] min-h-[80px] leading-snug">{currentQuiz[qIndex].q}</p>
              <div className="space-y-3">
                {currentQuiz[qIndex].options.map(opt => {
                  let btnClass = "bg-[#0a0a0a] border-[#333] text-slate-300 hover:border-[#D4AF37]/50";
                  if (feedback && opt === currentQuiz[qIndex].ans) btnClass = "bg-emerald-900 border-emerald-500 text-white";
                  else if (feedback === 'wrong' && opt !== currentQuiz[qIndex].ans) btnClass = "bg-[#0a0a0a] border-[#333] text-slate-600 opacity-50";
                  return <button key={opt} onClick={() => handleAnswer(opt)} className={`w-full p-5 rounded-2xl border flex items-center font-bold text-left transition-all ${btnClass}`}>{opt}</button>
                })}
              </div>
            </div>
          )}
          {gameState === 'end' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-emerald-900/30 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-10 h-10 text-emerald-400"/></div>
              <h3 className="font-serif text-3xl font-bold text-[#F5F5F5]">Terminé !</h3>
              <p className="text-2xl font-black text-emerald-400">{score} / {currentQuiz.length}</p>
              <div className="flex space-x-3"><button onClick={startGame} className="flex-1 py-4 bg-[#D4AF37] text-black font-bold rounded-2xl hover:bg-[#AA7C11]">Rejouer</button><button onClick={() => ctx.setView('home')} className="flex-1 py-4 bg-[#0a0a0a] border border-[#333] text-slate-300 font-bold rounded-2xl">Quitter</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MenuConfigView = ({ ctx }) => {
  const getFoodLabel = (f) => ({ 'ALL': 'Peu importe', 'APERITIF': 'Apéritif & Tapas', 'VIANDE_ROUGE': 'Viande Rouge', 'VIANDE_BLANCHE': 'Volaille & Porc', 'POISSON': 'Poisson & Mer', 'FROMAGE': 'Fromage' }[f] || f);
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le bon choix</h1><p className="text-slate-400 text-xs mt-1 font-medium">Scanner un menu de restaurant</p></div>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Que mangez-vous ce soir ?</span></h3>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(f => (
              <button key={f} onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: f})} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${ctx.menuPrefs.food === f ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] text-slate-400 border-[#333]'}`}>{getFoodLabel(f)}</button>
            ))}
          </div>
        </div>
        <div className="pt-6 space-y-3">
          <button onClick={() => ctx.startCamera('menu')} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg active:scale-95 shadow-lg"><Camera className="inline w-6 h-6 mr-3" />Scanner la carte</button>
        </div>
      </div>
    </div>
  );
};

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
      if (inStockWines.length === 0) throw new Error("Cave vide");
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} ${w.data.annee} (${w.data.type_simplifie})`).join('\n');
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}". Voici les vins dans sa cave : \n${inventoryString}\nChoisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat. Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;
      
      // ✅ Correction ici : Utilisation de ctx.callGemini de manière unifiée
      const result = await ctx.callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur IA");
      ctx.showToast(`L'IA recommande : ${chosenWine.data.nom}`);
      ctx.openExistingWine(chosenWine, 'recommendation');
    } catch (e) {
      ctx.showToast("Accord introuvable.");
    } finally { 
      setIsPairingLoading(false); 
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex items-center sticky top-0 z-50">
        {recMode !== 'menu' && <button onClick={() => setRecMode('menu')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#0a0a0a] border border-[#D4AF37]/50 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3"><Sparkles className="w-6 h-6 text-[#D4AF37]" /></div>
          <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Le Sommelier</h1><p className="text-slate-400 text-sm font-medium">Laissez l'IA vous conseiller</p></div>
        </div>
      </div>

      <div className="p-6 space-y-10">
        {recMode === 'menu' && (
          <div className="space-y-6 mt-4">
            <button onClick={() => setRecMode('buy')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><ShoppingCart className="w-6 h-6 text-[#D4AF37]" /></div>
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Acheter un vin</h3><p className="text-xs text-slate-400">Le meilleur vin à acheter selon votre repas.</p></div>
            </button>
            <button onClick={() => setRecMode('cellar')} className="w-full bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5 relative overflow-hidden">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center shrink-0 relative z-10"><Archive className="w-6 h-6 text-[#D4AF37]" /></div>
              <div className="relative z-10"><h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center mb-1">Que boire ce soir ?</h3><p className="text-xs text-slate-400">Trouvez la bouteille parfaite parmi celles déjà dans votre cave.</p></div>
            </button>
            <button onClick={() => setRecMode('boutique')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg text-left flex items-center space-x-5">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center shrink-0"><Wine className="w-6 h-6 text-[#D4AF37]" /></div>
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">La Boutique</h3><p className="text-xs text-slate-400">Carafes, verres, conservation... Équipez-vous comme un pro.</p></div>
            </button>
          </div>
        )}

        {recMode === 'cellar' && (
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-8 text-center shadow-lg">
            <div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333]"><Utensils className="w-10 h-10 text-[#D4AF37]" /></div>
            <h3 className="font-serif text-2xl font-bold text-[#F5F5F5] mb-3">Que mangez-vous ?</h3>
            <input autoFocus type="text" placeholder="Ex: Magret de canard..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-5 bg-[#0a0a0a] border border-[#333] text-white rounded-xl focus:border-[#D4AF37] outline-none mb-6" />
            <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-full shadow-lg flex justify-center">{isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Explorer ma cave"}</button>
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
          <button onClick={handleRecommend} className="w-full py-5 bg-[#D4AF37] text-black font-black text-lg rounded-full shadow-lg flex items-center justify-center space-x-3 mt-8"><Sparkles className="w-6 h-6" /><span>Trouver la perle rare</span></button>
         </div>
        )}

        {recMode === 'boutique' && (
          <div className="space-y-6 pb-10">
            <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden flex flex-col">
              <img src={imgTirebouchon} className="h-40 w-full object-cover" alt="Tire-bouchon"/>
              <div className="p-5">
                <h5 className="font-serif text-xl font-bold text-white mb-3">Tire-Bouchon Pro</h5>
                <a href={getAmazonAffiliateLink("tire bouchon sommelier professionnel")} target="_blank" rel="noopener noreferrer" className="block w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black py-3 rounded-xl transition-colors">Découvrir</a>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden flex flex-col">
              <img src={imgCarafe} className="h-40 w-full object-cover" alt="Carafe"/>
              <div className="p-5">
                <h5 className="font-serif text-xl font-bold text-white mb-3">Carafe Cristal</h5>
                <a href={getAmazonAffiliateLink("carafe a decanter vin cristal")} target="_blank" rel="noopener noreferrer" className="block w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black py-3 rounded-xl transition-colors">Découvrir</a>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden flex flex-col">
              <img src={imgVerres} className="h-40 w-full object-cover" alt="Verres"/>
              <div className="p-5">
                <h5 className="font-serif text-xl font-bold text-white mb-3">Verres Universels</h5>
                <a href={getAmazonAffiliateLink("verres de degustation vin cristallin")} target="_blank" rel="noopener noreferrer" className="block w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black py-3 rounded-xl transition-colors">Découvrir</a>
              </div>
             </div>

            <div className="bg-[#0a0a0a] rounded-3xl shadow-lg border border-[#D4AF37]/50 overflow-hidden flex flex-col">
                <img src={imgCoravin} className="h-40 w-full object-cover" alt="Coravin"/>
              <div className="p-5">
                <h5 className="font-serif text-xl font-bold text-[#D4AF37] mb-3">Système Coravin</h5>
                <a href={getAmazonAffiliateLink("coravin systeme preservation vin")} target="_blank" rel="noopener noreferrer" className="block w-full text-center font-bold bg-[#D4AF37] text-black hover:bg-[#AA7C11] py-3 rounded-xl transition-colors">Découvrir</a>
              </div>
            </div>
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
    return [...ctx.recommendationList].sort((a, b) => sortOrder === 'asc' ? (a.prix_unitaire_nombre||0) - (b.prix_unitaire_nombre||0) : (b.prix_unitaire_nombre||0) - (a.prix_unitaire_nombre||0));
  }, [ctx.recommendationList, sortOrder]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center"><button onClick={() => ctx.setView('recommendation')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">La Sélection</h1></div>
        <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center space-x-2 bg-[#0a0a0a] border border-[#333] text-slate-400 px-3 py-2 rounded-xl text-xs font-bold"><ArrowDownUp className="w-4 h-4" /><span>{sortOrder === 'asc' ? 'Prix croissant' : 'Prix décroissant'}</span></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedList.map((wine, index) => (
           <div key={index} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden">
             <div className="flex items-stretch">
               <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                 <div>
                   <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold uppercase text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded">{wine.type_simplifie}</span><span className="text-emerald-400 font-bold bg-emerald-900/30 px-2 py-0.5 rounded-lg">{wine.prix_unitaire_nombre}€</span></div>
                   <h3 className="font-serif text-[#F5F5F5] text-lg font-bold line-clamp-2">{wine.nom}</h3>
                   <p className="text-xs text-slate-500 mb-2">{wine.annee} • {wine.region}</p>
                   <p className="text-xs text-slate-400 mb-3 line-clamp-2">{wine.description}</p>
                 </div>
                 <button onClick={() => ctx.processRecommendationSelection(wine)} className="w-full py-3 bg-[#0a0a0a] text-[#D4AF37] border border-[#D4AF37]/50 rounded-xl text-sm font-bold">Découvrir ce vin</button>
               </div>
               <div className="w-28 bg-[#0a0a0a] border-l border-[#333] p-2.5 flex items-center justify-center"><img src={getGenericImageForType(wine.type_simplifie)} alt="Bouteille" className="max-h-full max-w-full object-contain" /></div>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};

const CellarView = ({ ctx }) => {
  const [cellarTab, setCellarTab] = useState('STOCK');
  const [filterType, setFilterType] = useState('ALL');
  const [filterApogee, setFilterApogee] = useState('ALL');
  const [filterFood, setFilterFood] = useState('ALL'); 
  const [viewMode, setViewMode] = useState('shelves'); 
  const [reorgMode, setReorgMode] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');

  const cellarItems = ctx.scanHistory.filter(item => cellarTab === 'STOCK' ? item.stock > 0 : item.wishlist === true);
  
  const filteredItems = useMemo(() => {
    return cellarItems.filter(item => {
      const matchType = filterType === 'ALL' || item.data.type_simplifie === filterType;
      const matchApogee = filterApogee === 'ALL' || item.data.statut_apogee === filterApogee;
      return matchType && matchApogee;
    });
  }, [cellarItems, filterType, filterApogee]);

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

  const handleDragStart = (e, bottle) => { e.dataTransfer.setData('text/plain', bottle.id); };
  const handleDrop = (e, targetShelf, targetBottleId = null) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetBottleId) return;
    const draggedItem = ctx.scanHistory.find(b => b.id === draggedId);
    if (!draggedItem) return;
    ctx.genericUpdate(draggedId, { location: targetShelf });
  };

  const handleMoveBottleClick = (locName) => {
    if (selectedBottle) { ctx.genericUpdate(selectedBottle.id, { location: locName }); setSelectedBottle(null); setNewShelfName(''); ctx.showToast("Bouteille déplacée !"); }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 relative select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-4 px-4 shadow-xl border-b border-[#333] sticky top-0 z-10">
        <div className="flex justify-between items-end mb-4">
          <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Ma Cave</h1>
        </div>
        <div className="flex bg-[#0a0a0a] p-1 rounded-xl mb-4 border border-[#333]">
          <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${cellarTab === 'STOCK' ? 'bg-[#1A1A1A] text-[#D4AF37]' : 'text-slate-500'}`}>En Cave</button>
          <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${cellarTab === 'WISHLIST' ? 'bg-[#1A1A1A] text-[#D4AF37]' : 'text-slate-500'}`}>Achats</button>
        </div>
        {/* NOUVEAUX FILTRES CAVE (Type + Apogée) */}
        <div className="flex flex-col space-y-3 mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${filterType === t ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400'}`}>{t === 'ALL' ? 'Tous' : t}</button>
              ))}
            </div>
            <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-[#333] shrink-0 ml-2">
             {cellarTab === 'STOCK' && (
               <>
                  <button onClick={() => { setViewMode('list'); setReorgMode(false); }} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-[#1A1A1A] text-[#F5F5F5]' : 'text-slate-600'}`}><List className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md ${viewMode === 'shelves' ? 'bg-[#1A1A1A] text-[#F5F5F5]' : 'text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
               </>
             )}
           </div>
          </div>
          
          <div className="flex items-center space-x-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
            {[{id: 'ALL', label: 'Toutes maturités'}, {id: 'APOGEE', label: 'À boire'}, {id: 'A_GARDER', label: 'À garder'}, {id: 'DECLIN', label: 'Déclin'}].map(a => (
              <button key={a.id} onClick={() => setFilterApogee(a.id)} className={`px-4 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap transition-colors ${filterApogee === a.id ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/50' : 'bg-[#1A1A1A] border-[#333] text-slate-500'}`}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === 'shelves' && cellarTab === 'STOCK' && (
          <div className="flex justify-between items-center bg-[#1A1A1A] border border-[#333] rounded-xl p-3 mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase"><b className="text-[#D4AF37]">Astuce :</b> Glissez une bouteille.</p>
            <button onClick={() => { setReorgMode(!reorgMode); setSelectedBottle(null); }} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${reorgMode ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}><GripHorizontal className="w-3 h-3" /><span>Sur Mobile ?</span></button>
          </div>
        )}
        
        {filteredItems.length === 0 && <div className="text-center p-6 opacity-50 mt-10"><Archive className="w-16 h-16 mx-auto mb-4 text-slate-600" /><p className="font-medium text-slate-400">Aucun vin ne correspond.</p></div>}

        {(viewMode === 'list' || cellarTab === 'WISHLIST') ? (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div key={item.id} onClick={() => ctx.openExistingWine(item, 'cellar')} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden flex items-stretch cursor-pointer">
                <div className="flex-1 p-5">
                 <div className="flex justify-between items-start">
                 <h3 className="font-serif text-[#F5F5F5] text-lg font-bold line-clamp-1">{item.data.nom}</h3>
                 <span className="text-emerald-400 font-bold bg-emerald-900/30 px-2 py-0.5 rounded-lg text-xs shrink-0 ml-2">{item.data.prix_unitaire_nombre}€</span>
               </div>
               <p className="text-xs text-slate-400 mt-1">{item.data.annee} • {item.data.region}</p>
             </div>
            </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10 mt-6">
             {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                <div key={shelfName} className="mb-8">
                   <div className="flex items-center justify-between mb-4 px-2"><h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center"><MapPin className="w-5 h-5 mr-2 text-[#D4AF37]" /> {shelfName}</h3><span className="bg-[#1A1A1A] border border-[#333] text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{bottles.length} bouteilles</span></div>
                   <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, shelfName === 'Vins non rangés' ? '' : shelfName)} className="grid grid-cols-3 gap-4 bg-[#1A1A1A]/50 p-4 rounded-3xl border border-[#333] shadow-inner min-h-[200px]">
                      {bottles.map(bottle => (
                         <div key={bottle.id} draggable={!reorgMode} onDragStart={(e) => handleDragStart(e, bottle)} onClick={() => { if (reorgMode) setSelectedBottle(bottle); else ctx.openExistingWine(bottle, 'cellar'); }} className={`relative flex flex-col bg-[#1A1A1A] rounded-2xl p-3 shadow-md border border-[#333] cursor-pointer ${reorgMode ? 'ring-2 ring-[#D4AF37] animate-pulse' : ''}`}>
                            <div className="relative h-28 w-full mb-3 flex items-center justify-center bg-[#0a0a0a] rounded-xl border border-[#222]">
                               <img src={bottle.image || fallbackImg} className="max-h-full object-contain" alt={bottle.data.nom} />
                               {cellarTab === 'STOCK' && bottle.stock > 1 && <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold">x{bottle.stock}</span>}
                            </div>
                            <div className="flex flex-col items-center text-center mt-1">
                             <h4 className="text-[11px] font-bold text-[#F5F5F5] leading-tight line-clamp-2">{bottle.data.nom}</h4>
                             <div className="flex items-center space-x-2 mt-1">
                               <span className="text-[10px] text-slate-400">{bottle.data.annee}</span>
                               <span className="text-[10px] font-bold text-emerald-400">{bottle.data.prix_unitaire_nombre}€</span>
                             </div>
                           </div>
                         </div>
                      ))}
                   </div>
                </div>
             ))}
             <div onDragOver={(e)=>e.preventDefault()} onDrop={(e) => { e.preventDefault(); const newName = window.prompt("Nom de la nouvelle étagère ?"); if (newName && newName.trim() !== '') handleDrop(e, newName); }} className="mt-8 border-2 border-dashed border-[#333] rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer">
               <Plus className="w-8 h-8 mb-2" /><p className="font-bold text-xs uppercase tracking-wider text-center">Glissez un vin ici pour créer une étagère</p>
             </div>
          </div>
        )}
      </div>

      {selectedBottle && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] w-full max-w-sm rounded-3xl p-6 shadow-2xl mb-safe border border-[#333]">
             <h3 className="font-serif text-2xl font-bold text-white mb-1">Ranger la bouteille</h3>
             <div className="space-y-2 max-h-48 overflow-y-auto mb-6 mt-4">
               {existingLocations.map(loc => <button key={loc} onClick={() => handleMoveBottleClick(loc)} className="w-full text-left p-4 rounded-2xl bg-[#0a0a0a] border border-[#333] text-[#F5F5F5] font-bold"><MapPin className="w-4 h-4 inline mr-3 text-[#D4AF37]" /> {loc}</button>)}
               <button onClick={() => handleMoveBottleClick('')} className="w-full text-left p-4 rounded-2xl bg-[#0a0a0a] border border-[#333] text-slate-500 italic">Retirer de l'étagère</button>
             </div>
             <div className="flex space-x-2 border-t border-[#333] pt-6">
               <input type="text" placeholder="Nouvelle étagère..." value={newShelfName} onChange={(e) => setNewShelfName(e.target.value)} className="flex-1 bg-[#0a0a0a] border border-[#333] text-white rounded-2xl px-4 py-4 outline-none focus:border-[#D4AF37] font-medium" />
               <button onClick={() => handleMoveBottleClick(newShelfName)} disabled={!newShelfName.trim()} className="px-6 py-4 bg-[#D4AF37] text-black rounded-2xl font-bold disabled:opacity-50">Créer</button>
             </div>
             <button onClick={() => { setSelectedBottle(null); setNewShelfName(''); }} className="mt-4 w-full py-4 text-slate-400 font-bold rounded-2xl">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryView = ({ ctx }) => {
  const historyItems = ctx.scanHistory.filter(item => item.in_history !== false);
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] shadow-sm"><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Historique</h1></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyItems.map((item) => (
          <div key={item.id} onClick={() => ctx.openExistingWine(item, 'history')} className="bg-[#1A1A1A] rounded-3xl border border-[#333] p-4 flex items-center space-x-4 cursor-pointer">
            <div className="w-20 h-20 bg-black rounded-xl p-1 flex items-center justify-center shrink-0"><img src={item.image} className="max-h-full object-contain" alt="wine" /></div>
            <div className="flex-1 min-w-0"><h3 className="text-white font-serif font-bold text-base truncate">{item.data.nom}</h3><p className="text-xs text-slate-400 mt-0.5">{item.data.annee}</p></div>
            <ChevronRight className="w-5 h-5 text-slate-600"/>
          </div>
        ))}
      </div>
    </div>
  );
};

const AlertsView = ({ ctx }) => {
  const { alerts, user } = ctx;
  const markAllAsRead = () => { if (!user) return; alerts.forEach(a => { if (!a.read) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', a.id), { read: true }); }); };
  const handleAlertClick = (alert) => { updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', alert.id), { read: true }); if (alert.scanId) { const wine = ctx.scanHistory.find(s => s.id === alert.scanId); if (wine) ctx.openExistingWine(wine, 'alerts'); } };
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          {/* CORRECTION DU BOUTON RETOUR ICI */}
          <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Notifications</h1>
        </div>
        {alerts.some(a => !a.read) && <button onClick={markAllAsRead} className="text-xs text-slate-400 hover:text-[#D4AF37]">Tout lire</button>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.map(a => (
          <div key={a.id} onClick={() => handleAlertClick(a)} className={`bg-[#1A1A1A] rounded-2xl border ${a.read ? 'border-[#333]' : 'border-[#D4AF37]/50 shadow-md'} p-4 flex items-center justify-between cursor-pointer`}>
            <div className="flex-1 pr-3"><h4 className="font-bold text-white text-sm">{a.title}</h4><p className="text-xs text-slate-400 mt-1">{a.message}</p></div>
            {!a.read && <div className="w-2 h-2 bg-[#D4AF37] rounded-full shrink-0"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const BADGES = [
  { id: 'b1', name: 'Premier Bouchon', desc: '1er vin scanné', icon: '🍷', check: (h) => h.length >= 1 },
  { id: 'b2', name: 'Amateur', desc: '10 vins scannés', icon: '🥉', check: (h) => h.length >= 10 },
  { id: 'b3', name: 'Passionné', desc: '50 vins scannés', icon: '🥈', check: (h) => h.length >= 50 },
  { id: 'b4', name: 'Sommelier', desc: '100 vins scannés', icon: '🥇', check: (h) => h.length >= 100 },
  { id: 'b5', name: 'Sang de la Terre', desc: '5 vins rouges', icon: '🩸', check: (h) => h.filter(v => v.data?.type_simplifie === 'ROUGE').length >= 5 },
  { id: 'b6', name: 'Larmes d\'Or', desc: '5 vins blancs', icon: '🥂', check: (h) => h.filter(v => v.data?.type_simplifie === 'BLANC').length >= 5 },
  { id: 'b7', name: 'Fête', desc: '3 pétillants', icon: '🍾', check: (h) => h.filter(v => v.data?.type_simplifie === 'PETILLANT').length >= 3 },
  { id: 'b8', name: 'Trésorier', desc: 'Cave > 100€', icon: '💰', check: (h) => h.reduce((acc, c) => acc + ((c.data?.prix_unitaire_nombre || 0) * (parseInt(c.stock) || 0)), 0) >= 100 },
  { id: 'b9', name: 'Investisseur', desc: 'Cave > 500€', icon: '💎', check: (h) => h.reduce((acc, c) => acc + ((c.data?.prix_unitaire_nombre || 0) * (parseInt(c.stock) || 0)), 0) >= 500 },
  { id: 'b10', name: 'Patrimoine', desc: 'Cave > 1000€', icon: '👑', check: (h) => h.reduce((acc, c) => acc + ((c.data?.prix_unitaire_nombre || 0) * (parseInt(c.stock) || 0)), 0) >= 1000 },
  { id: 'b11', name: 'Explorateur', desc: '3 régions', icon: '🌍', check: (h) => new Set(h.map(v => v.data?.region).filter(Boolean)).size >= 3 },
  { id: 'b12', name: 'Globe-Trotter', desc: '5 régions', icon: '🗺️', check: (h) => new Set(h.map(v => v.data?.region).filter(Boolean)).size >= 5 },
  { id: 'b13', name: 'Plume', desc: '10 notes ajoutées', icon: '✍️', check: (h) => h.filter(v => v.notes && v.notes.length > 5).length >= 10 },
  { id: 'b14', name: 'Archiviste', desc: 'Vin < 2015', icon: '⏳', check: (h) => h.some(v => parseInt(v.data?.annee) < 2015) },
  { id: 'b15', name: 'Gardien', desc: '10 bouteilles en stock', icon: '🛡️', check: (h) => h.reduce((acc, c) => acc + (parseInt(c.stock) || 0), 0) >= 10 }
];

const AccountView = ({ ctx }) => {
  const { user, scanHistory, valueHistory, analyzeSensoryDNA, showToast } = ctx;
  const items = scanHistory.filter(i => i.stock > 0);
  const len = scanHistory.filter(i => i.in_history !== false).length;
  const totalB = items.reduce((a, c) => a + (parseInt(c.stock) || 0), 0);
  const totalV = items.reduce((a, c) => a + ((c.data?.prix_unitaire_nombre || 0) * (parseInt(c.stock) || 0)), 0);
  
  const [sensoryData, setSensoryData] = useState(null);
  const [isSensoryLoading, setIsSensoryLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const saveProfile = async () => {
    if (!tempName.trim()) return;
    setIsSavingName(true);
    try {
      await updateProfile(user, { displayName: tempName });
      showToast("Profil mis à jour !");
      setIsEditingProfile(false);
    } catch (e) {
      showToast("Erreur de sauvegarde.");
    } finally {
      setIsSavingName(false);
    }
  };

  const generateADN = async () => {
    const allNotes = scanHistory.filter(i => i.notes && i.notes.length > 10).map(i => i.notes).join(' | ');
    if (allNotes.length < 30) { showToast("Notes insuffisantes (min. 3 vins notés)."); return; }
    setIsSensoryLoading(true);
    const dna = await analyzeSensoryDNA(ctx.callGemini, allNotes);
    if (dna) { setSensoryData(dna); showToast("ADN sensoriel généré !"); } else { showToast("Erreur de calcul."); }
    setIsSensoryLoading(false);
  };

  const formattedChartData = useMemo(() => { if (!valueHistory || valueHistory.length < 2) return []; return valueHistory.map(h => ({ date: h.dateStr, valeur: h.value })); }, [valueHistory]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] pb-32 overflow-y-auto select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex justify-between items-center shadow-xl sticky top-0 z-10">
        <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Mon Club</h1><p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Sauvegarde active</p></div>
        <div className="w-14 h-14 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#D4AF37]/50"><Award className="w-7 h-7 text-[#D4AF37]" /></div>
      </div>
      
      <div className="p-5 space-y-6">
        
        {/* PROFIL ÉDITABLE */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg flex justify-between items-center">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Membre Privé</p>
            {isEditingProfile ? (
              <div className="flex items-center space-x-2 mt-2">
                <input autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Votre nom..." className="bg-black border border-[#D4AF37] text-white rounded-lg px-3 py-2 text-sm outline-none w-full" />
                <button onClick={saveProfile} disabled={isSavingName} className="p-2 bg-[#D4AF37] text-black rounded-lg">{isSavingName ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}</button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <h3 className="font-serif text-2xl font-bold text-[#F5F5F5] truncate pr-4">{user?.displayName || "Anonyme"}</h3>
                <button onClick={() => setIsEditingProfile(true)} className="p-2 bg-[#0a0a0a] border border-[#333] rounded-full text-slate-400 hover:text-[#D4AF37] shrink-0"><Edit3 className="w-4 h-4" /></button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">{user?.email}</p>
          </div>
        </div>

        {/* VALORISATION */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <h3 className="font-serif text-lg font-bold text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-emerald-400"/> Valorisation de la Cave</h3>
          <p className="text-2xl font-black text-emerald-400">{totalV.toFixed(0)} € <span className="text-xs text-slate-500 font-medium">({totalB} bouteilles)</span></p>
          {formattedChartData.length > 1 ? (
            <div className="h-32 w-full mt-4 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData}><XAxis dataKey="date" hide /><YAxis hide /><Area type="monotone" dataKey="valeur" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.1} /></AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-slate-500 italic mt-4">Le graphique se construira au fil des mois.</p>}
        </div>

        {/* COLLECTION DE BADGES */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-serif text-lg font-bold text-white flex items-center">
              <Medal className="w-5 h-5 mr-2 text-[#D4AF37]"/> Collection de Badges
            </h3>
            <button 
              onClick={() => setShowAllBadges(!showAllBadges)} 
              className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-[#D4AF37] transition-colors"
            >
              {showAllBadges ? 'Réduire' : 'Voir tout'}
            </button>
          </div>
          
          <div className={showAllBadges 
            ? "grid grid-cols-3 gap-3" 
            : "flex space-x-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"}>
            {BADGES.map(badge => {
              const unlocked = badge.check(scanHistory);
              return (
                <div key={badge.id} className={`${showAllBadges ? 'w-full' : 'shrink-0 w-28'} flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${unlocked ? 'bg-[#0a0a0a] border-[#D4AF37]/50 shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'bg-[#0a0a0a] border-[#333] opacity-40 grayscale'}`}>
                  <span className="text-3xl mb-2">{badge.icon}</span>
                  <h4 className={`text-[10px] font-bold uppercase leading-tight ${unlocked ? 'text-[#D4AF37]' : 'text-slate-500'}`}>{badge.name}</h4>
                  <p className="text-[9px] text-slate-400 mt-1">{badge.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ADN SENSORIEL */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <h3 className="font-serif text-lg font-bold text-white mb-2 flex items-center"><Target className="w-5 h-5 mr-2 text-[#D4AF37]"/> Profil Sensoriel ADN</h3>
          {sensoryData ? (
            <div className="h-56 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sensoryData}><PolarGrid stroke="#333"/><PolarAngleAxis dataKey="subject" tick={{fill:'#fff', fontSize:10}}/><Radar dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.4}/></RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <button onClick={() => { if (!ctx.requirePremium()) generateADN(); }} disabled={isSensoryLoading} className="w-full mt-4 py-3 bg-[#D4AF37] text-black font-bold rounded-xl flex items-center justify-center space-x-2">
              {isSensoryLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
              <span>Générer mon ADN sensoriel</span>
            </button>
          )}
        </div>

        <button onClick={() => signOut(auth)} className="w-full py-4 bg-red-950/20 text-red-400 font-bold rounded-2xl border border-red-900/40 flex items-center justify-center"><LogOut className="w-4 h-4 mr-3" /> Se déconnecter</button>
      </div>
    </div>
  );
};

const ResultsView = ({ ctx }) => {
  let currentItem = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  if (!currentItem && ctx.analysisResult) currentItem = ctx.scanHistory.find(s => s.data?.nom === ctx.analysisResult.nom);
  
  const d = currentItem?.data;
  const stock = currentItem?.stock || 0;
  const rating = currentItem?.rating || 0;

  const [activeTab, setActiveTab] = useState('infos');
  const [protocol, setProtocol] = useState(null); 
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(false);

  const [tempType, setTempType] = useState(d?.type_simplifie || 'ROUGE');
  const [tempAnnee, setTempAnnee] = useState(d?.annee || 'N.M.');
  const [tempPrix, setTempPrix] = useState(d?.prix_unitaire_nombre || 0);
  const [tempLocation, setTempLocation] = useState(currentItem?.location || '');
  const [tempNotes, setTempNotes] = useState(currentItem?.notes || '');

  useEffect(() => {
    if (currentItem) {
      setTempType(currentItem.data?.type_simplifie || 'ROUGE');
      setTempAnnee(currentItem.data?.annee || 'N.M.');
      setTempPrix(currentItem.data?.prix_unitaire_nombre || 0);
      setTempLocation(currentItem.location || '');
      setTempNotes(currentItem.notes || '');
    }
  }, [currentItem?.id]);

  if (!currentItem) return null;

  const fetchProtocol = async () => {
    if (protocol) return;
    setIsLoadingProtocol(true);
    try {
      const prompt = `Protocole de service en JSON strict pour : "${d.nom} ${tempAnnee}". Format: {"temperature": "X°C", "carafage": "Oui/Non", "verre": "Type", "conseil": "Phrase"}`;
      const res = await ctx.callGemini(prompt);
      setProtocol(extractJSON(res.candidates[0].content.parts[0].text));
    } catch(e) { setProtocol({ temperature: "14°C", carafage: "Non requis", verre: "Classique", conseil: "Servir chambré." }); }
    finally { setIsLoadingProtocol(false); }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] pb-32 overflow-y-auto select-none">
      <div className="bg-[#1a1a1a] p-4 flex justify-between items-center border-b border-[#333] sticky top-0 z-20">
        <SommelierButton text={`Dégustation du cru ${d.nom}. Fenêtre optimale d'apogée : ${d.apogee}.`} />
        <button onClick={ctx.goBack} className="p-3 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full"><X className="w-5 h-5"/></button>
      </div>
      
      <div className="p-5 space-y-6">
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#333] flex p-5 shadow-xl">
          <div className="flex-1 min-w-0 pr-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#0a0a0a] border border-[#333] px-2 py-1 rounded">{tempType}</span>
            <h2 className="text-2xl font-serif font-bold text-white mt-2 leading-tight truncate">{d.nom}</h2>
            <p className="text-xs text-slate-400 mt-1">{tempAnnee} • {d.region}</p>
            <p className="text-xs text-emerald-400 font-bold mt-3">Apogée : {d.apogee}</p>
          </div>
          <div className="w-24 h-36 bg-black rounded-2xl p-2 flex items-center justify-center shrink-0"><img src={currentItem.image || fallbackImg} className="max-h-full object-contain" alt="wine"/></div>
        </div>

        <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#333]">
          <button onClick={() => setActiveTab('infos')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg ${activeTab === 'infos' ? 'bg-[#333] text-[#D4AF37]' : 'text-slate-500'}`}>Fiche Cru</button>
          <button onClick={() => { setActiveTab('service'); fetchProtocol(); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg ${activeTab === 'service' ? 'bg-[#333] text-[#D4AF37]' : 'text-slate-500'}`}>Service IA</button>
          <button onClick={() => setActiveTab('cave')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg ${activeTab === 'cave' ? 'bg-[#333] text-[#D4AF37]' : 'text-slate-500'}`}>Gestion</button>
        </div>

        {activeTab === 'infos' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] text-sm text-slate-300 leading-relaxed">
              {d.description}
            </div>
            
            {/* NOUVEAU : Boutons de stock sur la page principale */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#222] p-4 rounded-2xl border border-[#D4AF37]/30 flex justify-between items-center shadow-lg">
              <span className="text-sm font-bold text-[#D4AF37]">En cave :</span>
              <div className="flex items-center space-x-3">
                <button onClick={() => ctx.updateStock(currentItem.id, stock, -1)} className="w-10 h-10 bg-[#0a0a0a] border border-[#333] text-white rounded-xl font-bold active:scale-95">-</button>
                <span className="text-xl font-black text-white w-6 text-center">{stock}</span>
                <button onClick={() => ctx.updateStock(currentItem.id, stock, 1)} className="w-10 h-10 bg-[#D4AF37] text-black rounded-xl font-black active:scale-95">+</button>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] flex justify-between items-center">
              <div><span className="text-xs text-slate-500 block">Prix Indicatif</span><span className="text-2xl font-black text-[#D4AF37]">{tempPrix} €</span></div>
              <div className="text-right"><span className="text-xs text-slate-500 block">Garde</span><span className="text-sm font-bold text-white">{d.potentiel_garde || 'N.C.'}</span></div>
            </div>
            {(() => {
              const acc = getRecommendedAccessory(tempType);
              return (
                <a href={getAmazonAffiliateLink(acc.search)} target="_blank" rel="noopener noreferrer" className="block w-full text-center font-bold bg-[#D4AF37] text-black py-4 rounded-2xl shadow-lg hover:bg-[#AA7C11] transition-colors mt-4">
                  Accessoire recommandé : {acc.name}
                </a>
              );
            })()}
          </div>
        )}

        {activeTab === 'service' && (
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#333] space-y-4 animate-in fade-in">
            {isLoadingProtocol ? <p className="text-center text-xs text-slate-500">Chargement du protocole...</p> : protocol ? (
              <div className="space-y-3 text-sm">
                <p className="text-slate-400">🌡️ Température : <b className="text-white">{protocol.temperature}</b></p>
                <p className="text-slate-400">🏺 Carafage : <b className="text-white">{protocol.carafage}</b></p>
                <p className="text-slate-400">🍷 Verrerie : <b className="text-white">{protocol.verre}</b></p>
                <p className="text-xs text-[#D4AF37] italic mt-2">"{protocol.conseil}"</p>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'cave' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] flex justify-between items-center">
              <span className="text-sm font-bold text-slate-300">Bouteilles en stock :</span>
              <div className="flex items-center space-x-3">
                <button onClick={() => ctx.updateStock(currentItem.id, stock, -1)} className="w-8 h-8 bg-[#0a0a0a] border border-[#333] rounded font-bold">-</button>
                <span className="text-lg font-black text-[#D4AF37] w-6 text-center">{stock}</span>
                <button onClick={() => ctx.updateStock(currentItem.id, stock, 1)} className="w-8 h-8 bg-[#D4AF37] text-black rounded font-bold">+</button>
              </div>
            </div>
            
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] space-y-3">
              <div className="flex space-x-2">
                <select value={tempType} onChange={e => { 
                    const newType = e.target.value;
                    setTempType(newType); 
                    
                    let gMin = 2, gMax = 5;
                    if (newType === 'ROUGE') { gMin = 3; gMax = 10; }
                    else if (newType === 'BLANC') { gMin = 2; gMax = 6; }
                    else if (newType === 'PETILLANT') { gMin = 1; gMax = 5; }
                    else if (newType === 'ROSE') { gMin = 1; gMax = 3; }

                    const updatedData = normalizeData({
                      ...currentItem.data, 
                      type_simplifie: newType,
                      garde_min: gMin,
                      garde_max: gMax
                    });
                    ctx.genericUpdate(currentItem.id, { data: updatedData });
                  }} 
                  className="w-1/2 bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"
                >
                  <option value="ROUGE">Rouge</option>
                  <option value="BLANC">Blanc</option>
                  <option value="ROSE">Rosé</option>
                  <option value="PETILLANT">Pétillant</option>
                </select>
                <input type="text" value={tempAnnee} onChange={e => setTempAnnee(e.target.value)} onBlur={() => {
                    const updatedData = normalizeData({...currentItem.data, annee: tempAnnee});
                    ctx.genericUpdate(currentItem.id, { data: updatedData });
                  }} placeholder="Année (ex: 2018)" className="w-1/2 bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"/>
              </div>
              <input type="text" value={tempLocation} onChange={e=>setTempLocation(e.target.value)} onBlur={()=>ctx.genericUpdate(currentItem.id, {location: tempLocation})} placeholder="Rangement (ex: Étagère A)..." className="w-full bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"/>
              <textarea value={tempNotes} onChange={e=>setTempNotes(e.target.value)} onBlur={()=>ctx.genericUpdate(currentItem.id, {notes: tempNotes})} placeholder="Notes de dégustation personnelles..." className="w-full bg-black border border-[#333] text-white rounded-xl p-3 text-sm h-20 outline-none focus:border-[#D4AF37] resize-none"/>
            </div>
            
            <button onClick={() => { if (!ctx.requirePremium()) ctx.generateAndShareInstagramImage(ctx.showToast); }} className="w-full py-4 bg-gradient-to-r from-pink-600 to-orange-500 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center space-x-2"><Share2 className="w-4 h-4"/><span>Gérer mon image Story Instagram</span></button>
            <button onClick={() => ctx.setScanAction({id: currentItem.id, type: 'history'})} className="w-full py-3 bg-red-950/20 text-red-400 border border-red-900/40 rounded-xl text-xs font-bold">Supprimer de l'application</button>
            <InstagramShareCanvas wine={currentItem} rating={rating} notes={tempNotes} />
          </div>
        )}
      </div>
    </div>
  );
};

const CameraView = ({ ctx }) => (
  <div className="relative h-full w-full bg-black flex flex-col overflow-hidden select-none">
    <button onClick={() => { ctx.stopCamera(); ctx.setView('home'); }} className="absolute top-12 left-6 z-20 p-3 bg-black/50 text-white rounded-full border border-white/10"><ChevronLeft className="w-6 h-6" /></button>
    
    {/* BOUTON BASCULE CAMÉRA */}
    <button onClick={ctx.toggleCamera} className="absolute top-12 right-6 z-20 p-3 bg-black/50 text-white rounded-full border border-white/10 hover:bg-[#D4AF37] hover:text-black transition-colors"><RefreshCw className="w-6 h-6" /></button>
    
    <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover flex-1" />
    <div className="absolute bottom-0 w-full h-32 bg-black/90 flex items-center justify-center pb-8 z-20">
      <button onClick={ctx.capturePhoto} className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center"><div className="w-14 h-14 bg-[#D4AF37] rounded-full shadow-lg"></div></button>
    </div>
    <canvas ref={ctx.canvasRef} className="hidden" />
  </div>
);

const AnalyzingView = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] select-none relative overflow-hidden">
    <div className="relative z-10 text-center space-y-3">
      <div className="w-16 h-16 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#D4AF37]/30 animate-spin border-t-transparent"></div>
      <h2 className="text-xl font-serif font-bold text-white">Analyse oenologique...</h2>
    </div>
  </div>
);

const PaywallView = ({ ctx }) => (
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
          <button onClick={() => { ctx.setUserTier('AMATEUR'); ctx.setView('home'); ctx.showToast("Bienvenue dans le Club Amateur !"); }} className="w-full bg-[#333] text-white font-bold py-3 rounded-xl hover:bg-[#444] transition-colors">
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
          <button onClick={() => { ctx.setUserTier('COLLECTIONNEUR'); ctx.setView('home'); ctx.showToast("Bienvenue dans le Club Collectionneur !"); }} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
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

const CompareView = ({ ctx }) => (
  <div className="flex flex-col min-h-screen bg-[#0a0a0a] pb-32 overflow-y-auto select-none p-5">
    <div className="flex items-center justify-between mb-6 pt-6">
      <h2 className="text-2xl font-serif font-bold text-[#D4AF37]">Comparateur</h2>
      <button onClick={() => ctx.setView('home')} className="p-2 bg-[#1A1A1A] border border-[#333] rounded-full text-slate-400"><X className="w-5 h-5"/></button>
    </div>

    {/* AFFICHAGE DU RÉSULTAT */}
    {ctx.compareResult ? (
      <div className="animate-in slide-in-from-top-4 mb-6">
      <button 
        onClick={() => ctx.processRecommendationSelection({
          nom: ctx.compareResult.gagnant, 
          description: ctx.compareResult.justification,
          type_simplifie: "ROUGE",
          stock: 0 // Force le stock à 0 par défaut
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
        
        {/* Alternatives cliquables */}
        <div className="mt-4 space-y-2">
          <p className="text-xs text-black/80 font-bold uppercase tracking-wider mb-2">Autres options détectées :</p>
          {ctx.compareResult.alternatives?.map((alt, index) => (
            <div 
              key={index} 
              onClick={(e) => {
                e.stopPropagation(); // Évite de cliquer sur le gagnant en même temps
                ctx.processRecommendationSelection({ nom: alt.nom, description: alt.avis, type_simplifie: "ROUGE", stock: 0 });
              }}
              className="bg-black/5 border border-black/10 p-3 rounded-xl active:scale-95 transition-transform"
            >
              <p className="text-sm font-bold text-black">{alt.nom}</p>
              <p className="text-xs text-black/80 font-medium">{alt.avis}</p>
            </div>
          ))}
        </div>
      </button>

      <button onClick={() => {ctx.setCompareResult(null); ctx.setCompareBasket([]); ctx.setCompareContext('');}} className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#333]">
        Nouvelle comparaison
      </button>
    </div>
    ) : (
      <>
        <p className="text-sm text-slate-400 mb-6">Prenez en photo les bouteilles qui vous font hésiter. L'IA choisira la pépite.</p>
        
        <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] mb-6 shadow-lg">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pour quel plat / occasion ?</label>
          <input type="text" value={ctx.compareContext} onChange={(e) => ctx.setCompareContext(e.target.value)} placeholder="Ex: Barbecue, Poisson, Cadeau..." className="w-full bg-black border border-[#333] text-white rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {ctx.compareBasket.map((imgBase64, index) => (
            <div key={index} className="relative h-40 bg-black rounded-2xl border border-[#333] overflow-hidden shadow-md">
              <img src={imgBase64} className="w-full h-full object-cover opacity-80" alt={`Vin ${index + 1}`} />
              <button onClick={() => ctx.removeCompareImage(index)} className="absolute top-2 right-2 bg-red-500/90 text-white p-2 rounded-full shadow-lg active:scale-90"><X className="w-3 h-3" /></button>
            </div>
          ))}
          
          <label className="h-40 flex flex-col items-center justify-center bg-[#1A1A1A] border-2 border-dashed border-[#333] rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 transition-colors text-slate-400 hover:text-[#D4AF37] shadow-inner">
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">Ajouter un vin</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={ctx.handleAddCompareImage} />
          </label>
        </div>

        <button onClick={ctx.launchComparison} disabled={ctx.compareBasket.length < 2} className={`w-full py-5 font-black text-lg rounded-full shadow-lg flex items-center justify-center space-x-3 transition-all ${ctx.compareBasket.length >= 2 ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black hover:scale-[1.02]' : 'bg-[#1A1A1A] text-slate-600 border border-[#333]'}`}>
          <Sparkles className="w-6 h-6" /><span>Analyser la sélection ({ctx.compareBasket.length})</span>
        </button>
      </>
    )}
  </div>
);

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
  const [valueHistory, setValueHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [facingMode, setFacingMode] = useState('environment');
  const [isPremium, setIsPremium] = useState(false);
  // --- COMPARATEUR DE RAYON ---
  const [compareBasket, setCompareBasket] = useState([]);
  const [compareContext, setCompareContext] = useState('');
  const [compareResult, setCompareResult] = useState(null);

  const handleAddCompareImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Blocage selon le palier
    if (userTier === 'FREE' && compareBasket.length >= 2) { showToast("Gratuit : 2 bouteilles max."); return; }
    if (userTier === 'AMATEUR' && compareBasket.length >= 4) { showToast("Amateur : 4 bouteilles max."); return; }

    const reader = new FileReader();
    reader.onload = (event) => setCompareBasket([...compareBasket, event.target.result]);
    reader.readAsDataURL(file);
  };

  const removeCompareImage = (index) => {
    setCompareBasket(compareBasket.filter((_, i) => i !== index));
  };

  const launchComparison = async () => {
    if (!checkUsageLimit('rayon')) return;
    if (compareBasket.length < 2) { showToast("Ajoutez au moins 2 vins."); return; }
    
    setView('analyzing');
    setPreviousView('compare');
    
    try {
      const prompt = `Sommelier expert. Voici ${compareBasket.length} photos de bouteilles. Contexte/Repas : "${compareContext || 'Général'}". Analyse-les et choisis la meilleure option. Réponds UNIQUEMENT en JSON pur : {"gagnant":"Nom du vin","justification":"Pourquoi (max 20 mots)","alternatives":[{"nom":"Nom autre vin", "avis":"Avis (max 15 mots)"}]}`;

      // On retire l'en-tête "data:image/jpeg;base64," de chaque image de la galerie
      const cleanImages = compareBasket.map(img => img.split(',')[1]);
      
      // Appel propre de ta fonction
      const res = await callGemini(prompt, cleanImages);
      
      let cleanText = res.candidates[0].content.parts[0].text;
      cleanText = cleanText.replace(/```json/g, '').replace(/```/g, ''); 
      
      setCompareResult(JSON.parse(cleanText));
      incrementUsage('rayon');
      setView('compare'); 
    } catch (e) {
      console.error("Erreur IA Comparateur :", e);
      setErrorMsg("Erreur d'analyse des bouteilles.");
      setView('error');
    }
  };
  // -----------------------------
  
  // --- NOUVEAU SYSTÈME DE PALIERS ET LIMITES ---
  // userTier peut être : 'FREE', 'AMATEUR', ou 'COLLECTIONNEUR'
  const [userTier, setUserTier] = useState('FREE');

  const requireTier = (minimumTier) => {
    const tiers = { 'FREE': 0, 'AMATEUR': 1, 'COLLECTIONNEUR': 2 };
    if (tiers[userTier] < tiers[minimumTier]) {
      setPreviousView(view);
      setView('paywall');
      return true;
    }
    return false;
  };

  const checkUsageLimit = (type) => {
    // Définition de tes règles d'accès selon la conversation
    const limits = {
      FREE: { photo: 3, sommelier: 2, menu: 0, facture: 0, rayon: 0, expert: 0 },
      AMATEUR: { photo: Infinity, sommelier: Infinity, menu: 4, facture: 0, rayon: Infinity, expert: 5 },
      COLLECTIONNEUR: { photo: Infinity, sommelier: Infinity, menu: Infinity, facture: Infinity, rayon: Infinity, expert: Infinity }
    };

    const maxLimit = limits[userTier][type];
    
    // Si c'est bloqué (0) ou illimité (Infinity)
    if (maxLimit === Infinity) return true;
    if (maxLimit === 0) { 
      setPreviousView(view); 
      setView('paywall'); 
      return false; 
    }

    // Gestion du compteur mensuel
    const key = `vs_usage_${type}_${new Date().getMonth()}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    
    if (current >= maxLimit) { 
      setPreviousView(view); 
      setView('paywall'); 
      return false; 
    }
    return true;
  };

  const incrementUsage = (type) => {
    const key = `vs_usage_${type}_${new Date().getMonth()}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, current + 1);
  };
  // ----------------------------------------------

  const videoRef = useRef(null); 
  const canvasRef = useRef(null); 
  const streamRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { setUser(u); setIsAuthLoading(false); });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) { setScanHistory([]); setValueHistory([]); setAlerts([]); return; }
    const unsubScans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), (s) => {
      let sc = []; let totalV = 0;
      s.forEach(d => { 
        if(d.data().data) {
          const norm = normalizeData(d.data().data);
          sc.push({id: String(d.id), ...d.data(), data: norm}); 
          if (d.data().stock > 0) totalV += (norm.prix_unitaire_nombre * d.data().stock);
        }
      });
      sc.sort((a, b) => b.timestamp - a.timestamp); setScanHistory(sc);
      if (totalV > 0) saveCellarValueSnapshot(user, totalV);
    });
    const unsubValue = onSnapshot(firestoreQuery(collection(db, 'artifacts', appId, 'users', user.uid, 'value_history'), orderBy('timestamp', 'asc')), (s) => { let vh = []; s.forEach(d => vh.push(d.data())); setValueHistory(vh); });
    const unsubAlerts = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'alerts'), (s) => { let al = []; s.forEach(d => al.push(d.data())); al.sort((a, b) => b.timestamp - a.timestamp); setAlerts(al); });
    return () => { unsubScans(); unsubValue(); unsubAlerts(); };
  }, [user]);

  useEffect(() => { if (user && scanHistory.length > 0) checkAndGenerateAlerts(user, scanHistory, alerts); }, [scanHistory, user]);

  const showToast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3000); };
  
  const startCamera = async (mode = cameraMode, face = facingMode) => {
    // Blocages Freemium
    if (mode === 'bottle' && !checkUsageLimit('photo', 5)) return;
    if (mode !== 'bottle' && requirePremium()) return;

    if (!navigator.mediaDevices?.getUserMedia) { setErrorMsg("Caméra indisponible."); setView('error'); return; }
    try { 
      setCameraMode(mode); 
      setFacingMode(face);
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode: face}}); 
      streamRef.current = s; 
      setView('camera'); 
      setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100); 
    } 
    catch(e){ setErrorMsg("Erreur d'accès à la caméra."); setView('error'); }
  };
  
  const stopCamera = () => { if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; } };
  
  const toggleCamera = () => {
    const newFace = facingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera(cameraMode, newFace);
  };
  
  const capturePhoto = async () => {
    if(videoRef.current && canvasRef.current) {
      const c = canvasRef.current; c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
      c.getContext('2d').drawImage(videoRef.current,0,0); const d = c.toDataURL('image/jpeg',0.8); stopCamera();
      const img = await compressImage(d); setImageSrc(img); 
      if (cameraMode === 'receipt') analyzeReceipt(img); else if (cameraMode === 'menu') analyzeMenu(img); else analyzeImage(img);
    }
  };

  const handleFileUpload = async (e) => { 
    const f = e.target.files[0]; 
    if(f) { const r = new FileReader(); r.onloadend = async () => { const img = await compressImage(r.result); setImageSrc(img); analyzeImage(img); }; r.readAsDataURL(f); } 
  };

  const processAIResult = async (aiText, sourceImage) => {
    const data = normalizeData(extractJSON(aiText)); setAnalysisResult(data);
    const img = sourceImage || getGenericImageForType(data.type_simplifie); setImageSrc(img);
    const obj = { id: 'temp_'+Date.now(), image: img, data, stock: 1, in_history: true, wishlist: false, location: '', notes: '', rating: 0, sensory_dna: null, timestamp: Date.now(), dateStr: new Date().toLocaleDateString('fr-FR') };
    setScanHistory(p=>[obj,...p]); setCurrentScanId(obj.id); setPreviousView('home'); setView('results');
    if(user){ try { const r = await addDoc(collection(db,'artifacts',appId,'users',user.uid,'scans'), obj); setCurrentScanId(r.id); setScanHistory(p=>p.map(i=>i.id===obj.id?{...i,id:r.id}:i)); } catch(e){} }
  };

  const analyzeImage = async (b64) => {
    setView('analyzing');
    try {
      const prompt = `Expert Sommelier. Identifie le vin. JSON strict: {"nom":"NOM","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":20,"garde_min":2,"garde_max":10,"accord_parfait":"viande"}. IMPORTANT: 'garde_min' et 'garde_max' doivent être des entiers stricts.`;
      const p1 = await callGemini(prompt, b64.split(',')[1]);
      incrementUsage('photo'); // On compte +1 scan
      await processAIResult(p1.candidates[0].content.parts[0].text, b64);
    } catch(e) { setErrorMsg("Erreur d'analyse IA."); setView('error'); }
  };

  const searchWineText = async (textQuery) => {
    if (!checkUsageLimit('manual', 10)) return; // Limite de 10
    setView('analyzing'); setPreviousView('home');
    try {
      const prompt = `Recherche le vin : "${textQuery}". JSON strict: {"nom":"${textQuery}","type_simplifie":"ROUGE","annee":"2020","region":"","description":"","prix_unitaire_nombre":15,"garde_min":2,"garde_max":10,"accord_parfait":""}`;
      const result = await callGemini(prompt);
      incrementUsage('manual'); // On compte +1 recherche
      await processAIResult(result.candidates[0].content.parts[0].text, null);
    } catch (err) { setErrorMsg("Erreur de recherche."); setView('error'); }
  };

  const analyzeMenu = async (b64) => {
    setView('analyzing');
    try {
      const prompt = `Sommelier. Choisis le MEILLEUR vin sur cette carte pour accompagner un repas. JSON strict: {"nom":"NOM","type_simplifie":"ROUGE","annee":"","region":"","description":"","prix_unitaire_nombre":30,"potentiel_garde":"","accord_parfait":""}`;
      const result = await callGemini(prompt, b64.split(',')[1]);
      await processAIResult(result.candidates[0].content.parts[0].text, null);
    } catch(err) { setErrorMsg("Lecture du menu impossible."); setView('error'); }
  };

  const analyzeReceipt = async (b64) => {
    setView('analyzing');
    try {
      const prompt = `Extrait les vins de ce ticket. JSON: [{"nom":"Nom","annee":"2020","prix_unitaire_nombre":15,"type_simplifie":"ROUGE","region":""}]`;
      const result = await callGemini(prompt, b64.split(',')[1]);
      let parsed = extractJSON(result.candidates[0].content.parts[0].text);
      if(parsed && parsed[0]) { await processAIResult(JSON.stringify(parsed[0]), null); setView('cellar'); } else throw new Error();
    } catch(err) { setErrorMsg("Lecture de la facture impossible."); setView('error'); }
  };

  const fetchAIRecommendation = async (type='ALL', apogee='ALL', food='ALL', price='ALL') => {
    if (typeof type === 'function') type = 'ALL'; 
    setView('analyzing'); setPreviousView('recommendation');
    try {
      // CORRECTION ICI : Traduction du budget en Euros pour l'IA
      let budgetStr = "Peu importe";
      if (price === 'BUDGET') budgetStr = "Maximum 15€";
      else if (price === 'MEDIUM') budgetStr = "Entre 15€ et 35€";
      else if (price === 'PREMIUM') budgetStr = "Plus de 35€";

      const prompt = `Trouve 3 suggestions de grands vins réels. Format JSON avec clé racine "vins": {"vins": [{"nom":"Vin","type_simplifie":"ROUGE","annee":"2019","region":"","description":"","prix_unitaire_nombre":25,"potentiel_garde":"","accord_parfait":""}]}. Contraintes obligatoires -> Type: ${type}, Repas: ${food}, Budget: ${budgetStr}.`;
      
      const result = await ctx.callGemini(prompt);
      let parsed = extractJSON(result.candidates[0].content.parts[0].text);
      setRecommendationList((parsed.vins || parsed).map(v => normalizeData(v))); 
      setView('recommendationList');
    } catch (err) { 
      setErrorMsg("Erreur oenologique de l'IA."); 
      setView('error'); 
    }
  };

  const genericUpdate = async (id, f) => {
    setScanHistory(p=>p.map(i=>i.id===id?{...i,...f}:i));
    if(user && !id.startsWith('temp_')){ try{ await updateDoc(doc(db,'artifacts',appId,'users',user.uid,'scans',id), f); }catch(e){} }
  };
  const updateStock = async (id, cur, ch) => {
    const ns = Math.max(0, parseInt(cur)+ch); setScanHistory(p=>p.map(i=>i.id===id?{...i,stock:ns}:i));
    if(user && !id.startsWith('temp_')){ try{ const r=doc(db,'artifacts',appId,'users',user.uid,'scans',id); if(ns===0 && !scanHistory.find(s=>s.id===id).wishlist){ await deleteDoc(r); setScanHistory(p=>p.filter(i=>i.id!==id)); } else await updateDoc(r,{stock:ns}); }catch(e){} }
  };
  const updateDataField = async (id, fieldName, value) => {
    const currentItem = scanHistory.find(item => item.id === id); if (!currentItem) return;
    const newData = { ...currentItem.data, [fieldName]: value };
    setScanHistory(prev => prev.map(item => item.id === id ? { ...item, data: newData } : item));
    if (user && !id.startsWith('temp_')) { try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scans', id), { [`data.${fieldName}`]: value }); } catch(e) {} }
  };

  const handleKeyDown = (e) => { if(e.key==='Enter') e.target.blur(); };

  const ctx = { 
    user, view, setView, previousView, setPreviousView, imageSrc, analysisResult, errorMsg, setErrorMsg, 
    scanHistory, setScanHistory, scanAction, setScanAction, recommendationList, currentScanId, setCurrentScanId, 
    toastMsg, showToast, startCamera, stopCamera, capturePhoto, handleFileUpload, analyzeImage, searchWineText, 
    analyzeMenu, analyzeReceipt, fetchAIRecommendation, menuPrefs, setMenuPrefs, updateDataField,
    processRecommendationSelection: (w)=>processAIResult(JSON.stringify(w), null), genericUpdate, updateStock, 
    goBack:()=>setView(previousView), openExistingWine:(i,o)=>{setImageSrc(i.image);setAnalysisResult(i.data);setCurrentScanId(i.id);setPreviousView(o);setView('results');}, 
    videoRef, canvasRef, cameraMode, handleKeyDown, callGemini, valueHistory, alerts, analyzeSensoryDNA, generateAndShareInstagramImage,
    toggleCamera, userTier, setUserTier, requireTier, compareBasket, setCompareBasket, compareContext, setCompareContext, handleAddCompareImage, removeCompareImage, launchComparison, compareResult, setCompareResult
  };

  if (isAuthLoading) return <div className="h-[100dvh] bg-[#0a0a0a] flex items-center justify-center"><Wine className="w-12 h-12 text-[#D4AF37] animate-pulse" /></div>;
  if (!user) return <AuthView auth={auth} />;

  const unreadAlerts = alerts.filter(a => !a.read).length;

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] sm:border-x sm:border-[#333] overflow-hidden relative text-[#F5F5F5] font-sans select-none" style={{'--gold-primary': '#D4AF37'}}>
        {['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) && (
          <div className="absolute top-0 w-full h-16 bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#333] flex items-center justify-between px-5 z-30">
            <h2 className="text-xl font-serif font-bold text-[#D4AF37]">VinoScan</h2>
            <button onClick={() => setView('alerts')} className="relative p-2 bg-[#0a0a0a] rounded-full border border-[#333] text-slate-400 hover:border-[#D4AF37]/50 transition-all">
              <Bell className="w-5 h-5" /> {unreadAlerts > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#1a1a1a]">{unreadAlerts}</span>}
            </button>
          </div>
        )}
        <div className={['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) ? "pt-16 pb-16 h-full" : "h-full"}>
          {view === 'home' && <HomeView ctx={ctx} />}
          {view === 'account' && <AccountView ctx={ctx} />}
          {view === 'paywall' && <PaywallView ctx={ctx} />} 
          {view === 'compare' && <CompareView ctx={ctx} />}
          {view === 'history' && <HistoryView ctx={ctx} />}
          {view === 'cellar' && <CellarView ctx={ctx} />}
          {view === 'recommendation' && <RecommendationView ctx={ctx} />}
          {view === 'recommendationList' && <RecommendationListView ctx={ctx} />}
          {view === 'results' && <ResultsView ctx={ctx} />}
          {view === 'camera' && <CameraView ctx={ctx} />}
          {view === 'analyzing' && <AnalyzingView />}
          {view === 'menuConfig' && <MenuConfigView ctx={ctx} />}
          {view === 'manualSearch' && <ManualSearchView ctx={ctx} />}
          {view === 'quiz' && <QuizView ctx={ctx} />}
          {view === 'alerts' && <AlertsView ctx={ctx} />}
          {view === 'error' && (
          
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a] pt-20"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-bold text-white mb-2">Erreur technique</h2><p className="text-sm text-slate-400 mb-6">{errorMsg}</p><button onClick={()=>setView('home')} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl shadow-lg">Retour</button></div>
          )}
        </div>
        {['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) && <NavigationBar ctx={ctx} />}
        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"><h3 className="text-xl font-bold text-white mb-2">Supprimer ?</h3><div className="flex space-x-3 mt-6"><button onClick={()=>setScanAction(null)} className="flex-1 py-3 bg-[#333] rounded-xl font-bold">Annuler</button><button onClick={()=>{ ctx.genericUpdate(scanAction.id, { in_history: false, stock: 0 }); setScanAction(null); setView('home'); ctx.showToast("Supprimé."); }} className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-600/40 rounded-xl font-bold">Supprimer</button></div></div></div>
        )}
        {toastMsg && (
          <div className="absolute top-20 left-0 w-full flex justify-center z-[200] animate-in slide-in-from-top-4"><div className="bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-full shadow-lg border border-[#AA7C11] flex items-center space-x-2"><CheckCircle className="w-4 h-4" /><span>{toastMsg}</span></div></div>
        )}
      </div>
    </ErrorBoundary>
  );
}