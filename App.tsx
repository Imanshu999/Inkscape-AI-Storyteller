import React, { useState, useEffect, useRef } from 'react';
import { createChatSession } from '../services/gemini';

interface ChatBotProps {
  storyContext: string;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ storyContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hello! I am your storytelling companion. How can I help you refine your tale today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // इनफिनिट लूप रोकने के लिए ref का इस्तेमाल
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // केवल स्टोरी का कॉन्टेक्स्ट बदलने पर ही चैट सेशन एक बार अपडेट होगा
  useEffect(() => {
    const systemInstruction = `You are an expert creative writing assistant for Takano3D's Inkscape AI app. 
    Help the user brainstorm ideas, characters, and descriptions. Here is the current story context:
    """
    ${storyContext || 'No story generated yet.'}
    """`;

    try {
      chatSessionRef.current = createChatSession(systemInstruction);
    } catch (err) {
      console.error("Failed to initialize chat session:", err);
    }
  }, [storyContext]);

  // नए मैसेजेस आने पर ऑटो-स्क्रॉल करने के लिए
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        const systemInstruction = `You are a storytelling assistant. Context: ${storyContext}`;
        chatSessionRef.current = createChatSession(systemInstruction);
      }

      // @google/genai SDK का सही और सुरक्षित सिंटैक्स
      const response = await chatSessionRef.current.sendMessage({
        message: userText
      });

      const aiText = response.text || "I couldn't generate a response.";
      setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* चैट टॉगल बटन */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-comments text-xl"></i>
        </button>
      )}

      {/* चैट विंडो */}
      {isOpen && (
        <div className="w-[350px] sm:w-[400px] h-[500px] bg-white border border-stone-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* हेडर */}
          <header className="bg-stone-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="font-semibold text-sm tracking-wide">Story Companion</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </header>

          {/* मैसेज लिस्ट बॉक्स */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-50/50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                  msg.sender === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 text-stone-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm shadow-sm flex items-center gap-2">
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* इनपुट सेंड बार */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for ideas..."
              className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 bg-stone-900 text-white rounded-full flex items-center justify-center hover:bg-stone-800 transition-colors disabled:opacity-40"
            >
              <i className="fa-solid fa-arrow-up text-sm"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
