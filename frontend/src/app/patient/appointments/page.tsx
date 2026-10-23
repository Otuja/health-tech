"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  CheckCircle, 
  ShieldCheck, 
  User, 
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  Video,
  XCircle
} from "lucide-react";
import { authFetch } from "@/lib/api";

interface SlotItem {
  id: number;
  doctor: number;
  doctor_name?: string;
  doctor_specialization?: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface AppointmentItem {
  id: number;
  doctor: number;
  doctor_name?: string;
  doctor_specialization?: string;
  notes?: string;
  status?: string;
  slot_start_time?: string;
  slot_end_time?: string;
  created_at?: string;
}

export default function AppointmentBooking() {
  const [activeTab, setActiveTab] = useState<"book" | "my_visits">("book");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [myAppointments, setMyAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<SlotItem | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      // Fetch Available Slots
      const res = await authFetch("/api/appointments/slots/");
      if (res.ok) {
        const data = await res.json();
        setSlots(data.filter((s: SlotItem) => !s.is_booked));
      }

      // Fetch My Booked Visits
      const apptRes = await authFetch("/api/appointments/appointments/");
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        setMyAppointments(apptData);
      }
    } catch (e) {
      console.error("Error fetching slots and appointments:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();

    // Auto-refresh every 3s so when doctor publishes slots or appointment updates, it refreshes automatically
    const interval = setInterval(() => {
      fetchSlots();
    }, 3000);

    const onSync = () => fetchSlots();
    window.addEventListener("focus", onSync);
    document.addEventListener("visibilitychange", onSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onSync);
      document.removeEventListener("visibilitychange", onSync);
    };
  }, [fetchSlots]);

  const handleConfirmBooking = async () => {
    if (!selectedSlotForModal) return;
    setBooking(true);
    const toastId = toast.loading("Securing appointment slot with atomic lock...");
    try {
      const res = await authFetch(`/api/appointments/slots/${selectedSlotForModal.id}/book/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          notes: bookingNotes || "Comprehensive clinical consultation and diagnostic review" 
        })
      });

      if (res.ok) {
        toast.success("Appointment successfully booked and verified!", { id: toastId });
        setSelectedSlotForModal(null);
        setBookingNotes("");
        fetchSlots();
        setActiveTab("my_visits");
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to book slot. It might have just been reserved by another patient.", { id: toastId });
      }
    } catch {
      toast.error("Network error connecting to booking server.", { id: toastId });
    } finally {
      setBooking(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this appointment? Your reserved slot will be released.")) return;
    try {
      const res = await authFetch(`/api/appointments/appointments/${id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });
      if (res.ok) {
        toast.success("Appointment successfully cancelled.");
        fetchSlots();
      } else {
        toast.error("Failed to cancel appointment.");
      }
    } catch {
      toast.error("Network error cancelling appointment.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto pb-12"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-heading">
            Doctor Consultations &amp; Appointments
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Schedule a visit with licensed cardiologists, pulmonologists, and trauma physicians. Guaranteed anti-double-booking.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Real-Time Slot Concurrency
        </div>
      </header>

      {/* Mobile-First Segmented Tabs */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex max-w-md gap-1">
        <button
          onClick={() => setActiveTab("book")}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            activeTab === "book"
              ? "bg-white text-emerald-800 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Available Specialists</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
            {slots.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("my_visits")}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            activeTab === "my_visits"
              ? "bg-white text-emerald-800 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>My Visits</span>
          {myAppointments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px]">
              {myAppointments.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: AVAILABLE SLOTS */}
      {activeTab === "book" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 font-heading">Open Appointment Times</h2>
            <span className="text-xs text-slate-500 font-medium">
              Select any slot to reserve instantly
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Checking clinician schedules...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700">No Open Slots Available</h3>
              <p className="text-xs text-slate-500 mt-1">All posted slots are currently reserved. Please check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slots.map((slot) => {
                const start = new Date(slot.start_time);
                const end = new Date(slot.end_time);
                const doctorDisplayName = slot.doctor_name || `Doctor #${slot.doctor}`;
                const specialization = slot.doctor_specialization || "Clinical Specialist";

                return (
                  <div 
                    key={slot.id} 
                    className="p-6 rounded-3xl border border-slate-200/80 hover:border-emerald-400 hover:shadow-lg transition-all flex flex-col justify-between bg-white group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{doctorDisplayName}</h4>
                          <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1 uppercase tracking-wider">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {specialization}
                          </p>
                        </div>
                        <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-100">
                          {doctorDisplayName.charAt(0)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-6 text-xs text-slate-700">
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          <span>
                            {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} &ndash; {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedSlotForModal(slot)}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKED VISITS */}
      {activeTab === "my_visits" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 font-heading">Your Confirmed Appointments</h2>
            <span className="text-xs text-slate-500 font-medium">
              {myAppointments.length} confirmed visit(s)
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Loading your visits...</span>
            </div>
          ) : myAppointments.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700">No Appointments Booked</h3>
              <p className="text-xs text-slate-500 mt-1">You haven&apos;t reserved any doctor consultations yet. Switch to the &ldquo;Available Clinician Slots&rdquo; tab to schedule one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAppointments.map((appt) => (
                <div 
                  key={appt.id} 
                  className="p-6 rounded-3xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                        Confirmed Consultation
                      </span>
                      <span className="text-xs text-slate-400">ID #{appt.id}</span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900">
                      {appt.doctor_name || `Doctor #${appt.doctor}`}
                    </h4>

                    <p className="text-xs font-semibold text-emerald-700">
                      {appt.doctor_specialization || "Clinical Specialist"}
                    </p>

                    {appt.notes && (
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200 max-w-xl">
                        &ldquo;{appt.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {appt.slot_start_time ? new Date(appt.slot_start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Scheduled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-500 font-normal">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {appt.slot_start_time ? new Date(appt.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Consultation"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {appt.status === "COMPLETED" ? (
                        <>
                          <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Encounter Completed</span>
                          </span>
                          <Link
                            href="/patient/records"
                            className="inline-flex items-center justify-center gap-1 px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-semibold"
                          >
                            View Medical Summary &rarr;
                          </Link>
                        </>
                      ) : appt.status !== "CANCELLED" ? (
                        <>
                          <Link
                            href={`/consultation/${appt.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                          >
                            <Video className="w-4 h-4" />
                            <span>Join Video Call</span>
                          </Link>
                          <button
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Visit</span>
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-semibold text-center">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Confirmation Modal (Bottom-Sheet on Mobile) */}
      {selectedSlotForModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90dvh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-1">
              Confirm Doctor Appointment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              With {selectedSlotForModal.doctor_name} ({selectedSlotForModal.doctor_specialization})
            </p>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1 mb-4">
              <p className="font-bold">
                Date: {new Date(selectedSlotForModal.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p>
                Time: {new Date(selectedSlotForModal.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedSlotForModal.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Consultation Reason / Symptoms (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Follow-up on blood pressure and review laboratory tests..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedSlotForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={booking}
                onClick={handleConfirmBooking}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {booking ? "Locking Slot..." : "Confirm & Book"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
