"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  QrCode, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  Activity,
  Layers,
  UserCheck
} from "lucide-react";

interface RecentAppointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  start_time: string | null;
  notes: string;
  created_at: string;
}

interface AdminStats {
  total_patients: number;
  total_doctors: number;
  active_doctors: number;
  total_appointments: number;
  total_slots: number;
  booked_slots: number;
  total_records: number;
  total_documents: number;
  total_emergency_profiles: number;
  recent_appointments: RecentAppointment[];
}

interface DoctorItem {
  id: number;
  username: string;
  name: string;
  email: string;
  specialization: string;
  is_active: boolean;
  date_joined: string;
  slot_count: number;
  appointment_count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingDoctorId, setTogglingDoctorId] = useState<number | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      const [statsRes, doctorsRes] = await Promise.all([
        authFetch("/api/users/admin/stats/"),
        authFetch("/api/users/admin/doctors/")
      ]);

      if (statsRes.ok) {
        const statsData: AdminStats = await statsRes.json();
        setStats(statsData);
      }

      if (doctorsRes.ok) {
        const doctorsData: DoctorItem[] = await doctorsRes.json();
        setDoctors(doctorsData);
      }
    } catch (e) {
      console.error("Admin dashboard fetch error:", e);
      toast.error("Failed to load platform operations metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleToggleDoctor = async (doctorId: number, currentActive: boolean) => {
    setTogglingDoctorId(doctorId);
    try {
      const res = await authFetch(`/api/users/admin/doctors/${doctorId}/toggle/`, {
        method: "PATCH"
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || (currentActive ? "Doctor access suspended." : "Doctor license verified and activated."));
        fetchAdminData();
      } else {
        toast.error("Failed to update doctor verification status.");
      }
    } catch {
      toast.error("Network error modifying doctor status.");
    } finally {
      setTogglingDoctorId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              Operations Center
            </span>
            <span className="text-xs text-slate-500 font-medium">NDPR Encrypted Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Platform Governance & Metrics</h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time telehealth operations, clinician credentialing, and system vitals overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:8000/admin/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Open Django Admin</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Patients */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Registered Patients</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
            {loading ? "..." : stats?.total_patients ?? 0}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active clinical profiles</span>
          </div>
        </div>

        {/* Total Doctors */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Medical Specialists</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
            {loading ? "..." : stats?.total_doctors ?? 0}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-2">
            <span className="text-emerald-700 font-bold">{stats?.active_doctors ?? 0}</span>
            <span>verified & active</span>
          </div>
        </div>

        {/* Telehealth Consultations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Consultations Booked</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
            {loading ? "..." : stats?.total_appointments ?? 0}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-2">
            <span className="text-purple-700 font-bold">{stats?.total_slots ?? 0}</span>
            <span>published schedule slots</span>
          </div>
        </div>

        {/* Encrypted EHR & Passes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">EHR & Emergency Vitals</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
            {loading ? "..." : (stats?.total_documents ?? 0) + (stats?.total_emergency_profiles ?? 0)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-2">
            <QrCode className="w-3.5 h-3.5 text-amber-600" />
            <span>Paramedic QR Passes live</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Doctor Credentialing & Live Telehealth Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Doctor Credentialing Quick List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Clinician Credentialing & License Verification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and manage practicing privileges for hospital specialists.
              </p>
            </div>
            <Link
              href="/admin/doctors"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading clinicians...</span>
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
              No registered physicians found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-600 uppercase font-semibold">
                    <th className="pb-3 font-semibold">Physician</th>
                    <th className="pb-3 font-semibold">Specialization</th>
                    <th className="pb-3 font-semibold">Activity</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.slice(0, 5).map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            {doc.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{doc.name}</p>
                            <p className="text-[11px] text-slate-500">{doc.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {doc.specialization}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 text-slate-600">
                        <span>{doc.appointment_count} visits • {doc.slot_count} slots</span>
                      </td>
                      <td className="py-3.5 pr-3">
                        {doc.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Verified & Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Suspended / Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleToggleDoctor(doc.id, doc.is_active)}
                          disabled={togglingDoctorId === doc.id}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            doc.is_active
                              ? "text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                          } ${togglingDoctorId === doc.id ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {togglingDoctorId === doc.id ? "Updating..." : doc.is_active ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Telehealth Activity & Security Overview */}
        <div className="space-y-6">
          
          {/* Recent Appointments Audit */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Recent Consultations
            </h2>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading audit feed...</div>
            ) : !stats?.recent_appointments || stats.recent_appointments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No recent consultations recorded.</div>
            ) : (
              <div className="space-y-3">
                {stats.recent_appointments.map((appt) => (
                  <div key={appt.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{appt.patient_name}</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">{appt.doctor_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{appt.notes || "Clinical consultation review"}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{appt.start_time ? new Date(appt.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Unscheduled'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance & Security Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Regulatory Compliance</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              NDPR & HIPAA compliant audit logging is active. All emergency QR lookups and patient medical records are encrypted with AES-256 standard.
            </p>
            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">JWT Token Security:</span>
              <span className="text-emerald-400 font-bold">7-Day Rotated</span>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
