"use client";

import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CircleIcon,
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  MicIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCwIcon,
  Share2Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  VideoIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const mediaKindOptions = [
  { id: "image", label: "AI生图", icon: ImageIcon },
  { id: "video", label: "AI视频", icon: VideoIcon },
] as const;

const imageRatioOptions = ["1:1", "3:4", "4:3", "16:9", "9:16"];
const videoDurationOptions = ["5秒", "10秒", "15秒", "30秒"];

const suggestionItems = ["背景换成静谧的森林湖泊", "加上唯美的暖金色阳光"];

const historyItems = [
  "香水海报提示词",
  "活动海报提示词",
  "产品短视频分镜",
  "电商主图方案",
  "人物设定草案",
  "品牌视觉扩写",
];

const defaultPrompt =
  "高级自然风香水宣传海报，以静谧的蓝灰渐变背景为底，搭配圆形透明镜面增强空间层次；画面中心是方形透明香水瓶，内装浅琥珀香水，黑色瓶盖，标签印 ‘PERFUME’，香水瓶置于带天然纹理的木质底座上；周围点缀弯曲的原木枝、带绿叶的细枝，下方是波光粼粼的水面，香水与文字在水面形成清晰倒影，强化质感；文字部分用优雅衬线字体呈现大号 ‘PERFUME’，下方搭配中文 ‘你如自然般美丽’，整体风格静谧高级，突出自然美学与香水质感，色调融合蓝调、木色、棕色，营造出与自然共生的优雅氛围。";

function VisualResultCard({ index, mediaKind }: { index: number; mediaKind: "image" | "video" }) {
  return (
    <div className="group relative aspect-3/4 overflow-hidden border border-white bg-slate-200 first:rounded-l-xl last:rounded-r-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_22%,rgba(255,255,255,0.72),transparent_22%),radial-gradient(circle_at_48%_55%,rgba(146,64,14,0.46),transparent_16%),linear-gradient(160deg,#dbeafe_0%,#8da2b3_46%,#294154_100%)]" />
      <div className="absolute right-4 top-6 h-28 w-20 rounded-sm border border-amber-900/30 bg-amber-100/70 shadow-2xl shadow-slate-900/30">
        <div className="mx-auto mt-2 h-5 w-8 rounded-sm bg-slate-950" />
        <div className="mx-auto mt-9 w-12 border border-amber-900/30 bg-white/70 py-1 text-center font-semibold text-[7px] text-slate-700">
          PERFUME
        </div>
      </div>
      <div className="absolute bottom-8 left-3 right-3 h-7 rounded-full bg-amber-950/50 blur-sm" />
      <div className="absolute bottom-16 left-0 right-0 h-10 rotate-[-10deg] bg-[linear-gradient(90deg,transparent,#7c4a1e_18%,#d6a15f_52%,#5a3318_80%,transparent)] shadow-lg" />
      <div className="absolute left-4 top-12 h-28 w-20 rotate-[-18deg] rounded-full border border-white/60" />
      <div className="absolute right-2 top-14 h-16 w-10 rotate-12 rounded-full border-l-2 border-green-700/70" />
      <div className="absolute right-5 top-12 size-4 rounded-full bg-green-700" />
      <div className="absolute right-8 top-24 size-3 rounded-full bg-green-600" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-slate-950/50 to-transparent" />
      <div className="absolute left-4 top-6 font-serif text-white drop-shadow-sm">
        <p className="text-lg leading-none">你如自然般美丽</p>
        <p className="mt-1 text-center text-[10px]">自然美学</p>
      </div>
      <div className="absolute bottom-6 left-4 right-4 text-center font-serif text-white drop-shadow">
        <p className="text-lg leading-none">你如自然般美丽</p>
        <p className="text-[10px]">自然美学</p>
      </div>
      {mediaKind === "video" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10 opacity-90">
          <div className="flex size-10 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg">
            <VideoIcon className="size-4" />
          </div>
        </div>
      )}
      <span className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-slate-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        #{index + 1}
      </span>
    </div>
  );
}

