"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";

export default function AppSplashScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing clinical gateway...");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running as installed standalone PWA
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // Splash screen is strictly for installed mobile PWA standalone launch, not regular web browsing
    if (!isStandalone) {
      return;
    }

    // Check if splash was already shown in this standalone session
    const hasSeenSplash = sessionStorage.getItem("healthtech_pwa_splash_seen");
    if (hasSeenSplash) {
      return;
    }

    // Only launch splash if launching at root
    if (pathname === "/") {
      setShowSplash(true);
      sessionStorage.setItem("healthtech_pwa_splash_seen", "true");

      const startTime = Date.now();
      const duration = 1200;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min(Math.round((elapsed / duration) * 100), 100);
        setProgress(currentProgress);

        if (currentProgress < 40) {
          setStatusText("Establishing NDPR encrypted session...");
        } else if (currentProgress < 80) {
          setStatusText("Verifying clinical credentials...");
        } else {
          setStatusText("Launching HealthTech portal...");
        }

        if (elapsed >= duration) {
          clearInterval(interval);
          setTimeout(() => {
            setShowSplash(false);
          }, 200);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [pathname]);

  if (!showSplash) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="mobile-app-splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.03 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-8 select-none overflow-hidden"
      >
        {/* Dynamic Background Ambient Lighting */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-emerald-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-teal-500/20 blur-[130px] pointer-events-none" />

        {/* Top Minimal Security Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-emerald-400 font-mono tracking-wider z-10"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>NDPR 256-BIT ENCRYPTED</span>
        </motion.div>

        {/* Central Brand Identity & Heartbeat Rhythm */}
        <div className="flex flex-col items-center text-center z-10 my-auto">
          {/* Animated Medical Halo & Pulse */}
          <div className="relative mb-6">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.7, 0.35]
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 blur-xl opacity-40"
            />
            
            <motion.div 
              animate={{ scale: [1, 1.08, 1, 1.05, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, times: [0, 0.15, 0.3, 0.45, 1] }}
              className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 border border-emerald-300/30"
            >
              <HeartPulse className="w-12 h-12" />
            </motion.div>
          </div>

          {/* Animated SVG Electrocardiogram (ECG) Rhythm */}
          <div className="w-48 h-10 mb-4 flex items-center justify-center opacity-80">
            <svg viewBox="0 0 200 40" className="w-full h-full stroke-emerald-400 fill-none stroke-2">
              <motion.path
                d="M 0 20 L 50 20 L 60 10 L 70 30 L 80 5 L 90 35 L 100 20 L 110 20 L 120 15 L 130 25 L 140 20 L 200 20"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading"
          >
            Health<span className="text-emerald-400">Tech</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xs font-medium"
          >
            Clinical Telemedicine & AI Triage Platform
          </motion.p>
        </div>

        {/* Bottom Loading Bar & Native App Status */}
        <div className="w-full max-w-xs flex flex-col items-center gap-2.5 z-10 pb-4">
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-500 font-medium">
            <span className="truncate pr-2">{statusText}</span>
            <span className="font-mono text-emerald-400 flex-shrink-0">{progress}%</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
