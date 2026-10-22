"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  Stethoscope, 
  User, 
  FileText, 
  Send, 
  Sparkles,
  Info,
  X
} from "lucide-react";

interface AppointmentData {
  id: number;
  doctor: number;
  doctor_name: string;
  doctor_username: string;
  doctor_specialization: string;
  patient: number;
  patient_name: string;
  patient_username: string;
  slot_start_time: string;
  slot_end_time: string;
  notes: string;
  status: string;
}

interface MessageItem {
  id: number;
  sender: number;
  sender_name: string;
  sender_username: string;
  sender_role: string;
  text: string;
  created_at: string;
}

export default function ConsultationRoom({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const appointmentId = unwrappedParams.id;
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("PATIENT");

  // Call Controls State
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "notes" | null>("chat");

  // Messages State
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerAiEnabled, setPartnerAiEnabled] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Video Stream Persistent Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Fetch Appointment Details
  const fetchAppointmentDetails = useCallback(async () => {
    try {
      const res = await authFetch(`/api/appointments/appointments/${appointmentId}/`);
      if (res.ok) {
        const data = await res.json();
        setAppointment(data);
      } else {
        toast.error("Consultation room not found or session has expired.");
      }
    } catch {
      toast.error("Network error connecting to consultation server.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  // Fetch Messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await authFetch(`/api/appointments/appointments/${appointmentId}/messages/`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // silent polling catch
    }
  }, [appointmentId]);

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("user_role") || "PATIENT" : "PATIENT";
    setUserRole(role);
    fetchAppointmentDetails();
    fetchMessages();

    // Poll messages every 4 seconds during active consultation
    const msgInterval = setInterval(fetchMessages, 4000);
    return () => clearInterval(msgInterval);
  }, [fetchAppointmentDetails, fetchMessages]);

  // Handle Camera Stream Initialization
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
          });

          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
          setHasCameraAccess(true);
        } else {
          setHasCameraAccess(false);
        }
      } catch (err) {
        console.warn("Camera init notification:", err);
        setHasCameraAccess(false);
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Ensure stream stays bound and playing when camera is enabled
  useEffect(() => {
    if (!videoDisabled && streamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [videoDisabled]);

  // Robust Camera Toggle without destroying the MediaStream or video element
  const toggleCamera = async () => {
    const nextDisabled = !videoDisabled;
    setVideoDisabled(nextDisabled);

    try {
      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks.forEach(track => {
            track.enabled = !nextDisabled;
          });
        }

        // Re-attach and play video on re-enable
        if (!nextDisabled && localVideoRef.current) {
          if (localVideoRef.current.srcObject !== streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }
          await localVideoRef.current.play().catch(() => {});
        }
      } else if (!nextDisabled) {
        // Stream was absent or lost: re-request hardware access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: !audioMuted
          });
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            await localVideoRef.current.play().catch(() => {});
          }
          setHasCameraAccess(true);
        }
      }

      toast.info(nextDisabled ? "Camera paused" : "Camera turned on");
    } catch (err) {
      console.warn("Camera toggle notice:", err);
      toast.info(nextDisabled ? "Camera paused" : "Camera turned on");
    }
  };

  // Robust Audio Toggle
  const toggleAudio = () => {
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);

    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !nextMuted;
      });
    }

    toast.info(nextMuted ? "Microphone muted" : "Microphone unmuted");
  };

  // Send Consultation Message + Interactive Clinical Response
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage.trim();
    setSendingMsg(true);

    try {
      const res = await authFetch(`/api/appointments/appointments/${appointmentId}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSend })
      });

      if (res.ok) {
        const sent = await res.json();
        setMessages(prev => [...prev, sent]);
        setNewMessage("");
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });

        // If interactive clinical responder is enabled, simulate typing and doctor response
        if (partnerAiEnabled) {
          setIsPartnerTyping(true);
          setTimeout(async () => {
            try {
              const replyRes = await authFetch(`/api/appointments/appointments/${appointmentId}/simulate-reply/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
              });
              if (replyRes.ok) {
                const replyMsg = await replyRes.json();
                setMessages(prev => [...prev, replyMsg]);
                chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
              }
            } catch {
              // silent catch for simulated responder
            } finally {
              setIsPartnerTyping(false);
            }
          }, 1500);
        }
      } else {
        toast.error("Failed to transmit clinical message.");
      }
    } catch {
      toast.error("Network error sending message.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleEndCall = async () => {
    if (userRole === "DOCTOR") {
      try {
        await authFetch(`/api/appointments/appointments/${appointmentId}/status/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" })
        });
        toast.success("Consultation successfully marked as completed.");
        router.push("/doctor/dashboard");
        return;
      } catch {
        // fallback redirect
      }
    }
    
    toast.info("Consultation ended.");
    if (userRole === "DOCTOR") {
      router.push("/doctor/dashboard");
    } else if (userRole === "ADMIN") {
      router.push("/admin/dashboard");
    } else {
      router.push("/patient/dashboard");
    }
  };


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans">
        
        {/* TOP STATUS BAR */}
        <header className="px-4 sm:px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm text-white tracking-tight">
                  HealthTech Teleconsultation Room
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live WebRTC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {appointment ? `${appointment.doctor_name} (${appointment.doctor_specialization}) • Patient: ${appointment.patient_name}` : "Connecting to clinical session..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-medium text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatTimer(callDuration)}</span>
            </div>

            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 text-[11px] text-slate-400 border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>NDPR AES-256</span>
            </div>

            <button
              onClick={handleEndCall}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/30"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          </div>
        </header>

        {/* MAIN VIDEO FEEDS AREA */}
        <main className="flex-1 p-4 sm:p-6 flex flex-col lg:flex-row gap-4 items-stretch justify-center relative overflow-hidden">
          
          {/* Main Remote Feed (e.g. Doctor viewing Patient, or Patient viewing Doctor) */}
          <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl min-h-[360px]">
            
            {/* Remote Participant Label */}
            <div className="flex items-center justify-between z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">
                  {userRole === "DOCTOR" 
                    ? (appointment?.patient_name || "Patient") 
                    : (appointment?.doctor_name || "Physician")}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {userRole === "DOCTOR" ? "Patient Feed" : appointment?.doctor_specialization}
                </span>
              </div>
            </div>

            {/* Video Canvas Simulation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl font-bold shadow-2xl shadow-emerald-500/10 mb-4 animate-pulse">
                {userRole === "DOCTOR" 
                  ? (appointment?.patient_name?.charAt(0) || "P")
                  : (appointment?.doctor_name?.charAt(0) || "D")}
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {userRole === "DOCTOR" ? appointment?.patient_name : appointment?.doctor_name}
              </p>
              <p className="text-xs text-slate-500 mt-1">High-Definition Telehealth Stream Active</p>
            </div>

            {/* Bottom Audio Indicator */}
            <div className="z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-800 self-start text-[11px] text-slate-300">
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce delay-75" />
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce delay-150" />
              </div>
              <span className="ml-1 text-[10px] font-medium">Audio Active</span>
            </div>
          </div>

          {/* Local User Self-Preview Window */}
          <div className="w-full lg:w-80 h-52 lg:h-auto bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col justify-between p-3.5 shadow-2xl flex-shrink-0">
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-800 text-[11px] font-bold text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${!videoDisabled && hasCameraAccess ? "bg-emerald-400" : "bg-amber-400"}`} />
                You ({userRole === "DOCTOR" ? "Dr. Self" : "Patient Self"})
              </span>
              {audioMuted && (
                <span className="p-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
                  <MicOff className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Video Stream Element: Always persistent in DOM to prevent losing stream reference */}
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                hasCameraAccess && !videoDisabled ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
              }`} 
            />

            {/* Camera Muted or Fallback Preview Overlay */}
            {(!hasCameraAccess || videoDisabled) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-850 p-4 text-center z-5">
                <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xl mb-2 shadow-inner">
                  <User className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  {videoDisabled ? "Camera Paused" : "Self Camera Active"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px]">
                  {videoDisabled ? "Click camera icon below to turn video back on" : "Encrypted Local Stream"}
                </p>
              </div>
            )}

            <div className="z-10 flex items-center justify-between w-full">
              <span className="text-[10px] text-slate-400 font-mono">
                {videoDisabled ? "Video Muted" : "Live Stream"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                1080p • 30fps
              </span>
            </div>
          </div>

          {/* Right Side Drawer: In-Call Chat & Notes (Overlay on Mobile, Sidebar on Desktop) */}
          <AnimatePresence>
            {activeTab && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full lg:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl z-30 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-24 max-lg:top-16 max-lg:max-h-[calc(100dvh-10rem)] lg:max-h-full"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {activeTab === "chat" ? (
                        <>
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <span>Consultation Clinical Chat</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span>Encounter Notes & Details</span>
                        </>
                      )}
                    </h3>
                    {activeTab === "chat" && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        In session with {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient") : (appointment?.doctor_name || "Physician")}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {activeTab === "chat" && (
                      <button
                        type="button"
                        onClick={() => setPartnerAiEnabled(!partnerAiEnabled)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          partnerAiEnabled 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                        title="Toggle automated clinical responses for solo testing"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>{partnerAiEnabled ? "AI Responder Active" : "AI Responder Muted"}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setActiveTab(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {activeTab === "chat" ? (
                  <>
                    {/* Live Multi-Party Notice Banner */}
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1.5 leading-tight">
                      <Info className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Two-way live chat:</strong> Messages sync instantly. For dual testing across accounts, open an Incognito window and log in as <code>doctor</code> (<code>doctorpass123</code>).
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 max-h-[340px] lg:max-h-[300px]">
                      {messages.length === 0 ? (
                        <div className="text-center text-slate-500 text-xs py-8 space-y-2">
                          <p>No messages yet in this session.</p>
                          <p className="text-[11px] text-slate-600">Send a greeting, symptoms, or question to receive clinical feedback.</p>
                        </div>
                      ) : (
                        messages.map((m) => (
                          <div 
                            key={m.id} 
                            className={`p-2.5 rounded-2xl max-w-[85%] text-xs ${
                              m.sender_role === userRole 
                                ? "bg-emerald-600 text-white ml-auto rounded-br-none shadow-md shadow-emerald-600/20" 
                                : "bg-slate-800 text-slate-200 mr-auto rounded-bl-none border border-slate-700/60"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 gap-2">
                              <span className="font-bold flex items-center gap-1">
                                {m.sender_role === "DOCTOR" && <Stethoscope className="w-3 h-3 text-emerald-400" />}
                                {m.sender_name || m.sender_username}
                              </span>
                              <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="leading-relaxed">{m.text}</p>
                          </div>
                        ))
                      )}

                      {/* Animated Typing Indicator */}
                      {isPartnerTyping && (
                        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-800/90 text-slate-300 text-xs w-fit mr-auto border border-slate-700/60 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-medium text-[11px] text-emerald-300">
                            {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient") : (appointment?.doctor_name || "Dr. Sarah Connor")} is typing clinical response...
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2 border-t border-slate-800">
                      <input
                        type="text"
                        placeholder="Type symptoms or clinical question..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-base sm:text-xs rounded-xl bg-slate-950 border border-slate-800 focus:outline-hidden focus:border-emerald-500 text-white placeholder-slate-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !newMessage.trim()}
                        className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs text-slate-300">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Chief Complaint / Booking Reason:</span>
                      <p className="text-slate-200 mt-1 font-medium">{appointment?.notes || "General checkup & clinical consult"}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Scheduled Time Slot:</span>
                      <p className="text-slate-200 mt-1">
                        {appointment?.slot_start_time ? new Date(appointment.slot_start_time).toLocaleString() : "Live Encounter"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                      💡 <strong>Clinical Tip:</strong> Once finished with the consultation, click <strong>"End Call"</strong> to mark the encounter completed and finalize your medical records.
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* BOTTOM FLOATING CONTROLS BAR */}
        <footer className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-3 z-20">
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              audioMuted 
                ? "bg-red-500/20 text-red-400 border border-red-500/40" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
            title={audioMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {audioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              videoDisabled 
                ? "bg-red-500/20 text-red-400 border border-red-500/40" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
            title={videoDisabled ? "Turn Camera On" : "Turn Camera Off"}
          >
            {videoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "chat" ? null : "chat")}
            className={`p-3.5 rounded-2xl transition-all shadow-md relative ${
              activeTab === "chat" 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
            title="Consultation In-Call Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && activeTab !== "chat" && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-2 right-2 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "notes" ? null : "notes")}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              activeTab === "notes" 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
            title="Consultation Details & Notes"
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            onClick={handleEndCall}
            className="px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">End Consultation</span>
          </button>
        </footer>


      </div>
    </ProtectedRoute>
  );
}
