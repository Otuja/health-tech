"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  AlertTriangle,
  Stethoscope,
  Calendar,
  CheckCircle2,
  Video,
  ShieldCheck,
  Plus,
  Trash2,
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Apple,
  Pill,
  Heart,
  Activity
} from "lucide-react";
import { authFetch } from "@/lib/api";
import { toast } from "sonner";

interface RecommendedDoctor {
  id: number;
  username: string;
  name: string;
  specialization: string;
  available_slot_id: number | null;
  slot_start_time: string | null;
  slot_display_time: string | null;
}

interface TriageRouting {
  is_emergency: boolean;
  emergency_reason?: string;
  urgency: string;
  specialty: string;
  recommended_doctor: RecommendedDoctor | null;
}

interface MessageItem {
  role: "user" | "ai";
  text: string;
  category?: string;
  routing?: TriageRouting | null;
  bookingStatus?: "unbooked" | "booking" | "booked";
  appointmentId?: number;
}

interface SessionSummary {
  id: string;
  title: string;
  category: string;
  urgency: string;
  is_emergency: boolean;
  message_count: number;
  preview: string;
  updated_at: string;
}

const INITIAL_GREETING: MessageItem = { 
  role: "ai", 
  category: "GENERAL_HEALTH",
  text: "Hello! I am your **HealthTech Clinical & Wellness AI Assistant**.\n\nI can help you with:\n- **Nutritional & Dietary Guidance:** Ask about foods (like eba, amala, rice), balanced portions, and meal choices for your health.\n- **Clinical Symptom Assessment:** Describe any physical discomfort, duration, or triggers for triage and home remedies.\n- **Medications & Preventive Health:** Questions on vitamins, sleep hygiene, or blood pressure.\n\nHow can I support your health and well-being today?"
};

