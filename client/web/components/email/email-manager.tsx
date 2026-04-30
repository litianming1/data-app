"use client";

import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  Clock3Icon,
  CalendarIcon,
  MailIcon,
  ReplyIcon,
  SearchIcon,
  SendIcon,
  ShoppingBagIcon,
  TruckIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type MailStatus = "0" | "1" | "2" | "3" | "4" | "5" | "6";
type SearchContentType = "all" | "subject" | "customer" | "email" | "content";
type TimeType = "receivedAt" | "repliedAt";

type MailThread = {
  agent: string;
  channel: string;
  customer: string;
  email: string;
  excerpt: string;
  icon: typeof MailIcon;
  id: string;
  original: string;
  receivedAt: string;
  recipientEmail: string;
  reply: string;
  repliedAt: string;
  status: Exclude<MailStatus, "0">;
  statusLabel: string;
  subject: string;
  tags: string[];
  time: string;
  tone: string;
};

const pageSize = 3;

const mailThreads: MailThread[] = [
  {
    agent: "Ava Chen",
    channel: "Amazon",
    customer: "Emma Wilson",
    email: "emma.wilson@example.com",
    excerpt: "Can you confirm if the heated knee massager supports EU plugs?",
    icon: ShoppingBagIcon,
    id: "emma-eu-plug",
    original: `From: Emma Wilson <emma.wilson@example.com>
To: Support Team <support@example.com>
Subject: Amazon Listing 规格确认

Hi,

I’m interested in the heated knee massager from your store. Could you confirm whether it supports EU plugs and how long shipping usually takes to Germany?

Thanks,
Emma`,
    receivedAt: "2026-04-30T09:42",
    recipientEmail: "support@example.com",
    reply: `Hi Emma,

Thank you for your interest in our heated knee massager. We can confirm the product supports EU plug options and is ready for cross-border shipping to Germany.

Estimated delivery is usually 7–12 business days after dispatch. If you place the order today, we can add priority handling and a 10% first-order coupon.

Best regards,
Cross-border Support Team`,
    repliedAt: "2026-04-30T10:05",
    status: "2",
    statusLabel: "待处理",
    subject: "Amazon Listing 规格确认",
    tags: ["询盘", "产品规格"],
    time: "09:42",
    tone: "border-border text-foreground",
  },
  {
    agent: "Noah Ops",
    channel: "Shopify",
    customer: "Noah Miller",
    email: "noah.miller@example.com",
    excerpt: "The tracking link has not updated for three days. Please help.",
    icon: TruckIcon,
    id: "noah-tracking",
    original: `From: Noah Miller <noah.miller@example.com>
To: Support Team <support@example.com>
Subject: Shopify 订单物流延迟

Hello,

The tracking link for my order has not updated for three days. Can you help check whether the package is delayed?

Noah`,
    receivedAt: "2026-04-30T10:18",
    recipientEmail: "support@example.com",
    reply: `Hi Noah,

Thank you for your patience. Cross-border parcels may pause during carrier handoff or customs clearance, and this does not usually mean the parcel is lost.

We are checking the latest carrier status now and will keep monitoring your package. We will also add a small store credit for your next order.

Best regards,
Cross-border Support Team`,
    repliedAt: "2026-04-30T10:48",
    status: "1",
    statusLabel: "待分配",
    subject: "Shopify 订单物流延迟",
    tags: ["物流", "售后"],
    time: "10:18",
    tone: "border-border text-foreground",
  },
  {
    agent: "Mia Support",
    channel: "独立站",
    customer: "Sofia Garcia",
    email: "sofia.garcia@example.com",
    excerpt: "I would like to exchange the size before the holiday campaign starts.",
    icon: ReplyIcon,
    id: "sofia-exchange",
    original: `From: Sofia Garcia <sofia.garcia@example.com>
To: Store Team <support@example.com>
Subject: 独立站尺码换货请求

Hi,

I would like to exchange the size before the holiday campaign starts. Can you help confirm the process and shipping cost?

Sofia`,
    receivedAt: "2026-04-30T11:05",
    recipientEmail: "support@example.com",
    reply: `Hi Sofia,

We can help arrange the size exchange before the campaign starts. Please reply with your preferred size and a photo of the product label so we can verify the item quickly.

Once confirmed, we will send the exchange steps and shipping options.

Best regards,
Cross-border Support Team`,
    repliedAt: "2026-04-30T11:38",
    status: "2",
    statusLabel: "待处理",
    subject: "独立站尺码换货请求",
    tags: ["售后", "换货"],
    time: "11:05",
    tone: "border-border text-foreground",
  },
  {
    agent: "Liam Sales",
    channel: "B2B",
    customer: "Liam Brown",
    email: "liam.brown@example.com",
    excerpt: "Your Black Friday bundle offer looks interesting for our store.",
    icon: MailIcon,
    id: "liam-b2b",
    original: `From: Liam Brown <liam.brown@example.com>
To: Sales Team <sales@example.com>
Subject: B2B 批发合作咨询

Hello,

Your Black Friday bundle offer looks interesting for our store. Do you provide wholesale pricing and product certificates?

Liam`,
    receivedAt: "2026-04-30T13:27",
    recipientEmail: "sales@example.com",
    reply: `Hi Liam,

Thank you for your interest in our Black Friday bundle. We can provide wholesale pricing tiers, product certificates, and shipping estimates based on your target quantity and destination country.

Please share your expected order quantity and market, and we will prepare a quotation.

Best regards,
Cross-border Sales Team`,
    repliedAt: "2026-04-30T14:10",
    status: "5",
    statusLabel: "已处理",
    subject: "B2B 批发合作咨询",
    tags: ["合作", "批发"],
    time: "13:27",
    tone: "border-border text-foreground",
  },
];

