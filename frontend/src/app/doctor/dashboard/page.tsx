"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Calendar, 
  Users, 
  FileText, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  CheckCircle2, 
  Activity,
  User,
  Radio
} from "lucide-react";
import { authFetch } from "@/lib/api";

interface AppointmentItem {
  id: number;
  patient: number;
  patient_name?: string;
  patient_username?: string;
  slot: number;
  notes?: string;
  slot_start_time?: string;
  slot_end_time?: string;
}

interface SlotItem {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface PatientItem {
  id: number;
  name: string;
  username: string;
  appointment_count: number;
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const previousSlotsRef = useRef<Map<number, boolean>>(new Map());
  const initialLoadDoneRef = useRef(false);

  const fetchDoctorDashboardData = useCallback(async () => {
    try {
      // Fetch Booked Appointments
      const apptRes = await authFetch("/api/appointments/appointments/");
      if (apptRes.ok) {
        setAppointments(await apptRes.json());
      }

      // Fetch Doctor's Slots
      const slotsRes = await authFetch("/api/appointments/slots/");
      if (slotsRes.ok) {
        const slotsData: SlotItem[] = await slotsRes.json();
        
        // Check if any slot transitioned from unbooked -> booked
        if (initialLoadDoneRef.current) {
          slotsData.forEach((s) => {
            const wasBooked = previousSlotsRef.current.get(s.id);
            if (wasBooked === false && s.is_booked === true) {
              toast.success("Live Update: A patient just booked an open consultation slot!");
            }
          });
        }

        // Update map
        const newMap = new Map<number, boolean>();
        slotsData.forEach((s) => newMap.set(s.id, s.is_booked));
        previousSlotsRef.current = newMap;
        initialLoadDoneRef.current = true;

        setSlots(slotsData);
      }

      // Fetch Assigned Patients
      const patientsRes = await authFetch("/api/appointments/appointments/my-patients/");
      if (patientsRes.ok) {
        setPatients(await patientsRes.json());
      }

      // Fetch Records Count
      const recordsRes = await authFetch("/api/records/medical-records/");
      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecordCount(recordsData.length);
      }
    } catch (e) {
      console.error("Doctor dashboard error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctorDashboardData();

    // Auto-refresh every 3 seconds so newly booked slots update immediately without reload
    const interval = setInterval(() => {
      fetchDoctorDashboardData();
    }, 3000);

    const onSync = () => fetchDoctorDashboardData();
    window.addEventListener("focus", onSync);
    document.addEventListener("visibilitychange", onSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      document.removeEventListener("visibilitychange", onSync);
    };
  }, [fetchDoctorDashboardData]);

  const availableSlots = slots.filter(s => !s.is_booked);
  const nextOpenSlot = availableSlots.length > 0 ? availableSlots[0] : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinician Dashboard</h1>
          <p className="text-slate-600 mt-1">Practice summary, daily schedule, and patient care management.</p>
        </div>
        <Link
          href="/doctor/appointments"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 text-sm w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Time Slot</span>
        </Link>
      </header>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Booked Visits</h3>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{loading ? "..." : appointments.length}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-3">Active appointments</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Assigned Patients</h3>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{loading ? "..." : patients.length}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-blue-600 font-semibold mt-3">Under medical supervision</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Records Authored</h3>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{loading ? "..." : recordCount}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-3">NDPR verified</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Next Open Slot</h3>
              <p className="text-lg font-bold text-slate-900 mt-3 truncate max-w-[130px]">
                {loading ? "..." : nextOpenSlot ? new Date(nextOpenSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "None"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-purple-600 font-semibold mt-2">
            {availableSlots.length} open slot(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Booked Consultations Schedule */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Patient Visits</h2>
              <Link href="/doctor/appointments" className="text-xs font-bold text-emerald-600 hover:underline">
                Manage schedule &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading schedule...</div>
            ) : appointments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No booked consultations right now.</p>
                <p className="text-xs text-slate-400 mt-1">Open new slots to allow patients to book appointments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {appt.patient_name ? appt.patient_name.charAt(0) : "P"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">
                            {appt.patient_name || `Patient #${appt.patient}`}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              {appt.slot_start_time ? new Date(appt.slot_start_time).toLocaleDateString() : "Scheduled"}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              {appt.slot_start_time ? new Date(appt.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link 
                          href="/doctor/records"
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Draft Record
                        </Link>
                      </div>
                    </div>

                    {appt.notes && (
                      <p className="mt-3 text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/60">
                        Chief complaint: &ldquo;{appt.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Need to create more patient capacity?</span>
            <Link href="/doctor/appointments" className="text-emerald-600 font-bold hover:underline">
              Add Time Slots &rarr;
            </Link>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Navigation</h2>
            <div className="space-y-3">
              <Link 
                href="/doctor/records"
                className="block p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                        Author Medical Record
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Publish diagnosis & prescriptions</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
                </div>
              </Link>

              <Link 
                href="/doctor/appointments"
                className="block p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                        Manage Availability
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Publish & adjust booking slots</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
                </div>
              </Link>

              <Link 
                href="/doctor/patients"
                className="block p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                        Patient Directory
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">View all assigned treatment cases</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-1">NDPR Clinical Compliance</span>
            Record access is cryptographically restricted to patients who have active appointment engagements with you.
          </div>
        </div>

      </div>
    </motion.div>
  );
}
