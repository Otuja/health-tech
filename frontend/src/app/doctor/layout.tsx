"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { clearAuth } from "@/lib/api";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  LogOut, 
  Stethoscope, 
  Menu, 
  X,
  ShieldAlert,
  User
} from "lucide-react";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (role === "PATIENT") {
      router.push("/patient/dashboard");
    }
  }, [router]);

  const navItems = [
    { name: "Clinical Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { name: "My Schedule & Slots", href: "/doctor/appointments", icon: Calendar },
    { name: "Assigned Patients", href: "/doctor/patients", icon: Users },
    { name: "Medical Records & Patient EHR", href: "/doctor/records", icon: FileText },
    { name: "Doctor Profile & Credentials", href: "/doctor/profile", icon: User },
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
          <Link href="/doctor/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-heading font-extrabold text-lg text-white tracking-tight">
              Health<span className="text-emerald-400">Tech</span>
            </span>
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
              <Link href="/doctor/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                    Health<span className="text-emerald-400">Tech</span>
                  </span>
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-400 -mt-0.5">
                    Clinician Portal
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
                    className={`flex items-center space-x-3 px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                      isActive
                        ? "text-white bg-emerald-600 shadow-md shadow-emerald-600/30 font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-3">
            <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Medical License Verified</span>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 text-red-400 hover:bg-red-950/40 hover:text-red-300 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors w-full"
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
