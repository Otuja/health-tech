"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Users, Calendar, Mail, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { authFetch } from "@/lib/api";

interface AssignedPatient {
  id: number;
  username: string;
  name: string;
  email: string;
  appointment_count: number;
  latest_appointment: string;
}

export default function DoctorPatientsDirectory() {
  const [patients, setPatients] = useState<AssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await authFetch("/api/appointments/appointments/my-patients/");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (e) {
      console.error("Error fetching patients:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">NDPR-authorized roster of patients actively under your medical supervision.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Active Treatment Roster
        </div>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-500">Loading assigned patients...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Assigned Patients Yet</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Patients will appear in this directory as soon as they schedule an appointment with you.
            </p>
            <Link 
              href="/doctor/appointments"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Add Availability Slots
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((patient) => (
              <div key={patient.id} className="p-4 sm:p-6 md:p-8 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-900">{patient.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        ID: #{patient.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {patient.email || `@${patient.username}`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {patient.appointment_count} Booking(s)
                      </span>
                      {patient.latest_appointment && (
                        <span className="text-slate-400">
                          Last visit: {new Date(patient.latest_appointment).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap self-stretch sm:self-end md:self-center">
                  <Link
                    href="/doctor/records"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    Medical Records
                  </Link>
                  <Link
                    href="/doctor/records"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-emerald-600/20"
                  >
                    + Draft Record
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
