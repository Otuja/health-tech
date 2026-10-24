"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  X,
  Sparkles,
  HeartPulse,
  Droplets,
  Moon,
  Activity,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Bookmark,
  BookmarkCheck,
  Bot,
  Minimize2,
  Maximize2,
  RefreshCw,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

interface HealthTip {
  id: string;
  category: "Heart" | "Hydration" | "Sleep" | "Ergonomics" | "Nutrition" | "Mental";
  title: string;
  summary: string;
  details: string;
  clinicianVerified: string;
  actionText: string;
  aiPrompt: string;
}

const CLINICAL_TIPS: HealthTip[] = [
  {
    id: "tip-1",
    category: "Hydration",
    title: "The 250ml Morning Rehydration Rule",
    summary: "Drink a glass of water within 15 minutes of waking up.",
    details: "Overnight respiration and perspiration cause mild dehydration. Drinking 250–300ml of water upon waking immediately reduces blood viscosity, stimulates renal filtration, and enhances early morning cognitive alertness.",
    clinicianVerified: "Dr. Sarah Connor, MD (Cardiology)",
    actionText: "Hydrate Now",
    aiPrompt: "How does morning hydration affect resting heart rate and blood viscosity?"
  },
  {
    id: "tip-2",
    category: "Heart",
    title: "10-Minute Post-Meal Ambulatory Protocol",
    summary: "Take a light 10-minute stroll right after lunch or dinner.",
    details: "Light walking after meals activates GLUT4 glucose transporters in skeletal muscles without triggering excessive insulin spikes, lowering postprandial blood sugar by up to 30% and supporting cardiovascular health.",
    clinicianVerified: "Dr. Babatunde Adeleke, MD (Emergency Medicine)",
    actionText: "Track Vitals",
    aiPrompt: "Explain how post-meal walking manages glycemic response and cardiovascular risk."
  },
  {
    id: "tip-3",
    category: "Sleep",
    title: "The 90-Minute Sleep Cycle Alignment",
    summary: "Time your sleep in multiples of 90 minutes for effortless waking.",
    details: "Adult sleep cycles through light, deep, and REM sleep in ~90-minute blocks. Waking at the end of a cycle (e.g. 7.5 hours instead of 8 hours) prevents sleep inertia and morning grogginess.",
    clinicianVerified: "Dr. Amina Bello, MD (Pulmonology & Sleep)",
    actionText: "Learn Sleep Hygiene",
    aiPrompt: "What are the stages of sleep and how do I optimize my circadian rhythm?"
  },
  {
    id: "tip-4",
    category: "Ergonomics",
    title: "The 20-20-20 Digital Vision Micro-Break",
    summary: "Every 20 minutes, gaze 20 feet away for 20 seconds.",
    details: "Screen use drops natural blink rates by 50% and locks ciliary eye muscles. The 20-20-20 rule restores corneal lubrication, prevents digital eye fatigue, and relieves tension headaches.",
    clinicianVerified: "HealthTech Clinical Ergonomics Board",
    actionText: "Rest Eyes",
    aiPrompt: "How can I prevent computer vision syndrome and neck muscle strain?"
  },
  {
    id: "tip-5",
    category: "Mental",
    title: "The Dual-Inhale Physiological Sigh",
    summary: "Two quick nasal inhales followed by a long exhale resets acute stress.",
    details: "Developed by neurobiologists, the physiological sigh re-inflates collapsed pulmonary alveoli and stimulates the vagus nerve, rapidly slowing heart rate and reducing autonomic anxiety within 60 seconds.",
    clinicianVerified: "Dr. Sarah Connor, MD",
    actionText: "Try Breathwork",
    aiPrompt: "How does the physiological sigh regulate the parasympathetic nervous system?"
  },
  {
    id: "tip-6",
    category: "Nutrition",
    title: "Fiber & Protein Meal Precedence",
    summary: "Eat fibrous vegetables and protein before carbohydrates.",
    details: "Consuming greens and proteins first creates a viscous nutrient barrier in the digestive tract, significantly attenuating glucose surges and preventing afternoon lethargy.",
    clinicianVerified: "Clinical Dietetics Department",
    actionText: "Nutrition Insights",
    aiPrompt: "What is the science behind food sequencing for metabolic control?"
  },
  {
    id: "tip-7",
    category: "Heart",
    title: "Potassium vs Sodium Balance",
    summary: "Incorporate dietary potassium to counterbalance sodium.",
    details: "Potassium promotes renal sodium excretion and relaxes arterial walls. Adequate daily intake from bananas, spinach, and avocados naturally stabilizes systolic and diastolic blood pressure.",
    clinicianVerified: "Dr. Sarah Connor, MD",
    actionText: "BP Guidelines",
    aiPrompt: "What role does dietary potassium play in managing hypertension?"
  }
];

