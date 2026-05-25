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
// CONFIGURATION SÉCURISÉE (SANS CACHE EXPÉRIMENTAL POUR VERCEL)
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

// --- UTILITAIRES DE DONNÉES ET IMAGES ---
const getGenericImageForType = (type) => {
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?auto=format&fit=crop&w=800&q=80";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800&q=80";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800&q=80";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80"; 
  }
};

const getAmazonAffiliateLink = (query) => `https://www.amazon.fr/s?k=${encodeURIComponent(query)}&tag=vinoscan-21`;

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

// =========================================================================
// MOTEUR D'ANALYSES COMPLÉMENTAIRES (POINTS 1, 2, 3)
// =========================================================================

// POINT 3 : Analyse du profil sensoriel via Gemini
const analyzeSensoryDNA = async (callGeminiFunc, notes) => {
  if (!notes || notes.length < 10) return null;
  try {
    const prompt = `Analyse ces notes de dégustation : "${notes}". Évalue sur une échelle de 1 à 5 les dimensions suivantes. Réponds UNIQUEMENT en JSON pur : {"tannins": 0, "acidite": 0, "corps": 0, "fruit": 0, "boise": 0}`;
    const res = await callGeminiFunc(prompt);
    const data = extractJSON(res.candidates[0].content.parts[0].text);
    return [
      { subject: 'Tannins', A: data.tannins || 1, fullMark: 5 },
      { subject: 'Acidité', A: data.acidite || 1, fullMark: 5 },
      { subject: 'Corps', A: data.corps || 1, fullMark: 5 },
      { subject: 'Fruit', A: data.fruit || 1, fullMark: 5 },
      { subject: 'Boisé', A: data.boise || 1, fullMark: 5 },
    ];
  } catch(e) { return null; }
};

// POINT 1 : Calcul de l'historique de valeur (sauvegarde mensuelle)
const saveCellarValueSnapshot = async (user, totalValue) => {
  if (!user || totalValue <= 0) return;
  const now = new Date();
  const snapshotId = `${now.getFullYear()}_${now.getMonth() + 1}`;
  try {
    // On ne sauvegarde qu'une fois par mois maximum
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'value_history', snapshotId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { value: totalValue, timestamp: now.getTime(), dateStr: now.toLocaleDateString('fr-FR', {month: 'short', year: '2-digit'}) });
    }
  } catch(e) {}
};

// POINT 2 : Moteur de génération d'alertes internes (Apogée, Valorisation)
const checkAndGenerateAlerts = async (user, scans, alerts) => {
  if (!user || !scans) return;
  const currentYear = new Date().getFullYear();
  let newAlerts = [];

  scans.forEach(item => {
    const d = item.data;
    if (!d || !item.id) return;

    // Alerte Apogée (Point 2)
    if (d.statut_apogee === 'APOGEE' && item.stock > 0) {
      const alertId = `apogee_${item.id}_${currentYear}`;
      if (!alerts.some(a => a.id === alertId)) {
        newAlerts.push({ id: alertId, type: 'APOGEE', title: 'Window d\'apogée ouverte', message: `Votre ${d.nom} ${d.annee} est prêt à être dégusté !`, scanId: item.id, wineName: d.nom, read: false, timestamp: Date.now() });
      }
    }

    // Alerte Déclin (Point 2)
    if (d.statut_apogee === 'DECLIN' && item.stock > 0) {
      const alertId = `declin_${item.id}_${currentYear}`;
      if (!alerts.some(a => a.id === alertId)) {
        newAlerts.push({ id: alertId, type: 'DECLIN', title: 'Attention : Déclin imminent', message: `Il est temps d'ouvrir votre ${d.nom} ${d.annee} avant qu'il ne soit trop tard.`, scanId: item.id, wineName: d.nom, read: false, timestamp: Date.now() });
      }
    }
  });

  // Sauvegarde des nouvelles alertes dans Firebase
  for (let alert of newAlerts) {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', alert.id), alert);
    } catch(e) {}
  }
};

// =========================================================================
// MOTEUR IA INTELLIGENT ORIGINAL ROBUSTE
// =========================================================================
const callGemini = async (prompt, b64Data = null) => {
  const model = 'gemini-2.5-flash'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt }];
  
  if (b64Data) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: b64Data } });
  }
  
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

// =========================================================================
// MOTEUR DE TRAITEMENT DES DONNÉES
// =========================================================================
const getGenericImageForType = (type) => {
  switch(type) {
    case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?auto=format&fit=crop&w=800&q=80";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800&q=80";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800&q=80";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80"; 
  }
};

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

const getAmazonAffiliateLink = (query) => {
  const trackingTag = "vinoscan-21"; 
  const baseUrl = "https://www.amazon.fr/s?k=";
  const searchTerms = encodeURIComponent(query);
  return `${baseUrl}${searchTerms}&tag=${trackingTag}`;
};
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

const SommelierButton = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lireTexte = (e) => {
    e.stopPropagation(); 
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR'; utterance.rate = 0.9; utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance); setIsSpeaking(true);
  };
  return (
    <button onClick={lireTexte} className={`p-2 rounded-full border transition-all shadow-md ${isSpeaking ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-105' : 'bg-[#1A1A1A] border-[#333] text-[#D4AF37] hover:border-[#D4AF37]/50'}`}>
      {isSpeaking ? <EyeOff className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
    </button>
  );
};

const InstagramShareCanvas = ({ wine, rating, notes }) => (
  <div id="vs-share-canvas" className="fixed -left-[9999px] top-0 w-[1080px] h-[1920px] bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden select-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1594498653385-d5172b532c00?q=80&w=1080&auto=format&fit=crop')`, backgroundSize: 'cover' }}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    
    {/* Contenu principal */}
    <div className="relative z-10 flex flex-col items-center p-16 h-full border-[16px] border-[#D4AF37]/20 m-10 rounded-[60px] shadow-2xl bg-black/40">
      
      {/* Header App */}
      <div className="flex items-center space-x-6 mt-10">
        <div className="w-24 h-24 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center border-4 border-[#D4AF37] shadow-xl"><Wine className="w-12 h-12 text-[#D4AF37]" /></div>
        <h1 className="text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11]">VinoScan</h1>
      </div>
      
      {/* Image Bouteille Magnifiée */}
      <div className="flex-1 flex items-center justify-center my-20 w-full relative">
        <div className="absolute w-96 h-96 bg-[#D4AF37]/20 rounded-full blur-3xl opacity-60"></div>
        <img src={wine.image || getGenericImageForType(wine.data.type_simplifie)} className="h-[700px] object-contain drop-shadow-[0_20px_50px_rgba(212,175,55,0.4)] relative z-10" alt="wine" />
      </div>

      {/* Infos Dégustation */}
      <div className="w-full text-center space-y-6 bg-[#1a1a1a]/80 p-12 rounded-[40px] border border-[#333] backdrop-blur-md mb-12">
        <h2 className="text-7xl font-serif font-black text-white leading-tight">{wine.data.nom}</h2>
        <p className="text-4xl text-[#D4AF37] uppercase font-bold tracking-widest">{wine.data.type_simplifie} • {wine.data.annee} • {wine.data.region}</p>
        
        {rating > 0 && (
          <div className="flex items-center justify-center space-x-4 pt-4 border-t border-[#333]">
            {Array.from({length: 5}).map((_, i) => <Star key={i} className={`w-14 h-14 ${i < rating ? 'text-[#D4AF37] fill-current' : 'text-slate-600'}`} />)}
          </div>
        )}

        {notes && (
          <div className="pt-6 border-t border-[#333]">
            <p className="text-4xl text-slate-300 italic leading-snug">"{notes.length > 150 ? notes.substring(0, 147) + '...' : notes}"</p>
          </div>
        )}
      </div>

      {/* Footer / Publicité */}
      <div className="w-full border-t-4 border-[#D4AF37]/50 pt-10 text-center space-y-4">
        <p className="text-3xl text-slate-400 font-medium">Scanné et analysé avec intelligence par VinoScan</p>
        <p className="text-5xl text-[#D4AF37] font-black uppercase tracking-wider">vinoscan.com</p>
      </div>
    </div>
  </div>
);