const statusOptions: Array<{ label: string; value: MailStatus }> = [
  { label: "全部", value: "0" },
  { label: "待分配", value: "1" },
  { label: "待处理", value: "2" },
  { label: "待复核", value: "3" },
  { label: "待审核", value: "4" },
  { label: "已处理", value: "5" },
  { label: "发送失败", value: "6" },
];

const platformOptions = ["Amazon", "Shopify", "独立站", "B2B"];
const recipientEmailOptions = ["support@example.com", "sales@example.com"];
const tagOptions = ["询盘", "产品规格", "物流", "售后", "换货", "合作", "批发"];
const agentOptions = ["Ava Chen", "Noah Ops", "Mia Support", "Liam Sales"];
const timeTypeOptions: Array<{ label: string; value: TimeType }> = [
  { label: "收件时间", value: "receivedAt" },
  { label: "回复时间", value: "repliedAt" },
];
const searchContentTypeOptions: Array<{
  label: string;
  value: SearchContentType;
}> = [
  { label: "全部内容", value: "all" },
  { label: "主题", value: "subject" },
  { label: "客户", value: "customer" },
  { label: "邮箱", value: "email" },
  { label: "正文", value: "content" },
];

const searchControlClassName = "h-10 rounded-2xl bg-background text-foreground";

type FilterOption<T extends string> = {
  label: string;
  value: T;
};

const formatDateTimeValue = (value: string) => {
  if (value.length === 0) {
    return "";
  }

  const [date = "", time = ""] = value.split("T");
  return `${date.replaceAll("-", "/")} ${time}`.trim();
};

