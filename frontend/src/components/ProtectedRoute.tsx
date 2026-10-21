"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getAccessToken } from "@/lib/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const token = getAccessToken();
      if (!token) {
        if (isMounted) router.push("/login");
        return;
      }

      try {
        const res = await authFetch("/api/users/me/");
        if (!isMounted) return;

        if (res.ok) {
          setAuthorized(true);
        } else {
          // authFetch handles token refresh or redirection on failure
          if (isMounted) {
            setAuthorized(false);
            router.push("/login");
          }
        }
      } catch {
        if (isMounted) {
          setAuthorized(false);
          router.push("/login");
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (authorized !== true) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Verifying Authorization...</span>
      </div>
    );
  }

  return <>{children}</>;
}
