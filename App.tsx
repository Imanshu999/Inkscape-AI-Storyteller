Import React, { useState, useRef, useEffect } from 'react';
import { analyzeImageAndGhostwrite, generateSpeech, reviseStory, continueStory } from './services/gemini';
import { decodeBase64, decodeAudioData } from './utils/audio';
import { StoryState, Genre } from './types';
import ChatBot from './components/ChatBot';

const GENRES: Genre[] = ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror'];
const STORAGE_KEY = 'inkscape_saved_story';

const App: React.FC = () => {
  const [state, setState] = useState<StoryState>({
    image: null,
    paragraphs: [],
    genre: 'Fantasy',
    isAnalyzing: false,
    isNarrating: false,
  });

  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasSavedData, setHasSavedData] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for saved story on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSavedData(true);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setState({
          ...state,
          image: event.target?.result as string,
          paragraphs: [],
        });
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startStory = async () => {
    if (!state.image) return;
    setState(prev => ({ ...prev, isAnalyzing: true }));
    setError(null);

    try {
      const text = await analyzeImageAndGhostwrite(state.image, state.genre);
      setState(prev => ({ ...prev, paragraphs: [text], isAnalyzing: false }));
    } catch (err: any) {
      setError(err.message || "Failed to analyze image.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleRevise = async () => {
    if (!state.image || state.paragraphs.length === 0 || !feedback.trim()) return;
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      const revisedText = await reviseStory(state.image, state.paragraphs[state.paragraphs.length - 1], feedback, state.genre);
      setState(prev => {
        const newParas = [...prev.paragraphs];
        newParas[newParas.length - 1] = revisedText;
        return { ...prev, paragraphs: newParas, isAnalyzing: false };
      });
      setFeedback('');
    } catch (err: any) {
      setError(err.message || "Failed to revise paragraph.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleContinue = async () => {
    if (!state.image || state.paragraphs.length === 0) return;
    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const nextText = await continueStory(state.image, state.paragraphs, state.genre);
      setState(prev => ({ ...prev, paragraphs: [...prev.paragraphs, nextText], isAnalyzing: false }));
    } catch (err: any) {
      setError(err.message || "Failed to continue story.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleNarrate = async () => {
    if (state.paragraphs.length === 0) return;
    setState(prev => ({ ...prev, isNarrating: true }));

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const fullText = state.paragraphs.join(' ');
      const base64Audio = await generateSpeech(fullText);
      const audioBytes = decodeBase64(base64Audio);
      const buffer = await decodeAudioData(audioBytes, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setState(prev => ({ ...prev, isNarrating: false }));
      source.start(0);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate narration.");
      setState(prev => ({ ...prev, isNarrating: false }));
    }
  };

  const handleSave = () => {
    if (!state.image || state.paragraphs.length === 0) return;
    setSaveStatus('saving');
    
    try {
      const dataToSave = {
        image: state.image,
        paragraphs: state.paragraphs,
        genre: state.genre
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      
      setTimeout(() => {
        setSaveStatus('saved');
        setHasSavedData(true);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 600);
    } catch (err) {
      setError("Failed to save to local storage. Maybe the image is too large?");
      setSaveStatus('idle');
    }
  };

  const resumeStory = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setState({
        ...state,
        image: parsed.image,
        paragraphs: parsed.paragraphs,
        genre: parsed.genre
      });
      setError(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-stone-200">
      <nav className="p-6 md:p-10 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-pen-nib text-white"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight">INKSCAPE AI</h1>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-stone-500">
          <a href="#" className="hover:text-stone-900 transition-colors">Gallery</a>
          <a href="#" className="hover:text-stone-900 transition-colors">History</a>
          <a href="#" className="hover:text-stone-900 transition-colors">Settings</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-8">
        
        {/* Left Column: Input */}
        <section className="space-y-6">
          <div 
            className={`relative aspect-[4/5] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-white shadow-sm
              ${state.image ? 'border-transparent' : 'border-stone-200 hover:border-stone-400'}`}
          >
            {state.image ? (
              <>
                <img src={state.image} alt="Story inspiration" className="w-full h-full object-cover" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur text-stone-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
                >
                  <i className="fa-solid fa-rotate"></i>
                </button>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-image text-stone-400 text-3xl"></i>
                </div>
                <h2 className="text-xl font-semibold mb-2">Capture your inspiration</h2>
                <p className="text-stone-500 text-sm max-w-xs mx-auto mb-8">
                  Upload an image to serve as the visual soul of your story.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-stone-900 text-white px-8 py-3 rounded-full font-medium shadow-xl shadow-stone-900/10 hover:bg-stone-800 transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    Select Image
                  </button>
                  {hasSavedData && (
                    <button 
                      onClick={resumeStory}
                      className="text-stone-600 px-8 py-2 text-sm font-medium hover:text-stone-900 transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                      Resume Saved Story
                    </button>
                  )}
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>

          {state.image && (
            <div className="space-y-4 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block">Choose Genre</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => (
                  <button
                    key={g}
                    onClick={() => setState(s => ({ ...s, genre: g }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      state.genre === g 
                        ? 'bg-stone-900 text-white' 
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {state.paragraphs.length === 0 && !state.isAnalyzing && (
                <button
                  onClick={startStory}
                  className="w-full mt-4 bg-stone-900 text-white py-4 rounded-2xl font-semibold shadow-2xl shadow-stone-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
                >
                  <i className="fa-solid fa-sparkles"></i>
                  Write {state.genre} Opening
                </button>
              )}
            </div>
          )}

          {state.isAnalyzing && (
            <div className="w-full bg-stone-100 py-4 rounded-2xl flex items-center justify-center gap-4 text-stone-500 animate-pulse">
              <i className="fa-solid fa-feather animate-bounce"></i>
              <span>Inking the pages...</span>
            </div>
          )}
        </section>

        {/* Right Column: Output */}
        <section className="space-y-8 lg:sticky lg:top-10">
          <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 min-h-[500px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-full -z-0"></div>
            
            <div className="relative z-10 flex-1 flex flex-col">
              <header className="flex justify-between items-center mb-8">
                <span className="text-xs font-bold tracking-widest text-stone-400 uppercase">
                  {state.genre} Manuscript
                </span>
                <div className="flex gap-2">
                  <div className={`w-2 h-2 rounded-full ${state.isNarrating ? 'bg-red-500 animate-pulse' : 'bg-stone-200'}`}></div>
                  <div className="w-2 h-2 rounded-full bg-stone-200"></div>
                </div>
              </header>

              <div className="flex-1 space-y-8 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
                {state.paragraphs.length > 0 ? (
                  state.paragraphs.map((p, i) => (
                    <p key={i} className="serif-font text-2xl md:text-3xl leading-relaxed text-stone-800 italic animate-in fade-in slide-in-from-bottom-2 duration-700">
                      {p}
                    </p>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="mb-6 opacity-10">
                      <i className="fa-solid fa-feather-pointed text-8xl text-stone-900"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-stone-300">The page is waiting...</h3>
                    <p className="text-stone-400 text-sm mt-2">Select a genre and begin your journey.</p>
                  </div>
                )}
              </div>

              {state.paragraphs.length > 0 && (
                <div className="mt-8 border-t border-stone-100 pt-8 space-y-6">
                  {/* Revision Section */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRevise()}
                      placeholder="Feedback (e.g., 'make it darker', 'more detail')"
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                    />
                    <button
                      onClick={handleRevise}
                      disabled={!feedback.trim() || state.isAnalyzing}
                      className="bg-stone-100 text-stone-900 px-6 py-3 rounded-full text-sm font-semibold hover:bg-stone-200 transition-all disabled:opacity-50"
                    >
                      Revise
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center">
                    <button 
                      onClick={handleNarrate}
                      disabled={state.isNarrating}
                      className={`flex items-center gap-3 px-6 py-3 rounded-full font-medium transition-all ${
                        state.isNarrating 
                          ? 'bg-red-50 text-red-500 cursor-not-allowed border border-red-100' 
                          : 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg'
                      }`}
                    >
                      {state.isNarrating ? <i className="fa-solid fa-waveform"></i> : <i className="fa-solid fa-volume-high"></i>}
                      {state.isNarrating ? 'Narrating...' : 'Read Aloud'}
                    </button>

                    <button 
                      onClick={handleContinue}
                      disabled={state.isAnalyzing}
                      className="flex items-center gap-3 px-6 py-3 rounded-full font-medium bg-white border border-stone-200 text-stone-700 hover:border-stone-900 transition-all disabled:opacity-50"
                    >
                      <i className="fa-solid fa-plus-circle"></i>
                      Continue Story
                    </button>

                    <button 
                      onClick={handleSave}
                      disabled={state.isAnalyzing}
                      className={`flex items-center gap-3 px-6 py-3 rounded-full font-medium border transition-all ${
                        saveStatus === 'saved'
                          ? 'bg-green-50 border-green-200 text-green-600'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-900'
                      }`}
                    >
                      {saveStatus === 'saving' ? (
                        <i className="fa-solid fa-circle-notch animate-spin"></i>
                      ) : saveStatus === 'saved' ? (
                        <i className="fa-solid fa-check"></i>
                      ) : (
                        <i className="fa-solid fa-bookmark"></i>
                      )}
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Story'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="absolute bottom-8 left-8 right-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3 animate-in fade-in">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
              </div>
            )}
          </div>
        </section>
      </main>

      <ChatBot storyContext={state.paragraphs.join('\n\n')} />

      <div className="fixed top-0 left-0 w-full h-full -z-50 pointer-events-none opacity-[0.03]">
        <div className="absolute top-[10%] left-[5%] text-[20rem] font-serif">A</div>
        <div className="absolute bottom-[10%] right-[5%] text-[20rem] font-serif">Z</div>
      </div>
    </div>
  );
};

export default App;
