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
  Layers,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role === "DOCTOR") {
      router.push("/doctor/dashboard");
    } else if (role === "PATIENT") {
      router.push("/patient/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem("healthtech_admin_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("healthtech_admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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

        {/* DESKTOP SIDEBAR (Sticky & Collapsible Rail) */}
        <aside 
          className={`bg-slate-900 text-white border-r border-slate-800 hidden md:flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 self-start z-30 transition-[width,padding] duration-300 ease-in-out ${
            isCollapsed ? "w-20 p-3" : "w-64 p-5"
          }`}
        >
          <div className="flex flex-col min-h-0">
            {/* Top Brand & Toggle Header */}
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <Link 
                  href="/admin/dashboard" 
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 active:scale-95 transition-transform"
                  title="Admin Dashboard"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-200" />
                </Link>
                <button
                  onClick={toggleSidebar}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                  title="Expand Sidebar"
                  aria-label="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div className="truncate">
                    <span className="font-heading font-extrabold text-xl text-white tracking-tight block leading-tight">
                      Health<span className="text-emerald-400">Tech</span>
                    </span>
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-400 -mt-0.5">
                      Admin & Operations
                    </span>
                  </div>
                </Link>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Navigation Items */}
            <nav className="space-y-1.5 overflow-y-auto no-scrollbar flex-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                  Platform Governance
                </p>
              )}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                if (isCollapsed) {
                  return (
                    <div key={item.href} className="relative group flex justify-center">
                      <Link
                        href={item.href}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? "text-white bg-emerald-600 shadow-sm shadow-emerald-900/40"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                        }`}
                        title={item.name}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                      {/* Floating Tooltip */}
                      <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 border border-slate-700">
                        {item.name}
                      </div>
                    </div>
                  );
                }

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
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}

              {/* Django Admin Link */}
              <div className="pt-3">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                    System Consoles
                  </p>
                )}
                {isCollapsed ? (
                  <div className="relative group flex justify-center">
                    <a
                      href={`${API_BASE}/admin/`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-amber-300 hover:bg-amber-950/40 border border-amber-500/20 transition-all"
                      title="Django Backend Admin"
                    >
                      <Layers className="w-5 h-5" />
                    </a>
                    <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-amber-200 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 border border-slate-700">
                      Django Backend Admin
                    </div>
                  </div>
                ) : (
                  <a
                    href={`${API_BASE}/admin/`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs text-amber-300 hover:bg-amber-950/40 border border-amber-500/20 group transition-all"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Layers className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Django Admin</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                )}
              </div>
            </nav>
          </div>

          {/* Bottom Area (Admin info & Logout) */}
          <div className={`space-y-2.5 pt-4 border-t border-slate-800 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
            {isCollapsed ? (
              <>
                {/* Admin avatar */}
                <div className="relative group">
                  <div
                    className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30"
                    title="Administrator (NDPR Compliance Officer)"
                  >
                    AD
                  </div>
                  <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 border border-slate-700">
                    Administrator
                  </div>
                </div>

                {/* Logout button */}
                <div className="relative group">
                  <button
                    onClick={handleLogout}
                    className="w-11 h-11 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 flex items-center justify-center transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                  <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 border border-slate-700">
                    Sign Out
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    AD
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold text-white truncate">Administrator</p>
                    <p className="text-[10px] text-emerald-400 font-medium truncate">NDPR Compliance Officer</p>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-3 text-slate-400 hover:text-red-400 hover:bg-red-950/20 px-3.5 py-2.5 rounded-xl font-semibold text-xs w-full transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Sign out</span>
                </button>
              </>
            )}
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav
          aria-label="Admin Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/80 px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        >
          <div className="flex items-center justify-around max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                    isActive
                      ? "text-emerald-400 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium leading-none">
                    {item.name.split(" ")[0]}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />
                  )}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium leading-none">Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
