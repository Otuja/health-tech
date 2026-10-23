"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  User, 
  Calendar, 
  Pill, 
  AlertCircle,
  FolderOpen,
  Download,
  ExternalLink,
  Building2,
  Clock,
  Activity,
  Layers
} from "lucide-react";
import { authFetch, API_BASE } from "@/lib/api";

interface AssignedPatient {
  id: number;
  username: string;
  name: string;
  email: string;
  appointment_count: number;
}

interface MedicalRecordItem {
  id: number;
  diagnosis: string;
  symptoms: string;
  treatment_plan: string;
  prescriptions?: string;
  patient: number;
  patient_name?: string;
  patient_username?: string;
  created_at: string;
}

interface PatientDocumentItem {
  id: number;
  patient: number;
  patient_name?: string;
  patient_email?: string;
  title: string;
  category: string;
  category_display: string;
  facility_or_doctor: string;
  document_date: string | null;
  notes: string;
  file: string | null;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LAB_TEST: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  IMAGING: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PRESCRIPTION: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  DISCHARGE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  IMMUNIZATION: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  HISTORICAL: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  OTHER: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
};

export default function DoctorRecords() {
  const [activeTab, setActiveTab] = useState<"authored" | "patient_docs">("authored");

  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [patients, setPatients] = useState<AssignedPatient[]>([]);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>("ALL");
  
  // Create Record Form State
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    patient_id: "",
    diagnosis: "",
    symptoms: "",
    treatment_plan: "",
    prescriptions: ""
  });

  const fetchRecords = useCallback(async () => {
    try {
      // Fetch Medical Records
      const res = await authFetch("/api/records/medical-records/");
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }

      // Fetch Assigned Patients for record creation dropdown
      const patientRes = await authFetch("/api/appointments/appointments/my-patients/");
      if (patientRes.ok) {
        const patientData = await patientRes.json();
        setPatients(patientData);
        if (patientData.length > 0 && !formData.patient_id) {
          setFormData(prev => ({ ...prev, patient_id: String(patientData[0].id) }));
        }
      }
    } catch (e) {
      console.error("Error fetching doctor records:", e);
    } finally {
      setLoading(false);
    }
  }, [formData.patient_id]);

  const fetchPatientDocuments = useCallback(async (patientId?: string) => {
    setLoadingDocs(true);
    try {
      const url = patientId && patientId !== "ALL"
        ? `/api/records/documents/?patient_id=${patientId}`
        : "/api/records/documents/";
      
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error("Error fetching patient documents:", e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchPatientDocuments();
  }, [fetchRecords, fetchPatientDocuments]);

  const handlePatientFilterChange = (pId: string) => {
    setSelectedPatientFilter(pId);
    fetchPatientDocuments(pId);
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMessage("");

    try {
      const res = await authFetch("/api/records/medical-records/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          patient_id: Number(formData.patient_id)
        })
      });

      if (res.ok) {
        toast.success("Medical record successfully authored and verified!");
        setShowForm(false);
        setFormData({ 
          patient_id: patients.length > 0 ? String(patients[0].id) : "", 
          diagnosis: "", 
          symptoms: "", 
          treatment_plan: "", 
          prescriptions: "" 
        });
        fetchRecords();
      } else {
        const err = await res.json();
        const msg = err.detail || err.patient_id || "Failed to create medical record. Ensure you have an active appointment with this patient.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Network error connecting to API server.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto pb-12"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Assigned Patient Records & EHR</h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">NDPR-compliant clinical records authored for patients in your care, plus uploaded EHR documents.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-emerald-600 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 w-fit active:scale-95"
        >
          {showForm ? "Cancel Form" : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>+ Draft New Record</span>
            </>
          )}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar whitespace-nowrap gap-2">
        <button
          onClick={() => setActiveTab("authored")}
          className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === "authored"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Authored Clinical Records ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("patient_docs")}
          className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === "patient_docs"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Patient Uploaded EHR & Labs ({documents.length})</span>
        </button>
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center gap-2 mb-6 text-slate-900">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold">Author Clinical Medical Record</h2>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateRecord} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Assigned Patient
                </label>
                {patients.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No assigned patients found. You can only create records for patients who have booked appointments with you.
                  </div>
                ) : (
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                    required
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (@{p.username}) - {p.appointment_count} visit(s)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Clinical Diagnosis
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Type 2 Diabetes, Acute Bronchitis"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Reported Patient Symptoms
              </label>
              <textarea 
                placeholder="Describe presenting symptoms, onset, severity..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white h-24"
                value={formData.symptoms}
                onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Treatment Plan & Clinical Notes
              </label>
              <textarea 
                placeholder="Diagnostic follow-up, dietary recommendations, lifestyle changes..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white h-24"
                value={formData.treatment_plan}
                onChange={(e) => setFormData({...formData, treatment_plan: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Prescriptions & Dosages (Optional)
              </label>
              <textarea 
                placeholder="e.g. Amoxicillin 500mg tid x 7 days..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white h-20"
                value={formData.prescriptions}
                onChange={(e) => setFormData({...formData, prescriptions: e.target.value})}
              />
            </div>
            
            <button 
              type="submit"
              disabled={creating || patients.length === 0}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
            >
              {creating ? "Saving & Encrypting Record..." : "Publish Medical Record"}
            </button>
          </form>
        </motion.div>
      )}

      {/* VIEW 1: AUTHORED MEDICAL RECORDS */}
      {activeTab === "authored" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Loading patient records...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Patient Records Authored</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                You haven&apos;t authored any medical records for your assigned patients yet. Use the &ldquo;+ Draft New Record&rdquo; button above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map((record) => (
                <div key={record.id} className="p-4 sm:p-6 md:p-8 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{record.diagnosis}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-2">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(record.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          Patient: {record.patient_name || `Patient #${record.patient}`} (@{record.patient_username || `ID ${record.patient}`})
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      NDPR Protected
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Reported Symptoms</h4>
                      <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{record.symptoms}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Treatment Plan</h4>
                      <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{record.treatment_plan}</p>
                    </div>
                  </div>

                  {record.prescriptions && (
                    <div className="mt-6 bg-slate-100 border border-slate-200/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-slate-500" />
                        Prescriptions
                      </h4>
                      <div className="text-slate-900 font-medium text-sm whitespace-pre-wrap leading-relaxed">
                        {record.prescriptions}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PATIENT UPLOADED DOCUMENTS & LAB REPORTS */}
      {activeTab === "patient_docs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter by Patient:</span>
            </div>
            <select
              value={selectedPatientFilter}
              onChange={(e) => handlePatientFilterChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Assigned Patients</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (@{p.username})
                </option>
              ))}
            </select>
          </div>

          {loadingDocs ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Loading patient documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Patient Documents Found</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                No external health documents or lab tests have been uploaded by your assigned patients yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map(doc => {
                const badgeStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.OTHER;
                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                          {doc.category_display || doc.category}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                          Patient: {doc.patient_name || `ID ${doc.patient}`}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {doc.title}
                      </h3>

                      <div className="space-y-1 mt-2.5 text-xs text-slate-600">
                        {doc.facility_or_doctor && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Facility: {doc.facility_or_doctor}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-slate-500">
                          {doc.document_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Test Date: {new Date(doc.document_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {doc.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                          <p className="font-semibold text-slate-800 text-[11px] mb-0.5">Patient Clinical Notes:</p>
                          <p className="whitespace-pre-wrap">{doc.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      {doc.file ? (
                        <a
                          href={doc.file.startsWith("http") ? doc.file : `${API_BASE}${doc.file}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors border border-emerald-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download / Review Attachment</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No file attached (summary notes only)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
