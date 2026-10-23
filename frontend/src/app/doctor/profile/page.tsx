"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import { 
  User, 
  Mail, 
  Stethoscope, 
  ShieldCheck, 
  Save, 
  Award,
  Sparkles,
  Calendar,
  Activity
} from "lucide-react";

interface DoctorProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  specialization: string;
}

const COMMON_SPECIALIZATIONS = [
  "General Practice & Family Medicine",
  "Emergency Medicine & Trauma",
  "Cardiology & Cardiovascular Medicine",
  "Pulmonology & Respiratory Medicine",
  "Internal Medicine",
  "Pediatrics",
  "Neurology",
  "Dermatology",
  "Obstetrics & Gynecology"
];

export default function DoctorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [specialization, setSpecialization] = useState("");

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  const fetchDoctorProfile = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/users/me/");
      if (res.ok) {
        const data: DoctorProfile = await res.json();
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
        setUsername(data.username || "");
        setSpecialization(data.specialization || "General Practice");
      } else {
        toast.error("Failed to load doctor credentials.");
      }
    } catch {
      toast.error("Network error loading profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Updating your clinical credentials...");

    try {
      const res = await authFetch("/api/users/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          specialization: specialization.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Doctor profile and clinical specialization updated!", { id: toastId });
      } else {
        toast.error("Failed to save changes. Please check your inputs.", { id: toastId });
      }
    } catch {
      toast.error("Network error updating profile.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading doctor credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              Licensed Clinical Practitioner
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight mt-1.5">
            Doctor Profile & Credentials
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your physician credentials, display name, and specialty routing.
          </p>
        </div>

        <button
          type="submit"
          form="doctor-profile-form"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Updating..." : "Save Credentials"}</span>
        </button>
      </div>

      <form id="doctor-profile-form" onSubmit={handleSaveProfile} className="space-y-6 sm:space-y-8">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">Physician Details</h2>
              <p className="text-xs text-slate-500">Your information visible to patients during consultation booking.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Babatunde"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Adeleke"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Clinical Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.ng"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username (Practitioner ID)
              </label>
              <input
                type="text"
                disabled
                value={username}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Primary Medical Specialty
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Emergency Medicine & Trauma"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-900"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Quick select:</span>
                  {COMMON_SPECIALIZATIONS.slice(0, 4).map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSpecialization(spec)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-medium border border-slate-200 transition-colors"
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPLIANCE & VERIFICATION BADGE */}
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-950">
              Verified Medical Practitioner Status
            </h4>
            <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
              Your profile is authenticated to generate electronic prescriptions, conduct encrypted WebRTC teleconsultations, and document official EHR records.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
