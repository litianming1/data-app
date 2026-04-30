"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useTheme, type ThemeMode } from "@/components/theme/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  CloudIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  PenLineIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WorkspaceChrome = {
  description?: string;
  sidebarContent?: ReactNode;
  title?: string;
};

type WorkspaceChromeContextValue = {
  setChrome: (chrome: WorkspaceChrome | null) => void;
};

const WorkspaceChromeContext = createContext<WorkspaceChromeContextValue | null>(
  null
);

const navItems = [
  { href: "/chat", icon: PenLineIcon, label: "AI 对话", shortcut: "Ctrl K" },
  { href: "/create", icon: SparklesIcon, label: "AI 创作" },
  { href: "/skills", icon: BrainCircuitIcon, label: "Skills" },
  { href: "/drive", icon: CloudIcon, label: "云盘" },
  { href: "/email", icon: MailIcon, label: "邮件管理" },
  { adminOnly: true, href: "/users", icon: UsersIcon, label: "用户管理" },
];

const themeOptions: Array<{ icon: typeof SunIcon; label: string; value: ThemeMode }> = [
  { icon: SunIcon, label: "浅色", value: "light" },
  { icon: MoonIcon, label: "深色", value: "dark" },
  { icon: MonitorIcon, label: "匹配系统设置", value: "system" },
];

const routeChrome: Record<string, Required<Pick<WorkspaceChrome, "description" | "title">>> = {
  "/chat": {
    description: "AI 生成内容仅供参考，请结合实际判断",
    title: "新对话",
  },
  "/create": {
    description: "图片 / 视频对话式生成",
    title: "AI 创作",
  },
  "/drive": {
    description: "文件与素材管理即将上线",
    title: "云盘",
  },
  "/email": {
    description: "客户邮件、营销模板和自动化跟进",
    title: "邮件管理",
  },
  "/skills": {
    description: "MongoDB 持久化 Skills 配置",
    title: "Skills 管理",
  },
  "/users": {
    description: "管理员账号、角色和访问权限",
    title: "用户管理",
  },
};

export function useWorkspaceChrome(chrome: WorkspaceChrome) {
  const context = useContext(WorkspaceChromeContext);

  if (!context) {
    throw new Error("useWorkspaceChrome must be used within WorkspaceShell");
  }

  useEffect(() => {
    context.setChrome(chrome);

    return () => {
      context.setChrome(null);
    };
  }, [chrome, context]);
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { setTheme, theme } = useTheme();
  const [chrome, setChrome] = useState<WorkspaceChrome | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const defaultChrome = routeChrome[pathname] ?? routeChrome["/chat"];
  const title = chrome?.title ?? defaultChrome.title;
  const description = chrome?.description ?? defaultChrome.description;

  const contextValue = useMemo(() => ({ setChrome }), []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <WorkspaceChromeContext.Provider value={contextValue}>
      <main className="flex h-dvh min-w-0 overflow-hidden bg-background text-foreground">
        <aside
          aria-hidden={!isSidebarOpen}
          className={cn(
            "hidden h-dvh shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width,border-color] duration-300 ease-out md:block",
            isSidebarOpen
              ? "w-64 border-sidebar-border"
              : "w-0 border-transparent"
          )}
          inert={isSidebarOpen ? undefined : true}
        >
          <div
            className={cn(
              "flex h-full w-64 flex-col",
              isSidebarOpen
                ? "opacity-100 transition-opacity delay-75 duration-200"
                : "pointer-events-none opacity-0 transition-opacity duration-150"
            )}
          >
            <div className="shrink-0 border-sidebar-border border-b px-4 pb-3 pt-4">
              <div className="mb-4 flex items-center gap-2 px-1">
                <div className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 font-semibold text-[11px] text-white shadow-sm shadow-cyan-500/20">
                  AI
                </div>
                <span className="font-semibold text-sm">AI App</span>
              </div>

              <nav className="space-y-1">
                {navItems.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70"
                      )}
                      href={item.href}
                      key={item.href}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          isActive
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[11px] text-muted-foreground">
                          {item.shortcut}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {chrome?.sidebarContent}
            </div>

            <div className="shrink-0 border-sidebar-border border-t bg-sidebar p-3">
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-sidebar-accent">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary font-semibold text-[10px] text-primary-foreground">
                  {user?.name?.slice(0, 1).toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sidebar-foreground text-sm">
                    {user?.name ?? "workspace"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user?.email ?? "已登录"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="设置"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      type="button"
                    >
                      <SettingsIcon className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" side="top">
                    <DropdownMenuLabel>设置</DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <SunIcon className="size-4" />
                        设置主题
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-44">
                        <DropdownMenuRadioGroup
                          onValueChange={(value) => setTheme(value as ThemeMode)}
                          value={theme}
                        >
                          {themeOptions.map((option) => {
                            const Icon = option.icon;

                            return (
                              <DropdownMenuRadioItem key={option.value} value={option.value}>
                                <Icon className="size-4" />
                                {option.label}
                              </DropdownMenuRadioItem>
                            );
                          })}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-rose-600 focus:text-rose-600"
                      onClick={() => void handleLogout()}
                    >
                      <LogOutIcon className="size-4" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="grid h-11 shrink-0 grid-cols-[auto_1fr_auto] items-center border-border border-b bg-background px-3">
            <button
              aria-label={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsSidebarOpen((current) => !current)}
              type="button"
            >
              <MenuIcon className="size-4" />
            </button>

            <div className="min-w-0 text-center leading-tight">
              <h1 className="font-medium text-sm">{title}</h1>
              <p className="text-[11px] text-muted-foreground">{description}</p>
            </div>

            <div aria-hidden="true" className="size-8" />
          </header>

          <div className="min-h-0 flex-1">{children}</div>
        </section>
      </main>
    </WorkspaceChromeContext.Provider>
  );
}