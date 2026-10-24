"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoctorIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/doctor/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
        <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading clinician portal...</span>
      </div>
    </div>
  );
}
