"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatStatus, UIMessage } from "ai";
import {
  BotIcon,
  BoxIcon,
  ChevronRightIcon,
  CircleIcon,
  FolderIcon,
  Grid2X2Icon,
  ImageIcon,
  MenuIcon,
  MicIcon,
  PenLineIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const promptSuggestions = [
  "帮我规划一个 Next.js AI 应用结构",
  "把这个需求拆成可执行任务",
  "写一个支持 Markdown 的产品介绍",
  "解释 AI 对话页的核心交互流程",
  "生成一组适合首页的快捷提示词",
  "帮我优化这段 TypeScript 组件",
  "设计一个轻量级会话历史方案",
  "总结 React 19 的开发注意点",
  "给我 3 个 AI 产品界面灵感",
];

const historyItems = [
  "Next.js AI 对话页布局",
  "Markdown 流式渲染方案",
  "Agent 工具调用 UI 草图",
  "前端组件拆分建议",
  "提示词模板整理",
  "会话历史数据结构",
  "应用首页信息架构",
  "React 组件性能检查",
  "Tailwind 主题变量说明",
  "输入框交互细节",
  "模型选择器设计",
  "部署前检查清单",
];

const navItems = [
  { active: true, icon: PenLineIcon, label: "新对话", shortcut: "Ctrl K" },
  { icon: SparklesIcon, label: "AI 创作" },
  { icon: FolderIcon, label: "云盘" },
  { icon: Grid2X2Icon, label: "更多", trailing: true },
];

const quickModes = [
  {
    description: "适用于大部分情况",
    icon: ZapIcon,
    id: "fast",
    label: "快速",
  },
  {
    description: "擅长解决更难的问题",
    icon: SparklesIcon,
    id: "thinking",
    label: "思考",
  },
  {
    description: "研究级智能模型",
    icon: BotIcon,
    id: "expert",
    label: "专家",
  },
];

const createTextMessage = (
  role: UIMessage["role"],
  text: string
): UIMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  parts: [{ text, type: "text" }],
  role,
});

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

const updateTextMessage = (message: UIMessage, text: string): UIMessage => ({
  ...message,
  parts: [{ text, type: "text" }],
});

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8010";

type StreamEvent = {
  data: string;
  event: string;
};

type StreamDelta = {
  conversation_id?: string;
  text?: string;
  message?: string;
};

const parseStreamEvent = (rawEvent: string): StreamEvent => {
  const lines = rawEvent.split("\n");
  const data: string[] = [];
  let event = "message";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    }

    if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  return { data: data.join("\n"), event };
};