export default function AITriage() {
  const [messages, setMessages] = useState<MessageItem[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [lastSubmittedSymptoms, setLastSubmittedSymptoms] = useState("");
  
  // Sessions & History
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>("New Consultation");
  const [showSidebar, setShowSidebar] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, isStreaming, scrollToBottom]);

  // Clean up typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Fetch saved sessions on mount
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await authFetch("/api/triage/sessions/");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStartNewSession = () => {
    if (loading || isStreaming) return;
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    setCurrentSessionId(null);
    setCurrentSessionTitle("New Consultation");
    setMessages([INITIAL_GREETING]);
    setShowSidebar(false);
  };

  const handleSelectSession = async (session: SessionSummary) => {
    if (loading || isStreaming) return;
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    setCurrentSessionId(session.id);
    setCurrentSessionTitle(session.title);
    setShowSidebar(false);

    try {
      const res = await authFetch(`/api/triage/sessions/${session.id}/`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: { role: "user" | "ai"; text: string; routing?: TriageRouting }) => ({
            role: m.role,
            text: m.text,
            routing: m.routing
          })));
        } else {
          setMessages([INITIAL_GREETING]);
        }
      }
    } catch {
      toast.error("Failed to load conversation history.");
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/triage/sessions/${sessionId}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Consultation history erased under NDPR privacy regulations.");
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          handleStartNewSession();
        }
      } else {
        toast.error("Unable to delete session.");
      }
    } catch {
      toast.error("Network error deleting session.");
    }
  };

  const handleSendPrompt = (prompt: string) => {
    if (loading || isStreaming) return;
    setInput(prompt);
  };

  const streamAIMessage = (fullText: string, routing?: TriageRouting | null, category?: string) => {
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: "ai", text: "", routing, category }]);

    let currentIndex = 0;
    const chunkSize = 5;
    const tickMs = 12;

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    typingIntervalRef.current = setInterval(() => {
      currentIndex += chunkSize;

      if (currentIndex >= fullText.length) {
        // Complete streaming
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { 
              role: "ai", 
              text: fullText, 
              routing,
              category
            };
          }
          return updated;
        });
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsStreaming(false);
      } else {
        const partial = fullText.slice(0, currentIndex);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { 
              role: "ai", 
              text: partial, 
              routing,
              category
            };
          }
          return updated;
        });
      }
      scrollToBottom();
    }, tickMs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isStreaming) return;

    const userMessage = input.trim();
    setLastSubmittedSymptoms(userMessage);
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch("/api/triage/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          message: userMessage,
          session_id: currentSessionId
        })
      });
      
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.analysis) {
        if (!currentSessionId && data.session_id) {
          setCurrentSessionId(data.session_id);
          setCurrentSessionTitle(data.session_title || "Consultation");
          fetchSessions();
        }
        streamAIMessage(data.analysis, data.routing || null, data.category);
      } else {
        const errorMsg = data.error || "An error occurred while evaluating your inquiry. Please try again.";
        streamAIMessage(errorMsg, null);
      }
    } catch {
      setLoading(false);
      streamAIMessage("Failed to connect to the clinical service. Please verify your connection.", null);
    }
  };

  // 1-Click Direct Booking from Chat Card
  const handleQuickBook = async (msgIndex: number, slotId: number, docName: string) => {
    setBookingSlotId(slotId);
    const toastId = toast.loading(`Reserving clinical consultation with Dr. ${docName}...`);
    try {
      const res = await authFetch(`/api/appointments/slots/${slotId}/book/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: `HealthTech AI Referral: ${lastSubmittedSymptoms || "Clinical assessment referral"}`
        })
      });

      if (res.ok) {
        const apptData = await res.json();
        toast.success(`Priority consultation confirmed with Dr. ${docName}!`, { id: toastId });
        setMessages(prev => {
          const updated = [...prev];
          if (updated[msgIndex]) {
            updated[msgIndex] = {
              ...updated[msgIndex],
              bookingStatus: "booked",
              appointmentId: apptData.id
            };
          }
          return updated;
        });
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Unable to reserve this slot. Please select another time.", { id: toastId });
      }
    } catch {
      toast.error("Network error reserving appointment.", { id: toastId });
    } finally {
      setBookingSlotId(null);
    }
  };

  // Helper to parse and render Markdown text without raw asterisks
  const renderFormattedMessage = (text: string, isCurrentlyTyping: boolean) => {
    const lines = text.split('\n');

    return (
      <div className="space-y-1.5 text-xs sm:text-sm text-slate-800 leading-relaxed">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lIdx} className="h-1.5" />;
          }

          // Section Headings: ### or ## or ####
          if (trimmed.startsWith('#### ')) {
            const headingText = trimmed.replace(/^#{4}\s*/, '').replace(/\*/g, '');
            return (
              <h5 key={lIdx} className="font-bold text-slate-800 text-xs sm:text-xs uppercase tracking-wider mt-2.5 mb-1 text-emerald-800">
                {headingText}
              </h5>
            );
          }

          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const headingText = trimmed.replace(/^#{2,3}\s*/, '').replace(/\*/g, '');
            return (
              <h4 key={lIdx} className="font-bold text-slate-900 text-xs sm:text-sm mt-3 mb-1 flex items-center gap-1.5 text-emerald-950 font-heading">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span>{headingText}</span>
              </h4>
            );
          }

          // List item: * or -
          if (/^[\*\-]\s+/.test(trimmed)) {
            const itemText = trimmed.replace(/^[\*\-]\s+/, '');
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  {parseInlineFormatting(itemText)}
                </div>
              </div>
            );
          }

          // Numbered list item: 1. or 2.
          if (/^\d+\.\s+/.test(trimmed)) {
            const numberMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
            if (numberMatch) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
                  <span className="font-bold text-emerald-700 text-xs flex-shrink-0">{numberMatch[1]}</span>
                  <div className="flex-1">
                    {parseInlineFormatting(numberMatch[2])}
                  </div>
                </div>
              );
            }
          }

          // Horizontal rule: ---
          if (trimmed === '---') {
            return <hr key={lIdx} className="border-slate-200 my-2.5" />;
          }

          // Regular paragraph
          return (
            <p key={lIdx} className="my-0.5">
              {parseInlineFormatting(trimmed)}
            </p>
          );
        })}

        {/* Live typing cursor */}
        {isCurrentlyTyping && (
          <span className="inline-block w-2 h-4 bg-emerald-600 animate-pulse ml-0.5 rounded-xs align-middle" />
        )}
      </div>
    );
  };

  // Parses bold (**text**), italics (*text*), and strips unwanted stray asterisks
  const parseInlineFormatting = (str: string) => {
    const boldRegex = /\*\*(.+?)\*\*/g;
    const parts: { type: 'text' | 'bold', content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: str.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'bold', content: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) {
      parts.push({ type: 'text', content: str.slice(lastIndex) });
    }

    return parts.map((part, pIdx) => {
      if (part.type === 'bold') {
        return (
          <strong key={pIdx} className="font-bold text-slate-900">
            {part.content.replace(/\*/g, '')}
          </strong>
        );
      }

      // Check for italic (*text*) inside plain text
      const italicRegex = /\*([^\*]+)\*/g;
      const subNodes: React.ReactNode[] = [];
      let subLastIndex = 0;
      let itMatch;

      while ((itMatch = italicRegex.exec(part.content)) !== null) {
        if (itMatch.index > subLastIndex) {
          subNodes.push(part.content.slice(subLastIndex, itMatch.index).replace(/\*/g, ''));
        }
        subNodes.push(
          <em key={`it-${pIdx}-${subLastIndex}`} className="italic text-slate-600">
            {itMatch[1].replace(/\*/g, '')}
          </em>
        );
        subLastIndex = itMatch.index + itMatch[0].length;
      }
      if (subLastIndex < part.content.length) {
        subNodes.push(part.content.slice(subLastIndex).replace(/\*/g, ''));
      }

      return <span key={pIdx}>{subNodes}</span>;
    });
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case "NUTRITION_DIET":
        return { label: "Nutrition & Diet", icon: Apple, color: "bg-amber-100 text-amber-800 border-amber-300" };
      case "MEDICATION_INQUIRY":
        return { label: "Medications", icon: Pill, color: "bg-blue-100 text-blue-800 border-blue-300" };
      case "LIFESTYLE_WELLNESS":
        return { label: "Wellness", icon: Heart, color: "bg-teal-100 text-teal-800 border-teal-300" };
      case "CLINICAL_TRIAGE":
        return { label: "Clinical Triage", icon: Activity, color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      default:
        return { label: "Clinical Guidance", icon: Sparkles, color: "bg-slate-100 text-slate-800 border-slate-300" };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[calc(100dvh-13.5rem)] md:h-[calc(100vh-8rem)] max-w-5xl mx-auto"
    >
      <header className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span>AI Health & Clinical Assistant</span>
          </h1>
          <p className="text-slate-600 text-[11px] sm:text-xs mt-0.5">
            Personalized medical guidance, nutritional advice, and clinical triage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* History Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSidebar(!showSidebar)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Consultation History</span>
            <span className="sm:hidden">History</span>
            {sessions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {sessions.length}
              </span>
            )}
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleStartNewSession}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Consultation</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Main Container with Sidebar + Chat Area */}
      <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 flex overflow-hidden min-h-0 relative">
        
        {/* Sessions History Drawer / Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute sm:relative z-30 inset-y-0 left-0 w-72 bg-slate-50 border-r border-slate-200 flex flex-col shadow-lg sm:shadow-none"
            >
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>Saved Consultations</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Sessions list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {loadingSessions ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">Loading history...</p>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-4 text-slate-400">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">No previous sessions</p>
                    <p className="text-[10px] mt-0.5">Your clinical and dietary consultations will be saved here automatically.</p>
                  </div>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-1.5 ${
                        currentSessionId === s.id
                          ? "bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-2xs"
                          : "bg-white border-slate-200/80 hover:bg-slate-100/60 text-slate-700"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 truncate">
                            {s.category === "NUTRITION_DIET" ? "🍲 Nutrition" : s.category === "CLINICAL_TRIAGE" ? "🩺 Triage" : s.category === "MEDICATION_INQUIRY" ? "💊 Meds" : "🌿 Wellness"}
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate text-slate-900">
                          {s.title}
                        </p>
                        {s.preview && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {s.preview}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete Consultation (NDPR Erasure)"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Compliance Footer */}
              <div className="p-2.5 border-t border-slate-200 bg-white/60 text-[10px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>NDPR & HIPAA Privacy Compliant Storage</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          
          {/* Header Bar inside Chat */}
          <div className="px-3 sm:px-4 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-800 truncate">
                {currentSessionTitle}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Google Gemini Clinical Engine Active</span>
              <span className="sm:hidden">Gemini AI</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40">
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

                <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none shadow-sm' 
                    : 'bg-white border border-slate-200/80 text-slate-800 shadow-sm rounded-tl-none'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <>
                      {/* Category Badge for AI Message */}
                      {msg.category && msg.category !== "GENERAL_HEALTH" && (() => {
                        const badge = getCategoryBadge(msg.category);
                        const Icon = badge.icon;
                        return (
                          <div className="mb-2 flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                              <Icon className="w-3 h-3" />
                              <span>{badge.label}</span>
                            </span>
                          </div>
                        );
                      })()}

                      {renderFormattedMessage(
                        msg.text, 
                        Boolean(isStreaming && idx === messages.length - 1)
                      )}

                      {/* SMART CLINICAL ACTION & FAST-TRACK BOOKING CARD */}
                      {msg.routing && !Boolean(isStreaming && idx === messages.length - 1) && (() => {
                        const isEmergency = Boolean(msg.routing.is_emergency);
                        const flagReason = msg.routing.emergency_reason || "Immediate Medical Attention Required";

                        return (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/80">
                            {isEmergency ? (
                              <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-950 space-y-2.5 shadow-sm">
                                <div className="flex items-start gap-2.5">
                                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
                                  <div>
                                    <span className="font-bold text-xs uppercase tracking-wider text-red-700 block">
                                      🚨 Critical Clinical Red Flag: {flagReason}
                                    </span>
                                    <p className="text-xs text-red-900 mt-0.5 leading-relaxed font-medium">
                                      Symptoms such as acute chest pain, coughing blood, severe trauma, or stroke signs warrant immediate clinical action. Please call emergency services (112 / 911) or visit the nearest emergency trauma center immediately.
                                    </p>
                                  </div>
                                </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Link
                                  href="/patient/emergency"
                                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/20"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Open Emergency Vitals Pass</span>
                                </Link>

                                {msg.routing.recommended_doctor?.available_slot_id && (
                                  msg.bookingStatus === "booked" ? (
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Priority Visit Booked</span>
                                      </span>
                                      {msg.appointmentId && (
                                        <Link
                                          href={`/consultation/${msg.appointmentId}`}
                                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1"
                                        >
                                          <Video className="w-3.5 h-3.5" />
                                          <span>Enter Video Room</span>
                                        </Link>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={bookingSlotId === msg.routing.recommended_doctor.available_slot_id}
                                      onClick={() => handleQuickBook(
                                        idx, 
                                        msg.routing!.recommended_doctor!.available_slot_id!, 
                                        msg.routing!.recommended_doctor!.name
                                      )}
                                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                    >
                                      <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>
                                        {bookingSlotId === msg.routing.recommended_doctor.available_slot_id
                                          ? "Securing Slot..."
                                          : `⚡ Fast-Track Book with Dr. ${msg.routing.recommended_doctor.name}`}
                                      </span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Routine / Common Symptom Guidance Card */
                            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                              <div className="flex items-start gap-2.5">
                                <Stethoscope className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                                    🌿 Doctor Consultation Available
                                  </span>
                                  <p className="font-bold text-xs text-slate-900 mt-0.5">
                                    Dr. {msg.routing.recommended_doctor?.name || "Specialist"} • {msg.routing.recommended_doctor?.specialization || msg.routing.specialty}
                                  </p>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    If symptoms persist for &gt;48 hours or you desire an in-depth clinical consultation, book an appointment below.
                                  </p>
                                  {msg.routing.recommended_doctor?.slot_display_time && (
                                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                      Next Available Slot: <strong>{msg.routing.recommended_doctor.slot_display_time}</strong>
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                {msg.routing.recommended_doctor?.available_slot_id ? (
                                  msg.bookingStatus === "booked" ? (
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Booked</span>
                                      </span>
                                      <Link
                                        href="/patient/appointments"
                                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                                      >
                                        View Appointments
                                      </Link>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={bookingSlotId === msg.routing.recommended_doctor.available_slot_id}
                                      onClick={() => handleQuickBook(
                                        idx, 
                                        msg.routing!.recommended_doctor!.available_slot_id!, 
                                        msg.routing!.recommended_doctor!.name
                                      )}
                                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>
                                        {bookingSlotId === msg.routing.recommended_doctor.available_slot_id
                                          ? "Reserving..."
                                          : `Book with Dr. ${msg.routing.recommended_doctor.name.split(' ')[0]}`}
                                      </span>
                                    </button>
                                  )
                                ) : (
                                  <Link
                                    href="/patient/appointments"
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs whitespace-nowrap"
                                  >
                                    Browse Schedules
                                  </Link>
                                )}
                              </div>
                            </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 text-slate-800 shadow-sm rounded-2xl rounded-tl-none p-3.5 flex items-center space-x-1.5">
                  <span className="text-xs text-slate-500 mr-1 font-medium">Synthesizing clinical & nutritional assessment</span>
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-75" style={{animationDelay: '150ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-150" style={{animationDelay: '300ms'}}></div>
                </div>
              </motion.div>
            )}

            <div ref={endOfMessagesRef} />
          </div>

          {/* Suggested Quick Starters (Diverse: Nutrition, Symptoms, Wellness) */}
          <div className="px-3 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] whitespace-nowrap">
            <span className="text-slate-400 font-semibold flex-shrink-0 pr-1 text-[10px] uppercase tracking-wider">Quick Suggestions:</span>
            {[
              { label: "🍲 I want to eat Eba today, is it healthy?", text: "I want to eat eba today. What should I consider for portion control and healthy soup pairings?" },
              { label: "🩺 Throbbing headache with light sensitivity", text: "I have a throbbing headache with sensitivity to light for the past 6 hours." },
              { label: "🌿 Foods to naturally lower blood pressure", text: "What natural foods and diet habits can help lower my blood pressure?" },
              { label: "💊 Can I take paracetamol and ibuprofen together?", text: "Can I take paracetamol and ibuprofen together for fever and pain?" },
              { label: "🚨 Coughing blood and shortness of breath", text: "I am coughing blood and feeling shortness of breath." }
            ].map((item, i) => (
              <button
                key={i}
                type="button"
                disabled={loading || isStreaming}
                onClick={() => handleSendPrompt(item.text)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 text-slate-700 rounded-lg border border-slate-200/90 transition-colors shadow-2xs disabled:opacity-50 flex-shrink-0 text-[11px] font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-100">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about foods (e.g. eba, diet), symptoms, medications, or wellness..."
                className="flex-1 bg-slate-50 border border-slate-300 focus:bg-white rounded-2xl px-4 py-2.5 sm:py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400 min-w-0"
                disabled={loading || isStreaming}
              />
              <button 
                type="submit" 
                disabled={loading || isStreaming || !input.trim()}
                className="w-11 h-11 sm:w-auto sm:px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20 flex-shrink-0"
                aria-label="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </motion.div>
  );
}
