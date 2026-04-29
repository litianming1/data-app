"use client";

import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  ChevronRightIcon,
  CloudIcon,
  MenuIcon,
  PenLineIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  { href: "/chat", icon: PenLineIcon, label: "新对话", shortcut: "Ctrl K" },
  { href: "/create", icon: SparklesIcon, label: "AI 创作" },
  { href: "/skills", icon: BrainCircuitIcon, label: "Skills" },
  { href: "/drive", icon: CloudIcon, label: "云盘" },
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
  "/skills": {
    description: "MongoDB 持久化 Skills 配置",
    title: "Skills 管理",
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
  const [chrome, setChrome] = useState<WorkspaceChrome | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const defaultChrome = routeChrome[pathname] ?? routeChrome["/chat"];
  const title = chrome?.title ?? defaultChrome.title;
  const description = chrome?.description ?? defaultChrome.description;

  const contextValue = useMemo(() => ({ setChrome }), []);

  return (
    <WorkspaceChromeContext.Provider value={contextValue}>
      <main className="flex h-dvh min-w-0 overflow-hidden bg-slate-100 text-slate-950">
        <aside
          aria-hidden={!isSidebarOpen}
          className={cn(
            "hidden h-dvh shrink-0 overflow-hidden border-r bg-slate-50 transition-[width,border-color] duration-300 ease-out md:block",
            isSidebarOpen
              ? "w-64 border-slate-200"
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
            <div className="shrink-0 border-slate-200 border-b px-4 pb-3 pt-4">
              <div className="mb-4 flex items-center gap-2 px-1">
                <div className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 font-semibold text-[11px] text-white shadow-sm shadow-cyan-500/20">
                  AI
                </div>
                <span className="font-semibold text-sm">AI App</span>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-white shadow-sm ring-1 ring-cyan-100"
                          : "hover:bg-white/80"
                      )}
                      href={item.href}
                      key={item.href}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          isActive ? "text-cyan-700" : "text-neutral-700"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[11px] text-neutral-300">
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

            <div className="shrink-0 border-slate-200 border-t bg-white/70 p-3">
              <div className="flex h-11 items-center gap-2 rounded-xl px-2 transition-colors hover:bg-slate-100">
                <div className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-600 font-semibold text-[10px] text-white">
                  U
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  workspace
                </span>
                <ChevronRightIcon className="size-4 text-slate-400" />
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
          <header className="grid h-11 shrink-0 grid-cols-[auto_1fr_auto] items-center border-slate-200 border-b bg-white/85 px-3 backdrop-blur">
            <button
              aria-label={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
              className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
              onClick={() => setIsSidebarOpen((current) => !current)}
              type="button"
            >
              <MenuIcon className="size-4" />
            </button>

            <div className="min-w-0 text-center leading-tight">
              <h1 className="font-medium text-sm">{title}</h1>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>

            <div aria-hidden="true" className="size-8" />
          </header>

          <div className="min-h-0 flex-1">{children}</div>
        </section>
      </main>
    </WorkspaceChromeContext.Provider>
  );
}