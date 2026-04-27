"use client";

import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { UIMessage } from "ai";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
} from "lucide-react";
import type {
  ComponentProps,
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import {
  createContext,
  isValidElement,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CodeBlock,
  CodeBlockContainer,
  CodeBlockDownloadButton,
  CodeBlockHeader,
  Streamdown,
  StreamdownContext,
} from "streamdown";
import type { Components } from "streamdown";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = useCallback(
    (newBranch: number) => {
      setCurrentBranch(newBranch);
      onBranchChange?.(newBranch);
    },
    [onBranchChange]
  );

  const goToPrevious = useCallback(() => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const goToNext = useCallback(() => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const contextValue = useMemo<MessageBranchContextType>(
    () => ({
      branches,
      currentBranch,
      goToNext,
      goToPrevious,
      setBranches,
      totalBranches: branches.length,
    }),
    [branches, currentBranch, goToNext, goToPrevious]
  );

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export const MessageBranchSelector = ({
  className,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className
      )}
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({
  className,
  ...props
}: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, code, math, mermaid };
const codeLanguagePattern = /language-([^\s]+)/;
const plainTextLanguages = new Set(["", "plain", "text", "txt"]);
const plainTextCodeStyle: CSSProperties = {
  color: "#020617",
  fontFamily: '"Cascadia Mono", Consolas, "Courier New", monospace',
  fontVariantLigatures: "none",
  letterSpacing: "0",
  lineHeight: "1.5rem",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "geometricPrecision",
  WebkitFontSmoothing: "antialiased",
};

type TableCopyFormat = "markdown" | "csv" | "tsv";

const getNodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
};

const writeTextToClipboard = async (text: string) => {
  if (typeof window === "undefined") {
    throw new Error("Clipboard is only available in the browser");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const didCopy = document.execCommand("copy");
    if (!didCopy) {
      throw new Error("Copy command failed");
    }
  } finally {
    document.body.removeChild(textarea);
  }
};

const escapeTableCell = (cell: string) => cell.replaceAll("|", "\\|");

const escapeSeparatedValue = (cell: string, separator: string) => {
  if (
    cell.includes('"') ||
    cell.includes("\n") ||
    cell.includes("\r") ||
    cell.includes(separator)
  ) {
    return `"${cell.replaceAll('"', '""')}"`;
  }

  return cell;
};

const tableToText = (table: HTMLTableElement, format: TableCopyFormat) => {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? "")
  );

  if (format === "csv" || format === "tsv") {
    const separator = format === "csv" ? "," : "\t";
    return rows
      .map((row) =>
        row.map((cell) => escapeSeparatedValue(cell, separator)).join(separator)
      )
      .join("\n");
  }

  const [headers = [], ...bodyRows] = rows;
  const divider = headers.map(() => "---");
  return [headers, divider, ...bodyRows]
    .map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`)
    .join("\n");
};

const MessageCodeBlockCopyButton = ({ code }: { code: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { isAnimating } = useContext(StreamdownContext);

  const copyToClipboard = useCallback(async () => {
    if (isAnimating || isCopied) {
      return;
    }

    try {
      await writeTextToClipboard(code);
      setIsCopied(true);
      timeoutRef.current = window.setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code block", error);
    }
  }, [code, isAnimating, isCopied]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <button
      aria-label={isCopied ? "已复制代码" : "复制代码"}
      className="cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      data-streamdown="code-block-copy-button"
      disabled={isAnimating}
      onClick={copyToClipboard}
      title={isCopied ? "已复制" : "复制代码"}
      type="button"
    >
      <Icon size={14} />
    </button>
  );
};

const MessagePlainTextCodeBlock = ({
  className,
  code,
  language,
}: {
  className?: string;
  code: string;
  language: string;
}) => (
  <CodeBlockContainer
    className={cn("my-4 w-full rounded-xl border-border bg-sidebar", className)}
    language={language || "text"}
  >
    <CodeBlockHeader language={language || "text"} />
    <div className="pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end">
      <div
        className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-backdrop-filter:bg-sidebar/70 supports-backdrop-filter:backdrop-blur"
        data-streamdown="code-block-actions"
      >
        <CodeBlockDownloadButton code={code} language={language || "text"} />
        <MessageCodeBlockCopyButton code={code} />
      </div>
    </div>
    <div
      className="overflow-x-auto rounded-md border border-border bg-background p-4 text-sm"
      data-language={language || "text"}
      data-streamdown="code-block-body"
    >
      <pre
        className="m-0 whitespace-pre bg-transparent tabular-nums"
        style={plainTextCodeStyle}
      ><code>{code}</code></pre>
    </div>
  </CodeBlockContainer>
);

const MessageMarkdownCode = ({
  children,
  className,
  ...props
}: ComponentProps<"code"> & { node?: unknown }) => {
  const isBlock = "data-block" in props;
  const { lineNumbers } = useContext(StreamdownContext);

  if (!isBlock) {
    return (
      <code
        className={cn(
          "rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
          className
        )}
        data-streamdown="inline-code"
        {...props}
      >
        {children}
      </code>
    );
  }

  const codeText = getNodeText(children);
  const language = className?.match(codeLanguagePattern)?.at(1) ?? "text";

  if (plainTextLanguages.has(language.toLowerCase())) {
    return (
      <MessagePlainTextCodeBlock
        className={className}
        code={codeText.trimEnd()}
        language={language}
      />
    );
  }

  return (
    <CodeBlock
      className={className}
      code={codeText}
      language={language}
      lineNumbers={lineNumbers}
    >
      <CodeBlockDownloadButton code={codeText} language={language} />
      <MessageCodeBlockCopyButton code={codeText} />
    </CodeBlock>
  );
};

const MessageTableCopyButton = ({
  tableRef,
}: {
  tableRef: React.RefObject<HTMLTableElement | null>;
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { isAnimating } = useContext(StreamdownContext);

  const copyTable = useCallback(
    async (format: TableCopyFormat) => {
      if (isAnimating || !tableRef.current) {
        return;
      }

      try {
        await writeTextToClipboard(tableToText(tableRef.current, format));
        setIsCopied(true);
        setIsOpen(false);
        timeoutRef.current = window.setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy table", error);
      }
    },
    [isAnimating, tableRef]
  );

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <div className="relative">
      <button
        aria-label={isCopied ? "已复制表格" : "复制表格"}
        className="cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isAnimating}
        onClick={() => setIsOpen((current) => !current)}
        title={isCopied ? "已复制" : "复制表格"}
        type="button"
      >
        <Icon size={14} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-30 overflow-hidden rounded-md border border-border bg-background shadow-lg">
          <button
            className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
            onClick={() => copyTable("markdown")}
            type="button"
          >
            Markdown
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
            onClick={() => copyTable("csv")}
            type="button"
          >
            CSV
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
            onClick={() => copyTable("tsv")}
            type="button"
          >
            TSV
          </button>
        </div>
      )}
    </div>
  );
};

const MessageMarkdownTable = ({
  children,
  className,
  ...props
}: ComponentProps<"table"> & { node?: unknown }) => {
  const tableRef = useRef<HTMLTableElement | null>(null);

  return (
    <div
      className="my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2"
      data-streamdown="table-wrapper"
    >
      <div className="flex items-center justify-end gap-1">
        <MessageTableCopyButton tableRef={tableRef} />
      </div>
      <div className="border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background">
        <table
          className={cn("w-full divide-y divide-border", className)}
          data-streamdown="table"
          ref={tableRef}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
};

const streamdownComponents: Components = {
  code: MessageMarkdownCode,
  table: MessageMarkdownTable,
};

export const MessageResponse = memo(
  ({ className, components, ...props }: MessageResponseProps) => (
    <Streamdown
      caret="block"
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      animated={{
        animation: "blurIn",
        duration: 250,
        easing: "ease-out",
      }}
      components={{ ...streamdownComponents, ...components }}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={cn(
      "mt-4 flex w-full items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
