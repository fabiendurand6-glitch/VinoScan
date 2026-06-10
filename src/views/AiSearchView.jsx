// src/views/AiSearchView.jsx
import React, { useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';

export default function AiSearchView({ ctx }) {
  const [searchTerms, setSearchTerms] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerms.trim()) {
      ctx.searchWineText(searchTerms);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button 
          onClick={() => ctx.setView('scanSelector')} 
          className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Recherche IA</h1>
          <p className="text-slate-500 text-xs mt-1">Interroger la base de données</p>
        </div>
      </div>
      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              autoFocus 
              type="text" 
              value={searchTerms} 
              onChange={e => setSearchTerms(e.target.value)} 
              placeholder="Ex: Château Margaux 2015" 
              className="w-full pl-12 pr-4 py-4 bg-[#1a1a1a] border border-[#333] text-white rounded-2xl outline-none focus:border-[#D4AF37] text-lg transition-colors"
            />
          </div>
          <button 
            type="submit" 
            disabled={!searchTerms.trim()} 
            className="w-full py-4 bg-[#D4AF37] text-black rounded-full font-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 hover:bg-[#AA7C11] transition-all"
          >
            Analyser avec l'IA
          </button>
        </form>
      </div>
    </div>
  );
}