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
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import { apiFetch } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { ChatStatus, UIMessage } from "ai";
import {
  BotIcon,
  BrainCircuitIcon,
  CircleIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MicIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const promptSuggestions = [
  "帮我分析一个跨境电商爆品机会",
  "为 Amazon Listing 写五点描述和标题",
  "生成一套 TikTok Shop 短视频脚本",
  "优化独立站产品页转化文案",
  "整理一份 Shopify 店铺运营计划",
  "分析欧美市场用户痛点和卖点",
  "帮我写跨境客服英文回复模板",
  "设计一套 Facebook 广告投放角度",
  "把产品资料改写成多语言营销文案",
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

const getConversationTitleFromMessages = (messages: UIMessage[]) => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage ? getMessageText(firstUserMessage).trim() : "";

  if (!text) {
    return "新对话";
  }

  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
};

const updateTextMessage = (message: UIMessage, text: string): UIMessage => ({
  ...message,
  parts: [{ text, type: "text" }],
});

type MarkItDownResponse = {
  content_type: string | null;
  filename: string;
  markdown: string;
};

const convertFileToMarkdown = async (file: File): Promise<MarkItDownResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/api/markitdown", {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    let message = "文件转换失败，请稍后再试。";

    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail || message;
    } catch {
      const detail = await response.text();
      message = detail || message;
    }

    throw new Error(message);
  }

  return (await response.json()) as MarkItDownResponse;
};

const appendMarkdownToPrompt = (
  controller: ReturnType<typeof usePromptInputController>,
  result: MarkItDownResponse
) => {
  const current = controller.textInput.value.trimEnd();
  const markdownBlock = [
    `以下是 ${result.filename} 转换得到的 Markdown 内容：`,
    "",
    result.markdown.trim(),
  ].join("\n");

  controller.textInput.setInput(
    current ? `${current}\n\n${markdownBlock}` : markdownBlock
  );
};

type MarkItDownUploadActionProps = {
  disabled?: boolean;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
};

const MarkItDownUploadAction = ({
  disabled,
  onError,
  onMessage,
}: MarkItDownUploadActionProps) => {
  const controller = usePromptInputController();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const isDisabled = disabled || isConverting;

  const handleSelect = useCallback(
    (event: Event) => {
      event.preventDefault();

      if (!isDisabled) {
        inputRef.current?.click();
      }
    },
    [isDisabled]
  );

  const handleChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";

      if (!file) {
        return;
      }

      setIsConverting(true);
      onError(null);
      onMessage(`正在将 ${file.name} 转换为 Markdown...`);

      try {
        const result = await convertFileToMarkdown(file);
        appendMarkdownToPrompt(controller, result);
        onMessage(`已将 ${result.filename} 转为 Markdown 并追加到输入框。`);
      } catch (error) {
        onMessage(null);
        onError(error instanceof Error ? error.message : "文件转换失败，请稍后再试。");
      } finally {
        setIsConverting(false);
      }
    },
    [controller, onError, onMessage]
  );

  return (
    <>
      <input
        aria-label="上传文件并转换为 Markdown"
        className="hidden"
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
      <PromptInputActionMenuItem disabled={isDisabled} onSelect={handleSelect}>
        {isConverting ? (
          <Loader2Icon className="mr-2 size-4 animate-spin" />
        ) : (
          <FileTextIcon className="mr-2 size-4" />
        )}
        {isConverting ? "转换中..." : "文件转 Markdown"}
      </PromptInputActionMenuItem>
    </>
  );
};

type StreamEvent = {
  data: string;
  event: string;
};

type TriggeredSkill = {
  category: string;
  id: string;
  name: string;
  trigger: string;
};

type StreamDelta = {
  conversation_id?: string;
  skills?: TriggeredSkill[];
  text?: string;
  message?: string;
};

type ConversationSummary = {
  conversation_id: string;
  title: string;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

type StoredConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type ConversationHistoryResponse = {
  conversation_id: string;
  messages: StoredConversationMessage[];
};

const requestJson = async <T,>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await apiFetch(path, { signal });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "历史对话 API 请求失败");
  }

  return (await response.json()) as T;
};

