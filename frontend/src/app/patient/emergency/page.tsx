"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { 
  QrCode, 
  Heart, 
  AlertTriangle, 
  Phone, 
  Plus, 
  ShieldAlert, 
  ExternalLink, 
  Check, 
  Activity,
  UserCheck
} from "lucide-react";
import { authFetch } from "@/lib/api";

interface Allergy {
  id: number;
  name: string;
  severity: string;
}

interface ChronicCondition {
  id: number;
  name: string;
  diagnosed_date?: string;
  notes?: string;
}

interface EmergencyProfileData {
  id: number;
  uuid: string;
  patient_name?: string;
  patient_email?: string;
  blood_group: string;
  date_of_birth?: string;
  weight_kg?: string;
  height_cm?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  allergies: Allergy[];
  conditions: ChronicCondition[];
}

export default function PatientEmergencyProfile() {
  const [profile, setProfile] = useState<EmergencyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form Fields
  const [bloodGroup, setBloodGroup] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");

  // New Allergy & Condition Modal / Inline Inputs
  const [newAllergyName, setNewAllergyName] = useState("");
  const [newAllergySeverity, setNewAllergySeverity] = useState("Moderate");
  const [newConditionName, setNewConditionName] = useState("");
  const [newConditionNotes, setNewConditionNotes] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch("/api/records/emergency-profiles/my-profile/");
      if (res.ok) {
        const data: EmergencyProfileData = await res.json();
        setProfile(data);
        setBloodGroup(data.blood_group || "");
        setContactName(data.emergency_contact_name || "");
        setContactPhone(data.emergency_contact_phone || "");
        setWeightKg(data.weight_kg ? String(data.weight_kg) : "");
        setHeightCm(data.height_cm ? String(data.height_cm) : "");
      }
    } catch (e) {
      console.error("Error fetching emergency profile:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await authFetch("/api/records/emergency-profiles/my-profile/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          blood_group: bloodGroup,
          emergency_contact_name: contactName,
          emergency_contact_phone: contactPhone,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        toast.success("Emergency vitals saved successfully!");
        fetchProfile();
      } else {
        toast.error("Failed to update emergency vitals.");
      }
    } catch {
      toast.error("Failed to save emergency profile. Check network connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergyName.trim()) return;

    try {
      const res = await authFetch("/api/records/allergies/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newAllergyName,
          severity: newAllergySeverity
        })
      });
      if (res.ok) {
        toast.success(`Allergy "${newAllergyName}" recorded.`);
        setNewAllergyName("");
        fetchProfile();
      } else {
        toast.error("Failed to add allergy.");
      }
    } catch {
      toast.error("Network error adding allergy.");
    }
  };

  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConditionName.trim()) return;

    try {
      const res = await authFetch("/api/records/chronic-conditions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newConditionName,
          notes: newConditionNotes
        })
      });
      if (res.ok) {
        toast.success(`Condition "${newConditionName}" recorded.`);
        setNewConditionName("");
        setNewConditionNotes("");
        fetchProfile();
      } else {
        toast.error("Failed to add condition.");
      }
    } catch {
      toast.error("Network error adding condition.");
    }
  };

  const [networkHost, setNetworkHost] = useState("");
  const [showHostInput, setShowHostInput] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNetworkHost(window.location.origin);
    }
  }, []);

  const getFullScanUrl = () => {
    if (!profile?.uuid) return "";
    const base = networkHost || (typeof window !== "undefined" ? window.location.origin : "https://health-tech-psi.vercel.app");
    const cleanBase = base.startsWith("http://") || base.startsWith("https://") 
      ? base.replace(/\/+$/, "") 
      : `https://${base.replace(/\/+$/, "")}`;
    return `${cleanBase}/emergency/${profile.uuid}`;
  };

  const publicUrl = getFullScanUrl();

  const qrImageUrl = profile?.uuid
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(publicUrl)}`
    : "";

  const copyScanUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success("Mobile scan URL copied to clipboard!");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Emergency Profile &amp; QR Code</h1>
          <p className="text-slate-500 text-sm mt-0.5">NDPR-compliant public medical profile accessible to paramedics and first responders.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-semibold self-start sm:self-auto">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          Critical Vitals Pass
        </div>
      </header>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading your emergency pass...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: QR Code & Public Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold">First Responder QR Code</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Scan with your smartphone camera to access instant emergency vitals.
            </p>

            {/* Network Host Switcher for Phone Scanning */}
            {/* Scan Target Address */}
            <div className="w-full bg-slate-800/80 border border-slate-700 p-2.5 rounded-2xl mb-4 text-left">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400 font-medium">Scan Target Address:</span>
                <button
                  type="button"
                  onClick={() => setShowHostInput(!showHostInput)}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-[10px]"
                >
                  {showHostInput ? "Done" : "Custom Address"}
                </button>
              </div>

              {showHostInput ? (
                <div className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    value={networkHost}
                    onChange={(e) => setNetworkHost(e.target.value)}
                    placeholder="e.g. https://health-tech-psi.vercel.app"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNetworkHost(typeof window !== "undefined" ? window.location.origin : "https://health-tech-psi.vercel.app")}
                    className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1 text-xs">
                  <code className="text-emerald-400 font-mono text-[11px] bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700 truncate max-w-[200px]" title={publicUrl}>
                    {publicUrl.replace(/^https?:\/\//, "")}
                  </code>
                  <button
                    type="button"
                    onClick={copyScanUrl}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600"
                  >
                    Copy Link
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5">
                📲 Scan with any smartphone camera to open emergency vitals.
              </p>
            </div>

            {/* QR Card Container */}
            <div className="bg-white p-4 rounded-2xl shadow-lg mb-4">
              {qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={qrImageUrl} 
                  alt="Emergency Scan QR Code" 
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-[220px] h-[220px] bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Patient Info Summary Badge */}
            <div className="w-full bg-white/10 rounded-2xl p-4 text-left border border-white/10 space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Blood Group</span>
                <span className="font-bold text-red-400 text-sm">{profile?.blood_group || "Not Set"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Emergency Contact</span>
                <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                  {profile?.emergency_contact_name || "None"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Severe Allergies</span>
                <span className="font-semibold text-amber-300">
                  {profile?.allergies?.filter(a => a.severity === 'Severe').length || 0} Listed
                </span>
              </div>
            </div>

            {/* Instant Mobile Call Buttons for First Responders & Patients */}
            <div className="w-full space-y-2 mb-3">
              {profile?.emergency_contact_phone && (
                <a
                  href={`tel:${profile.emergency_contact_phone}`}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Next-of-Kin ({profile.emergency_contact_phone})</span>
                </a>
              )}
              <a
                href="tel:112"
                className="w-full py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Call Paramedics (112 / 911)</span>
              </a>
            </div>

            {profile?.uuid && (
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={copyScanUrl}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700 active:scale-95"
                >
                  <span>Copy Emergency URL for Phone</span>
                </button>
                <Link 
                  href={`/emergency/${profile.uuid}`} 
                  target="_blank"
                  className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"
                >
                  <span>Preview Paramedic Scan Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Profile Editor & Allergies */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-8">
            
            {/* Vitals Form */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <h2 className="text-xl font-bold text-slate-900">Critical Medical Vitals</h2>
                </div>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    Saved!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Blood Group
                    </label>
                    <select 
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800 font-bold"
                    >
                      <option value="">Select...</option>
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Weight (kg)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 75.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Height (cm)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 180"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      Emergency Contact Name
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Jane Doe (Spouse)"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      Emergency Contact Phone
                    </label>
                    <input 
                      type="tel"
                      placeholder="e.g. +234 801 234 5678"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={saving}
                  className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
                >
                  {saving ? "Saving Vitals..." : "Save Emergency Vitals"}
                </button>
              </form>
            </div>

            {/* Allergies & Chronic Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Allergies */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-slate-900">Allergies & Contraindications</h3>
                  </div>

                  {profile?.allergies?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">No allergies recorded.</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {profile?.allergies?.map((allergy) => (
                        <div key={allergy.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-800">{allergy.name}</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            allergy.severity === 'Severe' 
                              ? 'bg-red-100 text-red-700' 
                              : allergy.severity === 'Moderate'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {allergy.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddAllergy} className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add Allergy (e.g. Aspirin)"
                      value={newAllergyName}
                      onChange={(e) => setNewAllergyName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <select
                      value={newAllergySeverity}
                      onChange={(e) => setNewAllergySeverity(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Allergy
                  </button>
                </form>
              </div>

              {/* Chronic Conditions */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">Chronic Conditions</h3>
                  </div>

                  {profile?.conditions?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">No chronic conditions recorded.</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {profile?.conditions?.map((cond) => (
                        <div key={cond.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-800">{cond.name}</div>
                          {cond.notes && <p className="text-[11px] text-slate-500 mt-0.5">{cond.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddCondition} className="pt-4 border-t border-slate-100 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Condition name (e.g. Epilepsy)"
                    value={newConditionName}
                    onChange={(e) => setNewConditionName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Clinical notes / instructions..."
                    value={newConditionNotes}
                    onChange={(e) => setNewConditionNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Condition
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}
    </motion.div>
  );
}
