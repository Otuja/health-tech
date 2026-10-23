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
  AlertCircle,
  ArrowLeftRight
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

  // Speaker / Volume Boost State (Voice Amplification via Web Audio GainNode)
  const [speakerBoost, setSpeakerBoost] = useState<number>(100);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Picture-in-Picture layout swap: false = remote is big, self is PiP; true = self is big, remote is PiP (WhatsApp style)
  const [swappedFeeds, setSwappedFeeds] = useState(false);

  // Call Ended Modal State (Industrial Standard Notification)
  const [callEndedModalOpen, setCallEndedModalOpen] = useState(false);
  const [callEndedData, setCallEndedData] = useState<CallEndedData | null>(null);

  // Refs to prevent dependency re-renders from tearing down WebRTC
  const callDurationRef = useRef<number>(0);
  const appointmentRef = useRef<AppointmentData | null>(null);
  const userRoleRef = useRef<string>("PATIENT");

  useEffect(() => {
    appointmentRef.current = appointment;
  }, [appointment]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  // Timer Effect: updates callDurationRef without causing callback re-creation
  useEffect(() => {
    if (callEndedModalOpen) return;
    const timer = setInterval(() => {
      setCallDuration(prev => {
        const next = prev + 1;
        callDurationRef.current = next;
        return next;
      });
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
        appointmentRef.current = data;

        // Check if appointment is already completed on server
        if (data.status === "COMPLETED" && !callEndedModalOpen) {
          stopMediaTracks();
          setCallEndedData(prev => prev || {
            endedBy: "Doctor",
            endedByName: data.doctor_name || "Physician",
            duration: formatTimer(callDurationRef.current),
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
  }, [appointmentId, callEndedModalOpen, stopMediaTracks]);

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
        const apt = appointmentRef.current;
        const endedByName = sig.payload?.endedByName || (sig.payload?.endedBy === "DOCTOR" ? apt?.doctor_name : apt?.patient_name) || "Consultation Participant";

        setCallEndedData({
          endedBy: endedByRole,
          endedByName: endedByName,
          duration: sig.payload?.duration || formatTimer(callDurationRef.current),
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
  }, [createAndSendOffer, sendSignal, stopMediaTracks]);

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

  // Audio Booster via Web Audio API GainNode
  const setupAudioGain = useCallback(() => {
    try {
      if (!remoteVideoRef.current) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      if (!gainNodeRef.current) {
        const gain = ctx.createGain();
        gain.gain.value = speakerBoost / 100;
        gain.connect(ctx.destination);
        gainNodeRef.current = gain;
      }

      if (!mediaElementSourceRef.current && remoteVideoRef.current) {
        const source = ctx.createMediaElementSource(remoteVideoRef.current);
        source.connect(gainNodeRef.current);
        mediaElementSourceRef.current = source;
      }
    } catch (err) {
      console.warn("Audio gain initialization note:", err);
    }
  }, [speakerBoost]);

  const cycleSpeakerBoost = () => {
    const levels = [100, 150, 200, 250];
    const currentIndex = levels.indexOf(speakerBoost);
    const nextLevel = levels[(currentIndex + 1) % levels.length];
    setSpeakerBoost(nextLevel);

    try {
      setupAudioGain();
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = nextLevel / 100;
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      toast.success(
        nextLevel > 100 
          ? `🔊 Speaker Boost active: ${nextLevel}% volume!` 
          : `🔈 Speaker volume set to normal (100%)`
      );
    } catch (err) {
      console.warn("Could not adjust audio gain:", err);
    }
  };

  // Unlock audio on mobile devices and enable speaker booster
  const handleUnlockAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.play().then(() => {
        setAudioNeedsUnlock(false);
        setupAudioGain();
        toast.success("Remote audio active.");
      }).catch(() => {});
    }
  };

  // Main Camera & Peer Lifecycle: Runs ONCE per consultation mount
  useEffect(() => {
    let isMounted = true;

    async function startMedia() {
      let stream: MediaStream;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
              audio: true 
            });
            setHasCameraAccess(true);
          } catch (camErr) {
            console.warn("Full video+audio getUserMedia failed, trying audio-only fallback:", camErr);
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              setHasCameraAccess(false);
              setVideoDisabled(true);
              toast.info("Webcam busy or unavailable, streaming encrypted audio");
            } catch (audioErr) {
              console.warn("Audio getUserMedia failed, initializing stream container:", audioErr);
              stream = new MediaStream();
              setHasCameraAccess(false);
              setVideoDisabled(true);
            }
          }

          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          streamRef.current = stream;
          if (localVideoRef.current && stream.getVideoTracks().length > 0) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  // Polling Loops (Messages & Signaling): Runs ONCE per consultation mount
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
  }, [appointmentId, fetchAppointmentDetails, fetchMessages, pollSignals]);

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
      <div className="h-screen h-[100dvh] max-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
        
        {/* TOP STATUS BAR: Responsive & Zero Overflow */}
        <header className="px-3 sm:px-6 py-2.5 sm:py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between z-20 shadow-xs flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs flex-shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-xs">
                  {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient Call") : (appointment?.doctor_name ? `Dr. ${appointment.doctor_name}` : "Clinical Call")}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${remoteStreamActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="hidden xs:inline">{remoteStreamActive ? "Live" : "Connecting"}</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                {appointment?.doctor_specialization || "Telehealth Encounter"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {audioNeedsUnlock && (
              <button
                onClick={handleUnlockAudio}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold shadow-md animate-pulse"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Enable Audio</span>
              </button>
            )}

            {/* Quick Swap Feeds Button in Header */}
            <button
              onClick={() => setSwappedFeeds(prev => !prev)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors active:scale-95"
              title="Swap Big & Small Viewports"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Swap</span>
            </button>

            <button
              onClick={handleReconnect}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors active:scale-95"
              title="Reset P2P video stream if connection stalled"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Reconnect</span>
            </button>

            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] sm:text-xs font-mono font-medium text-slate-700">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>{formatTimer(callDuration)}</span>
            </div>

            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[11px] text-emerald-700 border border-emerald-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>NDPR AES-256</span>
            </div>
          </div>
        </header>

        {/* MAIN VIDEO FEEDS AREA: WhatsApp Style Stacked PiP with Tap-to-Swap */}
        <main className="flex-1 p-2 sm:p-4 flex relative overflow-hidden w-full max-w-7xl mx-auto min-h-0">
          <div className="relative w-full h-full flex-1 bg-slate-950 rounded-2xl sm:rounded-3xl border border-slate-300/80 shadow-xl overflow-hidden min-h-[300px]">
            
            {/* FEED A: REMOTE PARTICIPANT FEED */}
            <div 
              onClick={() => {
                if (swappedFeeds) setSwappedFeeds(false);
              }}
              className={`transition-all duration-300 ease-in-out ${
                !swappedFeeds
                  ? "absolute inset-0 w-full h-full z-0 flex flex-col justify-between p-3 sm:p-4"
                  : "absolute top-3 right-3 sm:top-5 sm:right-5 w-28 sm:w-44 h-40 sm:h-60 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-white/95 z-20 overflow-hidden cursor-pointer active:scale-95 hover:border-emerald-400 group p-2 flex flex-col justify-between bg-slate-900"
              }`}
            >
              {/* Remote Participant Label */}
              <div className="flex items-center justify-between z-10 pointer-events-none">
                <div className={`inline-flex items-center gap-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white ${
                  !swappedFeeds ? "px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs" : "px-2 py-0.5 text-[10px]"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${remoteStreamActive ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                  <span className="font-bold truncate max-w-[110px] sm:max-w-none">
                    {userRole === "DOCTOR" 
                      ? (appointment?.patient_name || "Patient") 
                      : (appointment?.doctor_name || "Physician")}
                  </span>
                  {swappedFeeds && (
                    <span className="text-[9px] text-emerald-400 font-semibold hidden sm:inline">(Tap to expand)</span>
                  )}
                </div>
                {swappedFeeds && (
                  <div className="w-5 h-5 rounded-full bg-slate-900/80 text-emerald-400 flex items-center justify-center border border-slate-700/80 group-hover:scale-110 transition-transform">
                    <ArrowLeftRight className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* REAL REMOTE VIDEO STREAM ELEMENT */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none ${
                  remoteStreamActive ? "opacity-100 z-0" : "opacity-0 -z-10"
                }`}
              />

              {/* Connecting / Standby Placeholder shown while waiting for peer stream */}
              {!remoteStreamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-4 text-center pointer-events-none">
                  <div className={`${!swappedFeeds ? "w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl mb-3" : "w-10 h-10 text-base mb-1"} rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shadow-xl animate-pulse`}>
                    {userRole === "DOCTOR" 
                      ? (appointment?.patient_name?.charAt(0) || "P")
                      : (appointment?.doctor_name?.charAt(0) || "D")}
                  </div>
                  <p className={`font-semibold text-slate-200 ${!swappedFeeds ? "text-sm" : "text-[11px] truncate max-w-[90px]"}`}>
                    {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient") : (appointment?.doctor_name || "Doctor")}
                  </p>
                  {!swappedFeeds && (
                    <>
                      <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Connecting clinical stream...
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        Keep camera and mic on while connecting.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Bottom Audio / Connection Status Indicator (Big view only) */}
              {!swappedFeeds && (
                <div className="z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 self-start text-[11px] text-slate-300 pointer-events-none">
                  <div className="flex items-center gap-0.5">
                    <span className={`w-1 h-2.5 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-bounce" : "bg-slate-600"}`} />
                    <span className={`w-1 h-4 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-bounce delay-75" : "bg-slate-600"}`} />
                    <span className={`w-1 h-3 rounded-full ${remoteStreamActive ? "bg-emerald-400 animate-bounce delay-150" : "bg-slate-600"}`} />
                  </div>
                  <span className="ml-1 text-[10px] font-medium">
                    {remoteStreamActive ? "Live WebRTC Audio & Video" : "Waiting for Peer Video"}
                  </span>
                </div>
              )}
            </div>

            {/* FEED B: LOCAL SELF PREVIEW (Doctor or Patient Self Feed) */}
            <div 
              onClick={() => {
                if (!swappedFeeds) setSwappedFeeds(true);
              }}
              className={`transition-all duration-300 ease-in-out ${
                swappedFeeds
                  ? "absolute inset-0 w-full h-full z-0 flex flex-col justify-between p-3 sm:p-4"
                  : "absolute top-3 right-3 sm:top-5 sm:right-5 w-28 sm:w-44 h-40 sm:h-60 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-white/95 z-20 overflow-hidden cursor-pointer active:scale-95 hover:border-emerald-400 group p-2 flex flex-col justify-between bg-slate-900"
              }`}
            >
              {/* Local Header Label */}
              <div className="flex items-center justify-between z-10 pointer-events-none">
                <div className={`inline-flex items-center gap-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white ${
                  swappedFeeds ? "px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs" : "px-2 py-0.5 text-[10px]"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${!videoDisabled && hasCameraAccess ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="font-bold">You</span>
                  {!swappedFeeds && (
                    <span className="text-[9px] text-emerald-400 font-semibold hidden sm:inline">(Tap to expand)</span>
                  )}
                </div>
                {!swappedFeeds && (
                  <div className="w-5 h-5 rounded-full bg-slate-900/80 text-emerald-400 flex items-center justify-center border border-slate-700/80 group-hover:scale-110 transition-transform">
                    <ArrowLeftRight className="w-2.5 h-2.5" />
                  </div>
                )}
                {audioMuted && swappedFeeds && (
                  <span className="p-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <MicOff className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* REAL LOCAL VIDEO STREAM ELEMENT (Muted to prevent audio feedback) */}
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
                  hasCameraAccess && !videoDisabled ? "opacity-100 z-0" : "opacity-0 -z-10"
                }`} 
              />

              {/* Local Fallback Preview Overlay */}
              {(!hasCameraAccess || videoDisabled) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-2 text-center z-5 pointer-events-none">
                  <div className={`${swappedFeeds ? "w-14 h-14" : "w-8 h-8"} rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold mb-1 shadow-inner`}>
                    <User className={`${swappedFeeds ? "w-7 h-7" : "w-4 h-4"} text-slate-400`} />
                  </div>
                  <p className={`font-semibold text-slate-200 ${swappedFeeds ? "text-xs" : "text-[10px]"}`}>
                    {videoDisabled ? "Camera Off" : "Audio Only"}
                  </p>
                </div>
              )}

              {/* Footer Indicator */}
              <div className="z-10 flex items-center justify-between w-full pointer-events-none">
                <span className="text-[10px] text-slate-400 font-mono">
                  {videoDisabled ? "Muted" : "Self Feed"}
                </span>
                {swappedFeeds && (
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">
                    {peerState === "connected" ? "Synced" : peerState}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Right Side Drawer / Mobile Slide-up Sheet: Direct In-Call Chat & Notes */}
          <AnimatePresence>
            {activeTab && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="w-full lg:w-96 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-between shadow-2xl z-40 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-14 max-lg:rounded-t-3xl max-lg:rounded-b-none max-lg:border-t max-lg:border-x-0 max-lg:border-b-0 lg:max-h-full"
              >
                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2.5 lg:hidden" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      {activeTab === "chat" ? (
                        <>
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <span>Direct Consultation Chat</span>
                        </>
                      ) : (
                        <>
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span>Encounter Details & Notes</span>
                        </>
                      )}
                    </h3>
                    {activeTab === "chat" && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Private messaging with {userRole === "DOCTOR" ? (appointment?.patient_name || "Patient") : (appointment?.doctor_name || "Physician")}
                      </p>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close Panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {activeTab === "chat" ? (
                  <>
                    <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 max-h-[calc(100vh-280px)] lg:max-h-[320px]">
                      {messages.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-10 space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                            <MessageSquare className="w-6 h-6 opacity-60" />
                          </div>
                          <p className="font-semibold text-slate-700">No in-call messages yet</p>
                          <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                            Send direct messages, vital readings, or clinical questions in real time.
                          </p>
                        </div>
                      ) : (
                        messages.map((m) => (
                          <div 
                            key={m.id} 
                            className={`p-3 rounded-2xl max-w-[85%] text-xs shadow-xs transition-all ${
                              m.sender_role === userRole 
                                ? "bg-emerald-600 text-white ml-auto rounded-br-xs shadow-emerald-600/15" 
                                : "bg-slate-100 text-slate-800 mr-auto rounded-bl-xs border border-slate-200/80"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-80 mb-1 gap-2 font-medium">
                              <span className="font-bold flex items-center gap-1">
                                {m.sender_role === "DOCTOR" && <Stethoscope className="w-3 h-3 text-emerald-300" />}
                                {m.sender_name || m.sender_username}
                              </span>
                              <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                          </div>
                        ))
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="pt-3 flex items-center gap-2 border-t border-slate-100">
                      <input
                        type="text"
                        placeholder="Type direct message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 transition-all shadow-inner"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !newMessage.trim()}
                        className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-all shadow-md shadow-emerald-600/20 flex-shrink-0 active:scale-95"
                        title="Send Message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs text-slate-600">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Chief Complaint / Booking Reason:</span>
                      <p className="text-slate-800 font-semibold">{appointment?.notes || "General checkup & clinical consult"}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Scheduled Time Slot:</span>
                      <p className="text-slate-800 font-medium">
                        {appointment?.slot_start_time ? new Date(appointment.slot_start_time).toLocaleString() : "Live Encounter"}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
                      💡 <strong>Clinical Tip:</strong> Once finished with the consultation, click <strong>"End Call"</strong> to mark the encounter completed and finalize your medical records.
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* BOTTOM FLOATING CONTROLS BAR: Modern WhatsApp/FaceTime Dock */}
        <div className="px-2 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 flex items-center justify-center z-30 flex-shrink-0">
          <footer className="p-2 sm:p-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-full sm:rounded-3xl flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-xl w-full">
            
            {/* Microphone Toggle */}
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-xs flex-shrink-0 ${
                audioMuted 
                  ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title={audioMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {audioMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-xs flex-shrink-0 ${
                videoDisabled 
                  ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title={videoDisabled ? "Turn Camera On" : "Turn Camera Off"}
            >
              {videoDisabled ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Tap-to-Swap Viewports Button */}
            <button
              onClick={() => setSwappedFeeds(prev => !prev)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-xs flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              title="Swap Big & Small Video Viewports"
            >
              <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </button>

            {/* Speaker Volume Booster (Louder Audio) */}
            <button
              onClick={cycleSpeakerBoost}
              className={`px-2.5 sm:px-3 h-10 sm:h-11 rounded-full transition-all shadow-xs flex items-center justify-center gap-1 flex-shrink-0 ${
                speakerBoost > 100 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold hover:bg-emerald-100 shadow-sm shadow-emerald-500/10" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title={`Speaker Volume: ${speakerBoost}% (Click to boost louder)`}
            >
              <Volume2 className={`w-4 h-4 sm:w-5 sm:h-5 ${speakerBoost > 100 ? "text-emerald-600 animate-pulse" : "text-slate-600"}`} />
              <span className="text-[10px] sm:text-[11px] font-bold">
                {speakerBoost > 100 ? `${speakerBoost}%` : "Vol"}
              </span>
            </button>

            {/* In-Call Chat Button */}
            <button
              onClick={() => setActiveTab(activeTab === "chat" ? null : "chat")}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-xs relative flex-shrink-0 ${
                activeTab === "chat" 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title="Direct In-Call Chat"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {messages.length > 0 && activeTab !== "chat" && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
              )}
            </button>

            {/* Clinical Notes Button */}
            <button
              onClick={() => setActiveTab(activeTab === "notes" ? null : "notes")}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full hidden xs:flex items-center justify-center transition-all shadow-xs flex-shrink-0 ${
                activeTab === "notes" 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title="Encounter Notes"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* End Consultation Button */}
            <button
              onClick={handleEndCall}
              className="px-3.5 sm:px-4 h-10 sm:h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 active:scale-95 flex-shrink-0 ml-0.5"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End</span>
            </button>

          </footer>
        </div>

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