// La fonction de capture et partage
const generateAndShareInstagramImage = async (showToastFunc) => {
  const element = document.getElementById('vs-share-canvas');
  if (!element) return;
  
  showToastFunc("Génération de votre image Story...");
  
  try {
    const canvas = await html2canvas(element, { useCORS: true, scale: 1, backgroundColor: '#0a0a0a' });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Convertir en Blob pour le partage
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'vinoscan_tasting.jpg', { type: 'image/jpeg' });
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Ma dégustation VinoScan 🍷', text: 'Scanné avec VinoScan !' });
    } else {
      // Fallback : téléchargement direct
      const link = document.createElement('a');
      link.download = 'vinoscan_degustation.jpg';
      link.href = dataUrl;
      link.click();
      showToastFunc("Image prête ! Partagez-la sur Instagram.");
    }
  } catch (e) {
    showToastFunc("Erreur lors de la génération de l'image.");
  }
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
    } 
    catch (x) { setError("Erreur de connexion. Vérifiez vos identifiants."); } 
    finally { setLoading(false); }
  };
  
  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] flex flex-col relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center mb-8 border border-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.15)]"><Wine className="w-12 h-12 text-[#D4AF37]" /></div>
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
      <button onClick={() => ctx.startCamera('receipt')} className="w-full flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#F5F5F5] p-5 rounded-full active:scale-95 transition-all hover:border-[#D4AF37]/50 shadow-md">
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
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Recherche Manuelle</h1><p className="text-slate-500 text-xs mt-1">Trouver un grand cru par son nom</p></div>
      </div>
      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex: Château Margaux 2015" className="w-full pl-12 pr-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-2xl outline-none focus:border-[#D4AF37] text-lg transition-colors"/>
          </div>
          <button type="submit" disabled={!query.trim()} className="w-full py-4 bg-[#D4AF37] text-black rounded-full font-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 hover:bg-[#AA7C11] transition-all">Rechercher</button>
        </form>
      </div>
    </div>
  );
};
// =========================================================================
// JEU, RECHERCHE MENU ET CONSEIL (BOUTIQUE & IA)
// =========================================================================

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
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le Nez du Sommelier</h1><p className="text-slate-500 text-xs mt-1">Défiez vos connaissances</p></div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {gameState === 'idle' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center mx-auto"><Gamepad2 className="w-10 h-10 text-[#D4AF37]"/></div>
              <h3 className="font-serif text-2xl font-bold text-[#F5F5F5]">Prêt à jouer ?</h3>
              <p className="text-slate-400 font-medium">4 questions aléatoires pour tester votre palais.</p>
              <button onClick={startGame} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-95 transition-transform text-lg hover:bg-[#AA7C11]">Démarrer le Quiz</button>
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

const MenuConfigView = ({ ctx }) => {
  const getFoodLabel = (f) => {
    const labels = { 'ALL': 'Peu importe', 'APERITIF': 'Apéritif & Tapas', 'VIANDE_ROUGE': 'Viande Rouge', 'VIANDE_BLANCHE': 'Volaille & Porc', 'POISSON': 'Poisson & Mer', 'FROMAGE': 'Fromage' };
    return labels[f] || f;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le bon choix</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">Scanner un menu de restaurant</p>
        </div>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Que mangez-vous ce soir ?</span></h3>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(f => (
              <button key={f} onClick={() => ctx.setMenuPrefs({...ctx.menuPrefs, food: f})} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${ctx.menuPrefs.food === f ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md' : 'bg-[#1A1A1A] text-slate-400 border-[#333] hover:text-white'}`}>
                {getFoodLabel(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-6 space-y-3">
          <button onClick={() => ctx.startCamera('menu')} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg active:scale-95 transition-transform hover:bg-[#AA7C11] shadow-[0_0_15px_rgba(212,175,55,0.3)]"><Camera className="inline w-6 h-6 mr-3" />Scanner la carte</button>
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
      if (inStockWines.length === 0) {
        ctx.setErrorMsg("Votre cave est vide ! Ajoutez des vins avant de demander conseil.");
        ctx.setView('error');
        return;
      }
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} ${w.data.annee} (${w.data.type_simplifie})`).join('\n');
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}". Voici les vins dans sa cave : \n${inventoryString}\nChoisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat. Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;
      const result = await callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur IA");
      ctx.showToast(`L'IA recommande : ${chosenWine.data.nom} !`);
      ctx.openExistingWine(chosenWine, 'recommendation');
    } catch (e) {
      ctx.setErrorMsg("Impossible de trouver un accord dans votre cave pour ce plat.");
      ctx.setView('error');
    } finally { setIsPairingLoading(false); }
  };

  const imgTirebouchon = "https://images.unsplash.com/photo-1585652874135-c335805e7144?auto=format&fit=crop&w=800&q=80";
  const imgCarafe = "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&w=800&q=80";
  const imgVerres = "https://images.unsplash.com/photo-1578339031418-410a566f1088?auto=format&fit=crop&w=800&q=80";
  const imgCoravin = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex items-center sticky top-0 z-10">
        {recMode !== 'menu' && (
          <button onClick={() => setRecMode('menu')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        )}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#0a0a0a] border border-[#D4AF37]/50 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)] transform -rotate-3"><Sparkles className="w-6 h-6 text-[#D4AF37]" /></div>
          <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Le Sommelier</h1><p className="text-slate-400 text-sm font-medium">Laissez l'IA vous conseiller</p></div>
        </div>
      </div>

      <div className="p-6 space-y-10">
        
        {recMode === 'menu' && (
          <div className="space-y-6 mt-4">
            <button onClick={() => setRecMode('buy')} className="w-full bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-lg hover:border-[#D4AF37]/50 transition-all active:scale-95 text-left flex items-center space-x-5 group">
              <div className="w-14 h-14 bg-[#0a0a0a] border border-[#333] group-hover:border-[#D4AF37]/50 rounded-full flex items-center justify-center shrink-0 transition-colors"><ShoppingCart className="w-6 h-6 text-[#D4AF37]" /></div>
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">Acheter un vin</h3><p className="text-xs text-slate-400 leading-relaxed">Le meilleur vin à acheter selon votre repas et votre budget.</p></div>
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
              <div><h3 className="font-serif text-xl font-bold text-[#F5F5F5] mb-1">La Boutique</h3><p className="text-xs text-slate-400 leading-relaxed">Carafes, verres, conservation... Équipez-vous comme un pro.</p></div>
            </button>
          </div>
        )}

        {recMode === 'cellar' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-8 text-center shadow-lg">
              <div className="w-20 h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#333]">
                <Utensils className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#F5F5F5] mb-3">Que mangez-vous ?</h3>
              <p className="text-sm text-slate-400 mb-8">Le sommelier va analyser votre cave pour trouver l'accord parfait.</p>
              <input autoFocus type="text" placeholder="Ex: Magret de canard, Lasagnes..." value={pairingDish} onChange={e=>setPairingDish(e.target.value)} className="w-full p-5 bg-[#0a0a0a] border border-[#333] text-white rounded-xl focus:border-[#D4AF37] outline-none mb-6 shadow-inner transition-colors" />
              <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:bg-[#AA7C11] disabled:opacity-50 flex items-center justify-center transition-colors">
                {isPairingLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "Explorer ma cave"}
              </button>
            </div>
          </div>
        )}

        {recMode === 'buy' && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Euro className="w-5 h-5 text-[#D4AF37]" /><span>Budget</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'BUDGET', 'MEDIUM', 'PREMIUM'].map(price => {
                  const labels = { ALL: 'Peu importe', BUDGET: 'Abordable (< 20€)', MEDIUM: 'Plaisir (20-50€)', PREMIUM: 'Exception (> 50€)' };
                  return <button key={price} onClick={() => setFilterPrice(price)} className={`px-5 py-3 rounded-full text-sm font-bold transition-all border ${filterPrice === price ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-[#F5F5F5]'}`}>{labels[price]}</button>
                })}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Utensils className="w-5 h-5 text-[#D4AF37]" /><span>Pour quel repas ?</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'APERITIF', 'VIANDE_ROUGE', 'VIANDE_BLANCHE', 'POISSON', 'FROMAGE'].map(food => {
                  const labels = { ALL: '🍽️ Peu importe', APERITIF: '🥂 Apéro', VIANDE_ROUGE: '🥩 Viande rouge', VIANDE_BLANCHE: '🍗 Viande blanche', POISSON: '🐟 Poisson & Mer', FROMAGE: '🧀 Fromage' };
                  return <button key={food} onClick={() => setFilterFood(food)} className={`px-5 py-3 rounded-full text-sm font-bold transition-all border ${filterFood === food ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-[#F5F5F5]'}`}>{labels[food]}</button>
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center space-x-2"><Wine className="w-5 h-5 text-[#D4AF37]" /><span>Type de vin</span></h3>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-5 py-3 rounded-full text-sm font-bold transition-all border ${filterType === type ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-105' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-[#F5F5F5]'}`}>{type === 'ALL' ? 'Surprenez-moi' : type === 'PETILLANT' ? 'Bulles' : type}</button>
                ))}
              </div>
            </div>

            <button onClick={handleRecommend} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-black text-lg rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all flex items-center justify-center space-x-3 mt-8 hover:bg-[#AA7C11]">
              <Sparkles className="w-6 h-6" /><span>Trouver la perle rare</span>
            </button>
          </div>
        )}

        {/* BOUTIQUE ACCESSOIRES (Grandes Images - Hero Design) */}
        {recMode === 'boutique' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 pb-10">
            <div className="text-center mb-8">
              <h3 className="font-serif text-3xl font-bold text-[#F5F5F5] mb-2">L'Atelier</h3>
              <p className="text-sm text-slate-400">4 essentiels approuvés par nos sommeliers.</p>
            </div>

            <div className="space-y-8">
              
              <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0">
                  <img src={imgTirebouchon} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="Tire-bouchon" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div><span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Ouverture</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Le Sommelier</h5></div>
                     <span className="font-bold text-[#D4AF37] text-xl">~25 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Le véritable limonadier professionnel à double levier. Extraction parfaite sans jamais briser le bouchon, même sur les vieux millésimes.</p>
                  <a href={getAmazonAffiliateLink("tire bouchon sommelier professionnel double levier")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0">
                  <img src={imgCarafe} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Carafe" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div><span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Aération</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Carafe Cristal</h5></div>
                     <span className="font-bold text-[#D4AF37] text-xl">~45 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Design à base large pour maximiser la surface d'oxygénation. Indispensable pour assouplir les tanins de vos vins jeunes.</p>
                  <a href={getAmazonAffiliateLink("carafe a decanter vin cristal")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-3xl shadow-lg border border-[#333] overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0">
                  <img src={imgVerres} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="Verres" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div><span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">Dégustation</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Verres Universels</h5></div>
                     <span className="font-bold text-[#D4AF37] text-xl">~35 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Coffret de 6 verres en cristallin. Leur forme "tulipe" refermée concentre les arômes vers le nez, s'adaptant à tous les types de vins.</p>
                  <a href={getAmazonAffiliateLink("verres de degustation vin cristallin")} target="_blank" rel="noopener noreferrer" className="w-full text-center font-bold border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-colors">Découvrir</a>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#1A1A1A] to-[#0a0a0a] rounded-3xl shadow-[0_0_20px_rgba(212,175,55,0.1)] border border-[#D4AF37]/30 overflow-hidden group">
                <div className="h-48 w-full bg-[#0a0a0a] relative overflow-hidden shrink-0">
                  <img src={imgCoravin} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Coravin" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div><span className="text-[10px] text-black font-bold uppercase tracking-widest bg-[#D4AF37] px-2 py-1 rounded shadow-md">Choix des Pros</span><h5 className="font-serif text-2xl font-bold text-white mt-2">Système Coravin</h5></div>
                     <span className="font-bold text-[#D4AF37] text-xl">~199 €</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">L'innovation ultime. Servez-vous un verre au mois ou à l'année sans jamais retirer le bouchon, empêchant toute oxydation.</p>
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
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center">
          <button onClick={() => ctx.setView('recommendation')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-serif font-bold text-[#D4AF37]">La Sélection</h1><p className="text-slate-500 text-xs mt-1 font-medium">{sortedList.length} vins trouvés</p></div>
        </div>
        <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center space-x-2 bg-[#0a0a0a] border border-[#333] text-slate-400 px-3 py-2 rounded-xl text-xs font-bold hover:text-[#F5F5F5] transition-colors">
          <ArrowDownUp className="w-4 h-4" /><span>{sortOrder === 'asc' ? 'Prix croissant' : 'Prix décroissant'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedList.map((wine, index) => {
           const imgUrl = getGenericImageForType(wine.type_simplifie);
           return (
             <div key={index} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden hover:border-[#D4AF37]/50 transition-colors group">
               <div className="flex items-stretch">
                 
                 <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                   <div>
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-2 py-0.5 rounded">{wine.type_simplifie === 'PETILLANT' ? 'Pétillant' : (wine.type_simplifie || 'VIN')}</span>
                       <div className="flex items-end space-x-1 text-emerald-400 font-bold bg-emerald-900/30 border border-emerald-800/50 px-2 py-0.5 rounded-lg">
                         <span className="text-lg leading-none">{wine.prix_unitaire_nombre || '?'}</span><span className="text-xs">€</span>
                       </div>
                     </div>
                     <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-1 font-bold line-clamp-2">{wine.nom}</h3>
                     <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2 font-medium">
                       <span className="text-rose-400 font-bold">{wine.annee}</span><span>•</span><span className="truncate">{wine.region}</span>
                     </div>
                     <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{wine.description}</p>
                   </div>
                   <button onClick={() => ctx.processRecommendationSelection(wine)} className="w-full py-3 bg-[#0a0a0a] text-[#D4AF37] border border-[#D4AF37]/50 rounded-xl text-sm font-bold shadow-md hover:bg-[#D4AF37] hover:text-black transition-colors mt-2">
                     Découvrir ce vin
                   </button>
                 </div>
                 
                 <div className="w-28 shrink-0 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-2.5">
                   <img src={imgUrl} alt="Bouteille" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                 </div>
                 
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};
// =========================================================================
// CAVE, HISTORIQUE ET PROFIL
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

  const handleAskCellarSommelier = async () => {
    if (!pairingDish.trim()) return;
    setIsPairingLoading(true);
    try {
      const inStockWines = ctx.scanHistory.filter(w => w.stock > 0);
      if (inStockWines.length === 0) throw new Error("Cave vide");
      const inventoryString = inStockWines.map(w => `[ID: ${w.id}] ${w.data.nom} ${w.data.annee} (${w.data.type_simplifie})`).join('\n');
      const prompt = `Tu es le Sommelier privé. L'utilisateur mange : "${pairingDish}". Voici les vins dans sa cave : \n${inventoryString}\nChoisis LE MEILLEUR vin PARMI CETTE LISTE UNIQUEMENT pour ce plat. Réponds en JSON strict : {"chosen_id": "ID_ici", "explication": "Pourquoi ce choix (max 20 mots)"}`;
      
      if (!apiKey) {
        setPairingResult({ wine: inStockWines[0], explication: "Mode démo : je choisis votre premier vin car la clé API manque." });
        setIsPairingLoading(false);
        return;
      }
      
      const result = await callGemini(prompt);
      const parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      const chosenWine = inStockWines.find(w => w.id === parsed.chosen_id);
      if(!chosenWine) throw new Error("Erreur IA");
      setPairingResult({ wine: chosenWine, explication: parsed.explication });
    } catch (e) {
      ctx.setErrorMsg("Impossible de trouver un accord correspondant dans votre stock actuel."); 
      ctx.setView('error');
    } finally { setIsPairingLoading(false); }
  };

  const getApogeeBadge = (statut) => {
    switch(statut) {
      case 'A_GARDER': return <div className="flex items-center space-x-1 text-xs text-indigo-400 bg-[#0a0a0a] border border-[#333] px-2 py-0.5 rounded font-medium"><Clock className="w-3 h-3" /><span>À garder</span></div>;
      case 'DECLIN': return <div className="flex items-center space-x-1 text-xs text-red-400 bg-[#0a0a0a] border border-[#333] px-2 py-0.5 rounded font-medium"><TrendingDown className="w-3 h-3" /><span>Déclin</span></div>;
      default: return <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-[#0a0a0a] border border-[#333] px-2 py-0.5 rounded font-medium"><CheckCircle className="w-3 h-3" /><span>Apogée</span></div>;
    }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 relative select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-4 px-4 shadow-xl border-b border-[#333] z-10 sticky top-0">
        <div className="flex justify-between items-end mb-4">
          <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Mes Vins</h1><p className="text-slate-400 text-sm mt-1">{totalBottles} bouteilles</p></div>
          <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valeur Estimée</p><div className="text-emerald-500"><span className="text-2xl font-bold">{totalValue.toFixed(0)}</span>€</div></div>
        </div>

        <div className="flex bg-[#0a0a0a] p-1 rounded-xl mb-4 border border-[#333]">
          <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${cellarTab === 'STOCK' ? 'bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>En Cave</button>
          <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${cellarTab === 'WISHLIST' ? 'bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Liste d'Achats</button>
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
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${filterType === t ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-white'}`}>{t === 'ALL' ? 'Tous types' : t}</button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide mt-2">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            {['ALL', 'A_GARDER', 'APOGEE', 'DECLIN'].map(a => {
              const labels = { ALL: 'Toutes dates', A_GARDER: 'À garder', APOGEE: 'À boire', DECLIN: 'Déclin' };
              return <button key={a} onClick={() => setFilterApogee(a)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${filterApogee === a ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-white'}`}>{labels[a]}</button>
            })}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide mt-2">
            <Utensils className="w-4 h-4 text-slate-500 shrink-0" />
            {['ALL', 'VIANDE', 'POISSON', 'FROMAGE', 'APERITIF'].map(f => (
              <button key={f} onClick={() => setFilterFood(f)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${filterFood === f ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#1A1A1A] border-[#333] text-slate-400 hover:text-white'}`}>
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

        {viewMode === 'shelves' && cellarTab === 'STOCK' && (
          <div className="flex justify-between items-center bg-[#1A1A1A] border border-[#333] rounded-xl p-3 mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase"><b className="text-[#D4AF37]">Astuce :</b> Glissez une bouteille.</p>
            <button onClick={() => { setReorgMode(!reorgMode); setSelectedBottle(null); }} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${reorgMode ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a0a0a] border-[#333] text-slate-400'}`}>
              <GripHorizontal className="w-3 h-3" /><span>{reorgMode ? 'Terminer' : 'Sur Mobile ?'}</span>
            </button>
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center p-6 opacity-50 mt-10"><Archive className="w-16 h-16 mx-auto mb-4 text-slate-600" /><p className="font-medium text-slate-400">Aucun vin ne correspond.</p></div>
        )}

        {/* AFFICHAGE LISTE (DESIGN DISCOVERY COMPACT) */}
        {filteredItems.length > 0 && viewMode === 'list' && (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden hover:border-[#D4AF37]/50 transition-colors group">
                <div onClick={() => ctx.openExistingWine(item, 'cellar')} className="flex items-stretch cursor-pointer">
                  <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-2 py-1 rounded">{item.data.type_simplifie === 'PETILLANT' ? 'Pétillant' : (item.data.type_simplifie || 'VIN')}</span>
                        <span className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-1 rounded-md border border-[#333]">{item.data.annee}</span>
                      </div>
                      <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-2 truncate font-bold group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#AA7C11] transition-all">{item.data.nom}</h3>
                      {item.location && <p className="text-xs text-slate-500 font-medium flex items-center mt-2"><MapPin className="w-3 h-3 mr-1 text-[#D4AF37]"/> {item.location}</p>}
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#333]">
                      {getApogeeBadge(item.data.statut_apogee)}
                      <span className="text-sm font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-1 rounded">{item.data.prix_unitaire_nombre}€</span>
                    </div>
                  </div>
                  <div className="w-28 shrink-0 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-2.5">
                    <img src={item.image || fallbackImg} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} alt={item.data.nom} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    {item.stock > 1 && <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md z-10 border border-black">x{item.stock}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AFFICHAGE ETAGERES (SHELVES) */}
        {filteredItems.length > 0 && viewMode === 'shelves' && (
          <div className="space-y-10 mt-6">
             {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                <div key={shelfName} className="mb-8">
                   <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-serif text-xl font-bold text-[#F5F5F5] flex items-center"><MapPin className="w-5 h-5 mr-2 text-[#D4AF37]" /> {shelfName}</h3>
                      <span className="bg-[#1A1A1A] border border-[#333] text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{bottles.length} bouteilles</span>
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
                <button onClick={handleAskCellarSommelier} disabled={!pairingDish.trim() || isPairingLoading} className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-bold rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50 transition-colors">
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
  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 border-b border-[#333]">
        <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Historique</h1>
        <p className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">{historyItems.length} bouteilles analysées</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
            <History className="w-16 h-16 mb-4 text-slate-500" />
            <p className="text-slate-400 font-medium">Aucun historique de scan.</p>
          </div>
        ) : (
          historyItems.map((item) => (
            <div key={item.id} className="bg-[#1A1A1A] rounded-3xl shadow-md border border-[#333] overflow-hidden hover:border-[#D4AF37]/50 transition-colors group">
              <div onClick={() => ctx.openExistingWine(item, 'history')} className="flex items-stretch cursor-pointer">
                
                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-2 py-1 rounded">
                        {item.data.type_simplifie === 'PETILLANT' ? 'PÉTILLANT' : (item.data.type_simplifie || 'VIN')}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-1 rounded-md border border-[#333]">
                        {item.data.annee}
                      </span>
                    </div>
                    <h3 className="font-serif text-[#F5F5F5] text-lg leading-tight mb-2 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#AA7C11] transition-all duration-300 font-bold">
                      {item.data.nom}
                    </h3>
                    {item.stock > 0 && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-0.5 rounded-full mt-1 inline-block">En cave</span>}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#333]">
                    <span className="text-xs text-slate-500 font-medium">{String(item.dateStr || '').split(' ')[0]}</span>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2 py-1 rounded">
                      {item.data.prix_unitaire_nombre}€
                    </span>
                  </div>
                </div>
                
                <div className="w-28 shrink-0 bg-[#0a0a0a] border-l border-[#333] relative flex items-center justify-center p-2.5">
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

// =========================================================================
// CENTRE DE NOTIFICATIONS INTERNE (POINT 2)
// =========================================================================
const AlertsView = ({ ctx }) => {
  const { alerts, setView, goBack, genericUpdate, user } = ctx;

  const markAllAsRead = () => {
    if (!user) return;
    alerts.forEach(a => {
      if (!a.read) {
        updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', a.id), { read: true });
      }
    });
  };

  const handleAlertClick = (alert) => {
    updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', alert.id), { read: true });
    if (alert.scanId) {
      const wine = ctx.scanHistory.find(s => s.id === alert.scanId);
      if (wine) ctx.openExistingWine(wine, 'alerts');
    }
  };

  const getAlertIcon = (type) => {
    switch(type) {
      case 'APOGEE': return <Star className="w-5 h-5 text-[#D4AF37] fill-current" />;
      case 'DECLIN': return <TrendingDown className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm sticky top-0 z-10 flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center">
          <button onClick={goBack} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Notifications</h1>
        </div>
        {alerts.some(a => !a.read) && (
          <button onClick={markAllAsRead} className="text-xs text-slate-500 hover:text-[#D4AF37]">Tout lire</button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center p-10 opacity-50 mt-10"><BellRing className="w-16 h-16 mx-auto mb-4 text-slate-600" /><p className="font-medium text-slate-400">Aucune notification.</p></div>
        ) : (
          alerts.map(a => (
            <div key={a.id} onClick={() => handleAlertClick(a)} className={`bg-[#1A1A1A] rounded-2xl border ${a.read ? 'border-[#333]' : 'border-[#D4AF37]/50 shadow-[0_0_10px_rgba(212,175,55,0.1)]'} p-4 flex items-center space-x-4 cursor-pointer transition-all ${a.read ? 'opacity-70' : 'hover:border-[#D4AF37]'}`}>
              <div className={`p-2 rounded-xl ${a.read ? 'bg-[#0a0a0a]' : 'bg-[#D4AF37]/10'}`}>{getAlertIcon(a.type)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{a.title}</h4>
                <p className="text-xs text-slate-400 leading-snug">{a.message}</p>
                <p className="text-[10px] text-slate-600 mt-1">{new Date(a.timestamp).toLocaleDateString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              {!a.read && <div className="w-2 h-2 bg-[#D4AF37] rounded-full shrink-0"></div>}
              {a.scanId && <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =========================================================================
// VUE PROFIL ENRICHIE (GRAPHES INVESTISSEMENT & ADN - POINTS 1 & 3)
// =========================================================================
const AccountView = ({ ctx }) => {
  const { user, scanHistory, valueHistory, fetchAIRecommendation, analyzeSensoryDNA, showToast } = ctx;
  
  const items = scanHistory.filter(i => i.stock > 0);
  const len = scanHistory.filter(i => i.in_history !== false).length;
  const totalB = items.reduce((a, c) => a + (parseInt(c.stock) || 0), 0);
  const totalV = items.reduce((a, c) => a + ((c.data?.prix_unitaire_nombre || 0) * (parseInt(c.stock) || 0)), 0);
  
  // Point 3 : État du profil sensoriel
  const [sensoryData, setSensoryData] = useState(null);
  const [isSensoryLoading, setIsSensoryLoading] = useState(false);

  // POINT 3 : Génération du profil sensoriel ADN
  const generateADN = async () => {
    // Collecter toutes les notes
    const allNotes = scanHistory.filter(i => i.notes && i.notes.length > 10).map(i => i.notes).join(' | ');
    if (allNotes.length < 30) {
      showToast("Pas assez de notes de dégustation (min. 3 vins notés).");
      return;
    }
    setIsSensoryLoading(true);
    const dna = await analyzeSensoryDNA(ctx.callGemini, allNotes);
    if (dna) { setSensoryData(dna); showToast("ADN Œnologique calculé !"); } 
    else { showToast("Erreur lors du calcul de l'ADN."); }
    setIsSensoryLoading(false);
  };

  const prem = { name: len>=50?"Maître Sommelier":len>=20?"Connaisseur Émérite":len>=5?"Amateur Éclairé":"Novice Curieux", req: len>=50?50:len>=20?50:len>=5?20:5 };

  const formattedChartData = useMemo(() => {
    if (!valueHistory || valueHistory.length < 2) return [];
    return valueHistory.map(h => ({ date: h.dateStr, valeur: h.value }));
  }, [valueHistory]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto select-none">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 shadow-xl border-b border-[#333] flex justify-between items-center sticky top-0 z-10">
        <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Mon Club</h1><p className="text-[10px] text-emerald-500 uppercase mt-1 flex items-center font-bold tracking-widest"><CheckCircle className="w-3 h-3 mr-1"/>Sauvegarde Cloud</p></div>
        <div className="w-14 h-14 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]"><Award className="w-7 h-7 text-[#D4AF37]" /></div>
      </div>

      <div className="p-5 space-y-6">
        {/* Niveau Œnologique */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Grade Membre</p>
          <h3 className="font-serif text-3xl font-bold mb-4 text-[#D4AF37] leading-tight">{prem.name}</h3>
          <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-white">{len} crus analysés</span><span className="text-xs font-bold text-slate-500">Palier : {prem.req}</span></div>
          <div className="h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden border border-[#333]"><div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11]" style={{width: `${Math.min(100, (len/prem.req)*100)}%`}}></div></div>
        </div>

        {/* POINT 1 : LA BOURSE DU VIN (Graphique de Valorisation) */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-[#0a0a0a] rounded-xl border border-[#333]"><TrendingUp className="w-5 h-5 text-emerald-400"/></div>
            <div className="flex-1 text-left"><h3 className="font-serif text-xl font-bold text-[#F5F5F5]">Valorisation Cave</h3><p className="text-xs text-slate-400">Total : <b className="text-emerald-400">{totalV.toFixed(0)}€</b> / {totalB} flacons</p></div>
          </div>
          {formattedChartData.length > 1 ? (
            <div className="h-40 w-full -ml-6 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666'}} />
                  <YAxis hide={true} domain={['dataMin - 100', 'dataMax + 100']} />
                  <ChartTooltip contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', fontSize: '12px'}} labelStyle={{color: '#D4AF37', fontWeight:'bold'}} itemStyle={{color:'white'}} cursor={{stroke: '#D4AF37', strokeWidth: 1}} formatter={(v)=>`${v}€`} labelFormatter={(l)=>`Janvier ${l}`} />
                  <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="valeur" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center p-8 bg-[#0a0a0a] rounded-2xl border border-[#333] opacity-60"><PieChart className="w-10 h-10 mx-auto mb-3 text-slate-600"/><p className="text-sm text-slate-400 leading-snug">L'historique de valeur se construit automatiquement chaque mois.</p></div>
          )}
        </div>

        {/* POINT 3 : LE PROFIL SENSORIEL (ADN Œnologique) */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-[#0a0a0a] rounded-xl border border-[#333]"><Target className="w-5 h-5 text-[#D4AF37]"/></div>
            <div className="flex-1 text-left"><h3 className="font-serif text-xl font-bold text-[#F5F5F5]">ADN Œnologique</h3><p className="text-xs text-slate-400">Votre profil sensoriel calculé par IA</p></div>
          </div>
          {sensoryData ? (
            <div className="h-64 w-full flex justify-center -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sensoryData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#F5F5F5', fontSize: 11, fontWeight: 'bold'}} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} hide={true} />
                  <Radar name="Mon ADN" dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.5} dot={{r: 3, fill: '#D4AF37'}} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-center p-8 bg-[#0a0a0a] rounded-2xl border border-[#333] opacity-60"><Wine className="w-10 h-10 mx-auto mb-3 text-slate-600"/><p className="text-sm text-slate-400 leading-snug">Ajoutez des notes privées détaillées dans vos fiches vins pour calculer votre profil.</p></div>
              <button onClick={generateADN} disabled={isSensoryLoading} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors">
                {isSensoryLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}<span>{isSensoryLoading ? "Calcul ADN..." : "Générer mon ADN sensoriel"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Boutons d'action standards */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#333] overflow-hidden shadow-lg">
          <div className="p-4 space-y-2">
            <button onClick={() => ctx.callGemini && fetchAIRecommendation(ctx.callGemini)} className="w-full flex items-center p-4 hover:bg-[#0a0a0a] rounded-2xl text-white font-bold transition-colors"><Euro className="w-5 h-5 mr-4 text-[#D4AF37]" /> Investir : Suggestion IA (1000€)</button>
            <div className="border-t border-[#333] my-2"></div>
            <button onClick={() => auth.signOut()} className="w-full flex items-center p-4 hover:bg-[#0a0a0a] rounded-2xl text-red-400 font-bold transition-colors"><LogOut className="w-5 h-5 mr-4" /> Se déconnecter</button>
          </div>
        </div>
      </div>
    </div>
  );
};
// =========================================================================
// FICHE DE RÉSULTATS DÉCOUVERTE (LE COMPOSANT MANQUANT)
// =========================================================================
const ResultsView = ({ ctx }) => {
  let currentItem = ctx.scanHistory.find(s => s.id === ctx.currentScanId);
  if (!currentItem && ctx.analysisResult) currentItem = ctx.scanHistory.find(s => s.data?.nom === ctx.analysisResult.nom);
  if (!currentItem) return null;
  
  const d = currentItem.data;
  const scanIdToUse = currentItem.id;
  const stock = currentItem.stock || 0;
  const isWishlist = currentItem.wishlist || false;
  const rating = currentItem.rating || 0;

  const [activeTab, setActiveTab] = useState('infos');
  const [protocol, setProtocol] = useState(null); 
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(false);

  const [showBlindTasting, setShowBlindTasting] = useState(false);
  const [blindNotes, setBlindNotes] = useState({ robe: '', nez: '', bouche: '' });
  const [blindResult, setBlindResult] = useState(null);
  const [isBlindLoading, setIsBlindLoading] = useState(false);

  const [tempType, setTempType] = useState(d?.type_simplifie || 'ROUGE');
  const [tempAnnee, setTempAnnee] = useState(d?.annee || 'N.M.');
  const [tempPrix, setTempPrix] = useState(d?.prix_unitaire_nombre || 0);
  const [tempLocation, setTempLocation] = useState(currentItem?.location || '');
  const [tempNotes, setTempNotes] = useState(currentItem?.notes || '');

  // Outil interne de recalcul d'Apogée selon les règles de l'art oenologique
  const computeApogeeForType = (type, anneeStr) => {
    const currentYear = new Date().getFullYear();
    const match = String(anneeStr).match(/\d{4}/);
    
    let minGarde = 2, maxGarde = 5;
    if (type === 'ROUGE') { minGarde = 4; maxGarde = 10; }
    else if (type === 'BLANC') { minGarde = 2; maxGarde = 6; }
    else if (type === 'ROSE') { minGarde = 1; maxGarde = 3; }
    else if (type === 'PETILLANT') { minGarde = 3; maxGarde = 7; }

    if (!match) {
      return { potentiel_garde: "À consommer rapidement", apogee: "Prêt à boire", declin: "Dans les 1-2 ans", statut_apogee: "APOGEE", baseGardeMin: minGarde, baseGardeMax: maxGarde };
    }

    const anneeInt = parseInt(match[0], 10);
    const start = anneeInt + minGarde;
    const end = anneeInt + maxGarde;
    const declinYear = end + 1;
    
    let statut = "APOGEE";
    if (currentYear < start) statut = "A_GARDER";
    else if (currentYear >= declinYear) statut = "DECLIN";

    return {
      potentiel_garde: `${minGarde} à ${maxGarde} ans`,
      apogee: `${start} - ${end}`,
      declin: `À partir de ${declinYear}`,
      statut_apogee: statut,
      baseGardeMin: minGarde,
      baseGardeMax: maxGarde
    };
  };

  // Changement dynamique du Type (Recalcule l'apogée + Accords mets)
  const handleTypeChange = (newType) => {
    setTempType(newType);
    const updatedDates = computeApogeeForType(newType, tempAnnee);
    
    let newAccords = [];
    if (newType === 'ROUGE') newAccords = ['Viande rouge grillée', 'Plateau de fromages affinés', 'Plats en sauce'];
    else if (newType === 'BLANC') newAccords = ['Poissons et fruits de mer', 'Volaille à la crème', 'Fromage de chèvre'];
    else if (newType === 'ROSE') newAccords = ['Apéritif festif', 'Grillades estivales', 'Salades composées'];
    else if (newType === 'PETILLANT') newAccords = ['Apéritif de prestige', 'Desserts légers', 'Coquilles Saint-Jacques'];
    else newAccords = ['Plats conviviaux à partager'];

    const updatedData = {
      ...d,
      type_simplifie: newType,
      accords_mets: newAccords,
      accord_parfait: newAccords[0],
      ...updatedDates
    };

    ctx.setAnalysisResult(updatedData);
    ctx.genericUpdate(scanIdToUse, { data: updatedData, image: ctx.getGenericImageForType ? ctx.getGenericImageForType(newType) : getGenericImageForType(newType) });
  };

  // Changement dynamique du Millésime
  const handleYearChange = (newYear) => {
    setTempAnnee(newYear);
    const updatedDates = computeApogeeForType(tempType, newYear);
    
    const updatedData = {
      ...d,
      annee: newYear,
      ...updatedDates
    };

    ctx.setAnalysisResult(updatedData);
    ctx.genericUpdate(scanIdToUse, { data: updatedData });
  };

  const fetchProtocol = async () => {
    if (protocol) return;
    setIsLoadingProtocol(true);
    try {
      const prompt = `Agis comme un Maître Sommelier. Donne le protocole de service parfait pour ce vin : "${d.nom} ${tempAnnee}". Réponds en JSON strict : {"temperature": "ex: 16°C", "carafage": "ex: Oui, 2h avant", "verre": "ex: Verre type Bordeaux", "conseil": "Une phrase d'expert"}`;
      const res = await ctx.callGemini ? await ctx.callGemini(prompt) : await callGemini(prompt);
      setProtocol(extractJSON(res.candidates[0].content.parts[0].text));
    } catch(e) {
      setProtocol({ temperature: tempType === 'ROUGE' ? "16°C" : "10°C", carafage: tempType === 'ROUGE' ? "Conseillé 1h avant" : "Non requis", verre: "Verre classique", conseil: "Servir à température idéale." });
    } finally { setIsLoadingProtocol(false); }
  };

  const finishBlindTasting = async () => {
    setIsBlindLoading(true);
    try {
      const prompt = `Le vin réel est : "${d.nom} ${tempAnnee} (${tempType})". Notes de l'invité : Robe=${blindNotes.robe}, Nez=${blindNotes.nez}, Bouche=${blindNotes.bouche}. Donne une note sur 10. Réponds en JSON strict : {"note": "ex: 8/10", "commentaire": "Ton verdict pour l'invité en 25 mots max, sois fun."}`;
      const res = await ctx.callGemini ? await ctx.callGemini(prompt) : await callGemini(prompt);
      setBlindResult(extractJSON(res.candidates[0].content.parts[0].text));
    } catch(e) {
      setBlindResult({ note: "7/10", commentaire: "Dégustation honorable, l'essentiel est le plaisir partagé !" });
    } finally { setIsBlindLoading(false); }
  };

  const getStatusBadge = (statut) => {
    switch(statut) {
      case 'A_GARDER': return <div className="flex items-center space-x-1.5 text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-900/60 px-2.5 py-1 rounded-lg font-bold"><Clock className="w-3.5 h-3.5" /><span>À garder ({d.potentiel_garde})</span></div>;
      case 'DECLIN': return <div className="flex items-center space-x-1.5 text-xs text-red-400 bg-red-950/40 border border-red-900/60 px-2.5 py-1 rounded-lg font-bold"><TrendingDown className="w-3.5 h-3.5" /><span>Déclin ({d.declin})</span></div>;
      default: return <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg font-bold"><CheckCircle className="w-3.5 h-3.5" /><span>À boire (Apogée)</span></div>;
    }
  };

  const existingLocations = Array.from(new Set(ctx.scanHistory.map(s => s.location).filter(Boolean))).sort();
  const fallbackImg = "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto select-none">
      
      {/* HEADER DE RECHERCHE */}
      <div className="bg-[#1a1a1a] p-4 flex justify-between z-20 sticky top-0 border-b border-[#333]">
        <SommelierButton text={`Analyse du cru ${d.nom}. D'après mes algorithmes, ce vin est idéalement à consommer dans la fenêtre d'apogée suivante : ${d.apogee}.`} />
        <button onClick={ctx.goBack} className="p-3 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-white transition-colors"><X className="w-5 h-5"/></button>
      </div>

      <div className="p-5">
        {/* LE HERO "DISCOVERY" MAJESTUEUX (IMAGE EN CARTALOUGE À DROITE) */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#333] flex overflow-hidden min-h-64 shadow-xl group relative">
          <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
            <div>
              {/* Édition dynamique de la couleur / type */}
              <div className="relative inline-block mb-3">
                <select value={tempType} onChange={(e) => handleTypeChange(e.target.value)} className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#0a0a0a] border border-[#333] pl-3 pr-8 py-1.5 rounded-lg outline-none cursor-pointer appearance-none">
                  <option value="ROUGE">🍷 Vin Rouge</option>
                  <option value="BLANC">🥂 Vin Blanc</option>
                  <option value="ROSE">🌸 Vin Rosé</option>
                  <option value="PETILLANT">🍾 Pétillant / Champagne</option>
                  <option value="AUTRE">💎 Autre</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#D4AF37] absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              <h2 className="text-3xl font-serif font-bold text-white leading-tight truncate group-hover:text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] transition-all duration-300">{d.nom}</h2>
              
              {/* REHABILITATION DES BADGES VISUELS */}
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="flex items-center text-slate-400 font-medium bg-[#0a0a0a] border border-[#333] px-2.5 py-1 rounded-xl">
                  <span className="text-[11px]">Année :</span>
                  <input type="text" value={tempAnnee} onChange={(e) => setTempAnnee(e.target.value)} onBlur={() => handleYearChange(tempAnnee)} className="bg-transparent text-white w-14 outline-none font-bold text-center ml-1 text-xs focus:text-[#D4AF37]" />
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-[#0a0a0a] border border-[#333] px-2.5 py-1.5 rounded-xl truncate max-w-[140px]">{d.region}</span>
              </div>

              {/* BADGES D'APOGÉE DYNAMIQUE RETROUVÉS */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium bg-[#0a0a0a]/60 p-2.5 rounded-xl border border-[#222] w-max">
                  <Star className="w-4 h-4 text-[#D4AF37] fill-current" />
                  <span>Apogée : <b className="text-white font-bold">{d.apogee}</b></span>
                </div>
                {getStatusBadge(d.statut_apogee)}
              </div>
            </div>

            <p className="text-xs text-slate-400 italic line-clamp-2 mt-4 border-t border-[#222] pt-3">Accord : {d.accord_parfait}</p>
          </div>

          <div className="w-36 bg-[#0a0a0a] p-3 flex justify-center items-center border-l border-[#333] shrink-0 relative overflow-hidden">
            <img src={currentItem.image || fallbackImg} onError={(e) => {e.target.onerror = null; e.target.src = fallbackImg;}} className="max-h-full object-contain drop-shadow-[0_10px_20px_rgba(212,175,55,0.25)] group-hover:scale-105 transition-transform duration-500" alt="wine"/>
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1A1A1A] to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* COMPOSANT DE DEGUSTATION AVEUGLE */}
        <button onClick={() => setShowBlindTasting(true)} className="w-full mt-5 bg-gradient-to-r from-rose-950/40 via-[#1A1A1A] to-[#1A1A1A] text-white rounded-3xl p-4 shadow-lg flex items-center justify-between active:scale-95 transition-transform border border-rose-900/30">
          <div className="flex items-center">
             <div className="bg-[#0a0a0a] p-2.5 rounded-full mr-3 border border-rose-900/50"><EyeOff className="w-5 h-5 text-rose-400"/></div>
             <div className="text-left">
               <h3 className="font-bold text-base text-[#F5F5F5]">Faire déguster ce vin à l'aveugle</h3>
               <p className="text-[9px] text-rose-400 uppercase tracking-widest font-bold">L'IA teste le palais de vos invités</p>
             </div>
          </div>
          <ChevronRight className="w-5 h-5 text-rose-500" />
        </button>

        {showBlindTasting && (
          <div className="fixed inset-0 bg-gradient-to-b from-[#1A100C] to-[#0a0a0a] z-[100] flex flex-col p-6 animate-in fade-in overflow-y-auto">
            <button onClick={() => setShowBlindTasting(false)} className="absolute top-8 left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><ChevronLeft className="w-6 h-6"/></button>
            <div className="mt-16 text-center flex-1 max-w-sm mx-auto w-full pb-10">
              <div className="w-20 h-20 bg-rose-900/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30"><EyeOff className="w-10 h-10 text-rose-400" /></div>
              <h2 className="text-3xl font-serif font-bold text-white mb-3">Dégustation Mystère</h2>
              <p className="text-rose-200/80 text-sm mb-8">Cachez la bouteille et faites remplir la fiche. L'IA jugera !</p>
              {!blindResult ? (
                <div className="space-y-4 text-left">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center mb-2">La Robe (Visuel)</label>
                    <input type="text" placeholder="Ex: Tuilé, Reflets dorés..." value={blindNotes.robe} onChange={e=>setBlindNotes({...blindNotes, robe: e.target.value})} className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-sm outline-none focus:border-rose-500" />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center mb-2">Le Nez (Arômes)</label>
                    <input type="text" placeholder="Ex: Fruits des bois, Poivré, Vanille..." value={blindNotes.nez} onChange={e=>setBlindNotes({...blindNotes, nez: e.target.value})} className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-sm outline-none focus:border-rose-500" />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center mb-2">La Bouche (Ressenti)</label>
                    <input type="text" placeholder="Ex: Puissant, Tanins soyeux..." value={blindNotes.bouche} onChange={e=>setBlindNotes({...blindNotes, bouche: e.target.value})} className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-sm outline-none focus:border-rose-500" />
                  </div>
                  <button onClick={finishBlindTasting} disabled={!blindNotes.robe} className="w-full py-4 mt-2 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center">Calcul du verdict...</button>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/20 p-6 rounded-3xl shadow-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-300 mb-1">Score Palais</p>
                  <div className="text-5xl font-black text-white mb-4">{blindResult.note}</div>
                  <p className="text-white text-base italic leading-relaxed mb-6">"{blindResult.commentaire}"</p>
                  <button onClick={() => { setShowBlindTasting(false); setBlindResult(null); setBlindNotes({robe:'',nez:'',bouche:''}); }} className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl">Fermer</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLETS DES DESCRIPTIONS RETROUVÉS */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#333] mt-6">
          <button onClick={() => setActiveTab('infos')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'infos' ? 'bg-[#333] text-[#D4AF37] border border-[#D4AF37]/20 shadow-sm' : 'text-slate-500'}`}>Fiche Cru</button>
          <button onClick={() => { setActiveTab('service'); fetchProtocol(); }} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'service' ? 'bg-[#333] text-[#D4AF37] border border-[#D4AF37]/20 shadow-sm' : 'text-slate-500'}`}>Service IA</button>
          <button onClick={() => setActiveTab('cave')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'cave' ? 'bg-[#333] text-[#D4AF37] border border-[#D4AF37]/20 shadow-sm' : 'text-slate-500'}`}>Rangement</button>
        </div>

        {/* CONTENU ONGLET 1 : DESCRIPTION GENERALE */}
        {activeTab === 'infos' && (
          <div className="space-y-4 mt-4 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md"><p className="text-sm text-slate-300 leading-relaxed font-medium">{d.description}</p></div>
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] flex justify-between items-center shadow-md">
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Prix Indicatif</p>
                <div className="flex items-center space-x-1 mt-1">
                   <input type="number" value={tempPrix} onChange={(e) => setTempPrix(e.target.value)} onBlur={() => ctx.updateDataField(scanIdToUse, 'prix_unitaire_nombre', Number(tempPrix))} className="text-3xl font-black text-[#D4AF37] bg-transparent outline-none w-24" />
                   <span className="text-2xl font-bold text-[#D4AF37]">€</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Potentiel de garde</p>
                <span className="text-base font-bold text-white mt-2 block">{d.potentiel_garde}</span>
              </div>
            </div>
            
            <a href={`https://www.google.com/search?q=${encodeURIComponent('prix vin ' + d.nom + ' ' + tempAnnee)}&tbm=shop`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center space-x-2 py-4 bg-[#1A1A1A] border border-[#333] text-slate-300 rounded-2xl font-bold text-sm hover:border-[#D4AF37] transition-all">
              <Search className="w-4 h-4 text-[#D4AF37]" /><span>Comparer les marchands en ligne</span>
            </a>
          </div>
        )}

        {/* CONTENU ONGLET 2 : PROTOCOLE IA DU SOMMELIER */}
        {activeTab === 'service' && (
          <div className="space-y-4 mt-4 animate-in fade-in">
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md">
              {isLoadingProtocol ? (
                <div className="text-center text-slate-400 py-6"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]"/><p className="font-bold text-xs">Le sommelier décrypte le protocole idéal...</p></div>
              ) : protocol ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 border-b border-[#222] pb-3">
                    <div className="p-2 bg-[#0a0a0a] rounded-xl border border-[#333] text-[#D4AF37]"><Clock className="w-4 h-4"/></div>
                    <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Préparation requise</span><p className="font-bold text-white text-sm">{protocol.carafage}</p></div>
                  </div>
                  <div className="flex items-center space-x-4 border-b border-[#222] pb-3">
                    <div className="p-2 bg-[#0a0a0a] rounded-xl border border-[#333] text-[#D4AF37]"><Wine className="w-4 h-4"/></div>
                    <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Verrerie recommandée</span><p className="font-bold text-white text-sm">{protocol.verre}</p></div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[#0a0a0a] rounded-xl border border-[#333] text-[#D4AF37]"><Tag className="w-4 h-4"/></div>
                    <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Température de service</span><p className="font-bold text-white text-sm">{protocol.temperature}</p></div>
                  </div>
                  <div className="p-3 bg-[#0a0a0a] border-l-2 border-[#D4AF37] rounded-r-xl text-xs text-slate-400 italic">"{protocol.conseil}"</div>
                </div>
              ) : null}
            </div>

            {/* Suggestions d'accessoires d'affiliation */}
            <a href={getAmazonAffiliateLink(getRecommendedAccessory(tempType).search)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#333] rounded-2xl shadow-sm hover:border-[#D4AF37]/50 transition-all">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#0a0a0a] rounded-xl text-[#D4AF37] border border-[#222]"><ShoppingCart className="w-4 h-4"/></div>
                <div className="text-left"><p className="text-[9px] text-slate-500 font-bold uppercase">Sublimer l'expérience</p><p className="text-sm font-bold text-white">{getRecommendedAccessory(tempType).name}</p></div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500"/>
            </a>
          </div>
        )}

        {/* CONTENU ONGLET 3 : RANGEMENT ET PARTAGE SÉCURISÉ */}
        {activeTab === 'cave' && (
          <div className="space-y-4 mt-4 animate-in fade-in">
            {/* Stock et Wishlist (Inchangé) */}
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md">
              <div className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-2xl border border-[#333]">
                <span className="text-sm font-bold text-slate-400 ml-2">Bouteilles en cave :</span>
                <div className="flex items-center space-x-4">
                  <button onClick={() => ctx.updateStock(currentItem.id, stock, -1)} className="w-10 h-10 bg-[#1A1A1A] border border-[#333] text-white font-bold rounded-lg flex items-center justify-center shadow-sm">-</button>
                  <span className="text-xl font-black text-[#D4AF37] w-6 text-center">{stock}</span>
                  <button onClick={() => ctx.updateStock(currentItem.id, stock, 1)} className="w-10 h-10 bg-[#D4AF37] text-black font-bold rounded-lg flex items-center justify-center shadow-lg">+</button>
                </div>
              </div>
              {stock === 0 && (
                <button onClick={() => ctx.genericUpdate(currentItem.id, { wishlist: !isWishlist })} className="w-full py-4 bg-[#0a0a0a] border border-[#333] text-slate-300 rounded-2xl font-bold flex items-center justify-center mt-4 transition-all"><Heart className={`w-4 h-4 mr-2 ${isWishlist ? 'text-pink-500 fill-current' : 'text-slate-500'}`} /><span>{isWishlist ? 'Retirer de ma liste d\'achats' : 'Mettre dans ma liste d\'achats'}</span></button>
              )}
            </div>

            {/* Rangement (Inchangé) */}
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 block mb-2">Notes & Rangement</label>
              <input type="text" value={tempLocation} onChange={(e) => setTempLocation(e.target.value)} onBlur={() => ctx.genericUpdate(currentItem.id, { location: tempLocation })} placeholder="Emplacement exact (ex: Étagère A3)..." className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl p-3.5 text-sm font-medium outline-none focus:border-[#D4AF37] mb-3" />
              <textarea value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} onBlur={() => ctx.genericUpdate(currentItem.id, { notes: tempNotes })} placeholder="Notes privées (Arômes, accords tentés...)" className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-2xl p-4 text-sm h-24 outline-none focus:border-[#D4AF37] resize-none" />
            </div>

            {/* POINT 4 : PARTAGE INSTAGRAMMABLE UGC */}
            <div className="bg-[#1A1A1A] p-5 rounded-3xl border border-[#333] shadow-md space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1 block mb-2">Partage Prestige</label>
              <div className="grid grid-cols-5 gap-2 mb-4 bg-[#0a0a0a] p-2 rounded-2xl border border-[#333]">
                {Array.from({length: 5}).map((_, i) => <button key={i} onClick={() => ctx.genericUpdate(currentItem.id, { rating: i+1 })} className="flex justify-center p-2"><Star className={`w-8 h-8 ${i < rating ? 'text-[#D4AF37] fill-current' : 'text-slate-600'} hover:text-[#D4AF37]/70`} /></button>)}
              </div>
              <button onClick={() => ctx.generateAndShareInstagramImage(ctx.showToast)} className="w-full py-4 bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 text-white font-black text-sm rounded-full shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform"><Instagram className="w-5 h-5"/><span>Gérer mon image Story "Instagrammable"</span></button>
            </div>

            <button onClick={() => ctx.setScanAction({id: currentItem.id, type: 'history'})} className="w-full py-4 bg-red-950/20 text-red-400 font-bold rounded-2xl border border-red-900/40 hover:bg-red-900 hover:text-white transition-colors">Supprimer définitivement</button>
          
            {/* LE CANVAS CACHÉ POUR LA CAPTURE D'ÉCRAN (POINT 4) */}
            <InstagramShareCanvas wine={currentItem} rating={rating} notes={tempNotes} />
          </div>
        )}
      </div>
    </div>
  );
};
// =========================================================================
// CAMÉRA ET ANALYSE
// =========================================================================

const CameraView = ({ ctx }) => (
  <div className="relative h-full w-full bg-black flex flex-col overflow-hidden select-none">
    <button onClick={() => { ctx.stopCamera(); ctx.setView('home'); }} className="absolute top-12 left-6 z-20 p-3 bg-black/50 text-white rounded-full border border-white/10 hover:bg-black/80 transition-colors">
      <ChevronLeft className="w-6 h-6" />
    </button>
    
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
      <div className="absolute top-24 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
        <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse"></div>
        <span className="text-white text-xs font-bold uppercase tracking-widest opacity-90">Analyse IA Prête</span>
      </div>

      <div className="relative w-4/5 h-1/2 mt-10">
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"></div>
        {/* Coins de scan */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#D4AF37] rounded-tl-3xl"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#D4AF37] rounded-tr-3xl"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#D4AF37] rounded-bl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#D4AF37] rounded-br-3xl"></div>
        
        {/* Ligne de balayage */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#D4AF37]/70 shadow-[0_0_15px_rgba(212,175,55,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
      </div>

      <div className="absolute bottom-40 flex space-x-8 text-white/60 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex flex-col items-center"><ScanLine className="w-5 h-5 mb-1 text-white"/><span>Cadrer</span></div>
        <div className="flex flex-col items-center"><Focus className="w-5 h-5 mb-1 text-[#D4AF37] animate-pulse"/><span>Nettoyer</span></div>
      </div>
    </div>

    <video ref={ctx.videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover flex-1" />
    
    <div className="absolute bottom-0 w-full h-32 bg-black/90 flex items-center justify-center pb-8 z-20">
      <button onClick={ctx.capturePhoto} className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center active:scale-90 transition-transform">
        <div className="w-14 h-14 bg-[#D4AF37] rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]"></div>
      </button>
    </div>
    <canvas ref={ctx.canvasRef} className="hidden" />
  </div>
);

const AnalyzingView = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] select-none relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/10 to-transparent"></div>
    <div className="relative z-10 text-center">
      <div className="w-24 h-24 mx-auto bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#D4AF37]/30 mb-6 relative shadow-[0_0_30px_rgba(212,175,55,0.15)]">
         <div className="absolute inset-0 rounded-full border border-[#D4AF37]/20 animate-[spin_3s_linear_infinite]"></div>
         <div className="absolute inset-2 rounded-full border border-[#D4AF37]/40 border-t-transparent animate-[spin_1.5s_linear_infinite]"></div>
         <Wine className="w-10 h-10 text-[#D4AF37] animate-pulse" />
      </div>
      <h2 className="text-3xl font-serif font-bold text-white mb-2">Analyse en cours</h2>
      <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest">Le Sommelier réfléchit...</p>
    </div>
  </div>
);

// =========================================================================
// APPLICATION PRINCIPALE (APP CONTEXT & ROUTER SÉCURISÉ)
// =========================================================================
// =========================================================================
// APPLICATION PRINCIPALE (APP CONTEXT & ROUTER SÉCURISÉ AVEC NOUVELLES FCTS)
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

  // NOUVEAUX ÉTATS POUR LES POINTS 1, 2, 3
  const [valueHistory, setValueHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const videoRef = useRef(null); 
  const canvasRef = useRef(null); 
  const streamRef = useRef(null);

  // ÉCOUTEUR D'AUTHENTIFICATION
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setIsAuthLoading(false); 
    });
    return () => unsubAuth();
  }, []);

  // SYNCHRONISATION FIRESTORE PRINCIPALE
  useEffect(() => {
    if (!user) { setScanHistory([]); setValueHistory([]); setAlerts([]); return; }
    
    // 1. Écoute des Scans
    const unsubScans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), (s) => {
      let sc = []; 
      let totalV = 0;
      s.forEach(d => { 
        if(d.data().data) {
          const norm = normalizeData(d.data().data);
          sc.push({id: String(d.id), ...d.data(), data: norm}); 
          if (d.data().stock > 0) { totalV += (norm.prix_unitaire_nombre * d.data().stock); }
        }
      });
      sc.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); 
      setScanHistory(sc);
      
      // POINT 1 : Sauvegarde du snapshot de valeur si total important
      if (totalV > 0) saveCellarValueSnapshot(user, totalV);
    });

    // 2. Écoute de l'historique de valeur (POINT 1)
    const qValue = query(collection(db, 'artifacts', appId, 'users', user.uid, 'value_history'), orderBy('timestamp', 'asc'));
    const unsubValue = onSnapshot(qValue, (s) => {
      let vh = []; s.forEach(d => vh.push(d.data()));
      setValueHistory(vh);
    });

    // 3. Écoute des Alertes internes (POINT 2)
    const unsubAlerts = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'alerts'), (s) => {
      let al = []; s.forEach(d => al.push(d.data()));
      al.sort((a, b) => b.timestamp - a.timestamp);
      setAlerts(al);
    });

    return () => { unsubScans(); unsubValue(); unsubAlerts(); };
  }, [user]);

  // POINT 2 : Déclenchement du moteur d'alertes quand les scans changent
  useEffect(() => {
    if (user && scanHistory.length > 0) {
      checkAndGenerateAlerts(user, scanHistory, alerts);
    }
  }, [scanHistory, user]);

  const showToast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 3000); };
  
  // GESTION CAMÉRA & ANALYSE (Inchangée)
  const startCamera = async (mode = 'bottle') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setErrorMsg("Accès caméra refusé (HTTPS requis)."); setView('error'); return; }
    try { setCameraMode(mode); const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); streamRef.current = s; setView('camera'); setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s;},100); } 
    catch(e){ setErrorMsg("Erreur d'accès à l'appareil photo."); setView('error'); }
  };
  const stopCamera = () => { if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; } };
  const capturePhoto = async () => {
    if(videoRef.current && canvasRef.current) {
      const c = canvasRef.current; c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
      c.getContext('2d').drawImage(videoRef.current,0,0); const d = c.toDataURL('image/jpeg',0.8); stopCamera();
      const img = await compressImage(d); setImageSrc(img); analyzeImage(img);
    }
  };
  const processAIResult = async (aiText, sourceImage) => {
    const data = normalizeData(extractJSON(aiText)); setAnalysisResult(data);
    const img = sourceImage || getGenericImageForType(data.type_simplifie); setImageSrc(img);
    const obj = { id: 'temp_'+Date.now(), image: img, data, stock: 0, in_history: true, wishlist: false, location: '', notes: '', rating: 0, sensory_dna: null, timestamp: Date.now(), dateStr: new Date().toLocaleDateString('fr-FR') };
    setScanHistory(p=>[obj,...p]); setCurrentScanId(obj.id); setPreviousView('home'); setView('results');
    if(user){ try { const r = await addDoc(collection(db,'artifacts',appId,'users',user.uid,'scans'), obj); setCurrentScanId(r.id); setScanHistory(p=>p.map(i=>i.id===obj.id?{...i,id:r.id}:i)); } catch(e){} }
  };
  const analyzeImage = async (b64) => {
    setView('analyzing');
    try {
      const p1 = await callGemini("Identifie le vin. Réponds {\"nom\": \"NOM\"} ou {\"nom\": \"INCONNU\"}", b64.split(',')[1]);
      const iden = extractJSON(p1.candidates[0].content.parts[0].text);
      if(!iden || iden.nom === 'INCONNU') { setErrorMsg("Bouteille non reconnue."); setView('error'); return; }
      let txt = ""; let ch = await checkGlobalCache(iden.nom);
      if(!ch){ const p2 = await callGemini(`Expert Sommelier. JSON strict: {"nom":"","type_simplifie":"ROUGE|BLANC|ROSE|PETILLANT","annee":"","region":"","description":"max 20 mots","prix_unitaire_nombre":0,"potentiel_garde":"x-y ans","accord_parfait":"max 10 mots"}`, b64.split(',')[1]); txt = p2.candidates[0].content.parts[0].text; const ob = extractJSON(txt); await saveToGlobalCache(ob.nom, ob); } else { txt = JSON.stringify(ch); }
      await processAIResult(txt, b64);
    } catch(e) { setErrorMsg("Erreur d'analyse."); setView('error'); }
  };

  // MISE À JOUR DONNÉES SÉCURISÉE (Inchangée)
  const genericUpdate = async (id, f) => {
    setScanHistory(p=>p.map(i=>i.id===id?{...i,...f}:i));
    if(user && !id.startsWith('temp_')){ try{ await updateDoc(doc(db,'artifacts',appId,'users',user.uid,'scans',id), f); }catch(e){} }
  };
  const updateStock = async (id, cur, ch) => {
    const ns = Math.max(0, parseInt(cur)+ch); setScanHistory(p=>p.map(i=>i.id===id?{...i,stock:ns}:i));
    if(user && !id.startsWith('temp_')){ try{ const r=doc(db,'artifacts',appId,'users',user.uid,'scans',id); if(ns===0 && !scanHistory.find(s=>s.id===id).wishlist){ await deleteDoc(r); setScanHistory(p=>p.filter(i=>i.id!==id)); } else await updateDoc(r,{stock:ns}); }catch(e){} }
  };

  const handleKeyDown = (e) => { if(e.key==='Enter') e.target.blur(); };

  const ctx = { user, view, setView, previousView, setPreviousView, imageSrc, analysisResult, errorMsg, setErrorMsg, scanHistory, setScanHistory, scanAction, setScanAction, recommendationList, currentScanId, setCurrentScanId, toastMsg, showToast, startCamera, stopCamera, capturePhoto, processRecommendationSelection: (w)=>processAIResult(JSON.stringify(w), null), genericUpdate, updateStock, goBack:()=>setView(previousView), openExistingWine:(i,o)=>{setImageSrc(i.image);setAnalysisResult(i.data);setCurrentScanId(i.id);setPreviousView(o);setView('results');}, videoRef, canvasRef, cameraMode, handleKeyDown, callGemini, valueHistory, alerts, analyzeSensoryDNA, generateAndShareInstagramImage };

  if (isAuthLoading) return <div className="h-[100dvh] bg-[#0a0a0a] flex items-center justify-center"><Wine className="w-12 h-12 text-[#D4AF37] animate-pulse" /></div>;
  if (!user) return <AuthView auth={auth} />;

  const unreadAlerts = alerts.filter(a => !a.read).length;

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] sm:border-x sm:border-[#333] overflow-hidden relative text-[#F5F5F5] font-sans select-none" style={{'--gold-primary': '#D4AF37'}}>
        
        {/* NOUVEAU HEADER AVEC CENTRE DE NOTIFICATIONS (POINT 2) */}
        {['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) && (
          <div className="absolute top-0 w-full h-16 bg-[#1a1a1a]/80 backdrop-blur-sm border-b border-[#333] flex items-center justify-between px-5 z-30">
            <h2 className="text-xl font-serif font-bold text-[#D4AF37]">VinoScan</h2>
            <button onClick={() => setView('alerts')} className="relative p-2 bg-[#0a0a0a] rounded-full border border-[#333] text-slate-400 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all">
              <Bell className="w-5 h-5" />
              {unreadAlerts > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#1a1a1a]">{unreadAlerts}</span>}
            </button>
          </div>
        )}

        <div className={['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) ? "pt-16 pb-16 h-full" : "h-full"}>
          {view === 'home' && <HomeView ctx={ctx} />}
          {view === 'account' && <AccountView ctx={ctx} />}
          {view === 'history' && <HistoryView ctx={ctx} />}
          {view === 'cellar' && <CellarView ctx={ctx} />}
          {view === 'recommendation' && <RecommendationView ctx={ctx} />}
          {view === 'results' && <ResultsView ctx={ctx} />}
          {view === 'camera' && <CameraView ctx={ctx} />}
          {view === 'analyzing' && <AnalyzingView />}
          {view === 'alerts' && <AlertsView ctx={ctx} />}
          {view === 'error' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a] pt-20"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-bold text-white mb-2">Erreur technique</h2><p className="text-sm text-slate-400 mb-6">{errorMsg}</p><button onClick={()=>setView('home')} className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl shadow-lg">Retour</button></div>
          )}
        </div>
        
        {['home', 'cellar', 'history', 'account', 'recommendation'].includes(view) && <NavigationBar ctx={ctx} />}
        
        {scanAction && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"><div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"><h3 className="text-xl font-bold text-white mb-2">Supprimer définitivement ?</h3><p className="text-slate-400 text-sm mb-6">Cette bouteille sera retirée de votre historique et de votre cave.</p><div className="flex space-x-3 mt-6"><button onClick={()=>setScanAction(null)} className="flex-1 py-3 bg-[#333] rounded-xl font-bold">Annuler</button><button onClick={()=>{ ctx.genericUpdate(scanAction.id, { in_history: false, stock: 0 }); setScanAction(null); setView('home'); ctx.showToast("Vin supprimé."); }} className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-600/40 rounded-xl font-bold">Supprimer</button></div></div></div>
        )}
        
        {toastMsg && (
          <div className="absolute top-20 left-0 w-full flex justify-center z-[200] animate-in slide-in-from-top-4"><div className="bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-full shadow-lg border border-[#AA7C11] flex items-center space-x-2"><CheckCircle className="w-4 h-4" /><span>{toastMsg}</span></div></div>
        )}
      </div>
    </ErrorBoundary>
  );
}