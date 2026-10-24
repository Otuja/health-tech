"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldAlert, 
  Heart, 
  Activity, 
  Calendar, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Stethoscope,
  KeyRound,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AllergyItem {
  id: number;
  name: string;
  severity: string;
}

interface ConditionItem {
  id: number;
  name: string;
  diagnosed_date?: string;
  notes?: string;
}

interface EmergencyData {
  blood_group: string;
  date_of_birth: string;
  weight_kg: string;
  height_cm: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  allergies?: AllergyItem[];
  conditions?: ConditionItem[];
}

export default function PatientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  // Health & Emergency details
  const [bloodGroup, setBloodGroup] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Allergies & Conditions
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [newAllergyName, setNewAllergyName] = useState("");
  const [newAllergySeverity, setNewAllergySeverity] = useState("Moderate");

  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [newConditionName, setNewConditionName] = useState("");
  const [newConditionNotes, setNewConditionNotes] = useState("");

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch User details
      const userRes = await authFetch("/api/users/me/");
      if (userRes.ok) {
        const uData: UserProfile = await userRes.json();
        setFirstName(uData.first_name || "");
        setLastName(uData.last_name || "");
        setEmail(uData.email || "");
        setUsername(uData.username || "");
      }

      // 2. Fetch Emergency / Personal Health Details
      const emRes = await authFetch("/api/records/emergency-profiles/my-profile/");
      if (emRes.ok) {
        const emData: EmergencyData = await emRes.json();
        setBloodGroup(emData.blood_group || "");
        setDateOfBirth(emData.date_of_birth || "");
        setWeightKg(emData.weight_kg ? String(emData.weight_kg) : "");
        setHeightCm(emData.height_cm ? String(emData.height_cm) : "");
        setContactName(emData.emergency_contact_name || "");
        setContactPhone(emData.emergency_contact_phone || "");
        setAllergies(emData.allergies || []);
        setConditions(emData.conditions || []);
      }
    } catch {
      toast.error("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Updating your personal & health details...");

    try {
      // 1. Update User basic info
      const userRes = await authFetch("/api/users/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
        }),
      });

      // 2. Update Emergency & Clinical Health info
      const emRes = await authFetch("/api/records/emergency-profiles/my-profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blood_group: bloodGroup,
          date_of_birth: dateOfBirth || null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          emergency_contact_name: contactName.trim(),
          emergency_contact_phone: contactPhone.trim(),
        }),
      });

      if (userRes.ok && emRes.ok) {
        toast.success("Profile and personal health details updated successfully!", { id: toastId });
      } else {
        toast.error("Failed to update some fields. Please check your inputs.", { id: toastId });
      }
    } catch {
      toast.error("Network error saving profile changes.", { id: toastId });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAllergyName.trim(),
          severity: newAllergySeverity,
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setAllergies((prev) => [...prev, added]);
        setNewAllergyName("");
        toast.success(`Added allergy: ${added.name}`);
      } else {
        toast.error("Failed to add allergy.");
      }
    } catch {
      toast.error("Error adding allergy.");
    }
  };

  const handleDeleteAllergy = async (id: number) => {
    try {
      const res = await authFetch(`/api/records/allergies/${id}/`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setAllergies((prev) => prev.filter((a) => a.id !== id));
        toast.info("Allergy record removed.");
      }
    } catch {
      toast.error("Error deleting allergy.");
    }
  };

  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConditionName.trim()) return;

    try {
      const res = await authFetch("/api/records/conditions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newConditionName.trim(),
          notes: newConditionNotes.trim(),
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setConditions((prev) => [...prev, added]);
        setNewConditionName("");
        setNewConditionNotes("");
        toast.success(`Added condition: ${added.name}`);
      } else {
        toast.error("Failed to add chronic condition.");
      }
    } catch {
      toast.error("Error adding chronic condition.");
    }
  };

  const handleDeleteCondition = async (id: number) => {
    try {
      const res = await authFetch(`/api/records/conditions/${id}/`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setConditions((prev) => prev.filter((c) => c.id !== id));
        toast.info("Condition record removed.");
      }
    } catch {
      toast.error("Error deleting condition.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please enter both your current password and new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation password do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authFetch("/api/users/change-password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "Failed to update password.");
      }
    } catch {
      toast.error("Network error updating password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Account & Medical Identity</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight mt-1.5">
            Personal & Health Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Keep your clinical identity, contact information, and emergency vitals up to date.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
          </button>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-5 sm:space-y-8">
        {/* 1. PERSONAL INFORMATION */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Personal Details</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Your verified identification on the telemedicine platform.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Address (Primary Account ID)
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Unique Identifier
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Your verified unique login identifier and telehealth contact.
              </p>
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                System Username Alias
              </label>
              <input
                type="text"
                disabled
                value={username}
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Internal system handle for database and EHR indexing.
              </p>
            </div>
          </div>
        </div>

        {/* 2. CLINICAL & EMERGENCY VITALS */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Health & Emergency Pass Vitals</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Critical medical attributes displayed to first responders and emergency clinicians.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-900 bg-white"
              >
                <option value="">Unknown / Select</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full min-w-0 max-w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="70.5"
                className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="175"
                className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-3 border-t border-slate-100">
            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Next-of-Kin / Emergency Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Jane Doe (Spouse)"
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Emergency Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full pl-10 pr-3.5 sm:pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 3. ALLERGIES & CHRONIC CONDITIONS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Allergies Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Known Clinical Allergies</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold flex-shrink-0">
              {allergies.length} Listed
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {allergies.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No known drug or food allergies recorded.</p>
            ) : (
              allergies.map((allergy) => (
                <div
                  key={allergy.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 break-words">{allergy.name}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px] inline-block">
                      {allergy.severity} Severity
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAllergy(allergy.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors flex-shrink-0"
                    title="Delete allergy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Allergy Form: Responsive on mobile */}
          <form onSubmit={handleAddAllergy} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Allergy (e.g. Penicillin, Peanuts)"
              value={newAllergyName}
              onChange={(e) => setNewAllergyName(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <div className="flex items-center gap-2">
              <select
                value={newAllergySeverity}
                onChange={(e) => setNewAllergySeverity(e.target.value)}
                className="flex-1 sm:w-28 px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none font-semibold text-slate-700"
              >
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>

        {/* Chronic Conditions Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Chronic Medical Conditions</span>
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold flex-shrink-0">
              {conditions.length} Listed
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {conditions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No chronic conditions recorded.</p>
            ) : (
              conditions.map((cond) => (
                <div
                  key={cond.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 break-words">{cond.name}</span>
                    {cond.notes && <p className="text-[11px] text-slate-600 mt-0.5 break-words">{cond.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCondition(cond.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors flex-shrink-0"
                    title="Delete condition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Condition Form: Responsive on mobile */}
          <form onSubmit={handleAddCondition} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Condition (e.g. Asthma, Hypertension)"
              value={newConditionName}
              onChange={(e) => setNewConditionName(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newConditionNotes}
                onChange={(e) => setNewConditionNotes(e.target.value)}
                className="flex-1 sm:w-36 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 4. ACCOUNT SECURITY & CHANGE PASSWORD */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Account Security & Password
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Update your account password to protect access to your confidential medical records.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Current Password */}
            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors focus:outline-none"
                  title={showCurrentPass ? "Hide password" : "Show password"}
                  aria-label={showCurrentPass ? "Hide password" : "Show password"}
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors focus:outline-none"
                  title={showNewPass ? "Hide password" : "Show password"}
                  aria-label={showNewPass ? "Hide password" : "Show password"}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="min-w-0">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors focus:outline-none"
                  title={showConfirmPass ? "Hide password" : "Show password"}
                  aria-label={showConfirmPass ? "Hide password" : "Show password"}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-500">
              Passwords must be at least 6 characters long.
            </span>
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>{changingPassword ? "Updating Password..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* MOBILE BOTTOM SAVE BUTTON */}
      <div className="sm:hidden pt-2 pb-6">
        <button
          type="submit"
          form="profile-form"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
        </button>
      </div>
    </div>
  );
}
