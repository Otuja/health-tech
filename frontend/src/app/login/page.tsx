"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { HeartPulse, Lock, Server, Cloud, RefreshCw, CheckCircle2, ArrowRight, Eye, EyeOff, Mail, User } from "lucide-react";
import { getApiBase, setApiBase, PROD_API_URL, LOCAL_API_URL, checkBackendHealth } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeApi, setActiveApi] = useState<string>("");
  const [isLocalOnline, setIsLocalOnline] = useState<boolean | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const current = getApiBase();
    setActiveApi(current);

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
    if (token && role) {
      setCurrentUserRole(role);
    }

    // Check health of local backend
    checkBackendHealth(LOCAL_API_URL).then((online) => {
      setIsLocalOnline(online);
    }).catch(() => setIsLocalOnline(false));
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    setCurrentUserRole(null);
    toast.info("Signed out. You can now log in with a new account.");
  };

  const getDashboardPath = (role: string) => {
    if (role === "DOCTOR") return "/doctor/dashboard";
    if (role === "ADMIN") return "/admin/dashboard";
    return "/patient/dashboard";
  };

  const toggleBackend = (targetUrl: string) => {
    setApiBase(targetUrl);
    setActiveApi(targetUrl);
    toast.info(`Switched API endpoint to ${targetUrl.includes("localhost") ? "Local Backend" : "Cloud Backend (Render)"}`);
  };

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    
    let currentApi = getApiBase();

    const attemptLogin = async (baseUrl: string): Promise<boolean> => {
      const res = await fetch(`${baseUrl}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid credentials. Please verify your username and password.");
          toast.error("Invalid credentials.");
          return true; // Request reached server, so no network fallback needed
        }
        return false;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      // Fetch user profile to determine role
      const profileRes = await fetch(`${baseUrl}/api/users/me/`, {
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
        return true;
      } else {
        setError("Failed to fetch user profile.");
        toast.error("Failed to fetch user profile.");
        return true;
      }
    };

    try {
      const handled = await attemptLogin(currentApi);
      if (!handled && currentApi !== PROD_API_URL) {
        // Fallback to cloud
        toast.info("Connecting to Cloud Backend (Render)...");
        const fallbackHandled = await attemptLogin(PROD_API_URL);
        if (fallbackHandled) {
          setApiBase(PROD_API_URL);
          setActiveApi(PROD_API_URL);
        }
      }
    } catch {
      // Network failure on current backend
      if (currentApi !== PROD_API_URL) {
        try {
          toast.info("Local backend offline. Auto-fallback to Cloud Backend (Render)...");
          const fallbackSuccess = await attemptLogin(PROD_API_URL);
          if (fallbackSuccess) {
            setApiBase(PROD_API_URL);
            setActiveApi(PROD_API_URL);
            return;
          }
        } catch {
          // Cloud also failed
        }
      }
      const msg = `Unable to reach backend. Please ensure the backend is running.`;
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isLocalActive = activeApi.includes("localhost") || activeApi.includes("127.0.0.1");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 selection:bg-emerald-500 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/90 z-10"
      >
        <div className="text-center mb-5">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 hover:scale-105 transition-transform shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Sign In to HealthTech
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            Access your verified Electronic Health Records & Clinical Consultations.
          </p>
        </div>

        {/* Backend Status Selector */}
        <div className="mb-5 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLocalActive ? (isLocalOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-amber-500") : "bg-sky-500"}`} />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-slate-700">
                {isLocalActive ? "Local Backend" : "Cloud Backend (Render)"}
              </span>
              <p className="text-slate-500 text-[10px] truncate max-w-[170px]">
                {activeApi || LOCAL_API_URL}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleBackend(isLocalActive ? PROD_API_URL : LOCAL_API_URL)}
            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm flex items-center gap-1"
          >
            {isLocalActive ? <Cloud className="w-3 h-3 text-sky-600" /> : <Server className="w-3 h-3 text-emerald-600" />}
            <span>Use {isLocalActive ? "Cloud" : "Local"}</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span>{error}</span>
            </div>
            {isLocalActive && (
              <button
                type="button"
                onClick={() => {
                  toggleBackend(PROD_API_URL);
                  setError("");
                }}
                className="text-[11px] font-bold text-red-800 underline hover:text-red-900 text-left mt-0.5"
              >
                Switch to Live Cloud Backend (Render) & Retry →
              </button>
            )}
          </div>
        )}

        {currentUserRole && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Signed in as <strong className="uppercase font-bold">{currentUserRole}</strong></span>
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 underline"
              >
                Sign Out
              </button>
            </div>
            <Link
              href={getDashboardPath(currentUserRole)}
              className="w-full py-2 px-3 bg-emerald-600 text-white rounded-lg font-bold text-center hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-[10px] text-slate-500 text-center">
              Or enter credentials below to switch accounts.
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address or Username
            </label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. patient@example.com or patient"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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

        {/* Quick Demo Credentials */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider text-center">
            Quick Fill Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillCredentials("doctor", "doctorpass123")}
              className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-center"
            >
              👨‍⚕️ Doctor
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("patient", "patientpass123")}
              className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-center"
            >
              🧑‍💼 Patient
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("admin", "adminpass123")}
              className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-center"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-slate-600 text-xs">
          New patient or clinician? <Link href="/register" className="text-emerald-700 font-bold hover:underline">Register an account</Link>
        </p>
      </motion.div>
    </div>
  );
}
