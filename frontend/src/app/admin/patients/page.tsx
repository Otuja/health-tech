"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import { 
  Users, 
  Search, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  Heart, 
  QrCode,
  FolderOpen,
  CheckCircle2
} from "lucide-react";

interface PatientItem {
  id: number;
  username: string;
  name: string;
  email: string;
  is_active: boolean;
  blood_group: string | null;
  has_emergency_profile: boolean;
  date_joined: string;
  appointment_count: number;
  document_count: number;
  record_count: number;
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPatients = useCallback(async () => {
    try {
      const res = await authFetch("/api/users/admin/patients/");
      if (res.ok) {
        const data: PatientItem[] = await res.json();
        setPatients(data);
      }
    } catch (e) {
      console.error("Error loading patients:", e);
      toast.error("Failed to load patient registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = patients.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.blood_group && p.blood_group.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              Patient Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Patient EHR & Vitals Registry</h1>
          <p className="text-slate-600 text-sm mt-1">
            NDPR-protected clinical records, emergency vitals passes, and document management registry.
          </p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name, email, or blood group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Showing {filteredPatients.length} registered patients
        </span>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading patients...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No patients matching search query found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Patient</th>
                  <th className="py-3.5 px-6">Emergency Pass & Blood Group</th>
                  <th className="py-3.5 px-6">EHR Documents</th>
                  <th className="py-3.5 px-6">Consultations</th>
                  <th className="py-3.5 px-6">Registered Date</th>
                  <th className="py-3.5 px-6 text-right">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shadow-xs">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{patient.name}</p>
                          <p className="text-slate-400 text-[11px]">{patient.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {patient.has_emergency_profile && patient.blood_group ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200 text-[11px]">
                          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                          Blood {patient.blood_group} (Pass Active)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium text-[11px]">
                          <QrCode className="w-3.5 h-3.5" />
                          Pending Setup
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900">{patient.document_count}</span>
                        <span className="text-slate-400">encrypted files</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900">{patient.appointment_count}</span>
                        <span className="text-slate-400">visits</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(patient.date_joined).toLocaleDateString([], { dateStyle: 'medium' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {patient.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
