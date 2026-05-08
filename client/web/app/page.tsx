"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="space-y-3">
        <p className="font-medium text-lg">正在进入 AI 工作区…</p>
        <a className="text-primary text-sm underline-offset-4 hover:underline" href="/chat">
          如果没有自动跳转，请点击这里进入 Chat
        </a>
      </div>
    </main>
  );
}
