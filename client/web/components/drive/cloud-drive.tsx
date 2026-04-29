"use client";

import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import {
  CircleIcon,
  CloudIcon,
  FileImageIcon,
  FileTextIcon,
  FolderOpenIcon,
  HardDriveIcon,
  UploadCloudIcon,
} from "lucide-react";
import { useMemo } from "react";

const driveSections = ["全部文件", "最近使用", "图片素材", "文档", "生成结果"];

export function CloudDrive() {
  const sidebarContent = useMemo(
    () => (
      <>
        <p className="mb-2 px-1 font-medium text-[11px] text-slate-400">
          文件分类
        </p>
        <div className="space-y-1 pb-3">
          {driveSections.map((item) => (
            <button
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-700 transition-colors hover:bg-white"
              key={item}
              type="button"
            >
              <CircleIcon className="size-3.5 text-slate-300" />
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      </>
    ),
    []
  );

  const chrome = useMemo(
    () => ({
      description: "文件与素材管理即将上线",
      sidebarContent,
      title: "云盘",
    }),
    [sidebarContent]
  );

  useWorkspaceChrome(chrome);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-[2rem] border border-cyan-100 bg-white p-8 shadow-sm">
          <div className="flex min-h-104 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-cyan-200 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.13),transparent_34%),linear-gradient(180deg,#f8fdff_0%,#ffffff_100%)] px-6 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20">
              <CloudIcon className="size-8" />
            </div>
            <h2 className="font-semibold text-2xl tracking-tight">
              文件与素材管理即将上线
            </h2>
            <p className="mt-3 max-w-lg text-slate-500 text-sm leading-6">
              这里将用于管理对话附件、生成结果、参考图和提示词素材。本次先接入真实
              `/drive` 路由，避免导航停留在占位链接。
            </p>
            <button
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 font-medium text-sm text-white shadow-sm transition-colors hover:bg-slate-800"
              type="button"
            >
              <UploadCloudIcon className="size-4" />
              上传能力待接入
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <HardDriveIcon className="size-4 text-cyan-600" />
              <h3 className="font-semibold text-sm">空间概览</h3>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[18%] rounded-full bg-cyan-500" />
            </div>
            <p className="mt-2 text-slate-500 text-xs">占位统计：1.8 GB / 10 GB</p>
          </div>

          <div className="grid gap-3">
            {[
              { icon: FolderOpenIcon, label: "项目素材", value: "24" },
              { icon: FileImageIcon, label: "图片", value: "128" },
              { icon: FileTextIcon, label: "文档", value: "12" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  key={item.label}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-slate-400 text-xs">即将支持同步管理</p>
                  </div>
                  <span className="font-semibold text-slate-700 text-sm">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}