// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List, GripHorizontal, ChevronDown, Download, Award, BookOpen, Receipt, ChefHat, WifiOff, Gamepad2, SlidersHorizontal, Globe, X, Trophy, TrendingUp, BarChart3, Target, Focus, Settings, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

// --- CONFIGURATION ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const firebaseConfig = { 
  apiKey: "AIzaSyA1SP_DboqzXPzSuYJmrYxWhd-lqBpml20", authDomain: "vinoscan-app-8d4af.firebaseapp.com", projectId: "vinoscan-app-8d4af", storageBucket: "vinoscan-app-8d4af.firebasestorage.app", messagingSenderId: "757406434839", appId: "1:757406434839:web:7d531655bcae02b5cbfe52", measurementId: "G-6EX8K29ZZK" 
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'vinoscan-app-8d4af';

// --- CACHE & UTILITAIRES ---
const checkGlobalCache = async (wineKey) => { try { const id = wineKey.toLowerCase().replace(/[^a-z0-9]/g, '_'); const snap = await getDoc(doc(db, "global_wine_cache", id)); return snap.exists() ? snap.data() : null; } catch (e) { return null; } };
const saveToGlobalCache = async (wineKey, data) => { try { const id = wineKey.toLowerCase().replace(/[^a-z0-9]/g, '_'); await setDoc(doc(db, "global_wine_cache", id), data); } catch (e) {} };
const getAmazonAffiliateLink = (q) => `https://www.amazon.fr/s?k=${encodeURIComponent(q)}&tag=vinoscan-21`;
const getRecommendedAccessory = (type) => {
  if(type==='ROUGE') return { name: "Carafe à décanter", search: "carafe a decanter vin rouge cristal" };
  if(type==='BLANC') return { name: "Seau à glace", search: "seau a glace vin inox" };
  if(type==='PETILLANT') return { name: "Coffret flûtes", search: "verres flutes champagne cristal" };
  return { name: "Tire-bouchon pro", search: "tire bouchon sommelier professionnel" };
};
const getGenericImageForType = (type) => {
  if(type==='BLANC') return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?auto=format&fit=crop&w=800&q=80";
  if(type==='PETILLANT') return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800&q=80";
  if(type==='ROSE') return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800&q=80";
  return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80"; 
};
const extractPrice = (priceStr) => { if (!priceStr) return 0; const match = String(priceStr).match(/\d+([.,]\d+)?/); return match ? parseFloat(match[0].replace(',', '.')) : 0; };
const extractJSON = (text) => {
  try { return JSON.parse(text); } catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/); if (match && match[1]) return JSON.parse(match[1]);
    const objMatch = text.match(/\{[\s\S]*\}/); if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("Impossible de lire l'IA.");
  }
};
const callGemini = async (prompt, b64Data = null) => {
  if (!apiKey) {
    // Mode Secours si la clé Vercel est manquante
    const isList = prompt.includes("trouve 3 vins");
    const dummyWine = { nom: "Vin de Démo (Clé API Manquante)", annee: "2020", type_simplifie: "ROUGE", region: "Bordeaux", description: "Ceci est un test car la clé API Gemini n'a pas été détectée sur ce serveur.", prix_unitaire_nombre: 15, potentiel_garde: "2-5 ans", apogee: "2022-2025", declin: "2026", statut_apogee: "APOGEE", accord_parfait: "Viande rouge" };
    return { candidates: [{ content: { parts: [{ text: JSON.stringify(isList ? { vins: [dummyWine] } : dummyWine) }] } }] };
  }
  const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
  if (b64Data) payload.contents[0].parts.push({ inlineData: { mimeType: "image/jpeg", data: b64Data } });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Erreur serveur IA`);
  return await response.json();
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
const normalizeData = (data) => {
  if (!data || typeof data !== 'object') data = {};
  try {
    let type = data.type ? String(data.type) : "Vin";
    let str = (String(data.type_simplifie || "") + ' ' + type).toUpperCase();
    let ts = 'AUTRE';
    if(str.includes('ROUGE')) ts='ROUGE'; else if(str.includes('BLANC')) ts='BLANC'; else if(str.includes('ROSE')) ts='ROSE'; else if(str.includes('PETILLANT')||str.includes('CHAMPAGNE')) ts='PETILLANT';
    let annee = data.annee ? String(data.annee) : "N.M.";
    const currentYear = new Date().getFullYear();
    const match = annee.match(/\d{4}/);
    let dyn = { potentiel_garde: "2 à 5 ans", apogee: "Prêt", declin: "Bientôt", statut_apogee: "APOGEE" };
    if(match) {
      let a = parseInt(match[0], 10); let s = a+2; let e = a+5; let d = e+1;
      let st = currentYear < s ? "A_GARDER" : (currentYear >= d ? "DECLIN" : "APOGEE");
      dyn = { potentiel_garde: "2 à 5 ans", apogee: `${s} - ${e}`, declin: `Dès ${d}`, statut_apogee: st };
    }
    return { nom: data.nom||"Inconnu", annee, region: data.region||"Inconnue", type, type_simplifie: ts, prix_unitaire_nombre: Number(data.prix_unitaire_nombre)||15, description: data.description||"Un excellent vin.", accord_parfait: data.accord_parfait||"Plat convivial", accords_mets: Array.isArray(data.accords_mets)?data.accords_mets:[], ...dyn };
  } catch (e) { return { nom: 'Erreur', type_simplifie: 'AUTRE' }; }
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0a0a0a]"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-bold text-white mb-2">Erreur Technique</h2><button onClick={() => { this.setState({hasError: false}); this.props.onReset(); }} className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold mt-4">Retour</button></div>;
    return this.props.children;
  }
}

// =========================================================================
// VUES DE L'APPLICATION
// =========================================================================
const NavigationBar = ({ ctx }) => (
  <div className="absolute bottom-0 w-full bg-[#1a1a1a] border-t border-[#333] flex justify-around items-center pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20 h-16 select-none">
    {[{id:'home', i:Home, t:'Scanner'},{id:'cellar', i:Archive, t:'Cave'},{id:'recommendation', i:Sparkles, t:'Conseil'},{id:'history', i:History, t:'Histo'},{id:'account', i:User, t:'Profil'}].map(m => (
      <button key={m.id} onClick={() => ctx.setView(m.id)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${ctx.view.includes(m.id) || (m.id==='home'&&['manualSearch','menuConfig','quiz'].includes(ctx.view)) || (m.id==='recommendation'&&ctx.view==='recommendationList') ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-[#D4AF37]/50'}`}>
        <m.i className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-wider">{m.t}</span>
      </button>
    ))}
  </div>
);

