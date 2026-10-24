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
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  GripHorizontal,
  Move
} from "lucide-react";
import { getApiBase } from "@/lib/api";

export interface HealthTip {
  id: string;
  category: "Heart" | "Hydration" | "Sleep" | "Ergonomics" | "Nutrition" | "Mental" | "Immunity" | string;
  title: string;
  summary: string;
  details: string;
  clinicianVerified: string;
  actionText: string;
  aiPrompt: string;
}

// Built-in intelligent fallback tips in case of network interruption
const DEFAULT_AI_TIPS: HealthTip[] = [
  {
    id: "tip-1",
    category: "Hydration",
    title: "The 250ml Morning Rehydration Rule",
    summary: "Drink a tall glass of water within 15 minutes of waking.",
    details: "Overnight respiration and perspiration cause subclinical dehydration. Drinking 250–300ml of water upon waking immediately reduces blood viscosity, stimulates glomerular filtration, and counters early morning cognitive fatigue.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "Hydrate Now",
    aiPrompt: "How does morning hydration affect resting heart rate and blood viscosity?"
  },
  {
    id: "tip-2",
    category: "Heart",
    title: "10-Minute Post-Meal Ambulatory Protocol",
    summary: "Take a light 10-minute stroll right after lunch or dinner.",
    details: "Light walking after meals activates GLUT4 glucose transporters in skeletal muscle without requiring excessive insulin, attenuating postprandial blood sugar spikes by up to 30% and supporting arterial elasticity.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "Track Vitals",
    aiPrompt: "Explain how post-meal walking manages glycemic response and cardiovascular risk."
  },
  {
    id: "tip-3",
    category: "Sleep",
    title: "Circadian 90-Minute Sleep Cycle Alignment",
    summary: "Time your sleep in multiples of 90 minutes for effortless waking.",
    details: "Adult sleep alternates between NREM and REM stages in ~90-minute blocks. Waking at cycle boundaries (e.g. 7.5 hours rather than 8 hours) prevents sleep inertia and grogginess.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "Learn Sleep Hygiene",
    aiPrompt: "What are the stages of sleep and how do I optimize my circadian rhythm?"
  },
  {
    id: "tip-4",
    category: "Ergonomics",
    title: "The 20-20-20 Digital Vision Micro-Break",
    summary: "Every 20 minutes, gaze 20 feet away for 20 seconds.",
    details: "Screen use reduces normal blink frequency by 50% and locks ciliary eye muscles. The 20-20-20 protocol restores corneal moisture, prevents eye fatigue, and relieves tension headaches.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "Rest Eyes",
    aiPrompt: "How can I prevent computer vision syndrome and neck muscle strain?"
  },
  {
    id: "tip-5",
    category: "Mental",
    title: "The Dual-Inhale Physiological Sigh",
    summary: "Two quick nasal inhales followed by a long exhale resets acute stress.",
    details: "Developed by neurophysiologists, this pattern pops open collapsed pulmonary alveoli and stimulates the vagus nerve, rapidly lowering acute cortisol and resting pulse within 60 seconds.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "Try Breathwork",
    aiPrompt: "How does the physiological sigh regulate the parasympathetic nervous system?"
  },
  {
    id: "tip-6",
    category: "Nutrition",
    title: "Fiber & Protein Meal Precedence",
    summary: "Eat fibrous greens and protein before refined carbohydrates.",
    details: "Consuming greens and proteins first creates a viscous nutrient barrier in the digestive tract, slowing gastric emptying and preventing mid-afternoon energy crashes.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "Nutrition Insights",
    aiPrompt: "What is the science behind food sequencing for metabolic control?"
  },
  {
    id: "tip-7",
    category: "Heart",
    title: "Potassium vs Sodium Arterial Balance",
    summary: "Incorporate dietary potassium to counterbalance sodium.",
    details: "Potassium promotes renal sodium excretion and relaxes arterial walls. Adequate daily intake from bananas, spinach, and avocados naturally stabilizes systolic and diastolic blood pressure.",
    clinicianVerified: "HealthTech Gemini AI Clinical Engine",
    actionText: "BP Guidelines",
    aiPrompt: "What role does dietary potassium play in managing hypertension?"
  }
];

