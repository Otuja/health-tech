"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { HeartPulse, Stethoscope, User, KeyRound, ShieldCheck, Lock } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);

        // Fetch user profile to determine role
        const profileRes = await fetch("http://localhost:8000/api/users/me/", {
          headers: { "Authorization": `Bearer ${data.access}` }
        });
        
        if (profileRes.ok) {
          const profile = await profileRes.json();
          localStorage.setItem("user_role", profile.role || "PATIENT");

          const displayName = profile.role === 'DOCTOR' 
            ? `Dr. ${profile.last_name || profile.username}` 
            : (profile.first_name || profile.username);
          toast.success(`Welcome back, ${displayName}!`);

          if (profile.role === 'DOCTOR') {
            router.push("/doctor/dashboard");
          } else if (profile.role === 'ADMIN' || profile.is_staff || profile.is_superuser) {
            router.push("/admin/dashboard");
          } else {
            router.push("/patient/dashboard");
          }
        } else {
          setError("Failed to fetch user profile.");
          toast.error("Failed to fetch user profile.");
        }
      } else {
        const msg = "Invalid credentials. Please verify username and password.";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Network error connecting to Django backend at http://localhost:8000.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-12 px-4 selection:bg-emerald-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-400/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-slate-200/80 z-10"
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 hover:scale-105 transition-transform shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Sign In to HealthTech
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            Access your verified Electronic Health Records & Clinical Consultations.
          </p>
        </div>

        {/* 1-Click Quick Demo Credentials Helper */}
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-2">
            <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
            <span>Instant 1-Click Test Credentials:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("doctor", "doctorpass123")}
              className="p-2.5 rounded-xl bg-white border border-emerald-200 text-left hover:border-emerald-500 transition-colors flex items-center gap-2 shadow-xs group"
            >
              <Stethoscope className="w-4 h-4 text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="font-bold block text-slate-800 text-xs">Dr. Sarah</span>
                <span className="text-[10px] text-slate-500">doctorpass123</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("patient", "patientpass123")}
              className="p-2.5 rounded-xl bg-white border border-emerald-200 text-left hover:border-emerald-500 transition-colors flex items-center gap-2 shadow-xs group"
            >
              <User className="w-4 h-4 text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="font-bold block text-slate-800 text-xs">Alex Murphy</span>
                <span className="text-[10px] text-slate-500">patientpass123</span>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Username
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. doctor or patient"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <input 
              type="password" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? "Signing in..." : "Sign In to Portal"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-slate-600 text-xs">
          New patient or clinician? <Link href="/register" className="text-emerald-700 font-bold hover:underline">Register an account</Link>
        </p>
      </motion.div>
    </div>
  );
}
