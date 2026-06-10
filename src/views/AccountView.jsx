// src/views/AccountView.jsx
import React, { useState, useMemo } from 'react';
import { 
  Award, Edit3, Check, RefreshCw, TrendingUp, Medal, 
  Target, Sparkles, LogOut 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis 
} from 'recharts';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { BADGES } from '../constants/gameData';

export default function AccountView({ ctx }) {
  const { user, scanHistory, valueHistory, analyzeSensoryDNA, showToast } = ctx;
  
  // Calculs des données de stock
  const items = scanHistory.filter(i => i.stock > 0);
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
      await ctx.updateProfile(user, { displayName: tempName });
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
    if (allNotes.length < 30) { 
      showToast("Notes insuffisantes (min. 3 vins notés)."); 
      return; 
    }
    setIsSensoryLoading(true);
    const dna = await analyzeSensoryDNA(ctx.callGemini, allNotes);
    if (dna) { 
      setSensoryData(dna); 
      showToast("ADN sensoriel généré !"); 
    } else { 
      showToast("Erreur de calcul."); 
    }
    setIsSensoryLoading(false);
  };

  const formattedChartData = useMemo(() => { 
    if (!valueHistory || valueHistory.length < 2) return []; 
    return valueHistory.map(h => ({ date: h.dateStr, valeur: h.value })); 
  }, [valueHistory]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] pb-32 overflow-y-auto select-none p-5">
      {/* HEADER */}
      <div className="bg-[#1A1A1A] pt-12 pb-6 px-6 border-b border-[#333] flex justify-between items-center shadow-xl sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#D4AF37]">Mon Club</h1>
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Sauvegarde active</p>
        </div>
        <div className="w-14 h-14 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#D4AF37]/50">
          <Award className="w-7 h-7 text-[#D4AF37]" />
        </div>
      </div>
      
      <div className="p-5 space-y-6">
        
        {/* PROFIL ÉDITABLE */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg flex justify-between items-center">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Membre Privé</p>
            {isEditingProfile ? (
              <div className="flex items-center space-x-2 mt-2">
                <input 
                  autoFocus 
                  type="text" 
                  value={tempName} 
                  onChange={(e) => setTempName(e.target.value)} 
                  placeholder="Votre nom..." 
                  className="bg-black border border-[#D4AF37] text-white rounded-lg px-3 py-2 text-sm outline-none w-full" 
                />
                <button onClick={saveProfile} disabled={isSavingName} className="p-2 bg-[#D4AF37] text-black rounded-lg">
                  {isSavingName ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <h3 className="font-serif text-2xl font-bold text-[#F5F5F5] truncate pr-4">{user?.displayName || "Anonyme"}</h3>
                <button onClick={() => setIsEditingProfile(true)} className="p-2 bg-[#0a0a0a] border border-[#333] rounded-full text-slate-400 hover:text-[#D4AF37] shrink-0">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">{user?.email}</p>
          </div>
        </div>

        {/* VALORISATION & GRAPHIQUE */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <h3 className="font-serif text-lg font-bold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-emerald-400"/> Valorisation de la Cave
          </h3>
          <p className="text-2xl font-black text-emerald-400">{totalV.toFixed(0)} € <span className="text-xs text-slate-500 font-medium">({totalB} bouteilles)</span></p>
          {formattedChartData.length > 1 ? (
            <div className="h-32 w-full mt-4 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="valeur" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-4">Le graphique se construira au fil des mois.</p>
          )}
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

        {/* ADN SENSORIEL RADAR */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 border border-[#333] shadow-lg">
          <h3 className="font-serif text-lg font-bold text-white mb-2 flex items-center">
            <Target className="w-5 h-5 mr-2 text-[#D4AF37]"/> Profil Sensoriel ADN
          </h3>
          {sensoryData ? (
            <div className="h-56 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sensoryData}>
                  <PolarGrid stroke="#333"/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:'#fff', fontSize:10}}/>
                  <Radar dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.4}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <button onClick={() => { if (!ctx.requireTier('AMATEUR')) generateADN(); }} disabled={isSensoryLoading} className="w-full mt-4 py-3 bg-[#D4AF37] text-black font-bold rounded-xl flex items-center justify-center space-x-2">
              {isSensoryLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
              <span>Générer mon ADN sensoriel</span>
            </button>
          )}
        </div>

        {/* BOUTON DÉCONNEXION */}
        <button onClick={() => signOut(auth)} className="w-full py-4 bg-red-950/20 text-red-400 font-bold rounded-2xl border border-red-900/40 flex items-center justify-center">
          <LogOut className="w-4 h-4 mr-3" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}