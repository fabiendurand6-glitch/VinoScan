// src/views/ResultsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Sparkles, EyeOff, Wine, Star, X, 
  Share2, Trash2, Edit3, MapPin 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { 
  getGenericImageForType, getAmazonAffiliateLink, 
  getRecommendedAccessory, extractJSON, normalizeData 
} from '../utils/wineHelpers';

// --- ACCESSOIRE / SOUS-COMPOSANT : BOUTON VOCAL SOMMELIER ---
const SommelierButton = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lireTexte = (e) => {
    e.stopPropagation(); 
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR'; utterance.rate = 0.95; 
    
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

// --- ACCESSOIRE / SOUS-COMPOSANT : CANVAS EXPORT INSTAGRAM ---
const InstagramShareCanvas = ({ wine, rating, notes }) => (
  <div id="vs-share-canvas" className="fixed -left-[9999px] top-0 w-[1080px] h-[1920px] bg-gradient-to-br from-[#1a1a1a] to-[#050505] text-white flex flex-col font-sans overflow-hidden">
    <div className="w-full h-full border-[12px] border-[#D4AF37] p-16 flex flex-col items-center justify-between">
      <div className="flex flex-col items-center mt-12">
        <div className="w-28 h-28 bg-[#0a0a0a] rounded-full flex items-center justify-center border-4 border-[#D4AF37] mb-6">
          <Wine className="w-14 h-14 text-[#D4AF37]" />
        </div>
        <h1 className="text-6xl font-serif font-bold text-[#D4AF37]">VinoScan</h1>
      </div>
      <div className="flex-1 flex items-center justify-center w-full my-12 bg-white/5 rounded-[40px] p-8 border border-[#333]">
        <img crossOrigin="anonymous" src={wine.image || getGenericImageForType(wine.data?.type_simplifie)} className="max-h-[800px] object-contain drop-shadow-2xl" alt="Bouteille" />
      </div>
      <div className="w-full text-center space-y-6 bg-[#0a0a0a] p-12 rounded-[40px] border-2 border-[#D4AF37]/50 mb-12 shadow-2xl">
        <h2 className="text-6xl font-serif font-black text-white leading-tight">{wine.data?.nom}</h2>
        <p className="text-4xl text-[#D4AF37] uppercase font-bold tracking-widest">{wine.data?.type_simplifie} • {wine.data?.annee} • {wine.data?.region}</p>
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
      <div className="w-full pt-8 text-center border-t-2 border-[#D4AF37]/30">
        <p className="text-3xl text-slate-400 mb-4">Scanné avec l'IA</p>
        <p className="text-5xl text-[#D4AF37] font-black tracking-widest">VINOSCAN.COM</p>
      </div>
    </div>
  </div>
);

// --- COMPOSANT EXPORT PRINCIPAL ---
export default function ResultsView({ ctx }) {
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
  const [tempNom, setTempNom] = useState(d?.nom || '');
  const [tempRegion, setTempRegion] = useState(d?.region || '');

  useEffect(() => {
    if (currentItem) {
      setTempType(currentItem.data?.type_simplifie || 'ROUGE');
      setTempAnnee(currentItem.data?.annee || 'N.M.');
      setTempPrix(currentItem.data?.prix_unitaire_nombre || 0);
      setTempLocation(currentItem.location || '');
      setTempNotes(currentItem.notes || '');
      setTempNom(currentItem.data?.nom || '');
      setTempRegion(currentItem.data?.region || '');
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
    } catch(e) { 
      setProtocol({ temperature: "14°C", carafage: "Non requis", verre: "Classique", conseil: "Servir chambré." }); 
    } finally { 
      setIsLoadingProtocol(false); 
    }
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
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] space-y-3">
              <h4 className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider mb-2 border-b border-[#333] pb-2">Modifier les informations</h4>
              <input type="text" value={tempNom} onChange={e=>setTempNom(e.target.value)} onBlur={()=> { const updatedData = normalizeData({...currentItem.data, nom: tempNom}); ctx.genericUpdate(currentItem.id, { data: updatedData }); }} placeholder="Nom du vin..." className="w-full bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"/>
              <input type="text" value={tempRegion} onChange={e=>setTempRegion(e.target.value)} onBlur={()=> { const updatedData = normalizeData({...currentItem.data, region: tempRegion}); ctx.genericUpdate(currentItem.id, { data: updatedData }); }} placeholder="Région / Appellation..." className="w-full bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"/>
              
              <div className="flex space-x-2">
                <select value={tempType} onChange={e => { 
                    const newType = e.target.value; setTempType(newType); 
                    let gMin = 2, gMax = 5; if (newType === 'ROUGE') { gMin = 3; gMax = 10; } else if (newType === 'BLANC') { gMin = 2; gMax = 6; } else if (newType === 'PETILLANT') { gMin = 1; gMax = 5; } else if (newType === 'ROSE') { gMin = 1; gMax = 3; }
                    const updatedData = normalizeData({ ...currentItem.data, type_simplifie: newType, garde_min: gMin, garde_max: gMax });
                    ctx.genericUpdate(currentItem.id, { data: updatedData });
                  }} 
                  className="w-1/2 bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"
                >
                  <option value="ROUGE">Rouge</option><option value="BLANC">Blanc</option><option value="ROSE">Rosé</option><option value="PETILLANT">Pétillant</option>
                </select>
                <input type="text" value={tempAnnee} onChange={e => setTempAnnee(e.target.value)} onBlur={() => { const updatedData = normalizeData({...currentItem.data, annee: tempAnnee}); ctx.genericUpdate(currentItem.id, { data: updatedData }); }} placeholder="Année" className="w-1/2 bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"/>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] space-y-3">
              <h4 className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider mb-2 border-b border-[#333] pb-2">Rangement & Notes</h4>
              <input type="text" value={tempLocation} onChange={e=>setTempLocation(e.target.value)} onBlur={()=>ctx.genericUpdate(currentItem.id, {location: tempLocation})} placeholder="Étagère..." className="w-full bg-black border border-[#333] text-white rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37]"/>
              <textarea value={tempNotes} onChange={e=>setTempNotes(e.target.value)} onBlur={()=>ctx.genericUpdate(currentItem.id, {notes: tempNotes})} placeholder="Notes de dégustation..." className="w-full bg-black border border-[#333] text-white rounded-xl p-3 text-sm h-20 outline-none focus:border-[#D4AF37] resize-none"/>
            </div>
            
            <button onClick={() => { if (!ctx.requireTier('AMATEUR')) ctx.generateAndShareInstagramImage(ctx.showToast); }} className="w-full py-4 bg-gradient-to-r from-pink-600 to-orange-500 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center space-x-2"><Share2 className="w-4 h-4"/><span>Gérer mon image Story Instagram</span></button>
            <button onClick={() => ctx.setScanAction({id: currentItem.id, type: 'history'})} className="w-full py-3 bg-red-950/20 text-red-400 border border-red-900/40 rounded-xl text-xs font-bold">Supprimer de l'application</button>
            <InstagramShareCanvas wine={currentItem} rating={rating} notes={tempNotes} />
          </div>
        )}
      </div>
    </div>
  );
}