const toConversationMessage = (
  conversationId: string,
  message: StoredConversationMessage,
  index: number
): UIMessage => ({
  id: `${conversationId}-${index}-${message.role}`,
  parts: [{ text: message.content, type: "text" }],
  role: message.role,
});

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
  onConversation: (conversationId: string) => void,
  onSkills: (skills: TriggeredSkill[]) => void
) => {
  const response = await apiFetch("/api/chat/stream", {
    body: JSON.stringify({ conversation_id: conversationId, message, mode }),
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

    if (event === "skills" && payload.skills) {
      onSkills(payload.skills);
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
  const [triggeredSkills, setTriggeredSkills] = useState<TriggeredSkill[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationSummary[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [markitdownMessage, setMarkitdownMessage] = useState<string | null>(null);
  const [markitdownError, setMarkitdownError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasConversation = messages.length > 0;
  const selectedQuickMode = useMemo(
    () => quickModes.find((mode) => mode.id === quickModeId) ?? quickModes[0],
    [quickModeId]
  );
  const activeConversationTitle = useMemo(() => {
    const historyTitle = conversationId
      ? conversationHistory.find(
          (conversation) => conversation.conversation_id === conversationId
        )?.title
      : null;

    return historyTitle ?? getConversationTitleFromMessages(messages);
  }, [conversationHistory, conversationId, messages]);
  const SelectedQuickModeIcon = selectedQuickMode.icon;

  const clearPendingReply = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPendingReply(), [clearPendingReply]);

  const loadConversationHistory = useCallback(async (signal?: AbortSignal) => {
    setHistoryError(null);

    try {
      const conversations = await requestJson<ConversationSummary[]>(
        "/api/conversations",
        signal
      );

      if (!signal?.aborted) {
        setConversationHistory(conversations);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setHistoryError(
        error instanceof Error ? error.message : "历史对话加载失败"
      );
    } finally {
      if (!signal?.aborted) {
        setIsHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    queueMicrotask(() => {
      void loadConversationHistory(abortController.signal);
    });

    return () => abortController.abort();
  }, [loadConversationHistory]);

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
      setTriggeredSkills([]);
      setMarkitdownMessage(null);
      setMarkitdownError(null);
      setStatus("streaming");

      clearPendingReply();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        let nextConversationId = conversationId;

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
          (id) => {
            nextConversationId = id;
            setConversationId(id);
          },
          setTriggeredSkills
        );

        if (nextConversationId) {
          await loadConversationHistory();
        }
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
    [clearPendingReply, conversationId, loadConversationHistory, selectedQuickMode.label, status]
  );

  const stopReply = useCallback(() => {
    clearPendingReply();
    setStatus("ready");
  }, [clearPendingReply]);

  const resetConversation = useCallback(() => {
    clearPendingReply();
    setConversationId(null);
    setMessages([]);
    setTriggeredSkills([]);
    setMarkitdownMessage(null);
    setMarkitdownError(null);
    setStatus("ready");
  }, [clearPendingReply]);

  const loadConversation = useCallback(
    async (nextConversationId: string) => {
      clearPendingReply();
      setStatus("ready");
      setTriggeredSkills([]);
      setMarkitdownMessage(null);
      setMarkitdownError(null);
      setHistoryError(null);
      setLoadingConversationId(nextConversationId);

      try {
        const history = await requestJson<ConversationHistoryResponse>(
          `/api/conversations/${nextConversationId}`
        );
        setConversationId(history.conversation_id);
        setMessages(
          history.messages.map((message, index) =>
            toConversationMessage(history.conversation_id, message, index)
          )
        );
      } catch (error) {
        setHistoryError(
          error instanceof Error ? error.message : "会话详情加载失败"
        );
      } finally {
        setLoadingConversationId(null);
      }
    },
    [clearPendingReply]
  );

  const isGenerating = status === "submitted" || status === "streaming";

  const sidebarContent = useMemo(
    () => (
      <>
        <p className="mb-2 px-1 font-medium text-[11px] text-muted-foreground">
          历史对话
        </p>
        <div className="space-y-1 pb-3">
          <button
            className="flex h-8 w-full items-center gap-2 rounded-lg bg-sidebar-accent px-2 text-left text-sm text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border transition-colors hover:bg-sidebar-accent/80"
            onClick={resetConversation}
            type="button"
          >
            <SparklesIcon className="size-3.5 text-primary" />
            <span className="truncate">开启新对话</span>
          </button>
          {isHistoryLoading ? (
            <div className="rounded-lg px-2 py-2 text-muted-foreground text-xs">
              正在加载历史…
            </div>
          ) : null}
          {!isHistoryLoading && historyError ? (
            <div className="rounded-lg bg-rose-50 px-2 py-2 text-rose-600 text-xs leading-5">
              {historyError}
            </div>
          ) : null}
          {!isHistoryLoading && !historyError && conversationHistory.length === 0 ? (
            <div className="rounded-lg px-2 py-2 text-muted-foreground text-xs leading-5">
              暂无历史对话，发起第一条消息吧。
            </div>
          ) : null}
          {conversationHistory.map((conversation) => {
            const isActive = conversation.conversation_id === conversationId;
            const isLoading = loadingConversationId === conversation.conversation_id;

            return (
              <button
                className={
                  isActive
                    ? "flex min-h-10 w-full items-start gap-2 rounded-lg bg-sidebar-accent px-2 py-2 text-left text-sm text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                    : "flex min-h-10 w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                }
                disabled={isLoading}
                key={conversation.conversation_id}
                onClick={() => void loadConversation(conversation.conversation_id)}
                type="button"
              >
                <CircleIcon
                  className={
                    isActive
                      ? "mt-0.5 size-3.5 shrink-0 text-primary"
                      : "mt-0.5 size-3.5 shrink-0 text-muted-foreground/60"
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {isLoading ? "加载中…" : conversation.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {conversation.preview}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </>
    ),
    [
      conversationHistory,
      conversationId,
      historyError,
      isHistoryLoading,
      loadConversation,
      loadingConversationId,
      resetConversation,
    ]
  );

  const chrome = useMemo(
    () => ({
      description: "AI 生成内容仅供参考，请结合实际判断",
      sidebarContent,
      title: activeConversationTitle,
    }),
    [activeConversationTitle, sidebarContent]
  );

  useWorkspaceChrome(chrome);

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
    <div className="relative flex h-full min-h-0 flex-col">
          {hasConversation ? (
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-8">
                {triggeredSkills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary text-xs">
                    <BrainCircuitIcon className="size-4" />
                    <span className="font-medium">已触发 Skills</span>
                    {triggeredSkills.map((skill) => (
                      <Badge
                        className="border-primary/20 bg-background/80 text-primary"
                        key={skill.id}
                        variant="outline"
                      >
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {messages.map((message, index) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "max-w-[min(75%,32rem)] rounded-2xl bg-muted px-4 py-3 text-foreground shadow-sm"
                          : "max-w-3xl rounded-2xl bg-transparent px-1 py-1 text-foreground"
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
                    <MessageContent className="rounded-2xl bg-transparent px-1 py-1 text-muted-foreground">
                      <div className="flex items-center gap-2 text-sm">
                        <BotIcon className="size-4 animate-pulse" />
                        正在组织回复...
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton className="border-border bg-card text-card-foreground hover:bg-muted" />
            </Conversation>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-36 text-center">
              <h2 className="mb-7 font-semibold text-2xl tracking-tight sm:text-3xl">
                有什么我能帮你的吗？
              </h2>
              <div className="flex w-full max-w-3xl flex-wrap justify-center gap-2">
                {visibleSuggestions.map((suggestion) => (
                  <Suggestion
                    className="h-9 rounded-xl border bg-card px-4 text-card-foreground shadow-sm hover:bg-muted"
                    disabled={isGenerating}
                    key={suggestion}
                    onClick={submitText}
                    suggestion={suggestion}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="shrink-0 bg-linear-to-t from-background via-background to-background/70 px-4 pb-4 pt-3">
            <div className="mx-auto w-full max-w-3xl">
              {hasConversation && (
                <Suggestions className="mb-3">
                  {visibleSuggestions.map((suggestion) => (
                    <Suggestion
                      className="h-8 shrink-0 rounded-full border bg-card px-3 text-card-foreground text-xs shadow-none hover:bg-muted"
                      disabled={isGenerating}
                      key={suggestion}
                      onClick={submitText}
                      suggestion={suggestion}
                    />
                  ))}
                </Suggestions>
              )}

              {markitdownMessage ? (
                <div className="mb-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-primary text-xs">
                  {markitdownMessage}
                </div>
              ) : null}
              {markitdownError ? (
                <div className="mb-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-600 text-xs">
                  {markitdownError}
                </div>
              ) : null}

              <PromptInputProvider>
              <PromptInput
                className="overflow-hidden rounded-2xl border bg-card shadow-[0_12px_40px_rgba(15,23,42,0.10)] ring-1 ring-border/80"
                onSubmit={(message) => submitText(message.text)}
              >
                <PromptInputTextarea
                  className="min-h-14 px-4 pt-4 text-foreground placeholder:text-muted-foreground"
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
                        <MarkItDownUploadAction
                          disabled={isGenerating}
                          onError={setMarkitdownError}
                          onMessage={setMarkitdownMessage}
                        />
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
                        className="w-48 rounded-xl border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-foreground/10"
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
                                <Icon className="mt-0.5 size-4 text-foreground" />
                                <span className="grid gap-0.5 text-left">
                                  <span className="font-medium text-foreground text-sm">
                                    {mode.label}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
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
              </PromptInputProvider>
            </div>
          </div>
    </div>
  );
}
