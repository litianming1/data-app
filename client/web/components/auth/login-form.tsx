"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { BotIcon, Loader2Icon, LockKeyholeIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginUser = {
  role: string;
};

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/chat";
  }

  return next;
}

function getLoginRedirect(user: LoginUser, next: string) {
  if (user.role !== "admin" && next.startsWith("/users")) {
    return "/chat";
  }

  return next;
}

export function LoginForm() {
  const { isLoading, login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const next = getSafeNext(searchParams.get("next"));
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getLoginRedirect(user, next));
    }
  }, [isLoading, next, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);

    try {
      const loggedInUser = await login(values.email, values.password);
      router.replace(getLoginRedirect(loggedInUser, next));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
    }
  });

  return (
    <div className="grid min-h-dvh overflow-hidden bg-[#07111f] text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden min-h-dvh overflow-hidden p-10 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(34,211,238,0.32),transparent_28%),radial-gradient(circle_at_72%_64%,rgba(59,130,246,0.24),transparent_30%),linear-gradient(135deg,#07111f,#0e1729_48%,#0f2535)]" />
        <div className="absolute left-20 top-24 h-64 w-64 rounded-full border border-cyan-300/20" />
        <div className="absolute bottom-20 right-16 h-72 w-72 rounded-full border border-blue-200/10" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-cyan-100 text-sm backdrop-blur">
            <BotIcon className="size-4" />
            AI App Secure Workspace
          </div>
          <div className="max-w-xl">
            <p className="mb-4 text-cyan-200 text-sm uppercase tracking-[0.42em]">
              Local Auth Gate
            </p>
            <h1 className="font-semibold text-5xl leading-tight tracking-[-0.04em]">
              你的 AI 工作区。
            </h1>
            <p className="mt-5 max-w-md text-slate-300 leading-7">
              AI App Secure Workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-10">
        <form
          className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-cyan-950/30 sm:p-8"
          onSubmit={onSubmit}
        >
          <div className="mb-7 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-cyan-200">
              <LockKeyholeIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-2xl tracking-tight">登录</h2>
              <p className="text-slate-500 text-sm">请输入账号继续</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="grid gap-1.5">
              <span className="font-medium text-slate-600 text-sm">邮箱</span>
              <Input
                {...register("email")}
                aria-invalid={!!errors.email}
                autoComplete="email"
                className="h-11 rounded-xl bg-slate-50 px-3"
                placeholder="Email"
                type="email"
              />
              {errors.email ? (
                <span className="text-rose-600 text-xs">{errors.email.message}</span>
              ) : null}
            </label>

            <label className="grid gap-1.5">
              <span className="font-medium text-slate-600 text-sm">密码</span>
              <PasswordInput
                {...register("password")}
                aria-invalid={!!errors.password}
                autoComplete="current-password"
                className="h-11 rounded-xl bg-slate-50 px-3"
                placeholder="Password"
              />
              {errors.password ? (
                <span className="text-rose-600 text-xs">
                  {errors.password.message}
                </span>
              ) : null}
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
              {errorMessage}
            </div>
          ) : null}

          <Button
            className="mt-6 h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
            disabled={isSubmitting || isLoading}
            type="submit"
          >
            {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {isSubmitting ? "登录中…" : "进入工作区"}
          </Button>

          <p className="mt-5 text-center text-slate-400 text-xs">
            {/* 管理员账号由后端启动时根据 .env 自动初始化。 */}
          </p>
        </form>
      </section>
    </div>
  );
}