const SommelierButton = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lire = (e) => {
    e.stopPropagation(); if(isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 0.9; u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u); setIsSpeaking(true);
  };
  return <button onClick={lire} className={`p-2 rounded-full border transition-all shadow-md ${isSpeaking ? 'bg-[#D4AF37] border-[#D4AF37] text-black scale-105' : 'bg-[#1A1A1A] border-[#333] text-[#D4AF37]'}`}>{isSpeaking ? <EyeOff className="w-5 h-5"/> : <Sparkles className="w-5 h-5"/>}</button>;
};

const AuthView = ({ auth }) => {
  const [m, setM] = useState('signup'); const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [ld, setLd] = useState(false);
  const handle = async (ev) => {
    ev.preventDefault(); setErr(''); setLd(true);
    try { if (m === 'login') await signInWithEmailAndPassword(auth, e, p); else await createUserWithEmailAndPassword(auth, e, p); } 
    catch (x) { setErr("Identifiants incorrects ou mot de passe trop faible."); } finally { setLd(false); }
  };
  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] flex flex-col relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center mb-8 border border-[#D4AF37]/30"><Wine className="w-12 h-12 text-[#D4AF37]" /></div>
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] mb-2 drop-shadow-sm">VinoScan</h2>
        <p className="text-[#D4AF37]/60 text-xs font-bold uppercase tracking-widest mb-12">Accès Réservé</p>
        <form onSubmit={handle} className="w-full space-y-5">
          <input type="email" placeholder="Email" value={e} onChange={x=>setE(x.target.value)} className="w-full p-4 rounded-2xl bg-[#1A1A1A] text-white border border-[#333] outline-none focus:border-[#D4AF37]" required />
          <input type="password" placeholder="Mot de passe" value={p} onChange={x=>setP(x.target.value)} className="w-full p-4 rounded-2xl bg-[#1A1A1A] text-white border border-[#333] outline-none focus:border-[#D4AF37]" required />
          {err && <p className="text-red-500 text-xs text-center font-bold bg-red-950/20 py-2 rounded-lg border border-red-900/50">{err}</p>}
          <button type="submit" disabled={ld} className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg active:scale-95 transition-all flex justify-center disabled:opacity-50">{ld ? <RefreshCw className="w-6 h-6 animate-spin"/> : (m==='login'?'Entrer':'Créer ma cave')}</button>
        </form>
        <button onClick={() => setM(m==='login'?'signup':'login')} className="mt-12 text-slate-400 text-sm font-medium hover:text-[#D4AF37] transition-colors">{m==='login'?"Nouveau ? Créer un compte":"Déjà membre ? Se connecter"}</button>
      </div>
    </div>
  );
};

