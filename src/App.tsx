/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  Settings, 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  Users, 
  Zap, 
  ShieldAlert,
  ArrowLeft,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
}

interface Team {
  name: string;
  score: number;
  color: string;
}

type GameState = 'START' | 'PLAYING' | 'RESULT' | 'EDITOR';

// --- Constants ---
const DEFAULT_QUESTIONS: Question[] = [
  { id: '1', text: 'Thủ đô của Việt Nam là gì?', options: ['TP. Hồ Chí Minh', 'Đà Nẵng', 'Hà Nội', 'Huế'], correctIndex: 2, points: 100 },
  { id: '2', text: 'Sông nào dài nhất thế giới?', options: ['Sông Nile', 'Sông Amazon', 'Sông Mê Kông', 'Sông Hồng'], correctIndex: 0, points: 100 },
  { id: '3', text: 'Hành tinh nào gần Mặt Trời nhất?', options: ['Trái Đất', 'Sao Thủy', 'Sao Kim', 'Sao Hỏa'], correctIndex: 1, points: 100 },
  { id: '4', text: 'Ai là tác giả của Truyện Kiều?', options: ['Nguyễn Trãi', 'Nguyễn Du', 'Chu Văn An', 'Hồ Xuân Hương'], correctIndex: 1, points: 100 },
  { id: '5', text: 'Công thức hóa học của nước là gì?', options: ['CO2', 'H2SO4', 'H2O', 'NaCl'], correctIndex: 2, points: 100 },
];

