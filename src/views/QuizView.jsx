// src/views/QuizView.jsx
import React, { useState } from 'react';
import { ChevronLeft, Gamepad2, Trophy } from 'lucide-react';
import { allQuestions } from '../constants/questions';

export default function QuizView({ ctx }) {
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'playing' | 'end'
  const [currentQuiz, setCurrentQuiz] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); 

  const startGame = () => { 
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    setCurrentQuiz(shuffled.slice(0, 4)); 
    setScore(0); 
    setQIndex(0); 
    setFeedback(null); 
    setGameState('playing'); 
  };

  const handleAnswer = (option) => {
    if (feedback) return;
    const correct = option === currentQuiz[qIndex].ans;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? 'correct' : 'wrong');
    
    setTimeout(() => { 
      setFeedback(null); 
      if (qIndex + 1 < currentQuiz.length) {
        setQIndex(i => i + 1);
      } else {
        setGameState('end');
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] pb-20 select-none">
      <div className="bg-[#1a1a1a] pt-12 pb-4 px-6 shadow-sm z-10 sticky top-0 flex items-center border-b border-[#333]">
        <button onClick={() => ctx.setView('home')} className="mr-4 p-2 bg-[#0a0a0a] border border-[#333] text-slate-400 rounded-full hover:text-[#D4AF37]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37]">Le Nez du Sommelier</h1>
          <p className="text-slate-500 text-xs mt-1">Défiez vos connaissances</p>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-[#1A1A1A] border border-[#333] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          
          {gameState === 'idle' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center mx-auto">
                <Gamepad2 className="w-10 h-10 text-[#D4AF37]"/>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#F5F5F5]">Prêt à jouer ?</h3>
              <p className="text-slate-400 font-medium">4 questions aléatoires pour tester votre palais.</p>
              <button onClick={startGame} className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl shadow-lg hover:bg-[#AA7C11]">
                Démarrer le Quiz
              </button>
            </div>
          )}

          {gameState === 'playing' && currentQuiz.length > 0 && currentQuiz[qIndex] && (
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-xl border border-[#333]">
                <span className="text-xs font-bold text-[#D4AF37] uppercase">Question {qIndex + 1}/{currentQuiz.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Score : {score}</span>
              </div>
              <p className="font-serif text-xl font-bold text-[#F5F5F5] min-h-[80px] leading-snug">
                {currentQuiz[qIndex].q}
              </p>
              <div className="space-y-3">
                {currentQuiz[qIndex].options.map(opt => {
                  let btnClass = "bg-[#0a0a0a] border-[#333] text-slate-300 hover:border-[#D4AF37]/50";
                  if (feedback && opt === currentQuiz[qIndex].ans) btnClass = "bg-emerald-900 border-emerald-500 text-white";
                  else if (feedback === 'wrong' && opt !== currentQuiz[qIndex].ans) btnClass = "bg-[#0a0a0a] border-[#333] text-slate-600 opacity-50";
                  
                  return (
                    <button 
                      key={opt} 
                      onClick={() => handleAnswer(opt)} 
                      className={`w-full p-5 rounded-2xl border flex items-center font-bold text-left transition-all ${btnClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {gameState === 'end' && (
            <div className="text-center space-y-6 relative z-10 py-4">
              <div className="w-20 h-20 bg-emerald-900/30 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-emerald-400"/>
              </div>
              <h3 className="font-serif text-3xl font-bold text-[#F5F5F5]">Terminé !</h3>
              <p className="text-2xl font-black text-emerald-400">{score} / {currentQuiz.length}</p>
              <div className="flex space-x-3">
                <button onClick={startGame} className="flex-1 py-4 bg-[#D4AF37] text-black font-bold rounded-2xl hover:bg-[#AA7C11]">Rejouer</button>
                <button onClick={() => ctx.setView('home')} className="flex-1 py-4 bg-[#0a0a0a] border border-[#333] text-slate-300 font-bold rounded-2xl">Quitter</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}