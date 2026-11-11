import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { ReelComposition } from './ReelComposition';
import { Settings, Play, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function App() {
  const [text, setText] = useState('Create your next viral Reel!');
  const [reader, setReader] = useState('alafasy');
  const [surah, setSurah] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState(7);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage(null);
    setExportStatus('idle');

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reader,
          readerName: reader === 'alafasy' ? 'مشاري راشد العفاسي' : reader,
          surah: Number(surah),
          surah_ar: surah === 1 ? 'الفاتحة' : 'سورة',
          start: Number(startVerse),
          end: Number(endVerse)
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setExportStatus('success');
        setExportMessage(`Video rendered successfully: ${data.file_name}`);
      } else {
        setExportStatus('error');
        setExportMessage(data.message || 'Export failed. Check verse boundaries.');
      }
    } catch (err: any) {
      setExportStatus('error');
      setExportMessage(`Export error: ${err.message || 'Network error'}`);
    } finally {
      setIsExporting(false);
    }
  };

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

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">Reciter</label>
              <select 
                value={reader} 
                onChange={e => setReader(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="alafasy">مشاري راشد العفاسي</option>
                <option value="abdulbaset">عبد الباسط عبد الصمد</option>
                <option value="al-minshawi">محمد صديق المنشاوي</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">Surah</label>
              <select 
                value={surah} 
                onChange={e => setSurah(Number(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>الفاتحة (7 آيات)</option>
                <option value={112}>الإخلاص (4 آيات)</option>
                <option value={113}>الفلق (5 آيات)</option>
                <option value={114}>الناس (6 آيات)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">From Ayah</label>
              <input 
                type="number" 
                min={1} 
                value={startVerse} 
                onChange={e => setStartVerse(Number(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">To Ayah</label>
              <input 
                type="number" 
                min={1} 
                value={endVerse} 
                onChange={e => setEndVerse(Number(e.target.value))}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button className="flex-1 bg-slate-700 hover:bg-slate-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <Play size={20} /> Preview
            </button>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
            >
              {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />} 
              {isExporting ? 'Rendering MP4...' : 'Export Video'}
            </button>
          </div>

          {exportStatus === 'success' && (
            <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-sm">
              <CheckCircle size={18} />
              <span>{exportMessage}</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="mt-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-sm">
              <AlertCircle size={18} />
              <span>{exportMessage}</span>
            </div>
          )}
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