const SPECIAL_EVENTS = [
  { type: 'STEAL', label: 'Cướp điểm!', description: 'Trả lời đúng sẽ cướp 50 điểm từ đối thủ!', icon: <ShieldAlert className="w-6 h-6" /> },
  { type: 'DOUBLE', label: 'Nhân đôi!', description: 'Câu hỏi này được x2 điểm!', icon: <Zap className="w-6 h-6" /> },
  { type: 'LUCKY', label: 'May mắn!', description: 'Nhận ngay 50 điểm thưởng!', icon: <Trophy className="w-6 h-6" /> },
];

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>('START');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [teams, setTeams] = useState<Team[]>([
    { name: 'Đội Đỏ', score: 0, color: 'bg-red-500' },
    { name: 'Đội Xanh', score: 0, color: 'bg-blue-500' }
  ]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [activeEvent, setActiveEvent] = useState<typeof SPECIAL_EVENTS[0] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // --- Audio Refs (Mocking for now, but structure is there) ---
  const playSound = (type: 'correct' | 'wrong' | 'click' | 'win' | 'tick') => {
    if (!soundEnabled) return;
    // In a real app, we'd use new Audio('/sounds/correct.mp3').play()
    console.log(`Playing sound: ${type}`);
  };

  // --- Initialization ---
  useEffect(() => {
    const saved = localStorage.getItem('arena_questions');
    if (saved) {
      setQuestions(JSON.parse(saved));
    } else {
      setQuestions(DEFAULT_QUESTIONS);
    }
  }, []);

  // --- Timer Logic ---
  useEffect(() => {
    let timer: number;
    if (isTimerActive && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
        if (timeLeft <= 5) playSound('tick');
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      handleAnswer(-1); // Timeout
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  // --- Game Actions ---
  const startGame = () => {
    if (questions.length === 0) {
      alert('Vui lòng thêm câu hỏi trước khi bắt đầu!');
      return;
    }
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
    setCurrentQuestionIndex(0);
    setCurrentTeamIndex(0);
    setGameState('PLAYING');
    nextTurn();
  };

  const nextTurn = () => {
    setSelectedOption(null);
    setShowFeedback(null);
    setTimeLeft(30);
    setIsTimerActive(true);
    
    // Random special event (15% chance)
    if (Math.random() < 0.15) {
      const event = SPECIAL_EVENTS[Math.floor(Math.random() * SPECIAL_EVENTS.length)];
      setActiveEvent(event);
      if (event.type === 'LUCKY') {
        setTeams(prev => {
          const newTeams = [...prev];
          newTeams[currentTeamIndex].score += 50;
          return newTeams;
        });
      }
    } else {
      setActiveEvent(null);
    }
  };

  const handleAnswer = (index: number) => {
    if (selectedOption !== null || showFeedback !== null) return;
    
    setIsTimerActive(false);
    setSelectedOption(index);
    
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = index === currentQ.correctIndex;
    
    setTimeout(() => {
      if (isCorrect) {
        playSound('correct');
        setShowFeedback('CORRECT');
        setTeams(prev => {
          const newTeams = [...prev];
          let pointsToAdd = currentQ.points;
          
          if (activeEvent?.type === 'DOUBLE') pointsToAdd *= 2;
          if (activeEvent?.type === 'STEAL') {
            const otherIndex = currentTeamIndex === 0 ? 1 : 0;
            const stolen = Math.min(newTeams[otherIndex].score, 50);
            newTeams[otherIndex].score -= stolen;
            pointsToAdd += stolen;
          }
          
          newTeams[currentTeamIndex].score += pointsToAdd;
          return newTeams;
        });
      } else {
        playSound('wrong');
        setShowFeedback('WRONG');
      }

      // Wait and move to next
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setCurrentTeamIndex(prev => (prev === 0 ? 1 : 0));
          nextTurn();
        } else {
          playSound('win');
          setGameState('RESULT');
        }
      }, 2000);
    }, 500);
  };

  // --- Editor Actions ---
  const saveQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    localStorage.setItem('arena_questions', JSON.stringify(newQuestions));
  };

  // --- Render Helpers ---
  const renderStart = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-12"
      >
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
          <Trophy className="w-24 h-24 mx-auto mb-4 text-yellow-400 drop-shadow-lg" />
          <h1 className="text-6xl font-black tracking-tighter mb-2 uppercase italic">Đấu Trường</h1>
          <h2 className="text-4xl font-bold tracking-tight text-pink-400 uppercase">Trí Tuệ</h2>
          <p className="mt-4 text-white/70 font-medium">Game đối kháng kiến thức dành cho lớp học</p>
        </div>
      </motion.div>

      <div className="flex gap-6 mb-12">
        {teams.map((team, idx) => (
          <div key={idx} className={`p-6 rounded-2xl ${team.color} shadow-xl w-48 border-4 border-white/20`}>
            <Users className="w-10 h-10 mx-auto mb-2" />
            <input 
              type="text" 
              value={team.name}
              onChange={(e) => setTeams(prev => {
                const n = [...prev];
                n[idx].name = e.target.value;
                return n;
              })}
              className="bg-transparent border-b border-white/30 text-center font-bold text-xl w-full focus:outline-none focus:border-white"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button 
          onClick={startGame}
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-black py-4 px-8 rounded-full text-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <Play className="fill-current" /> BẮT ĐẦU CHƠI
        </button>
        <button 
          onClick={() => setGameState('EDITOR')}
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full transition-all border border-white/20"
        >
          <Settings className="w-5 h-5" /> CHỈNH SỬA CÂU HỎI
        </button>
      </div>
      
      <button 
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute bottom-8 right-8 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
      </button>
    </div>
  );

  const renderGame = () => {
    const q = questions[currentQuestionIndex];
    const currentTeam = teams[currentTeamIndex];

    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col">
        {/* Header: Scoreboard */}
        <div className="flex justify-between items-center mb-8 gap-4">
          {teams.map((team, idx) => (
            <motion.div 
              key={idx}
              animate={{ scale: currentTeamIndex === idx ? 1.05 : 1, opacity: currentTeamIndex === idx ? 1 : 0.7 }}
              className={`flex-1 p-4 rounded-2xl ${team.color} flex items-center justify-between shadow-lg border-4 ${currentTeamIndex === idx ? 'border-white' : 'border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <span className="font-black text-xl uppercase truncate max-w-[120px]">{team.name}</span>
              </div>
              <span className="text-4xl font-black">{team.score}</span>
            </motion.div>
          ))}
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
          {/* Event Banner */}
          <AnimatePresence>
            {activeEvent && (
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black flex items-center gap-2 mb-6 shadow-xl"
              >
                {activeEvent.icon}
                <span>{activeEvent.label}: {activeEvent.description}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question Card */}
          <div className="w-full bg-white text-slate-900 p-10 rounded-[2.5rem] shadow-2xl mb-8 relative overflow-hidden border-b-8 border-slate-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex justify-between items-start mb-6">
              <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full font-bold text-sm">
                CÂU HỎI {currentQuestionIndex + 1}/{questions.length}
              </span>
              <div className={`flex items-center gap-2 font-black text-2xl ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                <Timer className="w-6 h-6" />
                {timeLeft}s
              </div>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-center leading-tight">
              {q.text}
            </h3>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {q.options.map((opt, idx) => {
              let btnClass = "bg-white/10 hover:bg-white/20 border-white/10";
              if (selectedOption === idx) btnClass = "bg-indigo-500 border-indigo-400 scale-95";
              if (showFeedback === 'CORRECT' && idx === q.correctIndex) btnClass = "bg-green-500 border-green-400 scale-105";
              if (showFeedback === 'WRONG' && idx === selectedOption) btnClass = "bg-red-500 border-red-400";
              if (showFeedback === 'WRONG' && idx === q.correctIndex) btnClass = "bg-green-500 border-green-400";

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedOption !== null}
                  className={`p-6 rounded-2xl border-4 text-left text-xl font-bold transition-all flex items-center gap-4 ${btnClass}`}
                >
                  <span className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-lg text-sm font-black">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Overlay */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className={`p-12 rounded-full bg-white shadow-2xl flex flex-col items-center border-8 ${showFeedback === 'CORRECT' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                {showFeedback === 'CORRECT' ? <CheckCircle2 className="w-32 h-32" /> : <XCircle className="w-32 h-32" />}
                <span className="text-4xl font-black mt-4 uppercase">
                  {showFeedback === 'CORRECT' ? 'CHÍNH XÁC!' : 'SAI RỒI!'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderResult = () => {
    const winner = teams[0].score > teams[1].score ? teams[0] : teams[1].score > teams[0].score ? teams[1] : null;
    
    return (
      <div className="min-h-screen bg-indigo-950 text-white p-6 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl max-w-2xl w-full"
        >
          <Trophy className="w-32 h-32 mx-auto mb-6 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
          <h2 className="text-5xl font-black mb-2 uppercase italic">KẾT THÚC TRẬN ĐẤU</h2>
          
          <div className="my-10 space-y-4">
            {winner ? (
              <>
                <p className="text-2xl font-medium text-white/70">Người chiến thắng là:</p>
                <div className={`inline-block px-10 py-4 rounded-2xl ${winner.color} text-4xl font-black shadow-xl`}>
                  {winner.name}
                </div>
              </>
            ) : (
              <div className="text-4xl font-black text-yellow-400">HÒA NHAU!</div>
            )}
          </div>

          <div className="flex justify-center gap-12 mb-12">
            {teams.map((t, i) => (
              <div key={i}>
                <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">{t.name}</p>
                <p className="text-5xl font-black">{t.score}</p>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setGameState('START')}
            className="flex items-center justify-center gap-2 bg-white text-indigo-900 font-black py-4 px-10 rounded-full text-2xl hover:bg-indigo-100 transition-all w-full"
          >
            <RotateCcw /> CHƠI LẠI
          </button>
        </motion.div>
      </div>
    );
  };

  const renderEditor = () => {
    const [editList, setEditList] = useState<Question[]>(questions);

    const addQuestion = () => {
      const newQ: Question = {
        id: Date.now().toString(),
        text: 'Câu hỏi mới?',
        options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
        correctIndex: 0,
        points: 100
      };
      setEditList([...editList, newQ]);
    };

    const updateQ = (id: string, field: keyof Question, value: any) => {
      setEditList(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOpt = (qId: string, optIdx: number, val: string) => {
      setEditList(prev => prev.map(q => {
        if (q.id === qId) {
          const newOpts = [...q.options];
          newOpts[optIdx] = val;
          return { ...q, options: newOpts };
        }
        return q;
      }));
    };

    const removeQ = (id: string) => {
      setEditList(prev => prev.filter(q => q.id !== id));
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setGameState('START')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold">
              <ArrowLeft /> QUAY LẠI
            </button>
            <h2 className="text-3xl font-black text-indigo-600">QUẢN LÝ CÂU HỎI</h2>
            <button 
              onClick={() => {
                saveQuestions(editList);
                setGameState('START');
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-700 shadow-lg"
            >
              <Save className="w-5 h-5" /> LƯU TẤT CẢ
            </button>
          </div>

          <div className="space-y-6">
            {editList.map((q, qIdx) => (
              <div key={q.id} className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 relative group">
                <button 
                  onClick={() => removeQ(q.id)}
                  className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                
                <div className="mb-4">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Câu hỏi {qIdx + 1}</label>
                  <textarea 
                    value={q.text}
                    onChange={(e) => updateQ(q.id, 'text', e.target.value)}
                    className="w-full text-xl font-bold p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name={`correct-${q.id}`} 
                        checked={q.correctIndex === oIdx}
                        onChange={() => updateQ(q.id, 'correctIndex', oIdx)}
                        className="w-5 h-5 accent-indigo-600"
                      />
                      <input 
                        type="text" 
                        value={opt}
                        onChange={(e) => updateOpt(q.id, oIdx, e.target.value)}
                        className={`flex-1 p-3 rounded-xl border-2 outline-none transition-all ${q.correctIndex === oIdx ? 'bg-indigo-50 border-indigo-200 font-bold' : 'bg-slate-50 border-transparent focus:border-slate-200'}`}
                        placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button 
              onClick={addQuestion}
              className="w-full py-6 border-4 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-10 h-10" />
              THÊM CÂU HỎI MỚI
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  switch (gameState) {
    case 'PLAYING': return renderGame();
    case 'RESULT': return renderResult();
    case 'EDITOR': return renderEditor();
    default: return renderStart();
  }
}
