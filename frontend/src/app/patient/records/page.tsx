"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { 
  FileText, 
  ShieldCheck, 
  Calendar, 
  User, 
  Pill, 
  Activity, 
  Upload, 
  FolderPlus, 
  Download, 
  Trash2, 
  ExternalLink, 
  X, 
  FileCheck, 
  Building2, 
  Sparkles,
  Info,
  Clock,
  HeartPulse,
  Printer
} from "lucide-react";
import { authFetch } from "@/lib/api";

interface MedicalRecordItem {
  id: number;
  diagnosis: string;
  symptoms: string;
  treatment_plan: string;
  prescriptions?: string;
  doctor: number;
  doctor_name?: string;
  doctor_specialization?: string;
  patient: number;
  patient_name?: string;
  created_at: string;
}

interface PatientDocumentItem {
  id: number;
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

export default function PatientRecords() {
  const [activeTab, setActiveTab] = useState<"documents" | "doctor_records">("documents");
  
  // Doctor Consultations
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Patient Uploaded EHR Documents
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("LAB_TEST");
  const [uploadFacility, setUploadFacility] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prescription Print Modal State
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<MedicalRecordItem | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await authFetch("/api/records/medical-records/");
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (e) {
      console.error("Error fetching medical records:", e);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await authFetch("/api/records/documents/");
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
    fetchDocuments();
  }, [fetchRecords, fetchDocuments]);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("title", uploadTitle);
      formData.append("category", uploadCategory);
      if (uploadFacility) formData.append("facility_or_doctor", uploadFacility);
      if (uploadDate) formData.append("document_date", uploadDate);
      if (uploadNotes) formData.append("notes", uploadNotes);
      if (selectedFile) formData.append("file", selectedFile);

