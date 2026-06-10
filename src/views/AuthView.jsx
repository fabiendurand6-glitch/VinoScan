// src/views/AuthView.jsx
import React, { useState } from 'react';
import { Wine, RefreshCw } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function AuthView({ auth }) {
  const [mode, setMode] = useState('signup'); // 'login' | 'signup'
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  const handleAuth = async (e) => {
    e.preventDefault(); 
    setError(''); 
    setLoading(true);
    try { 
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password); 
      } else {
        await createUserWithEmailAndPassword(auth, email, password); 
      }
    } catch (x) { 
      setError("Erreur de connexion ou d'inscription."); 
    } finally { 
      setLoading(false); 
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-[#0a0a0a] flex flex-col relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <div className="w-28 h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-full flex items-center justify-center mb-8 border border-[#D4AF37]/30 shadow-lg">
          <Wine className="w-12 h-12 text-[#D4AF37]" />
        </div>
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] mb-2 drop-shadow-sm">VinoScan</h2>
        <p className="text-[#D4AF37]/60 text-xs font-bold uppercase tracking-widest text-center mb-12">Accès Privé Réservé</p>
        
        <form onSubmit={handleAuth} className="w-full space-y-5">
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={x => setEmail(x.target.value)} 
              className="w-full bg-transparent text-white outline-none font-medium" 
              required 
            />
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-3xl border border-[#333] shadow-inner">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={x => setPassword(x.target.value)} 
              className="w-full bg-transparent text-white outline-none font-medium" 
              required 
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-xs text-center font-bold bg-red-950/20 py-2 rounded-lg border border-red-900/50">
              {error}
            </p>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg shadow-lg active:scale-95 transition-all flex justify-center disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (mode === 'login' ? 'Ouvrir la cave' : 'Créer ma cave privée')}
          </button>
        </form>
        
        <button 
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
          className="mt-12 text-slate-400 text-sm font-medium hover:text-[#D4AF37] transition-colors"
        >
          {mode === 'login' ? "Nouveau membre ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
}