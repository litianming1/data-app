import { ProtectedRoute } from "@/components/auth/protected-route";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Suspense } from "react";

function AuthFallback() {
  return (
    <main className="grid h-dvh place-items-center bg-slate-950 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        正在准备邮件工作区…
      </div>
    </main>
  );
}

export default function EmailLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AuthFallback />}>
      <ProtectedRoute>
        <WorkspaceShell>{children}</WorkspaceShell>
      </ProtectedRoute>
    </Suspense>
  );
}
