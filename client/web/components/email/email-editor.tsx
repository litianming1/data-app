"use client";

import {
  EmailEditor as ReactEmailEditor,
  type EmailEditorRef,
} from "@react-email/editor";
import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2Icon,
  FileTextIcon,
  MailCheckIcon,
  MailIcon,
  PaperclipIcon,
  SendIcon,
  SparklesIcon,
  TruckIcon,
  Undo2Icon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useMemo, useRef, useState } from "react";

type TemplateScope = "private" | "public";

type EmailMeta = {
  cc: string;
  recipient: string;
  sender: string;
  subject: string;
};

type EmailTemplate = {
  content: string;
  description: string;
  icon: typeof MailIcon;
  meta: EmailMeta;
  name: string;
  originalEmail: string;
  scope: TemplateScope;
};

type EmailAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

const defaultMeta: EmailMeta = {
  cc: "support-team@example.com",
  recipient: "emma.wilson@example.com",
  sender: "support@example.com",
  subject: "Re: Product details and shipping support",
};

const defaultOriginalEmail = `From: Emma Wilson <emma.wilson@example.com>
To: Support Team <support@example.com>
Subject: Product details and shipping support

Hi,

I’m interested in the heated knee massager from your store. Could you confirm whether it supports EU plugs and how long shipping usually takes to Germany?

Thanks,
Emma`;

const defaultContent = `
<h1>Re: Product details and shipping support</h1>
<p>Hi Emma,</p>
<p>Thank you for your interest in our heated knee massager. I’m happy to help with your question about EU plug compatibility and shipping time.</p>
<blockquote><p><strong>Quick answer:</strong> We have checked the details and can confirm the product is ready for cross-border shipping. If you need a plug type, size, or delivery estimate, we can verify it before dispatch.</p></blockquote>
<p>As a small thank-you, we can include priority handling and a 10% first-order coupon.</p>
<p><a href="https://example.com">View product details</a></p>
<p>Best regards,<br />Cross-border Support Team</p>
`;

const editorTemplates: EmailTemplate[] = [
  {
    content: defaultContent,
    description: "确认规格、插头、发货地和购买疑虑。",
    icon: MailIcon,
    meta: defaultMeta,
    name: "英文询盘回复",
    originalEmail: defaultOriginalEmail,
    scope: "private",
  },
  {
    content: `
<h1>Update on your shipping status</h1>
<p>Hi Noah,</p>
<p>Thank you for your patience. We understand that the tracking link has not updated recently, and we are checking the latest carrier status for Shopify order #A1024.</p>
<blockquote><p><strong>Current status:</strong> Cross-border parcels may pause during handoff or customs clearance. This does not usually mean the parcel is lost.</p></blockquote>
<p>We will keep monitoring the parcel and add a small store credit for your next order.</p>
<p>Best regards,<br />Cross-border Support Team</p>
`,
    description: "物流停滞、清关延迟、客户催件。",
    icon: TruckIcon,
    meta: {
      cc: "logistics@example.com",
      recipient: "noah.miller@example.com",
      sender: "support@example.com",
      subject: "Update on your shipping status",
    },
    name: "物流延迟安抚",
    originalEmail: `From: Noah Miller <noah.miller@example.com>
To: Support Team <support@example.com>
Subject: Tracking update for Shopify order #A1024

Hello,

The tracking link for my order has not updated for three days. Can you help check whether the package is delayed?

Noah`,
    scope: "private",
  },
  {
    content: `
<h1>Your cart is still waiting — with a limited offer</h1>
<p>Hi Sofia,</p>
<p>Your Black Friday bundle is still reserved in your cart. If you are comparing sizes, shipping time, or payment options, we can help confirm the details before checkout.</p>
<blockquote><p><strong>Limited offer:</strong> Your 12% discount is reserved for the next 24 hours.</p></blockquote>
<p><a href="https://example.com">Return to your cart</a></p>
<p>Best regards,<br />Cross-border Support Team</p>
`,
    description: "独立站弃购用户召回与限时权益。",
    icon: SparklesIcon,
    meta: {
      cc: "marketing@example.com",
      recipient: "sofia.garcia@example.com",
      sender: "campaign@example.com",
      subject: "Your cart is still waiting — with a limited offer",
    },
    name: "弃购召回邮件",
    originalEmail: `From: Sofia Garcia <sofia.garcia@example.com>
To: Store Team <campaign@example.com>
Subject: Question about my cart

Hi,

I left the Black Friday bundle in my cart because I wanted to check shipping cost and payment options before buying.

Sofia`,
    scope: "public",
  },
  {
    content: `
<h1>How was your recent order?</h1>
<p>Hi Liam,</p>
<p>We hope your recent order arrived safely and is working well for you.</p>
<p>If you have a moment, we would truly appreciate any product feedback you can share. Your experience helps us improve product details, shipping expectations, and customer support.</p>
<p>Best regards,<br />Cross-border Support Team</p>
`,
    description: "订单完成后的真实反馈邀请。",
    icon: MailCheckIcon,
    meta: {
      cc: "customer-success@example.com",
      recipient: "liam.brown@example.com",
      sender: "support@example.com",
      subject: "How was your recent order?",
    },
    name: "评价邀约模板",
    originalEmail: `From: Liam Brown <liam.brown@example.com>
To: Support Team <support@example.com>
Subject: Recent order received

Hi,

My recent order arrived yesterday. Everything looks good so far.

Liam`,
    scope: "public",
  },
];

