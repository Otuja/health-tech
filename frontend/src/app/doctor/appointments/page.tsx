"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Calendar, Clock, PlusCircle, AlertCircle, Video, CheckCircle2, XCircle } from "lucide-react";
import { authFetch } from "@/lib/api";

interface SlotItem {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface AppointmentItem {
  id: number;
  patient: number;
  patient_name?: string;
  patient_username?: string;
  slot: number;
  notes?: string;
  slot_start_time?: string;
  slot_end_time?: string;
  status?: string;
}

export default function DoctorAppointments() {
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Slot Form
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch slots
      const slotsRes = await authFetch("/api/appointments/slots/");
      if (slotsRes.ok) setSlots(await slotsRes.json());

      // Fetch appointments
      const apptRes = await authFetch("/api/appointments/appointments/");
      if (apptRes.ok) setAppointments(await apptRes.json());

    } catch (e) {
      console.error("Error loading doctor appointment data:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await authFetch(`/api/appointments/appointments/${id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Appointment marked as ${newStatus.toLowerCase()}.`);
        fetchData();
      } else {
        toast.error("Failed to update status.");
      }
    } catch {
      toast.error("Network error updating appointment status.");
    }
  };

  useEffect(() => {
    fetchData(true);

    // Auto-refresh every 3 seconds so when a patient books a slot, it updates immediately
    const interval = setInterval(() => {
      fetchData(false);
    }, 3000);

    const onSync = () => fetchData(false);
    window.addEventListener("focus", onSync);
    document.addEventListener("visibilitychange", onSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      document.removeEventListener("visibilitychange", onSync);
    };
  }, [fetchData]);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError("");

    try {
      const res = await authFetch("/api/appointments/slots/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ start_time: startTime, end_time: endTime })
      });
      if (res.ok) {
        toast.success("Availability slot published successfully!");
        setStartTime("");
        setEndTime("");
        fetchData();
      } else {
        const errorData = await res.json();
        const msg = JSON.stringify(errorData);
        setFormError(msg);
        toast.error("Failed to publish slot: " + msg);
      }
    } catch {
      const msg = "Network error connecting to scheduling service.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinician Schedule & Slots</h1>
          <p className="text-slate-600 mt-1">Manage consultation availability and review booked patient visits.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold w-fit">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Real-Time Availability Manager
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Slot Form */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold">Add Availability</h2>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSlot} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Session Start Time
              </label>
              <input 
                type="datetime-local" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Session End Time
              </label>
              <input 
                type="datetime-local" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800 text-sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit"
              disabled={creating}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              {creating ? "Publishing Slot..." : "Publish Slot"}
            </button>
          </form>
        </div>

        {/* Existing Slots & Appointments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Booked Appointments */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Booked Patient Consultations</h2>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {appointments.length} visit(s)
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading visits...</div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Booked Appointments Yet</p>
                <p className="text-xs text-slate-400 mt-1">When patients reserve your published slots, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map(appt => (
                  <div key={appt.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                          {appt.patient_name ? appt.patient_name.charAt(0) : "P"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">
                            {appt.patient_name || `Patient #${appt.patient}`}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              {appt.slot_start_time ? new Date(appt.slot_start_time).toLocaleDateString() : "Scheduled"}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              {appt.slot_start_time ? new Date(appt.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Consultation"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        {appt.status !== "COMPLETED" ? (
                          <>
                            <Link
                              href={`/consultation/${appt.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Video Call</span>
                            </Link>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, "COMPLETED")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold text-xs border border-slate-200 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mark Completed</span>
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Consultation Concluded</span>
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          appt.status === "COMPLETED" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}>
                          {appt.status || "SCHEDULED"}
                        </span>
                      </div>
                    </div>

                    {appt.notes && (
                      <p className="mt-3 text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
                        Notes: &ldquo;{appt.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Slots Published */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Published Time Slots</h2>
              <span className="text-xs font-medium text-slate-500">
                {slots.filter(s => !s.is_booked).length} Available / {slots.length} Total
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Slots Published</p>
                <p className="text-xs text-slate-400 mt-1">Use the &ldquo;Add Availability&rdquo; form on the left to publish slots.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {slots.map(slot => (
                  <div 
                    key={slot.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      slot.is_booked 
                        ? 'border-amber-200 bg-amber-50/50' 
                        : 'border-slate-200 bg-white hover:border-emerald-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 mb-1">
                      {new Date(slot.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-600 mb-3 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash; {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      slot.is_booked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {slot.is_booked ? "Booked" : "Available"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