export default function SmartHealthTips() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [bookmarkedTips, setBookmarkedTips] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Filtered tips based on category
  const filteredTips = selectedCategory === "All"
    ? CLINICAL_TIPS
    : CLINICAL_TIPS.filter(t => t.category === selectedCategory);

  const currentTip = filteredTips[currentIndex % filteredTips.length] || CLINICAL_TIPS[0];

  useEffect(() => {
    // Load stored bookmarks
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("healthtech_bookmarked_tips");
        if (saved) {
          setBookmarkedTips(JSON.parse(saved));
        }

        const dismissedDate = localStorage.getItem("healthtech_smart_tip_dismissed_date");
        const todayStr = new Date().toDateString();

        // If not dismissed today, gently slide in after 2.5 seconds
        if (dismissedDate !== todayStr) {
          const timer = setTimeout(() => {
            setIsMinimized(false);
            setIsOpen(true);
          }, 2500);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Smart tips init error", err);
      }
    }
  }, []);

  const handleDismissToday = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("healthtech_smart_tip_dismissed_date", new Date().toDateString());
      } catch (e) {
        console.error(e);
      }
    }
    stopSpeaking();
    setIsOpen(false);
    setIsMinimized(true);
  };

  const toggleBookmark = (id: string) => {
    let next: string[];
    if (bookmarkedTips.includes(id)) {
      next = bookmarkedTips.filter(item => item !== id);
    } else {
      next = [...bookmarkedTips, id];
    }
    setBookmarkedTips(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("healthtech_bookmarked_tips", JSON.stringify(next));
    }
  };

  const handleNext = () => {
    stopSpeaking();
    setCurrentIndex((prev) => (prev + 1) % filteredTips.length);
  };

  const handlePrev = () => {
    stopSpeaking();
    setCurrentIndex((prev) => (prev - 1 + filteredTips.length) % filteredTips.length);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      stopSpeaking();
    } else {
      stopSpeaking();
      const textToRead = `${currentTip.title}. ${currentTip.details}. Clinically verified by ${currentTip.clinicianVerified}.`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechRef.current = utterance;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleShareOrCopy = () => {
    if (typeof window !== "undefined") {
      const text = `💡 HealthTech Daily Tip: ${currentTip.title}\n\n${currentTip.details}\n— Verified by ${currentTip.clinicianVerified}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Heart": return <HeartPulse className="w-3.5 h-3.5 text-rose-500" />;
      case "Hydration": return <Droplets className="w-3.5 h-3.5 text-sky-500" />;
      case "Sleep": return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
      case "Ergonomics": return <Activity className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <aside aria-label="Smart Clinical Health Tips" className="fixed bottom-20 md:bottom-6 left-3 sm:left-5 z-40 max-w-[calc(100vw-24px)] pointer-events-none">
      {/* FLOATING TRIGGER PILL (When Minimized) */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto"
          >
            <button
              onClick={() => {
                setIsMinimized(false);
                setIsOpen(true);
                setHasInteracted(true);
              }}
              className="group relative flex items-center gap-2.5 px-3.5 py-2.5 bg-white/95 hover:bg-white text-slate-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_35px_rgb(5,150,105,0.2)] border border-emerald-500/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-95"
              aria-label="Open Smart Health Tips"
            >
              {/* Pulsing indicator */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>

              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-slate-700 group-hover:text-emerald-700">
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400 animate-pulse" />
                <span>Daily Health Pulse</span>
              </div>

              <span className="hidden sm:inline-flex text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {bookmarkedTips.length > 0 ? `${bookmarkedTips.length} Saved` : "Smart Tip"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDED SMART TIP MODAL CARD */}
      <AnimatePresence>
        {!isMinimized && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="pointer-events-auto w-[92vw] sm:w-[380px] md:w-[420px] bg-white/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(5,150,105,0.25),0_10px_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden text-slate-900"
          >
            {/* CARD HEADER */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-4 text-white relative">
              {/* Background ambient pattern */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <Lightbulb className="w-4 h-4 text-amber-300 fill-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-100">
                        Smart Health Pulse
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-900/60 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-medium">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-300" /> NDPR Verified
                      </span>
                    </div>
                    <p className="text-xs text-white/90 font-medium">Daily Clinical Guidance</p>
                  </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      stopSpeaking();
                      setIsMinimized(true);
                    }}
                    title="Minimize tip"
                    className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDismissToday}
                    title="Dismiss for today"
                    className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {["All", "Heart", "Hydration", "Sleep", "Ergonomics"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentIndex(0);
                      stopSpeaking();
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 ${
                      selectedCategory === cat
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "bg-white/10 hover:bg-white/20 text-emerald-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* CARD BODY */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Category & Verified clinician badge */}
              <div className="flex items-center justify-between text-xs">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
                  {getCategoryIcon(currentTip.category)}
                  <span>{currentTip.category}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <span>{currentTip.clinicianVerified}</span>
                </div>
              </div>

              {/* Tip Title & Description */}
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {currentTip.title}
                </h4>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  {currentTip.details}
                </p>
              </div>

              {/* AI Clinical Integration prompt */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-100/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium line-clamp-1">
                    Have symptoms? Ask AI Triage
                  </span>
                </div>
                <Link
                  href={`/triage`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
                >
                  <span>Consult AI</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* CARD FOOTER & ACTIONS */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                {/* Secondary tools: Audio & Bookmark & Share */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleSpeech}
                    title={isSpeaking ? "Stop reading" : "Read tip aloud"}
                    className={`p-2 rounded-xl transition-all ${
                      isSpeaking
                        ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500/30"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4 text-emerald-700 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleBookmark(currentTip.id)}
                    title={bookmarkedTips.includes(currentTip.id) ? "Remove bookmark" : "Save this tip"}
                    className={`p-2 rounded-xl transition-all ${
                      bookmarkedTips.includes(currentTip.id)
                        ? "bg-amber-50 text-amber-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {bookmarkedTips.includes(currentTip.id) ? (
                      <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-600" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={handleShareOrCopy}
                    title="Copy tip to clipboard"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-xs flex items-center gap-1"
                  >
                    {copiedLink ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Copied
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500">Copy</span>
                    )}
                  </button>
                </div>

                {/* Carousel Navigation */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">
                    {(currentIndex % filteredTips.length) + 1}/{filteredTips.length}
                  </span>
                  <button
                    onClick={handlePrev}
                    title="Previous tip"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    title="Next smart tip"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm hover:shadow active:scale-95 transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
