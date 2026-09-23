import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { ReelComposition } from './ReelComposition';
import { Settings, Play, Download } from 'lucide-react';

function App() {
  const [text, setText] = useState('Create your next viral Reel!');

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Reels Maker Studio</h1>
        <p className="text-emerald-400 opacity-90 text-lg">AI-powered Reel Generator</p>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <label className="block text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              <Settings size={20} /> Reel Text
            </label>
            <input 
              type="text" 
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex gap-4 mt-8">
            <button className="flex-1 bg-slate-700 hover:bg-slate-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <Play size={20} /> Preview
            </button>
            <button className="flex-2 bg-emerald-500 hover:bg-emerald-400 text-black p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
              <Download size={20} /> Export Video
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center bg-black/40 rounded-3xl p-6 border border-white/10">
          <div className="w-[300px] h-[533px] shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-800">
            <Player
              component={ReelComposition}
              inputProps={{ text }}
              durationInFrames={150}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={30}
              style={{ width: '100%', height: '100%' }}
              controls
              autoPlay
              loop
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