      const res = await authFetch("/api/records/documents/", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        toast.success("Health record document uploaded and encrypted successfully!");
        setShowUploadModal(false);
        setUploadTitle("");
        setUploadFacility("");
        setUploadDate("");
        setUploadNotes("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchDocuments();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to upload document. Please check the form.");
      }
    } catch {
      toast.error("Network error while uploading medical record.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    try {
      const res = await authFetch(`/api/records/documents/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Health document removed.");
        setDocuments(prev => prev.filter(d => d.id !== id));
      } else {
        toast.error("Failed to delete document.");
      }
    } catch {
      toast.error("Network error deleting document.");
    }
  };

  const filteredDocuments = selectedCategory === "ALL" 
    ? documents 
    : documents.filter(d => d.category === selectedCategory);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto pb-12"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Patient EHR & Health Records
          </h1>
          <p className="text-slate-600 mt-1">
            Your centralized health record. Upload past lab results, scans, and view official doctor consultations.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/patient/emergency"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors"
          >
            <HeartPulse className="w-4 h-4 text-red-600" />
            <span>Emergency Vitals & QR</span>
          </Link>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Upload Health Document</span>
          </button>
        </div>
      </header>

      {/* Explanatory Roles Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-blue-50 border border-emerald-100 rounded-3xl p-5 text-xs text-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">How Patient Medical Records Work:</h4>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              <strong>Doctors</strong> record official clinical diagnoses, symptoms, and treatment plans after consultations. 
              <strong> You (the Patient)</strong> can upload external lab test results, X-rays/scans, previous prescriptions, and manage your emergency baseline vitals anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "documents"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>My Uploaded Health Documents & Lab Tests ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("doctor_records")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "doctor_records"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Doctor Encounters & Verified Prescriptions ({records.length})</span>
        </button>
      </div>

      {/* TAB 1: PATIENT UPLOADED DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
            {[
              { id: "ALL", label: "All Documents" },
              { id: "LAB_TEST", label: "Lab / Blood Tests" },
              { id: "IMAGING", label: "Scans & X-Rays" },
              { id: "PRESCRIPTION", label: "Prescriptions" },
              { id: "DISCHARGE", label: "Discharge Summaries" },
              { id: "IMMUNIZATION", label: "Vaccines" },
              { id: "HISTORICAL", label: "Past History" },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loadingDocs ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Loading your uploaded health records...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Health Documents Uploaded Yet</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto mb-6">
                Upload your medical test results, prior hospital discharge letters, or doctor prescription slips to build your unified electronic health record.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Upload className="w-4 h-4" />
                <span>Upload First Health Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map(doc => {
                const badgeStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.OTHER;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                          {doc.category_display || doc.category}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                        {doc.title}
                      </h3>

                      <div className="space-y-1.5 mt-3 text-xs text-slate-600">
                        {doc.facility_or_doctor && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.facility_or_doctor}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-slate-500">
                          {doc.document_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(doc.document_date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {doc.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                          <p className="font-semibold text-slate-800 text-[11px] mb-0.5">Clinical Notes / Summary:</p>
                          <p className="whitespace-pre-wrap">{doc.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      {doc.file ? (
                        <a
                          href={`http://localhost:8000${doc.file}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors border border-emerald-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View / Download Attachment</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No file attached (notes only)</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCTOR CLINICAL CONSULTATIONS */}
      {activeTab === "doctor_records" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {loadingRecords ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-500">Loading verified consultation records...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Doctor Encounters Authored Yet</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Official clinical notes and prescription regimens authored by your doctor after appointments will be listed here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map((record) => (
                <div key={record.id} className="p-8 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{record.diagnosis}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-2">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(record.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          {record.doctor_name || `Doctor #${record.doctor}`}
                          {record.doctor_specialization && ` (${record.doctor_specialization})`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedRecordForPrint(record)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Print Official Rx</span>
                      </button>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Clinician Record
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-slate-500" />
                        Reported Symptoms
                      </h4>
                      <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                        {record.symptoms}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-500" />
                        Treatment Plan
                      </h4>
                      <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                        {record.treatment_plan}
                      </p>
                    </div>
                  </div>

                  {record.prescriptions && (
                    <div className="mt-6 bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-amber-700" />
                        Prescriptions & Medication
                      </h4>
                      <div className="text-amber-950 font-medium text-sm whitespace-pre-wrap leading-relaxed">
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

      {/* Upload Health Document Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Upload Health Document</h3>
                    <p className="text-xs text-slate-500">Attach lab test, imaging, prescription, or clinical summary.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Complete Blood Count (CBC) or Chest X-Ray"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Category *
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white font-medium"
                    >
                      <option value="LAB_TEST">Laboratory / Blood Test</option>
                      <option value="IMAGING">Radiology / X-Ray / Scan</option>
                      <option value="PRESCRIPTION">Prescription Slip</option>
                      <option value="DISCHARGE">Discharge Summary</option>
                      <option value="IMMUNIZATION">Vaccine Record</option>
                      <option value="HISTORICAL">Past Medical History</option>
                      <option value="OTHER">Other Clinical Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Date of Document / Test
                    </label>
                    <input
                      type="date"
                      value={uploadDate}
                      onChange={(e) => setUploadDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Hospital / Diagnostic Facility / Doctor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lagoon Hospital, Dr. Adewale"
                    value={uploadFacility}
                    onChange={(e) => setUploadFacility(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Clinical Notes, Results & Findings
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Hemoglobin 14.2 g/dL, clear lung fields, no abnormalities noted..."
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Attach File (PDF, Image, Scan)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-xl p-1"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Save to Health Record</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Prescription Print / PDF Modal */}
      <AnimatePresence>
        {selectedRecordForPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
            >
              {/* Top Modal Controls */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6 print:hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Official Medical Prescription Slip
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button 
                    onClick={() => setSelectedRecordForPrint(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Medical Sheet */}
              <div className="space-y-6 text-slate-900 font-sans print:p-0">
                {/* Header */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                      HT
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">HealthTech Telemedicine Systems</h2>
                      <p className="text-[11px] text-slate-600">Hospital Reg: HT-NG-2026-9042 • National Digital Health Network</p>
                      <p className="text-[10px] text-slate-500">Department of Clinical Medicine & Pharmacotherapy</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-mono font-bold text-slate-900">RX-ID: #{selectedRecordForPrint.id.toString().padStart(6, '0')}</p>
                    <p className="text-slate-500 text-[11px]">
                      {new Date(selectedRecordForPrint.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                    </p>
                  </div>
                </div>

                {/* Patient & Doctor Two-Column Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Patient:</span>
                    <p className="font-bold text-sm text-slate-900 mt-0.5">Alex Murphy</p>
                    <p className="text-slate-600">NDPR Identifier: PAT-0082</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Attending Physician:</span>
                    <p className="font-bold text-sm text-emerald-800 mt-0.5">
                      {selectedRecordForPrint.doctor_name || "Dr. Sarah Connor"}
                    </p>
                    <p className="text-slate-600">{selectedRecordForPrint.doctor_specialization || "Clinical Specialist"}</p>
                  </div>
                </div>

                {/* Diagnosis & Findings */}
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Clinical Diagnosis:</span>
                  <p className="font-bold text-base text-slate-900">{selectedRecordForPrint.diagnosis}</p>
                  {selectedRecordForPrint.symptoms && (
                    <p className="text-slate-600 text-xs mt-1">
                      <span className="font-semibold text-slate-700">Presenting Symptoms:</span> {selectedRecordForPrint.symptoms}
                    </p>
                  )}
                </div>

                {/* Prescription Box (Rx) */}
                <div className="border-2 border-emerald-600/40 rounded-2xl p-5 bg-emerald-50/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-serif font-black text-emerald-800">℞</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Prescribed Medications & Regimen
                    </span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedRecordForPrint.prescriptions || "No medication specified."}
                  </div>
                </div>

                {/* Treatment Plan & Directives */}
                {selectedRecordForPrint.treatment_plan && (
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Treatment Plan & Directives:</span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedRecordForPrint.treatment_plan}
                    </p>
                  </div>
                )}

                {/* Signature & Seal Footer */}
                <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-xs">
                  <div>
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-600 text-emerald-700 flex items-center justify-center text-[9px] font-extrabold uppercase text-center p-1 leading-tight rotate-[-12deg]">
                      Verified Clinician
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-48 border-b border-slate-900 pb-1 font-serif italic text-slate-700 text-sm">
                      {selectedRecordForPrint.doctor_name || "Dr. Sarah Connor"}
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                      Authorized Medical Practitioner
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
