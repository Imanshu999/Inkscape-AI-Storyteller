
import React, { useState, useRef, useEffect } from 'react';
import { createChatSession } from '../services/gemini';
import { Message } from '../types';

interface ChatBotProps {
  storyContext: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ storyContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (storyContext) {
      chatRef.current = createChatSession(
        `You are a creative writing assistant. You have access to the opening paragraph of a story: "${storyContext}". 
        Help the user expand this world, answer questions about characters, setting, or plot possibilities based on this text.`
      );
    }
  }, [storyContext]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatRef.current.sendMessage({ message: input });
      const modelMessage: Message = { role: 'model', text: response.text || "I'm not sure what to say." };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'model', text: "Sorry, I hit a snag." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white w-80 md:w-96 h-[500px] shadow-2xl rounded-2xl flex flex-col border border-stone-200 overflow-hidden">
          <div className="bg-stone-900 p-4 text-white flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Inkscape Assistant
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-stone-300 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-stone-400 text-center text-sm py-10">
                Ask me about the world, the characters, or what happens next!
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-stone-900 text-white rounded-tr-none' 
                    : 'bg-stone-100 text-stone-800 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-stone-100 text-stone-400 p-3 rounded-2xl text-xs rounded-tl-none animate-pulse">
                  Assistant is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-stone-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="bg-stone-900 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-stone-800 transition-colors"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-stone-900 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-comment-dots text-xl"></i>
        </button>
      )}
    </div>
  );
};

export default ChatBot;
