import { 
  ShieldAlert, 
  Heart, 
  Phone, 
  AlertTriangle, 
  Activity, 
  User, 
  Clock, 
  Info,
  CheckCircle2
} from "lucide-react";

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

interface EmergencyData {
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
  updated_at?: string;
}

import { getApiBase, PROD_API_URL } from "@/lib/api";

async function getEmergencyData(uuid: string): Promise<EmergencyData | null> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/records/emergency-scan/${uuid}/`, {
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch {
    // If local failed and we are not already querying PROD, try PROD
  }

  if (base !== PROD_API_URL) {
    try {
      const res = await fetch(`${PROD_API_URL}/api/records/emergency-scan/${uuid}/`, {
        cache: "no-store",
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error("Emergency scan server fetch error:", err);
    }
  }

  return null;
}

export default async function PublicEmergencyScanPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const data = await getEmergencyData(uuid);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4 border border-red-500/30">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-heading">Emergency Profile Not Found</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-sm">
          The requested emergency QR profile does not exist, has expired, or the medical registry server is offline.
        </p>
        <span className="text-xs text-slate-600 mt-4 font-mono">UUID: {uuid}</span>
      </div>
    );
  }

  const severeAllergies = data.allergies?.filter(a => a.severity === 'Severe') || [];
  const otherAllergies = data.allergies?.filter(a => a.severity !== 'Severe') || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-500 selection:text-white pb-16">
      
      {/* Top Critical Alert Bar */}
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest sticky top-0 z-50 shadow-lg">
        <ShieldAlert className="w-4 h-4 animate-pulse flex-shrink-0" />
        <span>First Responder Emergency Pass • NDPR Medical Exception</span>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Patient Identity & Blood Group Hero Card */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border-2 border-red-500/40 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5" />
                Verified Patient Pass
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
                {data.patient_name || "Emergency Patient"}
              </h1>
              <p className="text-slate-400 text-xs mt-1.5 font-mono">
                REGISTRY ID: {data.uuid.substring(0, 18)}...
              </p>
            </div>

            {/* Blood Group Highlight Card */}
            <div className="bg-red-600 text-white px-6 py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-red-600/30 border border-red-400/40 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-100">Blood Group</span>
              <span className="text-4xl font-black tracking-tight">{data.blood_group || "N/A"}</span>
            </div>
          </div>

          {/* Secondary Vitals Bar */}
          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-slate-800 text-center">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <span className="block text-[11px] text-slate-400">Weight</span>
              <span className="text-sm font-bold text-slate-200">{data.weight_kg ? `${data.weight_kg} kg` : "—"}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <span className="block text-[11px] text-slate-400">Height</span>
              <span className="text-sm font-bold text-slate-200">{data.height_cm ? `${data.height_cm} cm` : "—"}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
              <span className="block text-[11px] text-slate-400">Date of Birth</span>
              <span className="text-sm font-bold text-slate-200">{data.date_of_birth || "—"}</span>
            </div>
          </div>
        </div>

        {/* Severe Allergies (Highest Priority for Emergency Responders) */}
        {severeAllergies.length > 0 && (
          <div className="bg-red-950/50 border-2 border-red-600/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <h2 className="text-lg font-black uppercase tracking-wide">Severe Allergies & Contraindications</h2>
            </div>
            <div className="grid gap-2.5">
              {severeAllergies.map((allergy) => (
                <div key={allergy.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3.5 rounded-xl bg-red-900/40 border border-red-700/70">
                  <span className="font-bold text-white text-base break-words">{allergy.name}</span>
                  <span className="px-3 py-1 rounded-full bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm w-fit flex-shrink-0">
                    CRITICAL: {allergy.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Allergies */}
        {otherAllergies.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Other Sensitivities & Allergies
            </h3>
            <div className="flex flex-wrap gap-2">
              {otherAllergies.map((allergy) => (
                <span key={allergy.id} className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
                  {allergy.name} ({allergy.severity})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <Activity className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white font-heading">Chronic Conditions & History</h2>
          </div>
          {data.conditions?.length === 0 ? (
            <p className="text-slate-500 text-xs">No chronic conditions registered.</p>
          ) : (
            <div className="space-y-3">
              {data.conditions?.map((cond) => (
                <div key={cond.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-100">{cond.name}</h4>
                    {cond.diagnosed_date && (
                      <span className="text-[11px] text-slate-400">Diagnosed: {cond.diagnosed_date}</span>
                    )}
                  </div>
                  {cond.notes && (
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                      {cond.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Emergency Contact (One-Touch Call) */}
        <div className="bg-gradient-to-r from-emerald-950/70 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-xl">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
            Primary Emergency Contact
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white font-heading">
                {data.emergency_contact_name || "Emergency Contact Not Listed"}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Authorized medical decision proxy.
              </p>
            </div>

            {data.emergency_contact_phone ? (
              <a 
                href={`tel:${data.emergency_contact_phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/30 text-sm"
              >
                <Phone className="w-4 h-4 animate-pulse" />
                <span>Call {data.emergency_contact_phone}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500">No phone on file</span>
            )}
          </div>
        </div>

        {/* NDPR Legal Notice */}
        <div className="text-center pt-6 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>Compliant with NDPR Section 2.1 (Vital Interests Processing Exemption for Medical Emergencies).</span>
        </div>

      </main>
    </div>
  );
}
