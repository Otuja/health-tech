"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  ShieldCheck
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
  routing?: TriageRouting | null;
  bookingStatus?: "unbooked" | "booking" | "booked";
  appointmentId?: number;
}

export default function AITriage() {
  const [messages, setMessages] = useState<MessageItem[]>([
    { 
      role: "ai", 
      text: "Hello! I am your HealthTech Clinical Symptom Triage Assistant. Please describe your symptoms in detail (duration, severity, location, and triggers), and I will provide an automated clinical assessment with direct specialist routing." 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [lastSubmittedSymptoms, setLastSubmittedSymptoms] = useState("");

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

  const handleSendPrompt = (prompt: string) => {
    if (loading || isStreaming) return;
    setInput(prompt);
  };

  const streamAIMessage = (fullText: string, routing?: TriageRouting | null) => {
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: "ai", text: "", routing }]);

    let currentIndex = 0;
    const chunkSize = 4;
    const tickMs = 15;

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
              routing 
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
              routing 
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
      const res = await authFetch("/api/triage/analyze/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ symptoms: userMessage })
      });
      
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.analysis) {
        streamAIMessage(data.analysis, data.routing || null);
      } else {
        const errorMsg = data.error || "An error occurred while evaluating your symptoms. Please try again.";
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
          notes: `AI Triage Fast-Track Booking: ${lastSubmittedSymptoms || "Clinical assessment referral"}`
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

          // Section Headings: ### or ##
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const headingText = trimmed.replace(/^#{2,4}\s*/, '').replace(/\*/g, '');
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[calc(100dvh-13.5rem)] md:h-[calc(100vh-8rem)] max-w-4xl mx-auto"
    >
      <header className="mb-2.5 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-heading">
            AI Clinical Symptom Triage
          </h1>
          <p className="text-slate-600 text-[11px] sm:text-sm mt-0.5">
            Real-time diagnostic assessment with direct physician booking.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-semibold shadow-2xs self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Clinical AI Assistant</span>
        </div>
      </header>

      {/* Medical Safety Protocol Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 mb-2.5 sm:mb-4 text-[11px] sm:text-xs text-amber-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Safety Protocol:</strong> In severe emergencies (severe bleeding, chest pain, stroke, breathlessness), call <strong>112 / 911</strong> immediately.
          </span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden min-h-0">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
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
                  <p>{msg.text}</p>
                ) : (
                  <>
                    {renderFormattedMessage(
                      msg.text, 
                      Boolean(isStreaming && idx === messages.length - 1)
                    )}

                    {/* SMART CLINICAL ACTION & FAST-TRACK BOOKING CARD */}
                    {msg.routing && !Boolean(isStreaming && idx === messages.length - 1) && (() => {
                      const isEmergency = Boolean(
                        msg.routing.is_emergency ||
                        /emergency|critical|life-threatening|serve blead|severe bleed|coughing blood|hemorrhag|chest pain|call 112|call 911/i.test(msg.text)
                      );
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
                                    Symptoms such as severe bleeding, coughing blood, acute chest pain, or trauma warrant immediate clinical action. You can open your paramedic Emergency Pass or fast-track an urgent appointment with our emergency specialist below.
                                  </p>
                                </div>
                              </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {/* Paramedic Emergency Pass Button */}
                              <Link
                                href="/patient/emergency"
                                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/20"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span>Open Emergency Vitals Pass</span>
                              </Link>

                              {/* 1-Click Fast-Track Specialist Booking */}
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
                          /* Routine / Specialized Care Card */
                          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <Stethoscope className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                                  Recommended Clinical Specialist
                                </span>
                                <p className="font-bold text-xs text-slate-900 mt-0.5">
                                  Dr. {msg.routing.recommended_doctor?.name || "Specialist"} • {msg.routing.recommended_doctor?.specialization || msg.routing.specialty}
                                </p>
                                {msg.routing.recommended_doctor?.slot_display_time && (
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    Next Available Slot: <strong className="text-emerald-800">{msg.routing.recommended_doctor.slot_display_time}</strong>
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
                                  Browse Doctor Schedules
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
                <span className="text-xs text-slate-500 mr-1 font-medium">Synthesizing clinical assessment</span>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-75" style={{animationDelay: '150ms'}}></div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-150" style={{animationDelay: '300ms'}}></div>
              </div>
            </motion.div>
          )}

          <div ref={endOfMessagesRef} />
        </div>

        {/* Suggested Quick Starters (Horizontally Swipeable on Mobile) */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] whitespace-nowrap">
          <span className="text-slate-400 font-semibold flex-shrink-0 pr-1">Quick Tap:</span>
          {[
            "Coughing blood and shortness of breath",
            "Severe bleeding from open wound",
            "Chest tightness with mild wheezing",
            "Persistent dry cough & fever for 3 days",
            "Pounding migraine with sensitivity to light"
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={loading || isStreaming}
              onClick={() => handleSendPrompt(prompt)}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 text-slate-700 rounded-xl border border-slate-200/90 transition-colors shadow-2xs disabled:opacity-50 flex-shrink-0 text-xs font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input (Thumb-friendly with iOS zoom prevention) */}
        <div className="p-2.5 sm:p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe symptoms in detail..."
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

    </motion.div>
  );
}