export function AICreate() {
  const [selectedMediaKind, setSelectedMediaKind] = useState<"image" | "video">("image");
  const [selectedRatio, setSelectedRatio] = useState(imageRatioOptions[1]);
  const [selectedDuration, setSelectedDuration] = useState(videoDurationOptions[1]);
  const [brief, setBrief] = useState(defaultPrompt);
  const [submittedPrompt, setSubmittedPrompt] = useState(defaultPrompt);
  const [copyStatus, setCopyStatus] = useState("复制");

  const generatedPrompt = useMemo(() => {
    const subject = submittedPrompt.trim() || defaultPrompt;

    if (selectedMediaKind === "video") {
      return `${subject} 视频版本：镜头由中景缓慢推进到香水瓶特写，水面倒影轻微波动，枝叶自然摆动，${selectedDuration}，稳定运镜，柔和景深，商业广告质感，避免文字乱码、低清晰度、畸形结构。`;
    }

    return `${subject} 图片比例 ${selectedRatio}，高清商业摄影，主体清晰，画面干净，光影高级，避免文字乱码、低清晰度、畸形结构。`;
  }, [selectedDuration, selectedMediaKind, selectedRatio, submittedPrompt]);

  const copyPrompt = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedPrompt);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = generatedPrompt;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("已复制");
    } catch {
      setCopyStatus("失败");
    } finally {
      window.setTimeout(() => setCopyStatus("复制"), 1500);
    }
  }, [generatedPrompt]);

  const submitPrompt = useCallback(() => {
    const nextPrompt = brief.trim();
    if (!nextPrompt) {
      return;
    }
    setSubmittedPrompt(nextPrompt);
  }, [brief]);

  const ratioOrDuration = selectedMediaKind === "video" ? selectedDuration : selectedRatio;

  const sidebarContent = useMemo(
    () => (
      <>
        <p className="mb-2 px-1 font-medium text-[11px] text-slate-400">
          最近创作
        </p>
        <div className="space-y-1 pb-3">
          {historyItems.map((item) => (
            <button
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-700 transition-colors hover:bg-white"
              key={item}
              onClick={() => setBrief(item)}
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
      description: "图片 / 视频对话式生成",
      sidebarContent,
      title: "AI 创作",
    }),
    [sidebarContent]
  );

  useWorkspaceChrome(chrome);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-40 pt-5">
          <div className="mx-auto w-full max-w-3xl space-y-7">
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl bg-blue-50 px-4 py-3 text-slate-900 text-sm leading-7 shadow-sm">
                {submittedPrompt}
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-medium text-slate-900 text-sm">
                包在我身上！这就为您绘制这张静谧高级的自然风香水海报，质感拉满。
              </p>

              <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm sm:grid-cols-4">
                {Array.from({ length: selectedMediaKind === "video" ? 2 : 4 }).map((_, index) => (
                  <VisualResultCard index={index} key={index} mediaKind={selectedMediaKind} />
                ))}
              </div>

              <div className="flex items-center gap-3 text-slate-500">
                <button aria-label="下载" className="rounded-md p-1 transition-colors hover:bg-slate-100" type="button">
                  <DownloadIcon className="size-4" />
                </button>
                <button aria-label="喜欢" className="rounded-md p-1 transition-colors hover:bg-slate-100" type="button">
                  <ThumbsUpIcon className="size-4" />
                </button>
                <button aria-label="不喜欢" className="rounded-md p-1 transition-colors hover:bg-slate-100" type="button">
                  <ThumbsDownIcon className="size-4" />
                </button>
                <button aria-label="分享" className="rounded-md p-1 transition-colors hover:bg-slate-100" type="button">
                  <Share2Icon className="size-4" />
                </button>
                <button aria-label="重新生成" className="rounded-md p-1 transition-colors hover:bg-slate-100" type="button">
                  <RotateCwIcon className="size-4" />
                </button>
                <button aria-label="更多" className="rounded-md p-1 transition-colors hover:bg-slate-100" type="button">
                  <MoreHorizontalIcon className="size-4" />
                </button>
                <button
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs transition-colors hover:bg-slate-50"
                  onClick={copyPrompt}
                  type="button"
                >
                  <CopyIcon className="size-3.5" />
                  {copyStatus}
                </button>
              </div>

              <div className="max-w-xl rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-slate-600 text-xs leading-6">
                {generatedPrompt}
              </div>

              <div className="space-y-2">
                {suggestionItems.map((item) => (
                  <button
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-slate-700 text-sm shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
                    key={item}
                    onClick={() => {
                      const nextPrompt = `${submittedPrompt}，${item}`;
                      setBrief(nextPrompt);
                      setSubmittedPrompt(nextPrompt);
                    }}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                aria-label="滚动到底部"
                className="flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md shadow-slate-200/70 transition-colors hover:bg-slate-50"
                type="button"
              >
                <ArrowDownIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-white via-white to-white/0 px-4 pb-5 pt-12">
          <div className="mx-auto w-full max-w-3xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_14px_50px_rgba(15,23,42,0.10)]">
              <Textarea
                className="min-h-12 resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
                onChange={(event) => setBrief(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitPrompt();
                  }
                }}
                placeholder="支持图像生成与编辑，快速实现创意设计"
                value={brief}
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button className="size-8 rounded-full" size="icon" type="button" variant="ghost">
                  <PlusIcon className="size-5" />
                </Button>

                {mediaKindOptions.map((kind) => {
                  const Icon = kind.icon;
                  const isSelected = selectedMediaKind === kind.id;

                  return (
                    <button
                      className={
                        isSelected
                          ? "inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 font-medium text-blue-700 text-xs"
                          : "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-slate-600 text-xs transition-colors hover:bg-slate-50"
                      }
                      key={kind.id}
                      onClick={() => setSelectedMediaKind(kind.id)}
                      type="button"
                    >
                      <Icon className="size-3.5" />
                      {kind.label}
                      {isSelected && <span className="text-blue-400">×</span>}
                    </button>
                  );
                })}

                <button className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-slate-700 text-xs transition-colors hover:bg-slate-50" type="button">
                  <ImageIcon className="size-3.5" />
                  参考图
                </button>

                <div className="relative">
                  <select
                    aria-label={selectedMediaKind === "video" ? "视频时长" : "图片比例"}
                    className="h-8 appearance-none rounded-lg border-0 bg-transparent py-0 pl-2.5 pr-6 text-slate-700 text-xs outline-none transition-colors hover:bg-slate-50"
                    onChange={(event) => {
                      if (selectedMediaKind === "video") {
                        setSelectedDuration(event.target.value);
                      } else {
                        setSelectedRatio(event.target.value);
                      }
                    }}
                    value={ratioOrDuration}
                  >
                    {(selectedMediaKind === "video" ? videoDurationOptions : imageRatioOptions).map((option) => (
                      <option key={option} value={option}>
                        {selectedMediaKind === "video" ? "时长" : "比例"} {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button className="size-8 rounded-full text-slate-500" size="icon" type="button" variant="ghost">
                    <MicIcon className="size-4" />
                  </Button>
                  <Button
                    className="size-8 rounded-full bg-slate-300 text-white hover:bg-blue-600"
                    disabled={!brief.trim()}
                    onClick={submitPrompt}
                    size="icon"
                    type="button"
                  >
                    <ArrowUpIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-400">
              内容由 AI 生成，可能不准确，请注意核实
            </p>
          </div>
        </div>
    </div>
  );
}
