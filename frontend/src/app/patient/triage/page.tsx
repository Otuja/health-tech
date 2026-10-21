"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send, User, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { authFetch } from "@/lib/api";

export default function AITriage() {
  const [messages, setMessages] = useState([
    { 
      role: "ai", 
      text: "Hello! I am your HealthTech Clinical Assistant. Please describe your symptoms in detail (duration, severity, triggers), and I will provide an automated clinical assessment." 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch("/api/triage/analyze/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ symptoms: userMessage })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: "ai", text: data.analysis }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.error || "An error occurred during symptom processing." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Failed to connect to the medical AI service. Please ensure connectivity." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto"
    >
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
            AI Clinical Symptom Triage
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            Initial diagnostic guidance and specialty recommendations powered by medical AI.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold w-fit">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Interactive Health Assistant</span>
        </div>
      </header>

      {/* Medical Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 mb-4 text-xs text-amber-900 flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Clinical Disclaimer:</strong> This automated tool assists with symptom classification and does not replace in-person physician evaluation. In severe emergencies, call 112 / 911 immediately.
        </span>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx} 
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200/80 text-slate-800 shadow-sm rounded-tl-none whitespace-pre-wrap'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 text-slate-800 shadow-sm rounded-2xl rounded-tl-none p-3.5 flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 mr-1 font-medium">Analyzing symptoms</span>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-75" style={{animationDelay: '150ms'}}></div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-150" style={{animationDelay: '300ms'}}></div>
              </div>
            </motion.div>
          )}

          <div ref={endOfMessagesRef} />
        </div>

        {/* Suggested Quick Starters */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
          <span className="text-slate-400 self-center">Suggestions:</span>
          {[
            "Occasional chest flutter and mild fatigue",
            "Persistent dry cough with morning wheezing",
            "Sudden throbbing headache with light sensitivity"
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendPrompt(prompt)}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg border border-slate-200 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your symptoms in detail (e.g., headache for 2 days)..."
              className="flex-1 bg-slate-50 border border-slate-300 focus:bg-white rounded-2xl px-5 py-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </motion.div>
  );
}