const HomeView = ({ ctx }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20 relative bg-[#0a0a0a] overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#D4AF37]/10 to-transparent"></div>
    <div className="text-center space-y-4 relative z-10 mt-10">
      <div className="mx-auto w-32 h-32 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#D4AF37]/30 relative"><Wine className="w-14 h-14 text-[#D4AF37]" /></div>
      <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11]">VinoScan</h1>
    </div>
    <div className="w-full max-w-sm space-y-4 pt-8 relative z-10">
      <button onClick={() => ctx.startCamera('bottle')} className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black p-5 rounded-full active:scale-95 transition-all"><Camera className="w-6 h-6" /><span className="font-black text-xl">Scanner une bouteille</span></button>
      <button onClick={() => ctx.startCamera('receipt')} className="w-full flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-white p-5 rounded-full active:scale-95 transition-all"><Receipt className="w-6 h-6 text-slate-400" /><span className="font-bold text-lg">Scanner une facture</span></button>
      <div className="flex space-x-4 pt-2">
        <button onClick={() => ctx.setView('menuConfig')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-4 rounded-full active:scale-95"><BookOpen className="w-5 h-5" /><span className="font-bold text-xs">CARTE VINS</span></button>
        <button onClick={() => ctx.setView('quiz')} className="flex-1 flex items-center justify-center space-x-3 bg-[#1A1A1A] border border-[#333] text-[#D4AF37] p-4 rounded-full active:scale-95"><Gamepad2 className="w-5 h-5" /><span className="font-bold text-xs">JEU</span></button>
      </div>
      <div className="flex space-x-4">
        <label className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl cursor-pointer active:scale-95 hover:text-[#D4AF37]"><ImageIcon className="w-6 h-6 mb-1" /><span className="font-bold text-[10px]">GALERIE</span><input type="file" accept="image/*" className="hidden" onChange={(e) => ctx.handleFileUpload(e, 'bottle')} /></label>
        <button onClick={() => ctx.setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-1 bg-[#1A1A1A] border border-[#333] text-slate-400 py-4 rounded-3xl active:scale-95 hover:text-[#D4AF37]"><Search className="w-6 h-6 mb-1" /><span className="font-bold text-[10px]">RECHERCHE</span></button>
      </div>
    </div>
  </div>
);

const HistoryView = ({ ctx }) => {
  const items = (ctx.scanHistory || []).filter(i => i && i.in_history !== false);
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 border-b border-[#333] sticky top-0 z-10"><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Historique</h1><p className="text-slate-400 text-xs mt-1 uppercase">{items.length} vins</p></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? <div className="text-center p-6 mt-10"><History className="w-16 h-16 mx-auto mb-4 text-slate-600"/><p className="text-slate-400">Aucun historique.</p></div> : 
          items.map(i => (
            <div key={i.id} onClick={() => ctx.openExistingWine(i, 'history')} className="bg-[#1A1A1A] rounded-3xl border border-[#333] overflow-hidden flex cursor-pointer hover:border-[#D4AF37]/50 active:scale-95 transition-all h-32">
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div><span className="text-[10px] text-[#D4AF37] uppercase bg-[#0a0a0a] px-2 py-1 rounded">{i.data.type_simplifie}</span><h3 className="font-serif text-white font-bold truncate mt-2">{i.data.nom}</h3></div>
                <div className="flex justify-between items-center border-t border-[#333] pt-2"><span className="text-xs text-slate-500">{i.data.annee}</span><span className="text-sm font-bold text-emerald-400">{i.data.prix_unitaire_nombre}€</span></div>
              </div>
              <div className="w-24 shrink-0 bg-[#0a0a0a] p-2 flex items-center justify-center"><img src={i.image} className="max-h-full max-w-full object-contain" /></div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

const AccountView = ({ ctx }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const items = (ctx.scanHistory || []).filter(i => i.stock > 0);
  const len = (ctx.scanHistory || []).filter(i => i.in_history !== false).length;
  const totalB = items.reduce((a, c) => a + (parseInt(c.stock) || 0), 0);
  const totalV = items.reduce((a, c) => a + ((c.data?.prix_unitaire_nombre || 0) * (parseInt(c.stock) || 0)), 0);
  const prem = { name: len>=50?"Maître":len>=20?"Connaisseur":len>=5?"Amateur":"Novice", req: len>=50?50:len>=20?50:len>=5?20:5 };
  
  const handleClear = () => { ctx.scanHistory.forEach(i => ctx.genericUpdate(i.id, { in_history: false })); setShowConfirm(false); ctx.showToast("Historique nettoyé. Cave intacte."); };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 shadow-xl border-b border-[#333] flex justify-between items-center sticky top-0 z-10">
        <div><h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Profil</h1><p className="text-[10px] text-emerald-500 uppercase mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/>Sauvegarde Cloud</p></div>
        <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]"><Award className="w-7 h-7 text-[#D4AF37]" /></div>
      </div>
      <div className="p-5 space-y-6">
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333]">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Niveau Œnologique</p>
          <h3 className="font-serif text-3xl font-bold mb-4 text-[#D4AF37]">{prem.name}</h3>
          <div className="flex justify-between items-end mb-2"><span className="text-sm text-white">{len} vins</span><span className="text-xs text-slate-500">Palier: {prem.req}</span></div>
          <div className="h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden border border-[#333]"><div className="h-full bg-[#D4AF37]" style={{width: `${Math.min(100, (len/prem.req)*100)}%`}}></div></div>
        </div>
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333]">
          <div className="flex items-center space-x-3 mb-6"><div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20"><BarChart3 className="w-5 h-5 text-[#D4AF37]"/></div><h3 className="font-serif text-xl font-bold text-white">Ma Cave</h3></div>
          <div className="grid grid-cols-2 gap-4"><div className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#333]"><p className="text-[10px] text-slate-500 uppercase mb-1">Bouteilles</p><p className="text-4xl font-extrabold text-white">{totalB}</p></div><div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-900/30"><p className="text-[10px] text-emerald-500 uppercase mb-1">Valeur</p><p className="text-4xl font-extrabold text-emerald-400">{totalV.toFixed(0)}€</p></div></div>
        </div>
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#333] overflow-hidden">
          <div className="p-4 space-y-2">
            <button onClick={() => signOut(auth)} className="w-full flex items-center p-4 hover:bg-[#222] rounded-2xl text-white font-bold transition-colors"><LogOut className="w-5 h-5 mr-4 text-[#D4AF37]" /> Se déconnecter</button>
            <div className="border-t border-[#333] my-2"></div>
            <button onClick={() => setShowConfirm(true)} className="w-full flex items-center p-4 text-red-400 hover:bg-red-950/20 rounded-2xl font-bold transition-colors"><Trash2 className="w-5 h-5 mr-4" /> Nettoyer l'historique</button>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4"><div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-8 w-full max-w-sm text-center"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" /><h3 className="text-xl font-bold text-white mb-2">Nettoyer l'historique ?</h3><p className="text-slate-400 text-sm mb-6">Vos vins en cave resteront intacts.</p><div className="space-y-3"><button onClick={handleClear} className="w-full py-3 bg-red-600/20 text-red-500 font-bold rounded-xl">Oui, nettoyer</button><button onClick={()=>setShowConfirm(false)} className="w-full py-3 bg-[#333] text-white font-bold rounded-xl">Annuler</button></div></div></div>
      )}
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
      const res = await callGemini(`Plat: ${dish}. Vins en cave:\n${list}. Retourne JSON: {"chosen_id":"ID"}`);
      const c = w.find(x=>x.id===extractJSON(res.candidates[0].content.parts[0].text).chosen_id);
      if(!c) throw new Error("IA fail"); ctx.openExistingWine(c, 'recommendation');
    } catch(e) { ctx.setErrorMsg("Accord impossible."); ctx.setView('error'); } finally { setLd(false); }
  };
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 overflow-y-auto">
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex items-center sticky top-0 z-10">{recMode!=='menu' && <button onClick={()=>setRecMode('menu')} className="mr-4 text-slate-400"><ChevronLeft className="w-6 h-6"/></button>}<h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Le Sommelier</h1></div>
      <div className="p-6">
        {recMode==='menu' && (
          <div className="space-y-4">
            <button onClick={()=>setRecMode('buy')} className="w-full bg-[#1A1A1A] p-6 rounded-3xl border border-[#333] flex items-center space-x-4"><ShoppingCart className="w-8 h-8 text-emerald-500"/><div className="text-left"><h3 className="font-serif text-xl font-bold text-white">Acheter un vin</h3><p className="text-xs text-slate-400">Recommandation selon budget et plat.</p></div></button>
            <button onClick={()=>setRecMode('cellar')} className="w-full bg-[#1A1A1A] p-6 rounded-3xl border border-[#D4AF37]/50 flex items-center space-x-4"><Archive className="w-8 h-8 text-[#D4AF37]"/><div className="text-left"><h3 className="font-serif text-xl font-bold text-white">Que boire ce soir ?</h3><p className="text-xs text-slate-400">Accord avec votre cave actuelle.</p></div></button>
            <button onClick={()=>setRecMode('boutique')} className="w-full bg-[#1A1A1A] p-6 rounded-3xl border border-[#333] flex items-center space-x-4"><Wine className="w-8 h-8 text-amber-500"/><div className="text-left"><h3 className="font-serif text-xl font-bold text-white">La Boutique</h3><p className="text-xs text-slate-400">Équipez-vous comme un pro.</p></div></button>
          </div>
        )}
        {recMode==='cellar' && (
          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#D4AF37]/30 text-center"><Utensils className="w-10 h-10 mx-auto text-[#D4AF37] mb-4"/><h3 className="text-xl font-bold text-white mb-4">Que mangez-vous ?</h3><input value={dish} onChange={e=>setDish(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#333] p-4 text-white rounded-xl mb-4" placeholder="Ex: Lasagnes..." /><button onClick={handleAsk} disabled={!dish||ld} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl">{ld?"Recherche...":"Trouver le vin"}</button></div>
        )}
        {recMode==='buy' && (
          <div className="space-y-6">
            <div><h3 className="text-white mb-2 font-bold">Type</h3><div className="flex gap-2 flex-wrap">{['ALL','ROUGE','BLANC','ROSE','PETILLANT'].map(t=><button key={t} onClick={()=>setFt(t)} className={`px-4 py-2 rounded-xl text-sm ${ft===t?'bg-[#D4AF37] text-black':'bg-[#1A1A1A] text-white border border-[#333]'}`}>{t}</button>)}</div></div>
            <div><h3 className="text-white mb-2 font-bold">Budget</h3><div className="flex gap-2 flex-wrap">{['ALL','BUDGET','MEDIUM','PREMIUM'].map(t=><button key={t} onClick={()=>setFp(t)} className={`px-4 py-2 rounded-xl text-sm ${fp===t?'bg-[#D4AF37] text-black':'bg-[#1A1A1A] text-white border border-[#333]'}`}>{t}</button>)}</div></div>
            <div><h3 className="text-white mb-2 font-bold">Plat</h3><div className="flex gap-2 flex-wrap">{['ALL','VIANDE_ROUGE','POISSON','FROMAGE'].map(t=><button key={t} onClick={()=>setFf(t)} className={`px-4 py-2 rounded-xl text-sm ${ff===t?'bg-[#D4AF37] text-black':'bg-[#1A1A1A] text-white border border-[#333]'}`}>{t}</button>)}</div></div>
            <button onClick={handleRec} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl">Rechercher</button>
          </div>
        )}
        {recMode==='boutique' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif text-white text-center">L'Atelier</h3>
            <div className="bg-[#1a1a1a] rounded-3xl overflow-hidden border border-[#333]"><div className="h-40 bg-cover bg-center" style={{backgroundImage: `url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80')`}}></div><div className="p-4"><h5 className="font-bold text-white">Système Coravin</h5><a href={getAmazonAffiliateLink("coravin")} target="_blank" className="mt-3 block w-full py-3 bg-[#D4AF37] text-black text-center font-bold rounded-xl">Voir l'offre</a></div></div>
            <div className="bg-[#1a1a1a] rounded-3xl overflow-hidden border border-[#333]"><div className="h-40 bg-cover bg-center" style={{backgroundImage: `url('https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&w=800&q=80')`}}></div><div className="p-4"><h5 className="font-bold text-white">Carafe Cristal</h5><a href={getAmazonAffiliateLink("carafe a decanter")} target="_blank" className="mt-3 block w-full py-3 bg-[#D4AF37] text-black text-center font-bold rounded-xl">Voir l'offre</a></div></div>
          </div>
        )}
      </div>
    </div>
  );
};