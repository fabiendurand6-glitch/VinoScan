// src/views/ManualEntryView.jsx
import React, { useState } from 'react';
import { ChevronLeft, Camera } from 'lucide-react';
import { getGenericImageForType } from '../utils/wineHelpers';

export default function ManualEntryView({ ctx }) {
  const [formData, setFormData] = useState({ 
    nom: '', 
    annee: '', 
    region: '', 
    type_simplifie: 'ROUGE', 
    prix_unitaire_nombre: '' 
  });
  const [localImg, setLocalImg] = useState(null);

  const handleImg = async (e) => {
    const f = e.target.files[0];
    if (f) {
      const r = new FileReader();
      r.onloadend = async () => {
        // Compression de l'image sur le client
        const canvas = document.createElement('canvas'); 
        const img = new window.Image(); 
        img.src = r.result;
        img.onload = () => { 
          let w = img.width;
          let h = img.height; 
          if (w > 800) { 
            h = Math.round((h * 800) / w); 
            w = 800; 
          } 
          canvas.width = w; 
          canvas.height = h; 
          canvas.getContext('2d').drawImage(img, 0, 0, w, h); 
          setLocalImg(canvas.toDataURL('image/jpeg', 0.6)); 
        };
      };
      r.readAsDataURL(f);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nom.trim()) { 
      ctx.showToast("Le nom est obligatoire"); 
      return; 
    }
    ctx.processManualEntry(formData, localImg);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none overflow-y-auto">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button 
          onClick={() => ctx.setView('home')} 
          className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Ajout Manuel</h1>
          <p className="text-slate-500 text-xs mt-1">Saisir une bouteille sans IA</p>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4 mb-10">
          
          <div className="flex justify-center mb-6">
            <label className="relative w-32 h-32 bg-[#1A1A1A] border-2 border-dashed border-[#333] rounded-2xl flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-[#D4AF37]/50 transition-colors">
              {localImg ? ( 
                <img src={localImg} className="w-full h-full object-cover" alt="Vin" /> 
              ) : (
                <>
                  <Camera className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase text-center px-2">Ajouter photo</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImg} />
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom du vin *</label>
            <input 
              required 
              type="text" 
              value={formData.nom} 
              onChange={e => setFormData({...formData, nom: e.target.value})} 
              placeholder="Ex: Château Margaux" 
              className="w-full px-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          <div className="flex space-x-3">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Millésime</label>
              <input 
                type="number" 
                value={formData.annee} 
                onChange={e => setFormData({...formData, annee: e.target.value})} 
                placeholder="Ex: 2018" 
                className="w-full px-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Prix indicatif (€)</label>
              <input 
                type="number" 
                step="0.1" 
                value={formData.prix_unitaire_nombre} 
                onChange={e => setFormData({...formData, prix_unitaire_nombre: e.target.value})} 
                placeholder="Ex: 25" 
                className="w-full px-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Région / Appellation</label>
            <input 
              type="text" 
              value={formData.region} 
              onChange={e => setFormData({...formData, region: e.target.value})} 
              placeholder="Ex: Bordeaux" 
              className="w-full px-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Type de vin</label>
            <select 
              value={formData.type_simplifie} 
              onChange={e => setFormData({...formData, type_simplifie: e.target.value})} 
              className="w-full px-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-xl outline-none focus:border-[#D4AF37] transition-colors appearance-none"
            >
              <option value="ROUGE">Rouge</option>
              <option value="BLANC">Blanc</option>
              <option value="ROSE">Rosé</option>
              <option value="PETILLANT">Pétillant</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="w-full py-5 mt-6 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black rounded-full font-black text-lg shadow-lg active:scale-95 transition-all"
          >
            Ajouter (1 en stock)
          </button>
        </form>
      </div>
    </div>
  );
}