"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { clearAuth, API_BASE } from "@/lib/api";
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  ShieldCheck, 
  ExternalLink, 
  LogOut, 
  Menu, 
  X,
  Activity,
  Layers
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role === "DOCTOR") {
      router.push("/doctor/dashboard");
    } else if (role === "PATIENT") {
      router.push("/patient/dashboard");
    }
  }, [router]);

  const navItems = [
    { name: "Operations Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Doctor Credentialing", href: "/admin/doctors", icon: UserCheck },
    { name: "Patients & Registry", href: "/admin/patients", icon: Users },
  ];

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        
        {/* MOBILE TOP BAR */}
        <div className="md:hidden bg-slate-900 text-white border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg text-white tracking-tight">
                Health<span className="text-emerald-400">Tech</span>
              </span>
              <span className="block text-[9px] uppercase font-bold tracking-widest text-emerald-400 -mt-1">
                Admin Console
              </span>
            </div>
          </Link>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE SLIDE-DOWN DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white border-b border-slate-800 px-4 py-3 space-y-1.5 shadow-xl animate-in slide-in-from-top duration-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    isActive
                      ? "text-white bg-emerald-600 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <a
              href={`${API_BASE}/admin/`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-xs text-amber-300 hover:bg-amber-950/40 border border-amber-500/20"
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4" />
                <span>Django Backend Admin</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 text-red-400 hover:bg-red-950/40 px-4 py-2.5 rounded-xl font-semibold text-xs w-full mt-2 border-t border-slate-800"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        )}

        {/* DESKTOP SIDEBAR */}
        <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 p-6 hidden md:flex flex-col justify-between flex-shrink-0 h-screen sticky top-0">
          <div>
            <div className="mb-8">
              <Link href="/admin/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                    Health<span className="text-emerald-400">Tech</span>
                  </span>
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-400 -mt-0.5">
                    Admin & Operations
                  </span>
                </div>
              </Link>
            </div>

            <nav className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Platform Governance
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                      isActive
                        ? "text-white bg-emerald-600 shadow-sm shadow-emerald-900/40"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              <div className="pt-4">
                <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                  System Consoles
                </p>
                <a
                  href={`${API_BASE}/admin/`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs text-amber-300 hover:bg-amber-950/40 border border-amber-500/20 group transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Layers className="w-4 h-4" />
                    <span>Django Admin</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </nav>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                AD
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Administrator</p>
                <p className="text-[10px] text-emerald-400 font-medium">NDPR Compliance Officer</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 text-slate-400 hover:text-red-400 hover:bg-red-950/20 px-3.5 py-2.5 rounded-xl font-semibold text-xs w-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
