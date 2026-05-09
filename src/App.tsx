import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, Image as ImageIcon, Wine, Utensils, Tag, ChevronLeft, ScanLine, ShoppingCart, Info, AlertCircle, History, Home, ChevronRight, User, Lock, Mail, LogOut, UserPlus, MailCheck, ShieldCheck, RefreshCw, Archive, Plus, Minus, Clock, TrendingDown, Star, Euro, Filter, CheckCircle, AlertTriangle, EyeOff, Search, Sparkles, ArrowDownUp, Heart, MapPin, Share2, Edit3, PieChart, BellRing, LayoutGrid, List
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc
} from 'firebase/firestore';

// --- API & FIREBASE CONFIGURATION ---
const apiKey = "AIzaSyBom4kXpkpVQSMLS5k8RYKgh8PDLqfwEm0"; // <-- COLlez VOTRE CLÉ GEMINI ICI (ex: "AIzaSy...")

// VOTRE CONFIGURATION FIREBASE
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
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oups, un petit problème technique</h2>
          <p className="text-sm text-slate-600 mb-6">L'Intelligence Artificielle a renvoyé des données incompatibles.</p>
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
// MOTEUR IA INTELLIGENT (Avec Diagnostic d'Erreur Clair)
// =========================================================================
const callGemini = async (prompt, b64Data = null) => {
  const model = 'gemini-1.5-flash';
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
      const exactError = errData.error?.message || 'Erreur réseau inconnue';
      
      if (exactError.includes('API key not valid') || response.status === 400) {
        throw new Error("Clé API Google invalide. Assurez-vous d'avoir bien collé la clé de Google AI Studio.");
      }
      if (exactError.includes('not found') || response.status === 404) {
        throw new Error("Modèle IA introuvable. 🚨 PIÈGE CLASSIQUE : Avez-vous collé votre clé 'Firebase' au lieu de votre clé 'Google AI Studio' à la ligne 17 ? Elles se ressemblent beaucoup !");
      }
      if (response.status === 403) {
        throw new Error("Accès refusé par Google. Créez une nouvelle clé sans restriction sur Google AI Studio.");
      }
      
      throw new Error(`Erreur serveur (${response.status}) : ${exactError}`);
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
    case 'BLANC': return "https://images.unsplash.com/photo-1595914041793-11b0e00d7fb4?q=80&w=800&auto=format&fit=crop";
    case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?q=80&w=800&auto=format&fit=crop";
    case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?q=80&w=800&auto=format&fit=crop";
    default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop"; 
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

const normalizeData = (data) => {
  if (!data || typeof data !== 'object') {
    data = {};
  }
  
  try {
    let safeAccordsMets = [];
    if (Array.isArray(data.accords_mets)) {
      safeAccordsMets = data.accords_mets.filter(Boolean).map(item => safeString(item));
    } else if (data.accords_mets) {
      safeAccordsMets = [safeString(data.accords_mets)];
    }

    let safeTagsAccords = Array.isArray(data.tags_accords) ? data.tags_accords.filter(Boolean).map(safeString) : [];
    
    let safeComparateur = [];
    if (Array.isArray(data.comparateur)) {
      safeComparateur = data.comparateur.filter(Boolean).map(c => {
        if (typeof c === 'object') return { site: safeString(c.site, 'Marchand'), prix: safeString(c.prix, '?') };
        return { site: 'Marchand', prix: safeString(c) };
      });
    }

    let nom = safeString(data.nom, "Vin inconnu");
    let annee = safeString(data.annee, "N.M.");
    let region = safeString(data.region, "Région inconnue");
    let type = safeString(data.type, "Vin");
    let description = safeString(data.description, "Un excellent vin.");
    let potentiel_garde = safeString(data.potentiel_garde, "-");
    let apogee = safeString(data.apogee, "-");
    let declin = safeString(data.declin, "-");
    let accord_parfait = safeString(data.accord_parfait, safeAccordsMets.length > 0 ? safeAccordsMets[0] : "-");

    let strToSearch = (safeString(data.type_simplifie) + ' ' + type).toUpperCase();
    let type_simplifie = 'AUTRE';
    if (strToSearch.includes('ROUGE')) type_simplifie = 'ROUGE';
    else if (strToSearch.includes('BLANC')) type_simplifie = 'BLANC';
    else if (strToSearch.includes('ROSE') || strToSearch.includes('ROSÉ')) type_simplifie = 'ROSE';
    else if (strToSearch.includes('CHAMPAGNE') || strToSearch.includes('PETILLANT') || strToSearch.includes('PÉTILLANT') || strToSearch.includes('EFFERVESCENT') || strToSearch.includes('CRÉMANT') || strToSearch.includes('CREMANT') || strToSearch.includes('BULLE')) type_simplifie = 'PETILLANT';
    
    let statut_apogee = safeString(data.statut_apogee, 'APOGEE'); 
    let prix_unitaire_nombre = Number(data.prix_unitaire_nombre) || extractPrice(data.prix_moyen) || 0;

    const keywords = {
      'APERITIF': ['apéritif', 'aperitif', 'tapas', 'charcuterie', 'amuse-bouche', 'gougère', 'toast', 'apéro'],
      'VIANDE_ROUGE': ['viande rouge', 'boeuf', 'bœuf', 'canard', 'agneau', 'gibier', 'steak', 'grillade', 'rôti', 'mouton', 'côte', 'magret'],
      'VIANDE_BLANCHE': ['viande blanche', 'volaille', 'poulet', 'veau', 'dinde', 'porc', 'lapin'],
      'POISSON': ['poisson', 'saumon', 'bar', 'cabillaud', 'fruits de mer', 'huitre', 'huître', 'crevette', 'coquille', 'crustacé', 'crabe', 'homard', 'saint-jacques'],
      'FROMAGE': ['fromage', 'chèvre', 'chevre', 'roquefort', 'comté', 'comte', 'brie', 'camembert', 'tomme', 'bleu', 'pâte dure', 'pâte molle'],
      'DESSERT': ['dessert', 'chocolat', 'tarte', 'fruit', 'gâteau', 'gateau', 'macaron', 'sucré', 'sucre', 'glace', 'pâtisserie']
    };

    if (safeTagsAccords.length === 0 && safeAccordsMets.length > 0) {
      const accordsText = safeAccordsMets.join(' ').toLowerCase() + ' ' + accord_parfait.toLowerCase();
      Object.entries(keywords).forEach(([tag, words]) => {
        if (!safeTagsAccords.includes(tag) && words.some(w => accordsText.includes(w))) {
          safeTagsAccords.push(tag);
        }
      });
      if (safeTagsAccords.length === 0) {
        if (type_simplifie === 'ROUGE') safeTagsAccords.push('VIANDE_ROUGE', 'FROMAGE');
        if (type_simplifie === 'BLANC') safeTagsAccords.push('POISSON', 'VIANDE_BLANCHE', 'APERITIF');
        if (type_simplifie === 'PETILLANT') safeTagsAccords.push('APERITIF', 'DESSERT');
        if (type_simplifie === 'ROSE') safeTagsAccords.push('APERITIF', 'POISSON');
      }
    }

    return { 
      nom, annee, region, type,
      type_simplifie, statut_apogee, prix_unitaire_nombre, 
      description, potentiel_garde, apogee, declin, accord_parfait,
      accords_mets: safeAccordsMets, tags_accords: safeTagsAccords, comparateur: safeComparateur 
    };
  } catch (e) {
    return { nom: 'Erreur d\'analyse', type_simplifie: 'AUTRE', accords_mets: [], tags_accords: [], comparateur: [] };
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
  
  const [tempLocation, setTempLocation] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  
  const [currentScanId, setCurrentScanId] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) {
          await signInWithCustomToken(auth, (window as any).__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { }
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
    if (!user) return;

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

  const startCamera = async () => {
    try {
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();
      
      const compressedImg = await compressImage(dataUrl);
      setImageSrc(compressedImg);
      analyzeImage(compressedImg);
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

  useEffect(() => { return () => stopCamera(); }, []);

  const getPromptBase = () => `
    Tu DOIS renvoyer UNIQUEMENT un objet JSON valide. Ne renvoie AUCUN texte avant ou après le JSON.
    Structure EXACTE et OBLIGATOIRE :
    {
      "nom": "Nom complet du domaine, cuvée ou marque",
      "type": "Vin Rouge / Vin Blanc / Champagne / etc.",
      "type_simplifie": "ROUGE", 
      "annee": "Le millésime (ou 'Non millésimé')",
      "region": "Région ou pays d'origine",
      "description": "Brève description du profil aromatique.",
      "prix_moyen": "Prix marchand estimé (ex: '45€')",
      "prix_unitaire_nombre": 45.0, 
      "potentiel_garde": "Combien de temps le conserver (ex: '5 à 10 ans')",
      "apogee": "L'année ou la période où il sera parfait (ex: '2026 - 2028')",
      "declin": "L'année où il commencera à perdre ses qualités (ex: 'À partir de 2030')",
      "statut_apogee": "APOGEE", 
      "comparateur": [
        {"site": "Vinatis", "prix": "44.90€"}
      ],
      "accord_parfait": "LE plat ou l'accompagnement idéal et précis avec ce vin",
      "accords_mets": ["Autre Plat 1", "Autre Plat 2"], 
      "tags_accords": ["VIANDE_ROUGE", "FROMAGE"]
    }
  `;

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

    if (auth.currentUser && !auth.currentUser.isAnonymous) {
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
    setPreviousView('home');
    try {
      const b64Data = base64Img.split(',')[1];
      const prompt = `Tu es un sommelier expert. Analyse cette étiquette. L'année actuelle est 2026.\n${getPromptBase()}`;
      const result = await callGemini(prompt, b64Data);
      await processAIResult(result.candidates?.[0]?.content?.parts?.[0]?.text, base64Img);
    } catch (err) {
      setErrorMsg(err.message);
      setView('error');
    }
  };

  const searchWineText = async (textQuery) => {
    setView('analyzing');
    setPreviousView('home');
    try {
      const prompt = `Tu es un sommelier expert. L'utilisateur recherche le vin : "${textQuery}". L'année actuelle est 2026.\n${getPromptBase()}`;
      const result = await callGemini(prompt);
      await processAIResult(result.candidates?.[0]?.content?.parts?.[0]?.text, null);
    } catch (err) {
      setErrorMsg(err.message);
      setView('error');
    }
  };

  const fetchAIRecommendation = async (type, apogee, food, price) => {
    setView('analyzing');
    setPreviousView('recommendation');
    try {
      const mapType = { 'ALL': 'Peu importe le type', 'ROUGE': 'Vin Rouge', 'BLANC': 'Vin Blanc', 'ROSE': 'Vin Rosé', 'PETILLANT': 'Champagne ou Pétillant' };
      const mapApogee = { 'ALL': 'Peu importe', 'A_GARDER': 'Jeune', 'APOGEE': 'Apogée', 'DECLIN': 'Vieux millésime' };
      const mapFood = { 'ALL': 'Peu importe', 'APERITIF': 'Apéritif/Tapas', 'VIANDE_ROUGE': 'Viande rouge', 'VIANDE_BLANCHE': 'Viande blanche', 'POISSON': 'Poisson/Mer', 'FROMAGE': 'Fromage', 'DESSERT': 'Dessert' };
      const mapPrice = { 'ALL': 'Différentes tranches', 'BUDGET': '< 20 euros', 'MEDIUM': '20 - 50 euros', 'PREMIUM': '> 50 euros' };

      const prompt = `Tu es un sommelier de classe mondiale. Recommandations : Type: ${mapType[type]}, Repas: ${mapFood[food]}, Apogée: ${mapApogee[apogee]}, Budget: ${mapPrice[price]}.
      Trouve 3 à 4 vins RÉELS.
      Renvoie UNIQUEMENT un objet JSON avec une propriété "vins" contenant un tableau (array) de vins.
      Pour CHAQUE vin, tu DOIS utiliser EXACTEMENT cette structure :
      ${getPromptBase()}`;

      const result = await callGemini(prompt);
      
      let parsed = extractJSON(result.candidates?.[0]?.content?.parts?.[0]?.text);
      let vins = parsed.vins || (Array.isArray(parsed) ? parsed : null);
      if (!vins || !Array.isArray(vins) || vins.length === 0) throw new Error("Format inattendu");
      
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
    if (auth.currentUser && !auth.currentUser.isAnonymous && !id.startsWith('temp_')) {
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

    if (auth.currentUser && !auth.currentUser.isAnonymous && !id.startsWith('temp_')) {
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

    if (auth.currentUser && !auth.currentUser.isAnonymous && !id.startsWith('temp_')) {
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

    if (auth.currentUser && !auth.currentUser.isAnonymous && !scanId.startsWith('temp_')) {
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

    if (val !== '' && auth.currentUser && !auth.currentUser.isAnonymous && !scanId.startsWith('temp_')) {
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

  // --- VIEWS ---
  const NavigationBar = () => (
    <div className="absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 h-16">
      <button onClick={() => setView('home')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'home' || view === 'manualSearch' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
        <Home className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Scanner</span>
      </button>
      <button onClick={() => setView('cellar')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'cellar' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
        <Archive className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Cave</span>
      </button>
      <button onClick={() => setView('recommendation')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'recommendation' || view === 'recommendationList' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Conseil</span>
      </button>
      <button onClick={() => setView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'history' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
        <History className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Histo</span>
      </button>
      <button onClick={() => setView('account')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'account' ? 'text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}>
        <User className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Compte</span>
      </button>
    </div>
  );

  const HomeView = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 pb-20">
      <div className="text-center space-y-4">
        <div className="mx-auto w-24 h-24 bg-rose-900 rounded-full flex items-center justify-center shadow-lg shadow-rose-900/20">
          <Wine className="w-12 h-12 text-rose-100" />
        </div>
        <h1 className="text-4xl font-serif text-slate-800 tracking-tight">VinoScan</h1>
        <p className="text-slate-500 max-w-sm mx-auto text-sm">Gérez votre cave, analysez vos vins et découvrez leur apogée parfaite.</p>
      </div>
      <div className="w-full max-w-sm space-y-3 pt-4">
        <button onClick={startCamera} className="w-full flex items-center justify-center space-x-3 bg-rose-900 hover:bg-rose-800 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95">
          <Camera className="w-6 h-6" /><span className="font-medium text-lg">Scanner une bouteille</span>
        </button>
        <div className="flex space-x-3">
          <label className="flex-1 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 p-4 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm">
            <ImageIcon className="w-6 h-6 text-slate-500" /><span className="font-medium text-sm">Galerie photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={() => setView('manualSearch')} className="flex-1 flex flex-col items-center justify-center space-y-2 bg-slate-900 text-white hover:bg-slate-800 p-4 rounded-2xl shadow-sm transition-all active:scale-95">
            <Search className="w-6 h-6" /><span className="font-medium text-sm">Recherche texte</span>
          </button>
        </div>
      </div>
    </div>
  );

  const ManualSearchView = () => {
    const [query, setQuery] = useState('');
    const handleSearch = (e) => { e.preventDefault(); if(query.trim()) searchWineText(query); };
    return (
      <div className="flex flex-col h-full bg-slate-50 pb-20">
        <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center">
          <button onClick={() => setView('home')} className="mr-4 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-serif text-slate-900">Ajouter un vin</h1><p className="text-slate-500 text-xs mt-1">Recherche dans la base de données mondiale</p></div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">Nom du vin, Domaine, Millésime...</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex: Château Margaux 2015" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none shadow-sm text-lg"/>
              </div>
            </div>
            <button type="submit" disabled={!query.trim()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-medium shadow-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              Rechercher ce vin
            </button>
          </form>
        </div>
      </div>
    );
  };

  const CellarView = () => {
    const [cellarTab, setCellarTab] = useState('STOCK');
    const [filterType, setFilterType] = useState('ALL');
    const [filterApogee, setFilterApogee] = useState('ALL');
    const [viewMode, setViewMode] = useState('list');

    const cellarItems = scanHistory.filter(item => {
      if (cellarTab === 'STOCK') return item.stock > 0;
      return item.wishlist === true;
    });
    
    const filteredItems = useMemo(() => {
      return cellarItems.filter(item => {
        const matchType = filterType === 'ALL' || item.data.type_simplifie === filterType;
        const matchApogee = filterApogee === 'ALL' || item.data.statut_apogee === filterApogee;
        return matchType && matchApogee;
      });
    }, [cellarItems, filterType, filterApogee]);

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

    const getApogeeBadge = (statut) => {
      switch(statut) {
        case 'A_GARDER': return <div className="flex items-center space-x-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded"><Clock className="w-3 h-3" /><span>À garder</span></div>;
        case 'DECLIN': return <div className="flex items-center space-x-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded"><TrendingDown className="w-3 h-3" /><span>Déclin</span></div>;
        default: return <div className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle className="w-3 h-3" /><span>Apogée</span></div>;
      }
    };

    return (
      <div className="flex flex-col h-full bg-slate-50 pb-20">
        <div className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 sticky top-0">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-2xl font-serif text-slate-900">Mes Vins</h1>
              <p className="text-slate-500 text-sm mt-1">{totalBottles} {cellarTab === 'STOCK' ? 'bouteilles' : 'souhaits'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Valeur</p>
              <div className="flex items-center justify-end space-x-1 text-slate-900"><span className="text-2xl font-bold">{totalValue.toFixed(0)}</span><Euro className="w-5 h-5 mb-0.5" /></div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
            <button onClick={() => setCellarTab('STOCK')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'STOCK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>En Cave</button>
            <button onClick={() => setCellarTab('WISHLIST')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${cellarTab === 'WISHLIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Liste d'Achats</button>
          </div>

          <div className="space-y-3 relative">
            <div className="absolute right-0 top-0 h-full flex items-center bg-gradient-to-l from-white via-white to-transparent pl-4 pr-1">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                 <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-4 h-4" /></button>
                 <button onClick={() => setViewMode('shelves')} className={`p-1.5 rounded-md ${viewMode === 'shelves' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 pr-20 scrollbar-hide">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
              {['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (
                <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterType === type ? 'bg-rose-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {type === 'ALL' ? 'Tous les vins' : type === 'PETILLANT' ? 'Champagne/Pétillant' : type}
                </button>
              ))}
            </div>
            {cellarTab === 'STOCK' && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                <button onClick={() => setFilterApogee('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterApogee === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Toutes périodes</button>
                <button onClick={() => setFilterApogee('A_GARDER')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterApogee === 'A_GARDER' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>À garder</button>
                <button onClick={() => setFilterApogee('APOGEE')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterApogee === 'APOGEE' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>À boire (Apogée)</button>
                <button onClick={() => setFilterApogee('DECLIN')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterApogee === 'DECLIN' ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Sur le déclin</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {cellarTab === 'STOCK' && declinAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 mb-4 animate-in fade-in">
              <BellRing className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800">Alerte Apogée</h4>
                <p className="text-sm text-red-600">Vous avez {declinAlerts.length} bouteille(s) sur le déclin. Ne tardez plus pour les déguster !</p>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50 mt-10">
              {cellarTab === 'STOCK' ? <Archive className="w-16 h-16 mb-4 text-slate-400" /> : <Heart className="w-16 h-16 mb-4 text-slate-400" />}
              <p className="text-slate-600">Aucun vin ici.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div onClick={() => openExistingWine(item, 'cellar')} className="p-4 flex items-start space-x-4 active:bg-slate-50 cursor-pointer">
                    <div className="w-16 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 shadow-inner">
                      <img src={item.image} alt="Miniature" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{item.data.type_simplifie === 'PETILLANT' ? 'Pétillant' : item.data.type_simplifie}</span>
                        <span className="text-xs font-bold text-slate-400">{item.data.annee}</span>
                      </div>
                      <h3 className="font-serif text-slate-900 truncate font-semibold leading-tight mb-1">{item.data.nom}</h3>
                      {item.location && <p className="text-xs text-indigo-600 font-medium flex items-center mt-1"><MapPin className="w-3 h-3 mr-1"/> {item.location}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        {getApogeeBadge(item.data.statut_apogee)}
                        <span className="text-sm font-bold text-slate-700">{item.data.prix_unitaire_nombre}€</span>
                      </div>
                    </div>
                  </div>
                  
                  {cellarTab === 'STOCK' ? (
                    <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Quantité</span>
                      <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm">
                        <button onClick={(e) => { e.stopPropagation(); handleDirectStockChange(item.id, Math.max(0, item.stock - 1)); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"><Minus className="w-4 h-4" /></button>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" value={item.stock} onChange={(e) => handleDirectStockChange(item.id, e.target.value)} onBlur={(e) => { if(e.target.value === '') handleDirectStockChange(item.id, '0') }} onKeyDown={handleKeyDown} className="font-bold text-lg w-10 text-center text-slate-800 bg-slate-100/50 outline-none focus:bg-slate-200 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                        <button onClick={(e) => { e.stopPropagation(); handleDirectStockChange(item.id, item.stock + 1); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-end">
                      <button onClick={(e) => { e.stopPropagation(); genericUpdate(item.id, { wishlist: false, stock: 1 }); showToast("Ajouté à la cave !"); }} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-slate-800">
                        J'ai acheté ce vin
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
               {Object.entries(groupedByLocation).map(([shelfName, bottles]) => (
                  <div key={shelfName} className="bg-slate-800 rounded-xl overflow-hidden shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] border-b-8 border-amber-900/80">
                     <div className="bg-slate-900 px-4 py-3 text-amber-50 font-serif font-medium flex justify-between items-center border-b border-slate-700/50">
                        <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 opacity-70"/> {shelfName}</span>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded uppercase tracking-wider">{bottles.length} bot.</span>
                     </div>
                     <div className="p-4 flex flex-wrap gap-x-4 gap-y-6 justify-center bg-gradient-to-b from-slate-800 to-slate-900 min-h-[140px] items-end pb-2">
                        {bottles.map(bottle => (
                           <div key={bottle.id} onClick={() => openExistingWine(bottle, 'cellar')} className="relative cursor-pointer group active:scale-95 transition-transform">
                              <div className="w-12 h-32 bg-slate-950 rounded-t-xl rounded-b-sm overflow-hidden border-2 border-slate-700/50 relative shadow-2xl">
                                 <img src={bottle.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                 <div className={`absolute bottom-0 left-0 w-full h-2 ${getColorForType(bottle.data.type_simplifie)} opacity-90`}></div>
                              </div>
                              {cellarTab === 'STOCK' && bottle.stock > 1 && (
                                <span className="absolute -top-2 -right-2 bg-rose-600 border border-white text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-md z-10">
                                  x{bottle.stock}
                                </span>
                              )}
                              <p className="text-[9px] text-center text-slate-300 mt-2 truncate w-14 mx-auto">{String(bottle.data?.nom || 'Vin').split(' ')[0]}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const HistoryView = () => {
    const historyItems = scanHistory.filter(item => item.in_history !== false);

    return (
      <div className="flex flex-col h-full bg-slate-50 pb-20">
        <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0">
          <h1 className="text-2xl font-serif text-slate-900">Historique des scans</h1>
          <p className="text-slate-500 text-xs mt-1">Toutes les bouteilles analysées</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
              <History className="w-16 h-16 mb-4 text-slate-400" />
              <p className="text-slate-600">Aucun historique.</p>
            </div>
          ) : (
            historyItems.map((item) => (
              <div key={item.id} onClick={() => openExistingWine(item, 'history')} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center space-x-4 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden">
                <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 opacity-80">
                  <img src={item.image} alt="Miniature" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-slate-400">{String(item.dateStr || '').split(' ')[0]}</span>
                    {item.stock > 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">En cave</span>}
                  </div>
                  <h3 className="font-serif text-slate-900 truncate font-medium text-sm">{item.data.nom}</h3>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const AccountView = () => {
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const handleAuth = async (e) => {
      e.preventDefault();
      setAuthError('');
      try {
        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
      } catch (err) {
        setAuthError("Erreur : Vérifiez vos identifiants ou le mot de passe (min 6 caractères).");
      }
    };

    const handleLogout = async () => {
      await signOut(auth);
      await signInAnonymously(auth);
      setView('home');
    };
    
    if (!user || user.isAnonymous) {
      return (
        <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto p-6">
          <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-serif text-slate-900 mb-2">Sauvegardez votre cave</h2>
            <p className="text-sm text-slate-500 text-center mb-8">
              Créez un compte gratuitement pour retrouver votre cave sur tous vos appareils.
            </p>

            {authError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg w-full mb-4 text-center">{authError}</div>}

            <form onSubmit={handleAuth} className="w-full space-y-4">
              <input type="email" placeholder="Adresse email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-200" required />
              <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-200" required />
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-medium shadow-lg hover:bg-slate-800 transition-colors">
                {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>

            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-slate-500 text-sm hover:text-slate-700 underline underline-offset-4">
              {authMode === 'login' ? "Je n'ai pas de compte. M'inscrire." : "J'ai déjà un compte. Me connecter."}
            </button>
          </div>
        </div>
      );
    }

    const itemsInStock = scanHistory.filter(i => i.stock > 0);
    const totalBottles = itemsInStock.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    const totalValue = itemsInStock.reduce((acc, curr) => acc + ((curr.data.prix_unitaire_nombre || 0) * (curr.stock || 0)), 0);
    
    const countType = (type) => itemsInStock.filter(i => i.data.type_simplifie === type).reduce((acc, curr) => acc + curr.stock, 0);
    const red = countType('ROUGE');
    const white = countType('BLANC');
    const rose = countType('ROSE');
    const spark = countType('PETILLANT');
    const getPct = (val) => totalBottles === 0 ? 0 : Math.round((val / totalBottles) * 100);

    return (
      <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto">
        <div className="bg-white pt-12 pb-6 px-6 shadow-sm z-10 flex items-center space-x-3">
          <User className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-serif text-slate-900">Mon Profil</h1>
        </div>
        <div className="p-6 flex flex-col items-center text-center">
          
          <h2 className="text-lg font-semibold text-slate-800 truncate w-full px-4 mt-2">
            {user.email}
          </h2>
          <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mt-2 font-medium">Sauvegarde Cloud Activée</p>
          
          <div className="w-full bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mt-8 mb-6">
            <h3 className="font-semibold text-slate-800 flex items-center mb-4"><PieChart className="w-5 h-5 mr-2 text-indigo-600"/> Mon Dashboard</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Stock</p>
                <p className="text-2xl font-bold text-slate-800">{totalBottles}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Valeur</p>
                <p className="text-2xl font-bold text-slate-800">{totalValue.toFixed(0)}€</p>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-600 mb-2">Répartition de la cave</p>
            <div className="h-4 w-full flex rounded-full overflow-hidden mb-3">
              {red > 0 && <div style={{width: `${getPct(red)}%`}} className="bg-rose-800 h-full"></div>}
              {white > 0 && <div style={{width: `${getPct(white)}%`}} className="bg-amber-100 h-full"></div>}
              {rose > 0 && <div style={{width: `${getPct(rose)}%`}} className="bg-pink-300 h-full"></div>}
              {spark > 0 && <div style={{width: `${getPct(spark)}%`}} className="bg-yellow-400 h-full"></div>}
              {totalBottles === 0 && <div className="bg-slate-200 h-full w-full"></div>}
            </div>
            
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-800 mr-2"></div><span className="text-slate-600">Rouges ({getPct(red)}%)</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-100 mr-2 border border-slate-200"></div><span className="text-slate-600">Blancs ({getPct(white)}%)</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-pink-300 mr-2"></div><span className="text-slate-600">Rosés ({getPct(rose)}%)</span></div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div><span className="text-slate-600">Bulles ({getPct(spark)}%)</span></div>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">
            <LogOut className="w-5 h-5" /><span>Se déconnecter</span>
          </button>
        </div>
      </div>
    );
  };

  const CameraView = () => (
    <div className="relative h-full w-full bg-black flex flex-col">
      <button onClick={() => { stopCamera(); setView('home'); }} className="absolute top-6 left-6 z-10 p-3 bg-black/50 backdrop-blur text-white rounded-full"><ChevronLeft className="w-6 h-6" /></button>
      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="min-w-full min-h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-2xl flex flex-col justify-between p-4">
            <div className="flex justify-between"><div className="w-8 h-8 border-t-4 border-l-4 border-rose-500 rounded-tl-lg"></div><div className="w-8 h-8 border-t-4 border-r-4 border-rose-500 rounded-tr-lg"></div></div>
            <ScanLine className="w-12 h-12 text-white/30 self-center animate-pulse" />
            <div className="flex justify-between"><div className="w-8 h-8 border-b-4 border-l-4 border-rose-500 rounded-bl-lg"></div><div className="w-8 h-8 border-b-4 border-r-4 border-rose-500 rounded-br-lg"></div></div>
          </div>
        </div>
      </div>
      <div className="h-32 bg-black pb-8 pt-4 flex items-center justify-center">
        <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-90 transition-transform">
          <div className="w-16 h-16 bg-white rounded-full border-2 border-rose-500"></div>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const AnalyzingView = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50">
      <div className="relative w-32 h-32 flex items-center justify-center mb-8">
        <div className="absolute inset-0 border-4 border-rose-200 rounded-full animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute inset-2 border-4 border-rose-400 rounded-full border-t-transparent animate-[spin_1.5s_linear_infinite]"></div>
        <Wine className="w-12 h-12 text-rose-900 animate-pulse" />
      </div>
      <h2 className="text-2xl font-serif text-slate-800 mb-2">Analyse en cours...</h2>
      <p className="text-slate-500 text-sm mt-2 text-center">Notre sommelier travaille sur votre demande...</p>
    </div>
  );

  const ErrorView = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6"><AlertCircle className="w-10 h-10" /></div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-4">Erreur</h2>
      <p className="text-slate-600 mb-8">{errorMsg}</p>
      <button onClick={goBack} className="px-8 py-3 bg-slate-800 text-white rounded-full font-medium hover:bg-slate-700 transition-colors">Retour</button>
    </div>
  );

  const RecommendationView = () => {
    const [filterType, setFilterType] = useState('ALL');
    const [filterApogee, setFilterApogee] = useState('ALL');
    const [filterFood, setFilterFood] = useState('ALL');
    const [filterPrice, setFilterPrice] = useState('ALL');

    const handleRecommend = () => { fetchAIRecommendation(filterType, filterApogee, filterFood, filterPrice); };

    return (
      <div className="flex flex-col h-full bg-amber-50/30 pb-20 overflow-y-auto">
        <div className="bg-white pt-12 pb-6 px-6 shadow-sm z-10 sticky top-0 border-b border-amber-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center"><Sparkles className="w-5 h-5 text-amber-600" /></div>
            <div><h1 className="text-2xl font-serif text-slate-900">Sommelier Virtuel</h1><p className="text-slate-500 text-sm">Laissez l'IA vous conseiller</p></div>
          </div>
        </div>
        <div className="p-6 space-y-8">
          <div className="space-y-3"><h3 className="font-semibold text-slate-800 flex items-center space-x-2"><Euro className="w-5 h-5 text-emerald-600" /><span>Quel est votre budget ?</span></h3><div className="flex flex-wrap gap-2"><button onClick={() => setFilterPrice('ALL')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterPrice === 'ALL' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Peu importe</button><button onClick={() => setFilterPrice('BUDGET')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterPrice === 'BUDGET' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Abordable (&lt; 20€)</button><button onClick={() => setFilterPrice('MEDIUM')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterPrice === 'MEDIUM' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Plaisir (20€ - 50€)</button><button onClick={() => setFilterPrice('PREMIUM')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterPrice === 'PREMIUM' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Exception (&gt; 50€)</button></div></div>
          <div className="space-y-3"><h3 className="font-semibold text-slate-800 flex items-center space-x-2"><Utensils className="w-5 h-5 text-amber-600" /><span>Qu'allez-vous manger ?</span></h3><div className="flex flex-wrap gap-2"><button onClick={() => setFilterFood('ALL')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'ALL' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍽️ Peu importe</button><button onClick={() => setFilterFood('APERITIF')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'APERITIF' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🥂 Apéritif & Tapas</button><button onClick={() => setFilterFood('VIANDE_ROUGE')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'VIANDE_ROUGE' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🥩 Viande rouge</button><button onClick={() => setFilterFood('VIANDE_BLANCHE')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'VIANDE_BLANCHE' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍗 Viande blanche</button><button onClick={() => setFilterFood('POISSON')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'POISSON' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🐟 Poisson & Mer</button><button onClick={() => setFilterFood('FROMAGE')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'FROMAGE' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🧀 Fromage</button><button onClick={() => setFilterFood('DESSERT')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterFood === 'DESSERT' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>🍰 Dessert</button></div></div>
          <div className="space-y-3"><h3 className="font-semibold text-slate-800 flex items-center space-x-2"><Wine className="w-5 h-5 text-rose-800" /><span>Quel type de vin ?</span></h3><div className="flex flex-wrap gap-2">{['ALL', 'ROUGE', 'BLANC', 'PETILLANT', 'ROSE'].map(type => (<button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterType === type ? 'bg-rose-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{type === 'ALL' ? 'Surprenez-moi' : type === 'PETILLANT' ? 'Champagne/Pétillant' : type}</button>))}</div></div>
          <div className="space-y-3"><h3 className="font-semibold text-slate-800 flex items-center space-x-2"><Clock className="w-5 h-5 text-indigo-600" /><span>Quel âge ou profil ?</span></h3><div className="flex flex-wrap gap-2"><button onClick={() => setFilterApogee('ALL')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterApogee === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Peu importe</button><button onClick={() => setFilterApogee('A_GARDER')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterApogee === 'A_GARDER' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Un vin jeune</button><button onClick={() => setFilterApogee('APOGEE')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterApogee === 'APOGEE' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Prêt à boire (Apogée)</button><button onClick={() => setFilterApogee('DECLIN')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterApogee === 'DECLIN' ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Un vieux millésime</button></div></div>
          <button onClick={handleRecommend} className="w-full py-4 bg-amber-600 text-white rounded-xl font-medium shadow-lg shadow-amber-600/30 hover:bg-amber-700 transition-all active:scale-95 flex justify-center items-center space-x-2 mt-4"><Sparkles className="w-5 h-5" /><span>Me conseiller un vin</span></button>
        </div>
      </div>
    );
  };

  const RecommendationListView = () => {
    const [sortOrder, setSortOrder] = useState('asc');
    const sortedList = useMemo(() => {
      if (!recommendationList) return [];
      return [...recommendationList].sort((a, b) => {
        const priceA = a.prix_unitaire_nombre || 0;
        const priceB = b.prix_unitaire_nombre || 0;
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    }, [recommendationList, sortOrder]);

    return (
      <div className="flex flex-col h-full bg-amber-50/30 pb-20">
        <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center justify-between border-b border-amber-100">
          <div className="flex items-center"><button onClick={() => setView('recommendation')} className="mr-3 p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></button><div><h1 className="text-2xl font-serif text-slate-900">Notre Sélection</h1><p className="text-slate-500 text-xs mt-1">{sortedList.length} vins trouvés pour vous</p></div></div>
          <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center space-x-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"><ArrowDownUp className="w-4 h-4" /><span>{sortOrder === 'asc' ? 'Prix croissant' : 'Prix décroissant'}</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sortedList.map((wine, index) => {
             const imgUrl = getGenericImageForType(wine.type_simplifie);
             return (
               <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex space-x-4">
                 <div className="w-20 h-28 bg-slate-100 rounded-lg overflow-hidden shrink-0 shadow-inner">
                    <img src={imgUrl} alt="Bouteille" className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0 flex flex-col justify-between">
                   <div>
                     <div className="flex justify-between items-start mb-1">
                       <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{wine.type_simplifie === 'PETILLANT' ? 'Pétillant' : (wine.type_simplifie || 'VIN')}</span>
                       <div className="flex items-end space-x-1 text-emerald-700 font-bold">
                         <span className="text-xl leading-none">{wine.prix_unitaire_nombre || '?'}</span>
                         <span className="text-sm">€</span>
                       </div>
                     </div>
                     <h3 className="font-serif text-slate-900 text-base leading-tight mb-1 line-clamp-2">{wine.nom}</h3>
                     <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
                       <span className="font-semibold text-slate-700">{wine.annee}</span><span>•</span><span className="truncate">{wine.region}</span>
                     </div>
                     <p className="text-xs text-slate-600 mb-3 line-clamp-2">{wine.description}</p>
                   </div>
                   <button onClick={() => processRecommendationSelection(wine)} className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-medium shadow-md hover:bg-slate-800 transition-colors">
                     Voir cette bouteille
                   </button>
                 </div>
               </div>
             );
          })}
        </div>
      </div>
    );
  };

  const ResultsView = () => {
    const currentScanObj = scanHistory.find(s => s.id === currentScanId);
    const stock = currentScanObj ? currentScanObj.stock : 0;
    const isWishlist = currentScanObj ? currentScanObj.wishlist : false;
    const rating = currentScanObj ? currentScanObj.rating : 0;

    const [tempAnnee, setTempAnnee] = useState('');
    const [tempPrix, setTempPrix] = useState('');

    useEffect(() => {
      if (currentScanObj) {
        setTempLocation(currentScanObj.location || '');
        setTempNotes(currentScanObj.notes || '');
        setTempAnnee(currentScanObj.data?.annee || '');
        setTempPrix(currentScanObj.data?.prix_unitaire_nombre || '');
      } else if (analysisResult) {
        setTempAnnee(analysisResult.annee || '');
        setTempPrix(analysisResult.prix_unitaire_nombre || '');
      }
    }, [currentScanObj?.id, analysisResult]);

    if (!analysisResult) return null;
    const { nom, type, region, description, potentiel_garde, apogee, declin, statut_apogee, comparateur, accords_mets, accord_parfait } = analysisResult;
    
    const safeAccordsMets = Array.isArray(accords_mets) ? accords_mets : [];
    const safeComparateur = Array.isArray(comparateur) ? comparateur : [];

    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-8">
        <div className="relative h-64 bg-slate-800 overflow-hidden shrink-0">
          <img src={imageSrc} alt="Scanned bottle blur" className="w-full h-full object-cover opacity-50 blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img src={imageSrc} alt="Scanned bottle clear" className="max-h-full rounded-lg shadow-2xl" />
          </div>
          <button onClick={goBack} className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors z-20"><ChevronLeft className="w-6 h-6" /></button>
          
          {currentScanObj && (
            <button onClick={() => handleShare(currentScanObj)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors z-20">
              <Share2 className="w-5 h-5" />
            </button>
          )}

          {toastMsg && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 text-white text-sm font-medium rounded-full backdrop-blur z-50 animate-in fade-in slide-in-from-top-2">
              {toastMsg}
            </div>
          )}
        </div>
        
        <div className="px-4 -mt-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-1 rounded-md">{type}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{region}</span>
            </div>
            <h2 className="text-2xl font-serif text-slate-900 leading-tight mb-2">{nom}</h2>
            
            <div className="flex items-center text-lg text-slate-500 font-medium mb-4">
              <span>Millésime :</span>
              <div className="relative flex items-center ml-2">
                <input 
                  type="text" 
                  value={tempAnnee} 
                  onChange={(e) => setTempAnnee(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  onBlur={() => currentScanId && updateDataField(currentScanId, 'annee', tempAnnee)}
                  className="bg-slate-100 text-slate-800 px-2 py-1 rounded w-32 outline-none focus:ring-2 focus:ring-rose-200 font-bold"
                />
                <Edit3 className="absolute right-2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-start space-x-3 text-slate-600 bg-slate-50 p-4 rounded-xl">
              <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{description}</p>
            </div>
          </div>

          {currentScanObj && (
            <div className="bg-slate-900 rounded-2xl shadow-lg p-6 mb-4 text-white">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="font-medium text-slate-200">Dans ma cave</h3></div>
                <div className="flex items-center space-x-3 bg-slate-800 rounded-full p-1">
                  <button onClick={() => handleDirectStockChange(currentScanObj.id, Math.max(0, stock - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-slate-700 rounded-full transition-colors"><Minus className="w-5 h-5" /></button>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={stock} onChange={(e) => handleDirectStockChange(currentScanObj.id, e.target.value)} onBlur={(e) => { if(e.target.value === '') handleDirectStockChange(currentScanObj.id, '0') }} onKeyDown={handleKeyDown} className="w-14 h-12 text-center text-2xl font-bold bg-slate-700/50 rounded-xl text-white outline-none focus:bg-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => handleDirectStockChange(currentScanObj.id, stock + 1)} className="w-12 h-12 flex items-center justify-center bg-rose-600 hover:bg-rose-500 rounded-full transition-colors shadow-lg shadow-rose-900/50"><Plus className="w-5 h-5" /></button>
                </div>
              </div>

              {stock === 0 ? (
                <button onClick={() => genericUpdate(currentScanObj.id, { wishlist: !isWishlist })} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors border ${isWishlist ? 'bg-pink-900/40 border-pink-800 text-pink-200 hover:bg-pink-900/60' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                  <Heart className={`w-5 h-5 ${isWishlist ? 'fill-current' : ''}`} />
                  <span>{isWishlist ? 'Dans ma liste d\'achats' : 'Ajouter à la liste d\'achats'}</span>
                </button>
              ) : (
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center"><MapPin className="w-3 h-3 mr-1"/> Emplacement en cave</label>
                  <input type="text" value={tempLocation} onChange={(e) => setTempLocation(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => genericUpdate(currentScanObj.id, { location: tempLocation })} placeholder="Ex: Étagère du haut, Armoire B..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500" />
                </div>
              )}
            </div>
          )}

          {currentScanObj && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2"><Edit3 className="w-5 h-5 text-rose-800" /><h3 className="text-lg font-semibold text-slate-800">Mon avis</h3></div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => genericUpdate(currentScanObj.id, { rating: star })}>
                      <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                value={tempNotes} 
                onChange={(e) => setTempNotes(e.target.value)} 
                onKeyDown={handleKeyDown}
                onBlur={() => genericUpdate(currentScanObj.id, { notes: tempNotes })}
                placeholder="Ajoutez vos notes de dégustation personnelles ici..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          )}

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-100 p-6 mb-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center shadow-sm">
                <Star className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-xl font-serif text-amber-900">L'Accord Parfait</h3>
            </div>
            <p className="text-amber-800 font-medium text-lg leading-snug">{accord_parfait}</p>
            
            {safeAccordsMets.length > 0 && (
               <div className="mt-5 pt-4 border-t border-amber-200/50">
                 <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800/70 mb-3">Autres excellents choix :</h4>
                 <ul className="space-y-2">
                   {safeAccordsMets.map((plat, index) => (<li key={index} className="flex items-start space-x-2 text-sm"><div className="w-1 h-1 rounded-full bg-amber-500 mt-2 shrink-0"></div><span className="text-amber-900/80">{plat}</span></li>))}
                 </ul>
               </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <div className="flex items-center space-x-2 mb-6"><Clock className="w-5 h-5 text-indigo-600" /><h3 className="text-lg font-semibold text-slate-800">Potentiel de Garde</h3></div>
            <div className="space-y-4">
              <div className="flex items-start"><div className="w-10 flex flex-col items-center"><div className={`w-3 h-3 rounded-full ${statut_apogee === 'A_GARDER' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`}></div><div className={`w-0.5 h-10 ${statut_apogee === 'A_GARDER' ? 'bg-indigo-200' : 'bg-slate-200'}`}></div></div><div className="-mt-1.5 pb-6"><p className={`text-sm font-bold ${statut_apogee === 'A_GARDER' ? 'text-indigo-600' : 'text-slate-800'}`}>Temps de garde</p><p className="text-sm text-slate-500">{potentiel_garde}</p></div></div>
              <div className="flex items-start"><div className="w-10 flex flex-col items-center"><div className={`w-4 h-4 rounded-full flex items-center justify-center ${statut_apogee === 'APOGEE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div><div className={`w-0.5 h-10 ${statut_apogee === 'APOGEE' ? 'bg-emerald-200' : 'bg-slate-200'}`}></div></div><div className="-mt-1.5 pb-6"><p className={`text-sm font-bold ${statut_apogee === 'APOGEE' ? 'text-emerald-600' : 'text-slate-800'}`}>Apogée parfaite</p><p className="text-sm text-slate-600">À déguster : {apogee}</p></div></div>
              <div className="flex items-start"><div className="w-10 flex flex-col items-center"><TrendingDown className={`w-4 h-4 ${statut_apogee === 'DECLIN' ? 'text-red-600' : 'text-slate-400'}`} /></div><div className="-mt-1"><p className={`text-sm font-bold ${statut_apogee === 'DECLIN' ? 'text-red-600' : 'text-slate-800'}`}>Déclin du vin</p><p className="text-sm text-slate-600">{declin}</p></div></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Tag className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-800">Tarif Marchand</h3>
            </div>
            
            <div className="flex items-end space-x-1 mb-6">
              <div className="relative flex items-center">
                <input 
                  type="number" 
                  value={tempPrix} 
                  onChange={(e) => setTempPrix(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  onBlur={() => currentScanId && updateDataField(currentScanId, 'prix_unitaire_nombre', Number(tempPrix))}
                  className="text-4xl font-bold text-slate-900 bg-slate-50 border-b-2 border-dashed border-slate-300 w-24 outline-none focus:border-emerald-500 text-center"
                />
                <Edit3 className="absolute right-0 top-0 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="text-4xl font-bold text-slate-900">€</span>
              <span className="text-slate-500 mb-1 ml-2">estimé / bouteille</span>
            </div>

            {safeComparateur.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Comparateur en ligne</h4>
                {safeComparateur.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                      <ShoppingCart className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700 text-sm">{item.site}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.prix}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col space-y-3 mt-6">
             {currentScanObj && currentScanObj.in_history !== false && (
               <button onClick={() => setScanAction({id: currentScanObj.id, type: 'history'})} className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-100 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-200 transition-colors border border-slate-200"><EyeOff className="w-5 h-5 text-slate-500" /><span>Retirer de l'historique</span></button>
             )}
             {currentScanObj && currentScanObj.stock > 0 && (
               <button onClick={() => setScanAction({id: currentScanObj.id, type: 'cellar'})} className="w-full flex items-center justify-center space-x-2 py-4 bg-red-50 text-red-600 rounded-xl font-medium shadow-sm hover:bg-red-100 transition-colors border border-red-100"><Archive className="w-5 h-5" /><span>Retirer de ma cave</span></button>
             )}
          </div>

        </div>
      </div>
    );
  };

  if (isAuthLoading) return <div className="h-[100dvh] flex items-center justify-center bg-white"><Wine className="w-10 h-10 text-rose-500 animate-bounce" /></div>;

  return (
    <ErrorBoundary onReset={() => setView('home')}>
      <div className="w-full max-w-md mx-auto h-[100dvh] bg-white sm:border-x sm:border-slate-200 overflow-hidden relative shadow-2xl text-slate-900 font-sans">
        {view === 'home' && <HomeView />}
        {view === 'manualSearch' && <ManualSearchView />}
        {view === 'recommendation' && <RecommendationView />}
        {view === 'recommendationList' && <RecommendationListView />}
        {view === 'cellar' && <CellarView />}
        {view === 'history' && <HistoryView />}
        {view === 'account' && <AccountView />}
        {view === 'camera' && <CameraView />}
        {view === 'analyzing' && <AnalyzingView />}
        {view === 'results' && <ResultsView />}
        {view === 'error' && <ErrorView />}
        {(view === 'home' || view === 'cellar' || view === 'history' || view === 'account' || view === 'recommendation' || view === 'recommendationList') && <NavigationBar />}

        {scanAction && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-xl font-serif text-center text-slate-900 mb-2">{scanAction.type === 'history' ? "Retirer de l'historique ?" : "Retirer de la cave ?"}</h3>
              <p className="text-slate-600 text-sm text-center mb-6">{scanAction.type === 'history' ? "Ce vin n'apparaîtra plus dans votre historique de scans." : "Le stock de ce vin passera à 0 et il n'apparaîtra plus dans votre cave."}</p>
              <div className="flex space-x-3">
                <button onClick={() => setScanAction(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors">Annuler</button>
                <button onClick={executeAction} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium shadow-md hover:bg-red-700 transition-colors">Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}