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
  Menu, 
  X,
  ShieldCheck,
  UserCheck
} from "lucide-react";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (role === "DOCTOR") {
      router.push("/doctor/dashboard");
    }
  }, [router]);

  const navItems = [
    { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
    { name: "Appointments", href: "/patient/appointments", icon: Calendar },
    { name: "Medical Records & EHR", href: "/patient/records", icon: FileText },
    { name: "AI Health Triage", href: "/patient/triage", icon: Bot },
    { name: "Emergency Vitals Pass", href: "/patient/emergency", icon: QrCode, isSpecial: true },
  ];

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        
        {/* MOBILE TOP BAR */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <Link href="/patient/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="font-heading font-extrabold text-lg text-slate-900 tracking-tight">
              Health<span className="text-emerald-600">Tech</span>
            </span>
          </Link>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE SLIDE-DOWN DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1.5 shadow-lg animate-in slide-in-from-top duration-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    isActive
                      ? item.isSpecial
                        ? "text-white bg-red-600 shadow-sm"
                        : "text-white bg-emerald-600 shadow-sm"
                      : item.isSpecial
                      ? "text-red-700 bg-red-50 hover:bg-red-100"
                      : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
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

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl font-semibold text-xs w-full mt-2 border-t border-slate-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        )}

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

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
