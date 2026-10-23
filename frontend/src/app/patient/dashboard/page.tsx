"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Calendar, 
  FileText, 
  Bot, 
  QrCode, 
  ArrowRight, 
  Clock, 
  User, 
  ShieldCheck, 
  Activity,
  FolderPlus,
  Stethoscope,
  HeartPulse,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { authFetch } from "@/lib/api";

interface AppointmentItem {
  id: number;
  doctor: number;
  doctor_name?: string;
  doctor_specialization?: string;
  notes?: string;
  slot_start_time?: string;
  slot_end_time?: string;
  status?: string;
  created_at?: string;
}

interface MedicalRecordItem {
  id: number;
  diagnosis: string;
  doctor_name?: string;
  doctor_specialization?: string;
  created_at: string;
}

interface PatientDocumentItem {
  id: number;
  title: string;
  category_display: string;
  facility_or_doctor: string;
  created_at: string;
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch Appointments
      const apptRes = await authFetch("/api/appointments/appointments/");
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        setAppointments(apptData);
      }

      // Fetch Medical Records
      const recordsRes = await authFetch("/api/records/medical-records/");
      if (recordsRes.ok) {
        const recData = await recordsRes.json();
        setRecords(recData);
      }

      // Fetch Patient Uploaded EHR Documents
      const docRes = await authFetch("/api/records/documents/");
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocuments(docData);
      }
    } catch (e) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 3 seconds for instant updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 3000);

    const onSync = () => fetchDashboardData();
    window.addEventListener("focus", onSync);
    document.addEventListener("visibilitychange", onSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      document.removeEventListener("visibilitychange", onSync);
    };
  }, [fetchDashboardData]);

  const nextAppointment = appointments.find(a => a.status === "SCHEDULED" || a.status === "IN_PROGRESS") || null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-6xl mx-auto pb-12"
    >
      {/* Top Banner / Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-400/30">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Patient Medical Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
            Welcome to Your Health Center
          </h1>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Manage your doctor appointments, view lab diagnostic findings, and ensure your emergency first-responder pass is up to date.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 sm:gap-2.5">
          <Link
            href="/patient/appointments"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl sm:rounded-2xl font-bold transition-all shadow-md text-xs active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Visit</span>
          </Link>
          <Link
            href="/patient/records"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl sm:rounded-2xl font-bold transition-all text-xs active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Upload EHR</span>
          </Link>
        </div>
      </header>

      {/* MOBILE QUICK ACTION CAROUSEL (Mobile App Launcher) */}
      <div className="md:hidden flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -my-3">
        <Link
          href="/patient/triage"
          className="flex-1 min-w-[130px] p-3 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white shadow-md shadow-emerald-700/20 flex flex-col justify-between active:scale-95 transition-transform"
        >
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-2">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">AI Triage</span>
            <span className="text-xs font-bold block leading-tight">Check Symptoms</span>
          </div>
        </Link>

        <Link
          href="/patient/emergency"
          className="flex-1 min-w-[130px] p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-md shadow-red-600/20 flex flex-col justify-between active:scale-95 transition-transform"
        >
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-2">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-red-200 uppercase font-bold tracking-wider block">Offline SOS</span>
            <span className="text-xs font-bold block leading-tight">Emergency Pass</span>
          </div>
        </Link>

        <Link
          href="/patient/appointments"
          className="flex-1 min-w-[130px] p-3 rounded-2xl bg-slate-900 text-white shadow-md flex flex-col justify-between active:scale-95 transition-transform"
        >
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Doctors</span>
            <span className="text-xs font-bold block leading-tight">Book Visit</span>
          </div>
        </Link>
      </div>

      {/* Top Metric Cards (Mobile 2x2 App Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Booked Visits</h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{loading ? "..." : appointments.length}</p>
            <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-0.5 inline-block">Scheduled</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Consultations</h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{loading ? "..." : records.length}</p>
            <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-0.5 inline-block">EHR records</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Uploaded EHR</h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{loading ? "..." : documents.length}</p>
            <span className="text-[10px] sm:text-[11px] text-blue-700 font-semibold mt-0.5 inline-block">Lab & scans</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Emergency Pass</h3>
            <p className="text-xs sm:text-base font-bold text-red-600 mt-0.5 sm:mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Active QR
            </p>
            <Link href="/patient/emergency" className="text-[10px] sm:text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline mt-0.5 inline-block">
              View SOS Pass
            </Link>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Next Appointment Card (Col 7) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">Upcoming Doctor Consultation</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your next assigned hospital or virtual visit</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                Confirmed
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400 text-xs">Loading appointment details...</div>
            ) : nextAppointment ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">
                        {nextAppointment.doctor_name || `Doctor #${nextAppointment.doctor}`}
                      </h4>
                      <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                        {nextAppointment.doctor_specialization || "Clinical Specialist"}
                      </p>
                    </div>
                  </div>
                </div>

                {nextAppointment.notes && (
                  <p className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 italic">
                    &ldquo;{nextAppointment.notes}&rdquo;
                  </p>
                )}

                <div className="pt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {nextAppointment.slot_start_time 
                        ? new Date(nextAppointment.slot_start_time).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : "Scheduled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {nextAppointment.slot_start_time
                        ? new Date(nextAppointment.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "Consultation"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs">No upcoming appointments scheduled.</p>
                <Link
                  href="/patient/appointments"
                  className="mt-3 inline-flex items-center gap-1 text-emerald-700 font-bold text-xs hover:underline"
                >
                  Book Doctor Consultation &rarr;
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Need instant clinical symptom evaluation?</span>
            <Link href="/patient/triage" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              Launch AI Triage
            </Link>
          </div>
        </div>

        {/* Quick Actions & Recent EHR (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Recent EHR Documents Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">Recent Health Documents</h3>
              <Link href="/patient/records" className="text-xs font-bold text-emerald-700 hover:underline">
                View all &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-400 text-xs">Loading records...</div>
            ) : documents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                No health documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.slice(0, 3).map((doc) => (
                  <Link
                    key={doc.id}
                    href="/patient/records"
                    className="block p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {doc.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          {doc.category_display} • {doc.facility_or_doctor || "Personal Record"}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Pass Quick Card */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block">
                Emergency Vitals Pass
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                Scannable First-Responder QR
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Paramedics can scan to view blood group & severe allergies.
              </p>
            </div>

            <Link
              href="/patient/emergency"
              className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-md transition-all flex items-center justify-center flex-shrink-0"
              title="Open Emergency Pass"
            >
              <QrCode className="w-6 h-6" />
            </Link>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