const streamAssistantReply = async (
  message: string,
  mode: string,
  conversationId: string | null,
  signal: AbortSignal,
  onDelta: (text: string) => void,
  onConversation: (conversationId: string) => void
) => {
  const response = await fetch(`${apiBaseUrl}/api/chat/stream`, {
    body: JSON.stringify({ conversation_id: conversationId, message, mode }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "后端 API 请求失败");
  }

  if (!response.body) {
    throw new Error("当前浏览器不支持流式响应");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (rawEvent: string) => {
    const { data, event } = parseStreamEvent(rawEvent);

    if (event === "done") {
      return;
    }

    if (!data) {
      return;
    }

    const payload = JSON.parse(data) as StreamDelta;

    if (event === "error") {
      throw new Error(payload.message || "流式生成失败");
    }

    if (event === "conversation" && payload.conversation_id) {
      onConversation(payload.conversation_id);
    }

    if (event === "delta" && payload.text) {
      onDelta(payload.text);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replaceAll("\r\n", "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (rawEvent) {
        handleEvent(rawEvent);
      }

      boundary = buffer.indexOf("\n\n");
    }

    if (done) {
      const rawEvent = buffer.trim();
      if (rawEvent) {
        handleEvent(rawEvent);
      }
      break;
    }
  }
};

export function AIChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [quickModeId, setQuickModeId] = useState(quickModes[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasConversation = messages.length > 0;
  const selectedQuickMode = useMemo(
    () => quickModes.find((mode) => mode.id === quickModeId) ?? quickModes[0],
    [quickModeId]
  );
  const SelectedQuickModeIcon = selectedQuickMode.icon;

  const clearPendingReply = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPendingReply(), [clearPendingReply]);

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const isGenerating = status === "submitted" || status === "streaming";

      if (!trimmed || isGenerating) {
        return;
      }

      const assistantMessage = createTextMessage("assistant", "");
      setMessages((current) => [
        ...current,
        createTextMessage("user", trimmed),
        assistantMessage,
      ]);
      setStatus("streaming");

      clearPendingReply();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await streamAssistantReply(
          trimmed,
          selectedQuickMode.label,
          conversationId,
          abortController.signal,
          (delta) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? updateTextMessage(message, getMessageText(message) + delta)
                  : message
              )
            );
          },
          setConversationId
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id
              ? updateTextMessage(
                  message,
                  "后端流式 API 暂时不可用，请确认 FastAPI 服务已启动后再试。"
                )
              : message
          )
        );
      } finally {
        setStatus("ready");
        abortControllerRef.current = null;
      }
    },
    [clearPendingReply, conversationId, selectedQuickMode.label, status]
  );

  const stopReply = useCallback(() => {
    clearPendingReply();
    setStatus("ready");
  }, [clearPendingReply]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((current) => !current);
  }, []);

  const resetConversation = useCallback(() => {
    clearPendingReply();
    setConversationId(null);
    setMessages([]);
    setStatus("ready");
  }, [clearPendingReply]);

  const isGenerating = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const shouldShowGeneratingPlaceholder =
    isGenerating &&
    (!lastMessage ||
      lastMessage.role !== "assistant" ||
      getMessageText(lastMessage).length === 0);

  const visibleSuggestions = useMemo(
    () => (hasConversation ? promptSuggestions.slice(0, 4) : promptSuggestions),
    [hasConversation]
  );

  return (
    <main className="flex h-dvh min-w-0 overflow-hidden bg-slate-100 text-slate-950">
      <aside
        aria-hidden={!isSidebarOpen}
        className={
          isSidebarOpen
            ? "hidden h-dvh w-64 shrink-0 overflow-hidden border-slate-200 border-r bg-slate-50 transition-[width,border-color] duration-300 ease-out md:block"
            : "hidden h-dvh w-0 shrink-0 overflow-hidden border-transparent border-r bg-slate-50 transition-[width,border-color] duration-300 ease-out md:block"
        }
        inert={isSidebarOpen ? undefined : true}
      >
        <div
          className={
            isSidebarOpen
              ? "flex h-full w-64 flex-col opacity-100 transition-opacity delay-75 duration-200"
              : "pointer-events-none flex h-full w-64 flex-col opacity-0 transition-opacity duration-150"
          }
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
              return (
                <button
                  className={
                    item.active
                      ? "flex h-8 w-full items-center gap-2 rounded-xl bg-white px-2 text-left text-sm shadow-sm ring-1 ring-cyan-100"
                      : "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-sm transition-colors hover:bg-white/80"
                  }
                  key={item.label}
                  onClick={item.active ? resetConversation : undefined}
                  type="button"
                >
                  <Icon className="size-4 text-neutral-700" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[11px] text-neutral-300">
                      {item.shortcut}
                    </span>
                  )}
                  {item.trailing && (
                    <ChevronRightIcon className="size-4 text-neutral-300" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-2 px-1 font-medium text-[11px] text-slate-400">历史对话</p>
          <div className="space-y-1 pb-3">
            {historyItems.map((item) => (
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
            <Trash2Icon className="size-4 text-slate-400" />
          </div>
        </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
        <header className="grid h-11 shrink-0 grid-cols-[auto_1fr_auto] items-center border-slate-200 border-b bg-white/85 px-3 backdrop-blur">
          <button
            aria-label={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
            className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            onClick={toggleSidebar}
            type="button"
          >
            <MenuIcon className="size-4" />
          </button>
          <button
            aria-label={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
            className="hidden size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 md:flex"
            onClick={toggleSidebar}
            type="button"
          >
            <MenuIcon className="size-4" />
          </button>

          <div className="min-w-0 text-center leading-tight">
            <h1 className="font-medium text-sm">新对话</h1>
            <p className="text-[11px] text-slate-400">
              AI 生成内容仅供参考，请结合实际判断
            </p>
          </div>

          <div aria-hidden="true" className="size-8" />
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          {hasConversation ? (
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-8">
                {messages.map((message, index) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "max-w-[min(75%,32rem)] rounded-2xl bg-slate-100 px-4 py-3 text-slate-950 shadow-sm"
                          : "max-w-3xl rounded-2xl bg-transparent px-1 py-1 text-slate-900"
                      }
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-left leading-6 wrap-break-word">
                          {getMessageText(message)}
                        </p>
                      ) : (
                        <MessageResponse
                          isAnimating={isGenerating && index === messages.length - 1}
                        >
                          {getMessageText(message)}
                        </MessageResponse>
                      )}
                    </MessageContent>
                  </Message>
                ))}
                {shouldShowGeneratingPlaceholder && (
                  <Message from="assistant">
                    <MessageContent className="rounded-2xl bg-transparent px-1 py-1 text-slate-500">
                      <div className="flex items-center gap-2 text-sm">
                        <BotIcon className="size-4 animate-pulse" />
                        正在组织回复...
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50" />
            </Conversation>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-36 text-center">
              <h2 className="mb-7 font-semibold text-2xl tracking-tight sm:text-3xl">
                有什么我能帮你的吗？
              </h2>
              <Suggestions className="mx-auto max-w-3xl justify-center whitespace-normal">
                <div className="flex max-w-3xl flex-wrap justify-center gap-2">
                  {visibleSuggestions.map((suggestion) => (
                    <Suggestion
                      className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-slate-800 shadow-sm shadow-slate-200/50 hover:border-cyan-200 hover:bg-cyan-50"
                      disabled={isGenerating}
                      key={suggestion}
                      onClick={submitText}
                      suggestion={suggestion}
                    />
                  ))}
                </div>
              </Suggestions>
            </div>
          )}

          <div className="shrink-0 bg-linear-to-t from-white via-white to-white/70 px-4 pb-4 pt-3">
            <div className="mx-auto w-full max-w-3xl">
              {hasConversation && (
                <Suggestions className="mb-3">
                  {visibleSuggestions.map((suggestion) => (
                    <Suggestion
                      className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-none hover:border-cyan-200 hover:bg-cyan-50"
                      disabled={isGenerating}
                      key={suggestion}
                      onClick={submitText}
                      suggestion={suggestion}
                    />
                  ))}
                </Suggestions>
              )}

              <PromptInput
                className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-[0_12px_40px_rgba(59,130,246,0.14)] ring-1 ring-blue-100/80"
                onSubmit={(message) => submitText(message.text)}
              >
                <PromptInputTextarea
                  className="min-h-14 px-4 pt-4 text-neutral-900 placeholder:text-neutral-400"
                  placeholder="发消息..."
                />
                <PromptInputFooter className="flex-col items-stretch gap-2 px-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <PromptInputTools className="min-w-0 flex-1 flex-wrap gap-1.5 overflow-visible">
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger tooltip="添加" />
                      <PromptInputActionMenuContent>
                        <PromptInputActionMenuItem>
                          <ImageIcon className="mr-2 size-4" /> 上传图片
                        </PromptInputActionMenuItem>
                        <PromptInputActionMenuItem>
                          <BoxIcon className="mr-2 size-4" /> 添加文件
                        </PromptInputActionMenuItem>
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <PromptInputButton tooltip="回复模式" variant="ghost">
                          <SelectedQuickModeIcon className="size-4" />
                          <span className="hidden md:inline">
                            {selectedQuickMode.label}
                          </span>
                        </PromptInputButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-48 rounded-xl border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                        side="top"
                        sideOffset={10}
                      >
                        <DropdownMenuRadioGroup
                          onValueChange={setQuickModeId}
                          value={quickModeId}
                        >
                          {quickModes.map((mode) => {
                            const Icon = mode.icon;

                            return (
                              <DropdownMenuRadioItem
                                className="items-start gap-2 rounded-lg px-2 py-2 pr-8"
                                key={mode.id}
                                value={mode.id}
                              >
                                <Icon className="mt-0.5 size-4 text-slate-800" />
                                <span className="grid gap-0.5 text-left">
                                  <span className="font-medium text-slate-900 text-sm">
                                    {mode.label}
                                  </span>
                                  <span className="text-slate-400 text-xs">
                                    {mode.description}
                                  </span>
                                </span>
                              </DropdownMenuRadioItem>
                            );
                          })}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PromptInputTools>
                  <div className="ml-auto flex shrink-0 items-center gap-1 self-end sm:self-center">
                    <PromptInputButton tooltip="语音输入" variant="ghost">
                      <MicIcon className="size-4" />
                    </PromptInputButton>
                    <PromptInputSubmit onStop={stopReply} status={status} />
                  </div>
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
