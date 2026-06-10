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
import { getFirestore, initializeFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc, query as firestoreQuery, where, orderBy, limit, getDocs } from 'firebase/firestore';
import ManualEntryView from './views/ManualEntryView';
import AiSearchView from './views/AiSearchView';
import QuizView from './views/QuizView';
import RecommendationView from './views/RecommendationView';
import CellarView from './views/CellarView';
import HistoryView from './views/HistoryView';
import AccountView from './views/AccountView';
import HomeView from './views/HomeView';
import ResultsView from './views/ResultsView';
import CompareView from './views/CompareView';
import PaywallView from './views/PaywallView';
import AlertsView from './views/AlertsView';
import ScanSelectorView from './views/ScanSelectorView';
import MenuConfigView from './views/MenuConfigView';
import RecommendationListView from './views/RecommendationListView';
import CameraView, { AnalyzingView } from './views/CameraView';
import AuthView from './views/AuthView';

// ========================================================================
// CONFIGURATION SÉCURISÉEe
// =========================================================================
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

const firebaseConfig = { 
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", 
  authDomain: "vinoscan-prestige.firebaseapp.com", 
  projectId: "vinoscan-prestige",
  storageBucket: "vinoscan-prestige.firebasestorage.app", 
  messagingSenderId: "830980961095", 
  appId: "1:830980961095:web:6b396e8f1f23e834611262",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
const appId = 'vinoscan-prestige';

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
  const model = 'gemini-3.1-flash-lite'; 
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

const BottomNavigation = ({ ctx }) => (
  <nav className="absolute bottom-0 w-full bg-[#1A1A1A]/95 backdrop-blur-md border-t border-[#333] flex justify-around items-center h-20 z-50">
    <button onClick={() => ctx.setView('home')} className={`flex flex-col items-center transition-colors ${ctx.view === 'home' ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-400'}`}>
      <Wine className="w-6 h-6 mb-1" />
      <span className="text-[10px] font-bold uppercase tracking-wider">Ma Cave</span>
    </button>
    
    {/* Le bouton central a maintenant un design luxe Noir/Or au lieu du dégradé jaune */}
    <button onClick={() => ctx.setView('scanSelector')} className="w-16 h-16 bg-[#0a0a0a] border-2 border-[#D4AF37] rounded-full flex justify-center items-center shadow-[0_0_15px_rgba(212,175,55,0.2)] -mt-8 active:scale-90 transition-transform">
      <Camera className="w-7 h-7 text-[#D4AF37]" />
    </button>
    
    <button onClick={() => ctx.setView('account')} className={`flex flex-col items-center transition-colors ${ctx.view === 'account' ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-400'}`}>
      <User className="w-6 h-6 mb-1" />
      <span className="text-[10px] font-bold uppercase tracking-wider">Profil</span>
    </button>
  </nav>
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
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setIsAuthLoading(false); 
      
      if (u) {
        // Écoute le champ "tier" dans le document de l'utilisateur
        const userDocRef = doc(db, 'artifacts', appId, 'users', u.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().tier) {
            setUserTier(docSnap.data().tier);
          } else {
            setUserTier('FREE'); // Niveau par défaut
          }
        });
      } else {
        setUserTier('FREE');
      }
    });
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
    }, (error) => {
      alert("🚨 Lecture Firebase bloquée : " + error.message);
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
    if (mode === 'receipt' && !checkUsageLimit('facture')) return;

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
      const c = canvasRef.current; 
      c.width = videoRef.current.videoWidth; 
      c.height = videoRef.current.videoHeight;
      c.getContext('2d').drawImage(videoRef.current,0,0); 
      const d = c.toDataURL('image/jpeg',0.8); 
      
      stopCamera();
      const img = await compressImage(d); 
      setImageSrc(img); 
      
      // Le nouveau routage de l'image selon le mode
      if (cameraMode === 'receipt') {
        analyzeReceipt(img); 
      } else if (cameraMode === 'menu') {
        analyzeMenu(img); 
      } else if (cameraMode === 'compare') {
        setCompareBasket(prev => [...prev, img]);
        setView('compare'); // On retourne direct sur le comparateur
      } else {
        analyzeImage(img);
      }
    }
  };

  const handleFileUpload = async (e) => { 
    const f = e.target.files[0]; 
    if (f) { 
      const r = new FileReader(); 
      r.onloadend = async () => { 
        // 1. On coupe la caméra si elle tournait
        stopCamera(); 
  
        // 2. On compresse l'image de la galerie
        const img = await compressImage(r.result); 
        setImageSrc(img); 
  
        // 3. On route vers le bon module d'analyse
        if (cameraMode === 'receipt') {
          analyzeReceipt(img); 
        } else if (cameraMode === 'menu') {
          analyzeMenu(img); 
        } else if (cameraMode === 'compare') {
          setCompareBasket(prev => [...prev, img]);
          setView('compare');
        } else {
          analyzeImage(img);
        }
      }; 
      r.readAsDataURL(f); 
    } 
  };

  const processAIResult = async (aiText, sourceImage) => {
    const data = normalizeData(extractJSON(aiText)); 
    setAnalysisResult(data);
    
    // 1. Affichage de la vraie photo à l'écran
    const localImg = sourceImage || getGenericImageForType(data.type_simplifie); 
    setImageSrc(localImg);
    
    const scanId = Date.now().toString();
    const objLocal = { id: scanId, image: localImg, data, stock: 0, in_history: true, wishlist: false, location: '', notes: '', rating: 0, sensory_dna: null, timestamp: Date.now(), dateStr: new Date().toLocaleDateString('fr-FR') };
    
    // 2. L'interface se met à jour instantanément pour l'utilisateur
    setScanHistory(p=>[objLocal,...p]); 
    setCurrentScanId(scanId); 
    setPreviousView('home'); 
    setView('results');
    
    const activeUser = auth.currentUser;
    if (activeUser) { 
      try { 
        // 3. ENVOI SÉCURISÉ : On force l'image générique (légère) pour éviter le crash réseau
        const objFirebase = { ...objLocal, image: getGenericImageForType(data.type_simplifie) };
        
        const docRef = doc(db, 'artifacts', appId, 'users', activeUser.uid, 'scans', scanId);
        await setDoc(docRef, objFirebase); 
      } catch(e) {
        alert(`🚨 Erreur Firebase : ${e.message}`);
      } 
    }
  };

  const analyzeImage = async (b64) => {
    setView('analyzing');
    try {
      const prompt = `Expert Sommelier. Identifie le vin. JSON strict: {"nom":"NOM","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":20,"garde_min":2,"garde_max":10,"accord_parfait":"viande"}. IMPORTANT: 'garde_min' et 'garde_max' doivent être des entiers stricts.`;
      
      // Extraction sécurisée du base64
      const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;
      
      const p1 = await callGemini(prompt, cleanB64);
      incrementUsage('photo'); 
      
      if (!p1.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Réponse vide du serveur Gemini.");
      }
      
      await processAIResult(p1.candidates[0].content.parts[0].text, b64);
    } catch(e) {
      console.error("Détail Erreur IA:", e);
      // Affiche la vraie cause sur l'écran d'erreur
      setErrorMsg(`Détail : ${e.message}`); 
      setView('error'); 
    }
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
    let contraintes = "";
    if (menuPrefs.plat) {
      contraintes += ` Le plat choisi par le client est : "${menuPrefs.plat}". L'accord mets-vins doit être PARFAIT pour ce plat spécifique.`;
    }
    if (menuPrefs.budget) {
      contraintes += ` Le budget maximum absolu de la bouteille est de ${menuPrefs.budget}€.`;
    }

    const prompt = `Agis comme un Sommelier expert. L'utilisateur te fournit la photo d'une carte des vins de restaurant.${contraintes} Trouve LE MEILLEUR vin sur cette carte qui respecte strictement ces critères. Réponds UNIQUEMENT en JSON strict: {"nom":"NOM EXACT SUR LA CARTE","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"Pourquoi ce choix (max 20 mots)","prix_unitaire_nombre":30,"potentiel_garde":"","accord_parfait":""}`;
    
    const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;
    const result = await callGemini(prompt, cleanB64);
    
    await processAIResult(result.candidates[0].content.parts[0].text, null);
  } catch(err) { 
    setErrorMsg("Lecture du menu impossible ou aucun vin de la carte ne correspond à ce budget."); 
    setView('error'); 
  }
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
  const updateStock = async (id, currentStock, change) => {
    const newStock = Math.max(0, currentStock + change);
    
    // Sécurité : on vérifie que l'utilisateur est connecté
    if (!user) {
      console.error("Utilisateur non connecté");
      return;
    }

    try {
      // On envoie le nouveau stock directement à Firebase
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'scans', id);
      await updateDoc(docRef, { stock: newStock });
    } catch (e) {
      console.error("Erreur lors de la modification du stock :", e);
    }
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
    analyzeMenu, analyzeReceipt, fetchAIRecommendation, menuPrefs, setMenuPrefs, updateDataField, requireTier, userTier,

    // 1. Création d'une nouvelle bouteille avec stock à 0
    processRecommendationSelection: async (w) => {
      if (!user) { ctx.showToast("Connectez-vous pour ajouter à la cave."); return; }
      
      const scanId = Date.now().toString();
      const newItem = {
        data: w,
        stock: 0,
        timestamp: Date.now()
      };

      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scans', scanId), newItem);
        setCurrentScanId(scanId);
        setPreviousView(view);
        setView('results');
      } catch (e) {
        console.error("Erreur Firebase :", e);
        ctx.showToast("Erreur lors de la sauvegarde.");
      }
    },
    
    processManualEntry: async (manualData, customImage) => {
      if (!user) { ctx.showToast("Connectez-vous pour ajouter."); return; }
      const scanId = Date.now().toString();

      const typeSimp = manualData.type_simplifie || 'ROUGE';
      let gMin = 2, gMax = 5;
      if (typeSimp === 'ROUGE') { gMin = 3; gMax = 10; }
      else if (typeSimp === 'BLANC') { gMin = 2; gMax = 6; }
      else if (typeSimp === 'PETILLANT') { gMin = 1; gMax = 5; }
      else if (typeSimp === 'ROSE') { gMin = 1; gMax = 3; }

      const updatedData = normalizeData({ ...manualData, garde_min: gMin, garde_max: gMax });

      const newItem = {
        id: scanId,
        image: customImage || getGenericImageForType(typeSimp),
        data: updatedData,
        stock: 1, // Ajoute directement 1 bouteille en stock !
        in_history: true,
        wishlist: false,
        location: '', notes: '', rating: 0, sensory_dna: null,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('fr-FR')
      };

      setScanHistory(p => [newItem, ...p]);
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scans', scanId), newItem);
        ctx.showToast("Bouteille ajoutée à la cave !");
        setView('home');
      } catch (e) {
        ctx.showToast("Erreur lors de la sauvegarde.");
      }
    },

    // 2. Mise à jour fluide du stock (+ / -)
    updateStock: async (id, currentStock, change) => {
      const newStock = Math.max(0, currentStock + change);
      
      setScanHistory(prev => prev.map(item => 
        item.id === id ? { ...item, stock: newStock } : item
      ));

      if (user) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'scans', id);
          await updateDoc(docRef, { stock: newStock });
        } catch (e) {
          console.error("Erreur de sauvegarde Firebase :", e);
        }
      }
    },

    // 3. Mise à jour fluide des textes (Année, Notes, Emplacement)
    genericUpdate: async (id, fieldsToUpdate) => {
      setScanHistory(prev => prev.map(item => 
        item.id === id ? { ...item, ...fieldsToUpdate } : item
      ));

      if (user) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'scans', id);
          await updateDoc(docRef, fieldsToUpdate);
        } catch (e) {
          console.error("Erreur de sauvegarde Firebase :", e);
        }
      }
    },

    goBack: () => setView(previousView), 
    
    openExistingWine: (i, o) => {
      setImageSrc(i.image);
      setAnalysisResult(i.data);
      setCurrentScanId(i.id);
      setPreviousView(o);
      setView('results');
    }, 
    
    videoRef, canvasRef, cameraMode, handleKeyDown, callGemini, valueHistory, alerts, analyzeSensoryDNA, generateAndShareInstagramImage,
    toggleCamera, userTier, setUserTier, requireTier, compareBasket, setCompareBasket, compareContext, setCompareContext, handleAddCompareImage, removeCompareImage, launchComparison, compareResult, setCompareResult
  };

  if (isAuthLoading) return <div className="h-[100dvh] bg-[#0a0a0a] flex items-center justify-center"><Wine className="w-12 h-12 text-[#D4AF37] animate-pulse" /></div>;
  if (!user) return <AuthView auth={auth} />;

  const unreadAlerts = alerts.filter(a => !a.read).length;

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] sm:border-x sm:border-[#333] flex flex-col relative text-[#F5F5F5] font-sans select-none overflow-hidden" style={{'--gold-primary': '#D4AF37'}}>
        
        {/* EN-TÊTE FIXE UNIFIÉ */}
        {['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) && (
          <div className="w-full h-16 shrink-0 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#333] flex items-center justify-between px-5 z-30">
            <h1 className="text-2xl font-extrabold text-[#F5F5F5]">
              Vino<span className="text-[#D4AF37]">Scan</span>
            </h1>
            <div className="flex items-center space-x-3">
              <button onClick={() => setView('alerts')} className="relative p-2 bg-[#1a1a1a] rounded-full border border-[#333] text-slate-400 hover:text-[#D4AF37] transition-all">
                <Bell className="w-5 h-5" />
                {unreadAlerts > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#1a1a1a]">{unreadAlerts}</span>}
              </button>
              <button onClick={() => setView('paywall')} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg bg-[#D4AF37] text-black active:scale-95">
                {userTier === 'FREE' ? '⭐ PREMIUM' : userTier}
              </button>
            </div>
          </div>
        )}

        {/* CONTENU QUI SCROLL LIBREMENT */}
        <div className="flex-1 overflow-y-auto pb-20">
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
          {view === 'manualEntry' && <ManualEntryView ctx={ctx} />}
          {view === 'aiSearch' && <AiSearchView ctx={ctx} />}
          {view === 'quiz' && <QuizView ctx={ctx} />}
          {view === 'alerts' && <AlertsView ctx={ctx} />}
          {view === 'scanSelector' && <ScanSelectorView ctx={ctx} />}
          {view === 'error' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a] pt-20"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-bold text-white mb-2">Erreur technique</h2><p className="text-sm text-slate-400 mb-6">{errorMsg}</p><button onClick={()=>setView('home')} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl shadow-lg">Retour</button></div>
          )}
        </div>
        
        {/* POPUPS ET TOASTS */}
        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"><h3 className="text-xl font-bold text-white mb-2">Supprimer ?</h3><div className="flex space-x-3 mt-6"><button onClick={()=>setScanAction(null)} className="flex-1 py-3 bg-[#333] rounded-xl font-bold">Annuler</button><button onClick={()=>{ ctx.genericUpdate(scanAction.id, { in_history: false, stock: 0 }); setScanAction(null); setView('home'); ctx.showToast("Supprimé."); }} className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-600/40 rounded-xl font-bold">Supprimer</button></div></div></div>
        )}
        {toastMsg && (
          <div className="absolute top-20 left-0 w-full flex justify-center z-[200] animate-in slide-in-from-top-4"><div className="bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-full shadow-lg border border-[#AA7C11] flex items-center space-x-2"><CheckCircle className="w-4 h-4" /><span>{toastMsg}</span></div></div>
        )}

        {/* BARRE DE NAVIGATION EN BAS */}
        {view !== 'camera' && view !== 'analyzing' && <BottomNavigation ctx={ctx} />}
      </div>
    </ErrorBoundary>
  );
}