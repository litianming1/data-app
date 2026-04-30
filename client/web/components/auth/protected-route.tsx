"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Loader2Icon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading || user) {
      return;
    }

    const query = searchParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isLoading, pathname, router, searchParams, user]);

  if (isLoading) {
    return (
      <main className="grid h-dvh place-items-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm shadow-2xl shadow-cyan-950/40">
          <Loader2Icon className="size-4 animate-spin text-cyan-300" />
          正在确认登录状态…
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}