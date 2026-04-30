import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

function LoginFallback() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#07111f] text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        正在准备登录页…
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}