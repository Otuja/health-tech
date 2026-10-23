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
  Volume2,
  X,
  CheckCircle2,
  ArrowRight,
  Activity,
  RotateCw,
  AlertCircle
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

interface SignalItem {
  id: number;
  sender: number;
  sender_username: string;
  type: string;
  payload: any;
  created_at: string;
}

interface CallEndedData {
  endedBy: string;
  endedByName: string;
  duration: string;
  reason: string;
  timestamp: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:relay.metered.ca:80" },
    {
      urls: "turn:relay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:relay.metered.ca:80?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function ConsultationRoom({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const appointmentId = unwrappedParams.id;
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointmentNotFound, setAppointmentNotFound] = useState(false);
  const [userRole, setUserRole] = useState<string>("PATIENT");

  // Call Controls State
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "notes" | null>("chat");

  // Messages State (Direct Doctor & Patient Messaging)
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Video Streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);

  // WebRTC Peer Connection State
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsQueue = useRef<SignalItem[]>([]);
  const lastSignalIdRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 10));
  const makingOfferRef = useRef<boolean>(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const [peerState, setPeerState] = useState<string>("initializing");
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  // Call Ended Modal State (Industrial Standard Notification)
  const [callEndedModalOpen, setCallEndedModalOpen] = useState(false);
  const [callEndedData, setCallEndedData] = useState<CallEndedData | null>(null);

  // Timer Effect
  useEffect(() => {
    if (callEndedModalOpen) return;
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callEndedModalOpen]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Helper to cleanly release camera and mic hardware tracks
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStreamActive(false);
  }, []);

  // Transmit WebRTC signaling data through backend
  const sendSignal = useCallback(async (type: string, payload: any = {}) => {
    try {
      const currentRole = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "PATIENT").toUpperCase() : "PATIENT";
      await authFetch(`/api/appointments/appointments/${appointmentId}/signal/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          payload: {
            ...payload,
            sessionId: sessionIdRef.current,
            senderRole: currentRole
          }
        })
      });
    } catch (err) {
      console.warn("Signal send failed:", err);
    }
  }, [appointmentId]);

  // Fetch Appointment Details & status checks
  const fetchAppointmentDetails = useCallback(async () => {
    try {
      const res = await authFetch(`/api/appointments/appointments/${appointmentId}/`);
      if (res.ok) {
        const data = await res.json();
        setAppointment(data);

        // Check if appointment is already completed on server
        if (data.status === "COMPLETED" && !callEndedModalOpen) {
          stopMediaTracks();
          setCallEndedData(prev => prev || {
            endedBy: "Doctor",
            endedByName: data.doctor_name || "Physician",
            duration: formatTimer(callDuration),
            reason: "This consultation encounter has been officially finalized and archived.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          setCallEndedModalOpen(true);
        }
      } else {
        setAppointmentNotFound(true);
        toast.error("Consultation room not found or session has expired.");
      }
    } catch {
      toast.error("Network error connecting to consultation server.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, callEndedModalOpen, callDuration, stopMediaTracks]);

  // Fetch Authentic Messages (Polls every 2s for live chat)
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

  // Initiate an offer with in-flight guard to prevent glare
  const createAndSendOffer = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || makingOfferRef.current) return;

    try {
      makingOfferRef.current = true;
      if (pc.signalingState !== "stable") {
        try {
          await pc.setLocalDescription({ type: "rollback" } as any);
        } catch (e) {
          console.warn("Rollback failed:", e);
        }
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await sendSignal("offer", { sdp: offer });
    } catch (err) {
      console.warn("Failed creating offer:", err);
    } finally {
      makingOfferRef.current = false;
    }
  }, [sendSignal]);

  // Handle incoming signaling messages from other device
  const handleSignal = useCallback(async (sig: SignalItem) => {
    try {
      // Discard signals originating from this exact browser session
      if (sig.payload?.sessionId && sig.payload.sessionId === sessionIdRef.current) {
        return;
      }

      // 1. CALL ENDED SIGNAL (Either party concluded the encounter)
      if (sig.type === "call_ended") {
        stopMediaTracks();
        
        const endedByRole = sig.payload?.endedBy === "DOCTOR" ? "Doctor" : "Patient";
        const endedByName = sig.payload?.endedByName || (sig.payload?.endedBy === "DOCTOR" ? appointment?.doctor_name : appointment?.patient_name) || "Consultation Participant";

        setCallEndedData({
          endedBy: endedByRole,
          endedByName: endedByName,
          duration: sig.payload?.duration || formatTimer(callDuration),
          reason: endedByRole === "Doctor" 
            ? "The attending physician has concluded the video consultation and recorded the clinical encounter."
            : "The patient has concluded the teleconsultation session.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setCallEndedModalOpen(true);
        toast.info(`Call ended by ${endedByName}`);
        return;
      }

      const pc = peerRef.current;
      if (!pc) {
        // Queue until peer connection is initialized
        pendingSignalsQueue.current.push(sig);
        return;
      }

      const currentRole = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "PATIENT").toUpperCase() : "PATIENT";

      if (sig.type === "join" || sig.type === "reconnect") {
        // When peer joins or reconnects, Doctor immediately initiates an offer
        if (currentRole === "DOCTOR") {
          await createAndSendOffer();
        }
      } else if (sig.type === "offer") {
        const offerSdp = sig.payload?.sdp || sig.payload;
        if (!offerSdp || !offerSdp.type) return;

        if (pc.signalingState !== "stable") {
          try {
            await pc.setLocalDescription({ type: "rollback" } as any);
          } catch {
            // continue
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
        
        while (queuedCandidates.current.length > 0) {
          const candidate = queuedCandidates.current.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", { sdp: answer });
      } else if (sig.type === "answer") {
        const answerSdp = sig.payload?.sdp || sig.payload;
        if (!answerSdp || !answerSdp.type) return;

        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
          
          while (queuedCandidates.current.length > 0) {
            const candidate = queuedCandidates.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
          }
        }
      } else if (sig.type === "ice-candidate-batch" || sig.type === "ice-candidate") {
        const candidates = sig.type === "ice-candidate-batch" 
          ? (Array.isArray(sig.payload?.candidates) ? sig.payload.candidates : (Array.isArray(sig.payload) ? sig.payload : []))
          : [sig.payload?.candidate || sig.payload];

        for (const cand of candidates) {
          if (!cand) continue;
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          } else {
            queuedCandidates.current.push(cand);
          }
        }
      }
    } catch (err) {
      console.warn("Error handling incoming signal:", err);
    }
  }, [appointment, callDuration, createAndSendOffer, sendSignal, stopMediaTracks]);

  // Initialize WebRTC Peer Connection
  const initPeerConnection = useCallback((localStream: MediaStream) => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = pc;

    // Attach local audio/video tracks to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle incoming remote media tracks from other device
    pc.ontrack = (event) => {
      console.log("Remote WebRTC track received:", event.track.kind, event.streams);
      let targetStream = event.streams && event.streams[0];
      if (!targetStream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        if (!remoteStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
          remoteStreamRef.current.addTrack(event.track);
        }
        targetStream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = targetStream;
      }

      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== targetStream) {
          remoteVideoRef.current.srcObject = targetStream;
        }
        remoteVideoRef.current.play().then(() => {
          setAudioNeedsUnlock(false);
        }).catch((err) => {
          console.warn("Remote video play deferred by browser autoplay policy:", err);
          setAudioNeedsUnlock(true);
        });
      }
      setRemoteStreamActive(true);
    };

    // Batch ICE candidates
    let iceTimeout: any = null;
    let pendingIceList: any[] = [];

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        pendingIceList.push(event.candidate.toJSON());
        clearTimeout(iceTimeout);
        iceTimeout = setTimeout(() => {
          if (pendingIceList.length > 0) {
            sendSignal("ice-candidate-batch", { candidates: pendingIceList });
            pendingIceList = [];
          }
        }, 50);
      }
    };

    // Track connection state
    pc.onconnectionstatechange = () => {
      setPeerState(pc.connectionState);
      if (pc.connectionState === "connected") {
        setRemoteStreamActive(true);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (pc.connectionState === "failed") {
          pc.restartIce?.();
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setRemoteStreamActive(true);
      }
    };

    // Drain queued signals that arrived while camera was initializing
    while (pendingSignalsQueue.current.length > 0) {
      const pendingSig = pendingSignalsQueue.current.shift();
      if (pendingSig) {
        handleSignal(pendingSig).catch(console.warn);
      }
    }

    return pc;
  }, [sendSignal, handleSignal]);

  // Reconnection Helper
  const handleReconnect = useCallback(async () => {
    toast.loading("Reconnecting P2P video stream...", { id: "reconnect-call" });
    try {
      sessionIdRef.current = Math.random().toString(36).substring(2, 10);
      queuedCandidates.current = [];
      pendingSignalsQueue.current = [];
      
      if (streamRef.current) {
        initPeerConnection(streamRef.current);
        await sendSignal("reconnect", { timestamp: Date.now() });
        const currentRole = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "PATIENT").toUpperCase() : "PATIENT";
        if (currentRole === "DOCTOR") {
          setTimeout(createAndSendOffer, 600);
        }
      }
      toast.success("Stream re-negotiated", { id: "reconnect-call" });
    } catch {
      toast.error("Failed to re-initialize stream", { id: "reconnect-call" });
    }
  }, [sendSignal, initPeerConnection, createAndSendOffer]);

  // Poll for new signals
  const pollSignals = useCallback(async () => {
    if (callEndedModalOpen) return;
    try {
      const res = await authFetch(`/api/appointments/appointments/${appointmentId}/signals/?since=${lastSignalIdRef.current}`);
      if (res.ok) {
        const signals: SignalItem[] = await res.json();
        for (const sig of signals) {
          if (sig.id > lastSignalIdRef.current) {
            lastSignalIdRef.current = sig.id;
            if (!peerRef.current) {
              pendingSignalsQueue.current.push(sig);
            } else {
              await handleSignal(sig);
            }
          }
        }
      }
    } catch {
      // silent polling catch
    }
  }, [appointmentId, handleSignal, callEndedModalOpen]);

  // Unlock audio on mobile devices
  const handleUnlockAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.play().then(() => {
        setAudioNeedsUnlock(false);
      }).catch(() => {});
    }
  };

  // Main Camera & Peer Lifecycle
  useEffect(() => {
    let isMounted = true;

    async function startMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
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

          initPeerConnection(stream);
          await sendSignal("join", { timestamp: Date.now() });

          const currentRole = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "PATIENT").toUpperCase() : "PATIENT";
          if (currentRole === "DOCTOR") {
            setTimeout(() => {
              createAndSendOffer();
            }, 800);
          }
        } else {
          setHasCameraAccess(false);
        }
      } catch (err) {
        console.warn("Camera init notification:", err);
        setHasCameraAccess(false);
      }
    }

    startMedia();

    return () => {
      isMounted = false;
      stopMediaTracks();
    };
  }, [initPeerConnection, sendSignal, createAndSendOffer, stopMediaTracks]);

  // Polling Loops (Messages & Signaling)
  useEffect(() => {
    const role = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "PATIENT").toUpperCase() : "PATIENT";
    setUserRole(role);
    fetchAppointmentDetails();
    fetchMessages();

    const signalInterval = setInterval(pollSignals, 1000);
    const msgInterval = setInterval(fetchMessages, 2000);

    return () => {
      clearInterval(signalInterval);
      clearInterval(msgInterval);
    };
  }, [fetchAppointmentDetails, fetchMessages, pollSignals]);

  // Keep local video playing when re-enabled
  useEffect(() => {
    if (!videoDisabled && streamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [videoDisabled]);

  // Robust Camera Toggle
  const toggleCamera = async () => {
    const nextDisabled = !videoDisabled;
    setVideoDisabled(nextDisabled);

    try {
      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = !nextDisabled;
        });

        if (!nextDisabled && localVideoRef.current) {
          if (localVideoRef.current.srcObject !== streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }
          await localVideoRef.current.play().catch(() => {});
        }
      }
      toast.info(nextDisabled ? "Camera paused" : "Camera turned on");
    } catch {
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

  // Send Direct Doctor <-> Patient Message
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
      } else {
        toast.error("Failed to transmit clinical message.");
      }
    } catch {
      toast.error("Network error sending message.");
    } finally {
      setSendingMsg(false);
    }
  };

  // End Call Initiation: Notifies peer, updates status, and presents summary modal
  const handleEndCall = async () => {
    const durationStr = formatTimer(callDuration);
    const selfName = userRole === "DOCTOR" 
      ? (appointment?.doctor_name || "Doctor") 
      : (appointment?.patient_name || "Patient");

    // 1. Notify remote peer that the call has ended
    await sendSignal("call_ended", {
      endedBy: userRole,
      endedByName: selfName,
      duration: durationStr
    });

    // 2. If Doctor, mark appointment COMPLETED in database
    if (userRole === "DOCTOR") {
      try {
        await authFetch(`/api/appointments/appointments/${appointmentId}/status/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" })
        });
      } catch {
        // silent catch
      }
    }

    // 3. Stop camera and microphone hardware tracks
    stopMediaTracks();

    // 4. Open summary modal on initiator device
    setCallEndedData({
      endedBy: "You",
      endedByName: selfName,
      duration: durationStr,
      reason: "You concluded the teleconsultation encounter.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setCallEndedModalOpen(true);
  };

  // Navigate away after reviewing call summary
  const handleLeaveToDashboard = () => {
    if (userRole === "DOCTOR") {
      router.push("/doctor/dashboard");
    } else if (userRole === "ADMIN") {
      router.push("/admin/dashboard");
    } else {
      router.push("/patient/dashboard");
    }
  };

  if (appointmentNotFound && !loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-white">
            Consultation Encounter Not Found
          </h2>
          <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
            Consultation #{appointmentId} was not found, has already been completed, or is not assigned to your account.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              href={userRole === "DOCTOR" ? "/doctor/appointments" : "/patient/appointments"}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20"
            >
              View Scheduled Consultations
            </Link>
            <Link
              href={userRole === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard"}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors border border-slate-700"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
                  <span className={`w-1.5 h-1.5 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  {remoteStreamActive ? "P2P WebRTC Connected" : "Connecting Peer..."}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {appointment ? `${appointment.doctor_name} (${appointment.doctor_specialization}) • Patient: ${appointment.patient_name}` : "Connecting to clinical session..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {audioNeedsUnlock && (
              <button
                onClick={handleUnlockAudio}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg animate-pulse"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Tap to Enable Audio</span>
              </button>
            )}

            <button
              onClick={handleReconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors active:scale-95"
              title="Reset P2P video stream if connection stalled"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reconnect</span>
            </button>

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
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          </div>
        </header>

        {/* MAIN VIDEO FEEDS AREA */}
        <main className="flex-1 p-4 sm:p-6 flex flex-col lg:flex-row gap-4 items-stretch justify-center relative overflow-hidden">
          
          {/* Main Remote Feed: Doctor viewing Patient, or Patient viewing Doctor */}
          <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl min-h-[360px]">
            
            {/* Remote Participant Label */}
            <div className="flex items-center justify-between z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800 text-xs">
                <span className={`w-2 h-2 rounded-full ${remoteStreamActive ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
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

            {/* REAL REMOTE VIDEO STREAM ELEMENT */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                remoteStreamActive ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
              }`}
            />

            {/* Connecting / Standby Placeholder shown while waiting for peer stream */}
            {!remoteStreamActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-6 text-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl font-bold shadow-2xl shadow-emerald-500/10 mb-4 animate-pulse">
                  {userRole === "DOCTOR" 
                    ? (appointment?.patient_name?.charAt(0) || "P")
                    : (appointment?.doctor_name?.charAt(0) || "D")}
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient") : (appointment?.doctor_name || "Doctor")}
                </p>
                <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Connecting peer-to-peer clinical stream...
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  {userRole === "DOCTOR" 
                    ? "Ensure the patient has opened this consultation room from their device." 
                    : "Connecting with physician. Please keep camera and microphone enabled."}
                </p>
              </div>
            )}

            {/* Bottom Audio / Connection Status Indicator */}
            <div className="z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-800 self-start text-[11px] text-slate-300">
              <div className="flex items-center gap-0.5">
                <span className={`w-1 h-2.5 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-bounce" : "bg-slate-600"}`} />
                <span className={`w-1 h-4 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-bounce delay-75" : "bg-slate-600"}`} />
                <span className={`w-1 h-3 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-bounce delay-150" : "bg-slate-600"}`} />
              </div>
              <span className="ml-1 text-[10px] font-medium">
                {remoteStreamActive ? "Live WebRTC Audio & Video" : "Waiting for Peer Video"}
              </span>
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

            {/* Local Video Stream Element: Muted to prevent audio feedback */}
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
                {videoDisabled ? "Video Muted" : "Local Feed"}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">
                {peerState === "connected" ? "P2P Synced" : peerState}
              </span>
            </div>
          </div>

          {/* Right Side Drawer: Direct Doctor <-> Patient In-Call Chat & Notes */}
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
                          <span>Direct Consultation Chat</span>
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
                        Private live messaging with {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient") : (appointment?.doctor_name || "Physician")}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
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
                    <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 max-h-[340px] lg:max-h-[300px]">
                      {messages.length === 0 ? (
                        <div className="text-center text-slate-500 text-xs py-8 space-y-2">
                          <p>No messages yet in this consultation.</p>
                          <p className="text-[11px] text-slate-600">Messages sent here are private and direct between Doctor and Patient.</p>
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

                      <div ref={chatBottomRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2 border-t border-slate-800">
                      <input
                        type="text"
                        placeholder="Type direct message..."
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
            className="px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 active:scale-95"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">End Consultation</span>
          </button>
        </footer>

        {/* INDUSTRIAL-STANDARD CALL ENDED RECAP & NOTIFICATION MODAL */}
        <AnimatePresence>
          {callEndedModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl relative overflow-hidden"
              >
                {/* Background Glow */}
                <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

                {/* Hero Icon */}
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-emerald-400 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>NDPR ENCRYPTED ENCOUNTER SAVED</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight">
                  Consultation Concluded
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  {callEndedData?.reason || "This clinical teleconsultation encounter has been successfully finalized."}
                </p>

                {/* Encounter Stats Grid */}
                <div className="grid grid-cols-3 gap-2 my-6 p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-left">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Duration</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                      {callEndedData?.duration || formatTimer(callDuration)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Concluded By</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-200 truncate block">
                      {callEndedData?.endedByName || "Clinician"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Time</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-slate-300">
                      {callEndedData?.timestamp || "Recorded"}
                    </span>
                  </div>
                </div>

                {/* Navigation Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleLeaveToDashboard}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Return to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <Link
                    href={userRole === "DOCTOR" ? "/doctor/records" : "/patient/records"}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs block transition-colors"
                  >
                    View Electronic Medical Records
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ProtectedRoute>
  );
}
