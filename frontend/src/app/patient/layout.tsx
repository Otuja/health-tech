"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { clearAuth } from "@/lib/api";
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Bot, 
  QrCode, 
  LogOut, 
  HeartPulse, 
  ShieldCheck,
  ShieldAlert,
  User,
  Sparkles
} from "lucide-react";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (role === "DOCTOR") {
      router.push("/doctor/dashboard");
    }
  }, [router]);

interface NavItem {
  name: string;
  shortName: string;
  href: string;
  icon: any;
  isCenter?: boolean;
  isSpecial?: boolean;
}

  const navItems: NavItem[] = [
    { name: "Dashboard", shortName: "Home", href: "/patient/dashboard", icon: LayoutDashboard },
    { name: "Appointments", shortName: "Visits", href: "/patient/appointments", icon: Calendar },
    { name: "AI Symptom Triage", shortName: "AI Triage", href: "/patient/triage", icon: Bot, isCenter: true },
    { name: "Medical Records & EHR", shortName: "Records", href: "/patient/records", icon: FileText },
    { name: "My Profile & Health", shortName: "Profile", href: "/patient/profile", icon: User },
  ];

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased">
        
        {/* MOBILE TOP APP BAR (iOS / Android Native Feel) */}
        <header className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <Link href="/patient/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base text-slate-900 tracking-tight leading-none block">
                Health<span className="text-emerald-600">Tech</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-700">
                Patient App
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick Emergency Pass Pill */}
            <Link
              href="/patient/emergency"
              className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>SOS Pass</span>
            </Link>

            {/* Quick Log Out */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* DESKTOP SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200/80 p-6 hidden md:flex flex-col justify-between flex-shrink-0 h-screen sticky top-0">
          <div>
            <div className="mb-8">
              <Link href="/patient/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-heading font-extrabold text-xl text-slate-900 tracking-tight">
                    Health<span className="text-emerald-600">Tech</span>
                  </span>
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-700 -mt-0.5">
                    Patient Portal
                  </span>
                </div>
              </Link>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                      isActive
                        ? item.isSpecial
                          ? "text-white bg-red-600 shadow-md shadow-red-600/25"
                          : "text-white bg-emerald-600 shadow-md shadow-emerald-600/25"
                        : item.isSpecial
                        ? "text-red-700 bg-red-50 hover:bg-red-100/80"
                        : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.isSpecial && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-3">
            <Link
              href="/patient/emergency"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors text-xs font-bold"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Emergency SOS Pass</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            </Link>

            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>NDPR Protected Session</span>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA (Padding-bottom for docked mobile tab bar) */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {children}
        </main>

        {/* NATIVE MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly PWA experience) */}
        <nav 
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-around max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              // Center Action Button (AI Triage)
              if (item.isCenter) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center relative -top-3 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                      isActive 
                        ? "bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-emerald-500/40 ring-4 ring-emerald-100" 
                        : "bg-slate-900 text-white shadow-slate-900/30 group-hover:bg-emerald-600"
                    }`}>
                      <Icon className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className={`text-[10px] font-bold mt-1 tracking-tight ${
                      isActive ? "text-emerald-700" : "text-slate-600"
                    }`}>
                      {item.shortName}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                    isActive 
                      ? item.isSpecial
                        ? "text-red-600 font-bold"
                        : "text-emerald-600 font-bold" 
                      : item.isSpecial
                      ? "text-red-700 hover:text-red-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.isSpecial && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-red-600 absolute -top-0.5 -right-0.5 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium leading-none">
                    {item.shortName}
                  </span>
                  {isActive && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      item.isSpecial ? "bg-red-600" : "bg-emerald-600"
                    }`} />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
