"use client";

import { PasswordInput } from "@/components/auth/password-input";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CrownIcon,
  KeyRoundIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type UserRole = "admin" | "user";

type ManagedUser = {
  created_at: string;
  email: string;
  id: string;
  name: string;
  role: UserRole;
  updated_at: string;
};

type UserCreateForm = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

type UserEditForm = {
  name: string;
  password: string;
  role: UserRole;
};

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: "普通用户", value: "user" },
  { label: "管理员", value: "admin" },
];

const createUserSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱"),
  name: z.string().trim().min(1, "请输入名称"),
  password: z.string().min(6, "密码至少 6 位"),
  role: z.enum(["admin", "user"]),
});

const editUserSchema = z.object({
  name: z.string().trim().min(1, "请输入名称"),
  password: z
    .string()
    .refine((value) => !value || value.length >= 6, "密码至少 6 位"),
  role: z.enum(["admin", "user"]),
});

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);

  if (!response.ok) {
    let message = "用户管理请求失败";
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail || message;
    } catch {
      const detail = await response.text();
      message = detail || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function toEditForm(user: ManagedUser): UserEditForm {
  return { name: user.name, password: "", role: user.role };
}

export function UsersManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    formState: { errors: createErrors, isSubmitting: isCreating },
    handleSubmit: handleCreateSubmit,
    register: registerCreate,
    reset: resetCreate,
  } = useForm<UserCreateForm>({
    defaultValues: {
      email: "",
      name: "",
      password: "",
      role: "user",
    },
    resolver: zodResolver(createUserSchema),
  });
  const {
    formState: { errors: editErrors },
    handleSubmit: handleEditSubmit,
    register: registerEdit,
    reset: resetEdit,
  } = useForm<UserEditForm>({
    defaultValues: { name: "", password: "", role: "user" },
    resolver: zodResolver(editUserSchema),
  });

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users]
  );

  const adminCount = users.filter((user) => user.role === "admin").length;
  const regularCount = users.length - adminCount;

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [user.email, user.name, user.role]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, users]);

  const chrome = useMemo(
    () => ({
      description: "管理员账号、角色和访问权限",
      title: "用户管理",
    }),
    []
  );

  useWorkspaceChrome(chrome);

  useEffect(() => {
    if (currentUser?.role !== "admin") {
      return;
    }

    let isMounted = true;

    async function loadUsers() {
      try {
        const nextUsers = await requestJson<ManagedUser[]>("/api/users");
        if (!isMounted) {
          return;
        }
        setUsers(nextUsers);
        setSelectedUserId(nextUsers[0]?.id ?? null);
        if (nextUsers[0]) {
          resetEdit(toEditForm(nextUsers[0]));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "用户加载失败");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.role, resetEdit]);

  useEffect(() => {
    if (selectedUser) {
      resetEdit(toEditForm(selectedUser));
    }
  }, [resetEdit, selectedUser]);

  const createUser = handleCreateSubmit(async (payload) => {
    setErrorMessage(null);
    try {
      const nextUser = await requestJson<ManagedUser>("/api/users", {
        body: JSON.stringify(payload),
        method: "POST",
      });
      setUsers((current) => [nextUser, ...current]);
      setSelectedUserId(nextUser.id);
      resetCreate({ email: "", name: "", password: "", role: "user" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建用户失败");
    }
  });

  const saveSelectedUser = handleEditSubmit(async (values) => {
    if (!selectedUser) {
      return;
    }

    const payload: Partial<UserEditForm> = {
      name: values.name,
      role: values.role,
    };
    if (values.password.trim()) {
      payload.password = values.password;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const nextUser = await requestJson<ManagedUser>(`/api/users/${selectedUser.id}`, {
        body: JSON.stringify(payload),
        method: "PATCH",
      });
      setUsers((current) =>
        current.map((user) => (user.id === nextUser.id ? nextUser : user))
      );
      resetEdit(toEditForm(nextUser));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存用户失败");
    } finally {
      setIsSaving(false);
    }
  });

  const deleteSelectedUser = async () => {
    if (!selectedUser) {
      return;
    }

    const shouldDelete = window.confirm(
      `确认删除用户「${selectedUser.email}」？此操作不可恢复。`
    );

    if (!shouldDelete) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await requestJson<void>(`/api/users/${selectedUser.id}`, { method: "DELETE" });
      const remainingUsers = users.filter((user) => user.id !== selectedUser.id);
      setUsers(remainingUsers);
      setSelectedUserId(remainingUsers[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除用户失败");
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="grid h-full place-items-center px-4">
        <div className="max-w-md rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-center text-amber-900 shadow-sm dark:text-amber-200">
          <ShieldAlertIcon className="mx-auto mb-3 size-8" />
          <h2 className="font-semibold text-lg">需要管理员权限</h2>
          <p className="mt-2 text-sm leading-6">
            当前账号只能查看自己的工作区数据，用户管理入口仅对 admin 开放。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[1fr_24rem]">
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
              <p className="text-muted-foreground text-xs">总用户</p>
              <p className="mt-2 font-semibold text-2xl">{users.length}</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-sm">
              <p className="text-primary text-xs">管理员</p>
              <p className="mt-2 font-semibold text-2xl text-primary">
                {adminCount}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
              <p className="text-muted-foreground text-xs">普通用户</p>
              <p className="mt-2 font-semibold text-2xl">{regularCount}</p>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
                  <UsersIcon className="size-3.5" />
                  Admin Console
                </div>
                <h2 className="font-semibold text-xl tracking-tight">
                  管理登录用户
                </h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  新建账号、调整角色、重置密码；普通用户只能看到自己的对话数据。
                </p>
              </div>
              <label className="relative block w-full lg:w-72">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 rounded-xl bg-background pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索邮箱、名称或角色"
                  value={query}
                />
              </label>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {isLoading ? (
              <div className="rounded-2xl border bg-card p-6 text-muted-foreground text-sm shadow-sm lg:col-span-2">
                正在加载用户…
              </div>
            ) : null}
            {!isLoading && filteredUsers.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6 text-muted-foreground text-sm shadow-sm lg:col-span-2">
                没有匹配的用户
              </div>
            ) : null}
            {filteredUsers.map((managedUser) => {
              const isSelected = managedUser.id === selectedUser?.id;
              const isCurrentUser = managedUser.id === currentUser?.id;

              return (
                <button
                  className={
                    isSelected
                      ? "rounded-2xl border border-primary/30 bg-card p-4 text-left shadow-sm ring-1 ring-primary/20"
                      : "rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50"
                  }
                  key={managedUser.id}
                  onClick={() => setSelectedUserId(managedUser.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        {managedUser.role === "admin" ? (
                          <CrownIcon className="size-4 text-primary-foreground" />
                        ) : (
                          <UserRoundIcon className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-card-foreground text-sm">
                          {managedUser.name}
                        </h3>
                        <p className="truncate text-muted-foreground text-xs">
                          {managedUser.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        className={
                          managedUser.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }
                        variant="secondary"
                      >
                        {managedUser.role === "admin" ? "管理员" : "用户"}
                      </Badge>
                      {isCurrentUser ? (
                        <span className="text-[11px] text-muted-foreground">当前账号</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-muted-foreground text-xs">
                    <span>创建 {formatDate(managedUser.created_at)}</span>
                    <span className="text-right">更新 {formatDate(managedUser.updated_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <form
            className="rounded-3xl border bg-card p-4 text-card-foreground shadow-sm"
            onSubmit={createUser}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlusIcon className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">新建用户</h3>
                <p className="text-muted-foreground text-xs">创建后即可用邮箱密码登录</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-xs">邮箱</span>
                <Input {...registerCreate("email")} aria-invalid={!!createErrors.email} />
                {createErrors.email ? (
                  <span className="text-rose-600 text-xs">
                    {createErrors.email.message}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-xs">名称</span>
                <Input {...registerCreate("name")} aria-invalid={!!createErrors.name} />
                {createErrors.name ? (
                  <span className="text-rose-600 text-xs">
                    {createErrors.name.message}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-xs">初始密码</span>
                <PasswordInput
                  {...registerCreate("password")}
                  aria-invalid={!!createErrors.password}
                />
                {createErrors.password ? (
                  <span className="text-rose-600 text-xs">
                    {createErrors.password.message}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-xs">角色</span>
                <select
                  {...registerCreate("role")}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Button
              className="mt-4 w-full rounded-xl"
              disabled={isCreating}
              type="submit"
            >
              <PlusIcon className="size-4" />
              {isCreating ? "创建中…" : "创建用户"}
            </Button>
          </form>

          <form
            className="rounded-3xl border bg-card p-4 text-card-foreground shadow-sm"
            onSubmit={saveSelectedUser}
          >
            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">当前用户</p>
                    <h3 className="mt-1 truncate font-semibold text-lg">
                      {selectedUser.email}
                    </h3>
                  </div>
                  <Badge variant="outline">
                    {selectedUser.role === "admin" ? "管理员" : "用户"}
                  </Badge>
                </div>

                <label className="grid gap-1.5">
                  <span className="font-medium text-muted-foreground text-xs">名称</span>
                  <Input {...registerEdit("name")} aria-invalid={!!editErrors.name} />
                  {editErrors.name ? (
                    <span className="text-rose-600 text-xs">
                      {editErrors.name.message}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-1.5">
                  <span className="font-medium text-muted-foreground text-xs">角色</span>
                  <select
                    {...registerEdit("role")}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                    disabled={selectedUser.id === currentUser?.id}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="font-medium text-muted-foreground text-xs">
                    重置密码（可选）
                  </span>
                  <PasswordInput
                    {...registerEdit("password")}
                    aria-invalid={!!editErrors.password}
                    placeholder="留空则不修改密码"
                  />
                  {editErrors.password ? (
                    <span className="text-rose-600 text-xs">
                      {editErrors.password.message}
                    </span>
                  ) : null}
                </label>

                <Button
                  className="w-full rounded-xl"
                  disabled={isSaving}
                  type="submit"
                >
                  <SaveIcon className="size-4" />
                  {isSaving ? "保存中…" : "保存用户"}
                </Button>

                <Button
                  className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isSaving || selectedUser.id === currentUser?.id}
                  onClick={() => void deleteSelectedUser()}
                  type="button"
                  variant="outline"
                >
                  <Trash2Icon className="size-4" />
                  {selectedUser.id === currentUser?.id ? "不能删除当前账号" : "删除用户"}
                </Button>

                <div className="rounded-2xl bg-muted/50 p-3 text-muted-foreground text-xs leading-6">
                  <KeyRoundIcon className="mr-1 inline size-3.5" />
                  密码只会写入哈希值，API 不会返回密码或哈希。
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-muted/50 p-6 text-center text-muted-foreground text-sm">
                请选择一个用户
              </div>
            )}
          </form>
        </aside>
      </div>
    </div>
  );
}