export default function SmartHealthTips() {
  const [tips, setTips] = useState<HealthTip[]>(DEFAULT_AI_TIPS);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [bookmarkedTips, setBookmarkedTips] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch dynamic AI tips from backend
  const fetchAiTips = async (forceRefresh: boolean = false) => {
    setIsLoadingAi(true);
    try {
      const base = getApiBase();
      const url = `${base}/api/triage/smart-tips/${forceRefresh ? "?refresh=1" : ""}`;
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const data = await res.json();
        if (data.tips && Array.isArray(data.tips) && data.tips.length > 0) {
          setTips(data.tips);
          setIsAiGenerated(true);
          setCurrentIndex(0);
          if (typeof window !== "undefined") {
            localStorage.setItem("healthtech_ai_tips_cache", JSON.stringify({
              date: new Date().toDateString(),
              tips: data.tips
            }));
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote AI tips, using dynamic daily rotation:", err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Load bookmarks
        const savedBookmarks = localStorage.getItem("healthtech_bookmarked_tips");
        if (savedBookmarks) {
          setBookmarkedTips(JSON.parse(savedBookmarks));
        }

        // Check if tips for today are already cached locally
        const cachedStr = localStorage.getItem("healthtech_ai_tips_cache");
        const todayStr = new Date().toDateString();
        let shouldFetch = true;

        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            if (cached.date === todayStr && cached.tips && cached.tips.length > 0) {
              setTips(cached.tips);
              setIsAiGenerated(true);
              shouldFetch = false;
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (shouldFetch) {
          fetchAiTips(false);
        }

        // Auto slide in after 2.5s if not dismissed today
        const dismissedDate = localStorage.getItem("healthtech_smart_tip_dismissed_date");
        if (dismissedDate !== todayStr) {
          const timer = setTimeout(() => {
            setIsMinimized(false);
            setIsOpen(true);
          }, 2500);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Smart tips init error:", err);
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

  // Filtered tips
  const filteredTips = selectedCategory === "All"
    ? tips
    : tips.filter(t => t.category.toLowerCase() === selectedCategory.toLowerCase());

  const currentTip = filteredTips[currentIndex % (filteredTips.length || 1)] || tips[0] || DEFAULT_AI_TIPS[0];

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
      const textToRead = `${currentTip.title}. ${currentTip.details}.`;
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
      const text = `💡 HealthTech Daily AI Tip: ${currentTip.title}\n\n${currentTip.details}\n— Generated by HealthTech AI`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "heart": return <HeartPulse className="w-3.5 h-3.5 text-rose-500" />;
      case "hydration": return <Droplets className="w-3.5 h-3.5 text-sky-500" />;
      case "sleep": return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
      case "ergonomics": return <Activity className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <aside
      aria-label="Smart Clinical Health Tips"
      className="fixed bottom-20 md:bottom-6 left-3 sm:left-5 z-40 max-w-[calc(100vw-24px)]"
    >
      {/* FLOATING DRAGGABLE TRIGGER PILL (When Minimized) */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            whileDrag={{ scale: 1.05, cursor: "grabbing" }}
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="cursor-grab active:cursor-grabbing select-none"
            title="Drag anywhere on screen to reposition"
          >
            <div className="relative group flex items-center gap-2 pl-2 pr-3.5 py-2 bg-white/95 hover:bg-white text-slate-800 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.15)] hover:shadow-[0_14px_40px_rgba(5,150,105,0.25)] border border-emerald-500/40 backdrop-blur-md transition-all">
              {/* Drag Handle Indicator */}
              <div className="flex items-center text-slate-400 group-hover:text-emerald-600 transition-colors pl-1">
                <GripHorizontal className="w-3.5 h-3.5" />
              </div>

              {/* Pulsing AI Indicator */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>

              <button
                onClick={() => {
                  setIsMinimized(false);
                  setIsOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-slate-800 group-hover:text-emerald-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 animate-pulse" />
                <span>AI Health Pulse</span>
              </button>

              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>{tips.length} Tips</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDED DRAGGABLE SMART TIP CARD */}
      <AnimatePresence>
        {!isMinimized && isOpen && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.06}
            whileDrag={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="w-[92vw] sm:w-[390px] md:w-[430px] bg-white/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(5,150,105,0.3),0_10px_25px_-5px_rgba(0,0,0,0.12)] overflow-hidden text-slate-900 select-text"
          >
            {/* TACTILE DRAG HANDLE BAR */}
            <div
              className="cursor-grab active:cursor-grabbing bg-emerald-800 hover:bg-emerald-800/90 py-1 px-4 flex items-center justify-between text-emerald-200 text-[10px] font-medium border-b border-emerald-700/50 select-none transition-colors"
              title="Click and drag anywhere to move this window"
            >
              <div className="flex items-center gap-1.5 opacity-90">
                <Move className="w-3 h-3 text-emerald-300" />
                <span>Drag to reposition anywhere</span>
              </div>
              <span className="text-[9px] text-emerald-300 font-mono">
                {isLoadingAi ? "AI Generating..." : "Active"}
              </span>
            </div>

            {/* CARD HEADER */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-4 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-100">
                        AI Daily Health Pulse
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-900/70 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-medium">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-300" /> Auto-Rotating
                      </span>
                    </div>
                    <p className="text-xs text-white/90 font-medium">
                      {tips.length} fresh clinical insights for today
                    </p>
                  </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1">
                  {/* Refresh Fresh AI Tips Button */}
                  <button
                    onClick={() => fetchAiTips(true)}
                    disabled={isLoadingAi}
                    title="Generate brand new AI tips right now"
                    className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? "animate-spin text-amber-300" : ""}`} />
                  </button>

                  <button
                    onClick={() => {
                      stopSpeaking();
                      setIsMinimized(true);
                    }}
                    title="Minimize tip"
                    className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleDismissToday}
                    title="Dismiss for today"
                    className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {["All", "Heart", "Hydration", "Sleep", "Ergonomics", "Nutrition", "Mental"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentIndex(0);
                      stopSpeaking();
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
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
              {/* Category & Verified AI badge */}
              <div className="flex items-center justify-between text-xs">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
                  {getCategoryIcon(currentTip.category)}
                  <span>{currentTip.category}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Gemini Clinical AI</span>
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

              {/* Direct AI Consultation Link */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-100/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium line-clamp-1">
                    Ask AI about this topic
                  </span>
                </div>
                <Link
                  href={`/triage?q=${encodeURIComponent(currentTip.aiPrompt || currentTip.title)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
                >
                  <span>Ask AI</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* CARD FOOTER & ACTIONS */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                {/* Secondary tools: Audio & Bookmark & Copy */}
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
                    {(currentIndex % (filteredTips.length || 1)) + 1}/{filteredTips.length || 1}
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