const templateScopeOptions: Array<{
  icon: typeof UserIcon;
  label: string;
  value: TemplateScope;
}> = [
  {
    icon: UserIcon,
    label: "私用模板",
    value: "private",
  },
  {
    icon: UsersIcon,
    label: "公用模板",
    value: "public",
  },
];

const formatAttachmentSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export function EmailEditor() {
  const editorRef = useRef<EmailEditorRef>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [meta, setMeta] = useState<EmailMeta>(defaultMeta);
  const [originalEmail, setOriginalEmail] = useState(defaultOriginalEmail);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [templateScope, setTemplateScope] = useState<TemplateScope>("private");
  const safeMeta = { ...defaultMeta, ...meta };
  const visibleTemplates = editorTemplates.filter(
    (template) => template.scope === templateScope
  );
  const isReadyToSend =
    safeMeta.sender.includes("@") &&
    safeMeta.recipient.includes("@") &&
    safeMeta.subject.trim().length > 0;

  const chrome = useMemo(
    () => ({
      description: "@react-email/editor 富文本编辑、预览和导出",
      title: "邮件编辑器",
    }),
    []
  );

  useWorkspaceChrome(chrome);

  const updateMeta = (key: keyof EmailMeta, value: string) => {
    setMeta((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
  };

  const addAttachments = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setAttachments((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${file.size}-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type || "未知类型",
      })),
    ]);
    setStatusMessage(`已添加 ${files.length} 个附件`);
    event.target.value = "";
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId)
    );
    setStatusMessage(null);
  };

  const applyTemplate = (template: EmailTemplate) => {
    setMeta(template.meta);
    setOriginalEmail(template.originalEmail);
    editorRef.current?.editor?.commands.setContent(template.content);
    setStatusMessage(`已套用「${template.name}」`);
  };

  const simulateSend = async () => {
    if (!isReadyToSend) {
      setStatusMessage("请填写有效发件人、收件人和主题后再发送");
      return;
    }

    if (editorRef.current) {
      await editorRef.current.getEmail();
    }
    setStatusMessage("演示：邮件已加入待发送队列（尚未接入真实 SMTP/API）");
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <section className="space-y-5">
          <Card className="rounded-[2rem] p-5 shadow-sm">
            <Link
              className="mb-4 inline-flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
              href="/email"
            >
              <Undo2Icon className="size-3.5" />
              返回邮件管理
            </Link>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-semibold text-2xl tracking-tight">写邮件</h1>
              </div>
              <Button
                className="h-10 rounded-xl"
                onClick={() => void simulateSend()}
                type="button"
              >
                <SendIcon className="size-4" />
                发送
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-sm">发件人</span>
                <Input
                  className="h-11 rounded-xl bg-background"
                  onChange={(event) => updateMeta("sender", event.target.value)}
                  placeholder="sender@example.com"
                  value={safeMeta.sender}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-sm">收件人</span>
                <Input
                  className="h-11 rounded-xl bg-background"
                  onChange={(event) => updateMeta("recipient", event.target.value)}
                  placeholder="recipient@example.com"
                  value={safeMeta.recipient}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-sm">抄送</span>
                <Input
                  className="h-11 rounded-xl bg-background"
                  onChange={(event) => updateMeta("cc", event.target.value)}
                  placeholder="cc@example.com"
                  value={safeMeta.cc}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium text-muted-foreground text-sm">主题</span>
                <Input
                  className="h-11 rounded-xl bg-background"
                  onChange={(event) => updateMeta("subject", event.target.value)}
                  placeholder="Email subject"
                  value={safeMeta.subject}
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed bg-muted/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <PaperclipIcon className="size-4 text-primary" />
                    <h2 className="font-semibold text-base">附件</h2>
                  </div>
                </div>
                <Button asChild className="h-10 cursor-pointer rounded-xl" variant="outline">
                  <label>
                    <PaperclipIcon className="size-4" />
                    添加附件
                    <input
                      className="sr-only"
                      multiple
                      onChange={addAttachments}
                      type="file"
                    />
                  </label>
                </Button>
              </div>

              {attachments.length > 0 ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {attachments.map((attachment) => (
                    <div
                      className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-2"
                      key={attachment.id}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <FileTextIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-card-foreground text-sm">
                          {attachment.name}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          {formatAttachmentSize(attachment.size)} · {attachment.type}
                        </p>
                      </div>
                      <button
                        aria-label={`删除附件 ${attachment.name}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeAttachment(attachment.id)}
                        type="button"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] py-0 shadow-sm">
            <CardHeader className="border-b bg-muted/40 py-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary" />
                  <CardTitle>模板库</CardTitle>
                </div>
                <div className="inline-flex rounded-2xl border bg-background p-1">
                  {templateScopeOptions.map((option) => {
                    const ScopeIcon = option.icon;
                    const isActive = templateScope === option.value;

                    return (
                      <Button
                        className="h-9 rounded-xl"
                        key={option.value}
                        onClick={() => setTemplateScope(option.value)}
                        type="button"
                        variant={isActive ? "default" : "ghost"}
                      >
                        <ScopeIcon className="size-4" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {visibleTemplates.map((template) => {
                  const Icon = template.icon;

                  return (
                    <button
                      className="rounded-2xl border bg-card p-3 text-left transition-colors hover:bg-muted/60"
                      key={template.name}
                      onClick={() => applyTemplate(template)}
                      type="button"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                          <Icon className="size-3.5" />
                        </div>
                        <p className="font-semibold text-card-foreground text-sm">
                          {template.name}
                        </p>
                      </div>
                      <p className="line-clamp-2 text-muted-foreground text-xs leading-5">
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 className="font-semibold text-base">正文</h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  输入 / 可打开命令菜单，选中文字可使用气泡工具栏。
                </p>
              </div>
              <Badge variant="secondary">
                editor
              </Badge>
            </div>
            <ReactEmailEditor
              className="min-h-96 bg-[#ffffff] px-6 py-5 outline-none [&_.tiptap]:min-h-80 [&_.tiptap]:max-w-none [&_.tiptap]:text-card-foreground [&_.tiptap]:outline-none [&_.tiptap]:p-1"
              content={defaultContent}
              onReady={(ref) => {
                editorRef.current = ref;
              }}
              placeholder="输入邮件正文，或按 / 插入内容..."
              ref={editorRef}
              theme="basic"
            />
          </Card>

          <Card className="rounded-[2rem] p-5 shadow-sm">
            <CardHeader className="mb-4 flex items-center justify-between gap-3 px-0">
              <div>
                <CardTitle>原始邮件</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  查看客户来信或平台邮件，方便在编辑回复内容时参考。
                </CardDescription>
              </div>
              <Badge variant="secondary">source</Badge>
            </CardHeader>
            <CardContent className="px-0">
              <pre className="max-h-64 min-h-44 overflow-auto whitespace-pre-wrap rounded-2xl border bg-muted/50 px-4 py-3 font-mono text-card-foreground text-xs leading-6">{originalEmail}</pre>
            </CardContent>
          </Card>

          {statusMessage ? (
            <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-primary text-sm">
              <CheckCircle2Icon className="size-4" />
              {statusMessage}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