function DateTimeFilter({
  defaultTime,
  label,
  onChange,
  value,
}: {
  defaultTime: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [date = "", time = ""] = value.split("T");
  const displayValue = formatDateTimeValue(value);

  const updateDate = (nextDate: string) => {
    onChange(nextDate.length > 0 ? `${nextDate}T${time || defaultTime}` : "");
  };

  const updateTime = (nextTime: string) => {
    if (date.length === 0) {
      return;
    }

    onChange(`${date}T${nextTime || defaultTime}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`${searchControlClassName} flex w-full items-center justify-between gap-2 border border-input px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/20`}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span
              className={
                displayValue.length > 0
                  ? "truncate text-foreground"
                  : "truncate text-muted-foreground"
              }
            >
              {displayValue || label}
            </span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="grid gap-3">
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-muted-foreground text-xs">选择日期和时间</p>
          </div>
          <label className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">日期</span>
            <Input
              className="h-9 rounded-xl bg-background"
              onChange={(event) => updateDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">时间</span>
            <Input
              className="h-9 rounded-xl bg-background"
              disabled={date.length === 0}
              onChange={(event) => updateTime(event.target.value)}
              type="time"
              value={time}
            />
          </label>
          {value.length > 0 ? (
            <button
              className="inline-flex h-8 items-center justify-center rounded-xl border border-border bg-background px-3 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => onChange("")}
              type="button"
            >
              清除时间
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MultiSelectFilter({
  label,
  onChange,
  options,
  values,
}: {
  label: string;
  onChange: (values: string[]) => void;
  options: string[];
  values: string[];
}) {
  const [query, setQuery] = useState("");
  const displayText = values.length > 0 ? `${label} · ${values.length}` : label;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
    : options;

  const toggleValue = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`${searchControlClassName} flex w-full items-center justify-between gap-1.5 border border-input px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/20`}
          type="button"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-muted-foreground text-xs">可搜索并多选</p>
            </div>
            {values.length > 0 ? (
              <button
                className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onChange([])}
                type="button"
              >
                <XIcon className="size-3.5" />
                清空
              </button>
            ) : null}
          </div>
          <label className="relative block">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-xl bg-background pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`搜索${label}`}
              value={query}
            />
          </label>
          <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = values.includes(option);

                return (
                  <button
                    className="flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-sm transition-colors hover:bg-muted"
                    key={option}
                    onClick={() => toggleValue(option)}
                    type="button"
                  >
                    <span
                      className={
                        isSelected
                          ? "flex size-4 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground"
                          : "flex size-4 shrink-0 rounded border border-border"
                      }
                    >
                      {isSelected ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <span className="truncate">{option}</span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
                没有匹配项
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SingleSelectFilter<T extends string>({
  clearValue,
  label,
  onChange,
  options,
  value,
}: {
  clearValue: T;
  label: string;
  onChange: (value: T) => void;
  options: Array<FilterOption<T>>;
  value: T;
}) {
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        [option.label, option.value]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : options;
  const canClear = value !== clearValue;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`${searchControlClassName} flex w-full items-center justify-between gap-1.5 border border-input px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/20`}
          type="button"
        >
          <span className="truncate">
            {selectedOption?.label ?? label}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-muted-foreground text-xs">可搜索并单选</p>
            </div>
            {canClear ? (
              <button
                className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onChange(clearValue)}
                type="button"
              >
                <XIcon className="size-3.5" />
                清空
              </button>
            ) : null}
          </div>
          <label className="relative block">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-xl bg-background pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`搜索${label}`}
              value={query}
            />
          </label>
          <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    className="flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-sm transition-colors hover:bg-muted"
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    type="button"
                  >
                    <span
                      className={
                        isSelected
                          ? "flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : "size-4 shrink-0 rounded-full border border-border"
                      }
                    >
                      {isSelected ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
                没有匹配项
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EmailManager() {
  const [agentFilters, setAgentFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [endTime, setEndTime] = useState("");
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [recipientEmailFilters, setRecipientEmailFilters] = useState<string[]>([]);
  const [searchContent, setSearchContent] = useState("");
  const [searchContentType, setSearchContentType] =
    useState<SearchContentType>("all");
  const [selectedThreadId, setSelectedThreadId] = useState(
    mailThreads[0]?.id ?? ""
  );
  const [startTime, setStartTime] = useState("");
  const [statusFilter, setStatusFilter] = useState<MailStatus>("0");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [timeType, setTimeType] = useState<TimeType>("receivedAt");

  const chrome = useMemo(
    () => ({
      description: "状态筛选、邮件列表和对话详情",
      title: "邮件管理",
    }),
    []
  );

  useWorkspaceChrome(chrome);

  const filteredThreads = useMemo(() => {
    const keyword = searchContent.trim().toLowerCase();

    return mailThreads.filter((thread) => {
      const matchesStatus =
        statusFilter === "0" || thread.status === statusFilter;
      const matchesPlatform =
        platformFilters.length === 0 || platformFilters.includes(thread.channel);
      const matchesRecipientEmail =
        recipientEmailFilters.length === 0 ||
        recipientEmailFilters.includes(thread.recipientEmail);
      const threadTime = thread[timeType];
      const matchesStartTime = startTime.length === 0 || threadTime >= startTime;
      const matchesEndTime = endTime.length === 0 || threadTime <= endTime;
      const matchesTags =
        tagFilters.length === 0 ||
        tagFilters.every((tag) => thread.tags.includes(tag));
      const matchesAgent =
        agentFilters.length === 0 || agentFilters.includes(thread.agent);
      const searchableContent: Record<SearchContentType, string> = {
        all: [
          thread.customer,
          thread.email,
          thread.recipientEmail,
          thread.subject,
          thread.excerpt,
          thread.original,
          thread.reply,
        ].join(" "),
        content: [thread.excerpt, thread.original, thread.reply].join(" "),
        customer: thread.customer,
        email: [thread.email, thread.recipientEmail].join(" "),
        subject: thread.subject,
      };
      const matchesKeyword =
        keyword.length === 0 ||
        searchableContent[searchContentType].toLowerCase().includes(keyword);

      return (
        matchesStatus &&
        matchesPlatform &&
        matchesRecipientEmail &&
        matchesStartTime &&
        matchesEndTime &&
        matchesTags &&
        matchesAgent &&
        matchesKeyword
      );
    });
  }, [
    agentFilters,
    endTime,
    platformFilters,
    recipientEmailFilters,
    searchContent,
    searchContentType,
    startTime,
    statusFilter,
    tagFilters,
    timeType,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedThreads = filteredThreads.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );
  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedThreadId) ??
    filteredThreads[0] ??
    mailThreads[0];
  const SelectedIcon = selectedThread.icon;

  const setStatus = (value: MailStatus) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const updateMultiFilter = (
    setter: (values: string[]) => void,
    values: string[]
  ) => {
    setter(values);
    setCurrentPage(1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-muted/30 p-4 text-foreground">
      <Card className="shrink-0 gap-4 py-4">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const count =
                  option.value === "0"
                    ? mailThreads.length
                    : mailThreads.filter((thread) => thread.status === option.value)
                        .length;
                const isActive = statusFilter === option.value;

                return (
                  <Button
                    key={option.value}
                    onClick={() => setStatus(option.value)}
                    size="sm"
                    type="button"
                    variant={isActive ? "default" : "outline"}
                  >
                    {option.label}
                    <span
                      className={
                        isActive
                          ? "text-primary-foreground/70 text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {count}
                    </span>
                  </Button>
                );
              })}
          </div>

          <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-6">
              <MultiSelectFilter
                label="平台"
                onChange={(values) => updateMultiFilter(setPlatformFilters, values)}
                options={platformOptions}
                values={platformFilters}
              />
              <MultiSelectFilter
                label="收件邮箱"
                onChange={(values) =>
                  updateMultiFilter(setRecipientEmailFilters, values)
                }
                options={recipientEmailOptions}
                values={recipientEmailFilters}
              />
              <SingleSelectFilter
                clearValue="receivedAt"
                label="时间类型"
                onChange={(value) => {
                  setTimeType(value);
                  setCurrentPage(1);
                }}
                options={timeTypeOptions}
                value={timeType}
              />
              <div className="grid gap-2 sm:grid-cols-2 xl:col-span-2">
                <DateTimeFilter
                  defaultTime="00:00"
                  label="开始时间"
                  onChange={(value) => {
                    setStartTime(value);
                    setCurrentPage(1);
                  }}
                  value={startTime}
                />
                <DateTimeFilter
                  defaultTime="23:59"
                  label="结束时间"
                  onChange={(value) => {
                    setEndTime(value);
                    setCurrentPage(1);
                  }}
                  value={endTime}
                />
              </div>
              <MultiSelectFilter
                label="标签"
                onChange={(values) => updateMultiFilter(setTagFilters, values)}
                options={tagOptions}
                values={tagFilters}
              />
              <MultiSelectFilter
                label="坐席"
                onChange={(values) => updateMultiFilter(setAgentFilters, values)}
                options={agentOptions}
                values={agentFilters}
              />
              <SingleSelectFilter
                clearValue="all"
                label="搜索内容类型"
                onChange={(value) => {
                  setSearchContentType(value);
                  setCurrentPage(1);
                }}
                options={searchContentTypeOptions}
                value={searchContentType}
              />
              <label className="relative block xl:col-span-3">
                <SearchIcon className="-translate-y-1/2 pointer-events-none absolute left-3 top-1/2 size-4 text-muted-foreground" />
                <Input
                  className={`${searchControlClassName} px-10`}
                  onChange={(event) => {
                    setSearchContent(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="搜索内容"
                  value={searchContent}
                />
              </label>
            <Button asChild className="h-10 rounded-2xl">
              <Link href="/email/editor">
                <SendIcon className="size-4" />
                写邮件
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[21rem_1fr]">
        <Card className="min-h-0 gap-0 py-0">

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {paginatedThreads.length > 0 ? (
              paginatedThreads.map((thread) => {
                const Icon = thread.icon;
                const isSelected = selectedThread.id === thread.id;

                return (
                  <button
                    className={
                      isSelected
                        ? "w-full rounded-xl border border-ring bg-background p-3 text-left text-foreground shadow-sm ring-2 ring-ring/20"
                        : "w-full rounded-xl border border-border bg-background p-3 text-left text-foreground transition-colors hover:bg-muted"
                    }
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${
                          isSelected ? thread.tone : "border-border text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-sm">
                            {thread.subject}
                          </p>
                          <span
                            className={
                              isSelected
                                ? "text-muted-foreground text-xs"
                                : "text-muted-foreground text-xs"
                            }
                          >
                            {thread.time}
                          </span>
                        </div>
                        <p
                          className={
                            isSelected
                              ? "mt-1 truncate text-muted-foreground text-xs"
                              : "mt-1 truncate text-muted-foreground text-xs"
                          }
                        >
                          {thread.customer} · {thread.channel}
                        </p>
                        <p
                          className={
                            isSelected
                              ? "mt-2 line-clamp-2 text-muted-foreground text-xs leading-5"
                              : "mt-2 line-clamp-2 text-muted-foreground text-xs leading-5"
                          }
                        >
                          {thread.excerpt}
                        </p>
                        <Badge
                          className={
                            isSelected
                              ? "mt-3 border-border text-foreground"
                              : "mt-3 border-border text-muted-foreground"
                          }
                          variant="outline"
                        >
                          {thread.statusLabel}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 text-muted-foreground text-sm">
                没有符合当前条件的邮件。
              </div>
            )}
          </div>

          <CardFooter className="justify-between gap-3">
            <Button
              size="icon-lg"
              variant="outline"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <div className="text-center text-sm">
              <p className="font-semibold">
                {safeCurrentPage} / {totalPages}
              </p>
              <p className="text-muted-foreground text-xs">
                分页 · 共 {filteredThreads.length} 条
              </p>
            </div>
            <Button
              size="icon-lg"
              variant="outline"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              type="button"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </CardFooter>
        </Card>

        <main className="min-h-0 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between gap-3 text-foreground">
            <div>
              <h3 className="mt-1 font-semibold text-xl">
                {selectedThread.subject}
              </h3>
              <p className="mt-1 text-muted-foreground text-sm">
                {selectedThread.customer} · {selectedThread.channel} · {selectedThread.agent}
              </p>
            </div>
            <Badge className="border-border text-muted-foreground" variant="outline">
              {selectedThread.statusLabel}
            </Badge>
          </div>

          <div className="flex min-h-[calc(100vh-17rem)] flex-col gap-5 overflow-y-auto px-0.5 py-0.5">
            <Card className="w-full max-w-[90%] self-start gap-0 py-0">
              <CardHeader className="border-b py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>原文</CardTitle>
                    <CardDescription>
                      {selectedThread.customer} · {selectedThread.email}
                    </CardDescription>
                  </div>
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg border ${selectedThread.tone}`}
                  >
                    <SelectedIcon className="size-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-0">
                <pre className="min-h-0 whitespace-pre-wrap px-5 py-4 font-mono text-card-foreground text-sm leading-7">
                  {selectedThread.original}
                </pre>
              </CardContent>
            </Card>

            <Card className="mt-auto w-full max-w-[90%] self-end gap-0 py-0">
              <CardHeader className="border-b py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>回复的邮件</CardTitle>
                    <CardDescription>
                      自动草稿，可进入完整编辑器继续编辑。
                    </CardDescription>
                  </div>
                  <Button asChild size="lg">
                    <Link href="/email/editor">
                      <ReplyIcon className="size-4" />
                      编辑
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="mb-4 grid gap-3 rounded-xl border border-border bg-background p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CircleIcon className="size-3 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">To</span>
                    <span className="truncate text-foreground">
                      {selectedThread.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CircleIcon className="size-3 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Subject</span>
                    <span className="truncate text-foreground">
                      Re: {selectedThread.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3Icon className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">建议本地时间 18:00 前回复</span>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-border bg-background px-4 py-4 font-mono text-foreground text-sm leading-7">
                  {selectedThread.reply}
                </pre>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
