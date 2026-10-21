"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { HeartPulse, UserPlus, Stethoscope, User } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: Record<string, string> = { 
        username, 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName, 
        role 
      };
      if (role === 'DOCTOR') {
        payload.specialization = specialization;
      }
      
      const res = await fetch("http://localhost:8000/api/users/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Account registered successfully! Redirecting to login...");
        setTimeout(() => router.push("/login"), 1000);
      } else {
        const data = await res.json();
        const msg = typeof data === 'object' ? Object.values(data).flat().join(" ") : JSON.stringify(data);
        setError(msg);
        toast.error("Registration failed: " + msg);
      }
    } catch {
      const msg = "Network error connecting to Django server at http://localhost:8000.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-12 px-4 selection:bg-emerald-500 selection:text-white">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-2xl p-8 rounded-3xl shadow-xl border border-slate-200/80 z-10 my-4"
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 hover:scale-105 transition-transform shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Create an Account
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            Join HealthTech to access encrypted health records & specialist care.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">First Name</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Last Name</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Username</label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdoe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">I am registering as</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setRole("PATIENT"); setSpecialization(""); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  role === "PATIENT"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Patient</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("DOCTOR")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  role === "DOCTOR"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor</span>
              </button>
            </div>
          </div>
          
          {role === 'DOCTOR' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Medical Specialization</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Consultant Cardiologist"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/25 text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? "Creating Account..." : "Create Account"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-slate-600 text-xs">
          Already have an account? <Link href="/login" className="text-emerald-700 font-bold hover:underline">Sign in here</Link>
        </p>
      </motion.div>
    </div>
  );
}
