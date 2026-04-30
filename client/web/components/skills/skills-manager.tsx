"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import {
  BrainCircuitIcon,
  CircleIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type SkillStatus = "enabled" | "disabled";

type SkillItem = {
  category: string;
  description: string;
  id: string;
  instructions: string;
  name: string;
  status: SkillStatus;
  trigger: string;
  updatedAt: string;
  usageCount: number;
};

type SkillForm = Pick<
  SkillItem,
  "category" | "description" | "instructions" | "name" | "trigger"
>;

const categoryOptions = [
  "全部",
  "美工",
  "运营",
  "客服",
  "视频",
  "图片",
  "设计",
  "计划",
  "创作",
];

const fallbackCategoryOptions = new Set(categoryOptions);
const hiddenLegacyCategoryOptions = new Set(["开发", "调试", "测试"]);

const toForm = (skill: SkillItem): SkillForm => ({
  category: skill.category,
  description: skill.description,
  instructions: skill.instructions,
  name: skill.name,
  trigger: skill.trigger,
});

const emptyForm: SkillForm = {
  category: "美工",
  description: "",
  instructions: "",
  name: "",
  trigger: "",
};

const requiredText = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName}不能为空`);

const skillFormSchema = z.object({
  category: requiredText("分类"),
  description: requiredText("描述"),
  instructions: requiredText("说明"),
  name: requiredText("名称"),
  trigger: requiredText("触发词"),
});

const skillStatusUpdateSchema = z.object({
  status: z.enum(["enabled", "disabled"]),
});

const skillCreateSchema = skillFormSchema.extend({
  status: z.enum(["enabled", "disabled"]),
  usageCount: z.number().int().min(0),
});

const getValidationMessage = (error: z.ZodError) =>
  error.issues[0]?.message ?? "提交内容校验失败";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Skills API 请求失败");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function SkillsManager() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<SkillForm>({
    defaultValues: emptyForm,
    resolver: zodResolver(skillFormSchema),
  });

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? skills[0],
    [selectedSkillId, skills]
  );

  const visibleCategoryOptions = useMemo(() => {
    const customCategories = skills
      .map((skill) => skill.category)
      .filter(
        (category) =>
          !fallbackCategoryOptions.has(category) &&
          !hiddenLegacyCategoryOptions.has(category)
      );

    return [...categoryOptions, ...Array.from(new Set(customCategories))];
  }, [skills]);

  useEffect(() => {
    let isMounted = true;

    async function loadSkills() {
      try {
        const nextSkills = await requestJson<SkillItem[]>("/api/skills");
        if (!isMounted) {
          return;
        }

        const nextSelectedSkill = nextSkills[0];
        setSkills(nextSkills);
        setSelectedSkillId(nextSelectedSkill?.id ?? null);
        reset(nextSelectedSkill ? toForm(nextSelectedSkill) : emptyForm);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Skills API 请求失败"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSkills();

    return () => {
      isMounted = false;
    };
  }, [reset]);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesCategory =
        selectedCategory === "全部" || skill.category === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        [skill.name, skill.description, skill.trigger, skill.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory, skills]);

  const enabledCount = skills.filter((skill) => skill.status === "enabled").length;
  const disabledCount = skills.length - enabledCount;

  const selectSkill = (skill: SkillItem) => {
    setSelectedSkillId(skill.id);
    reset(toForm(skill));
  };

  const updateSkillInState = (nextSkill: SkillItem) => {
    setSkills((current) =>
      current.map((skill) => (skill.id === nextSkill.id ? nextSkill : skill))
    );

    if (selectedSkillId === nextSkill.id) {
      reset(toForm(nextSkill));
    }
  };

  const toggleSkill = async (skillId: string, checked: boolean) => {
    const previousSkills = skills;
    const nextStatus: SkillStatus = checked ? "enabled" : "disabled";
    const statusPayload = skillStatusUpdateSchema.safeParse({ status: nextStatus });

    if (!statusPayload.success) {
      setErrorMessage(getValidationMessage(statusPayload.error));
      return;
    }

    setSkills((current) =>
      current.map((skill) =>
        skill.id === skillId ? { ...skill, status: nextStatus } : skill
      )
    );
    setErrorMessage(null);

    try {
      const nextSkill = await requestJson<SkillItem>(`/api/skills/${skillId}`, {
        body: JSON.stringify(statusPayload.data),
        method: "PATCH",
      });
      updateSkillInState(nextSkill);
    } catch (error) {
      setSkills(previousSkills);
      setErrorMessage(error instanceof Error ? error.message : "保存启用状态失败");
    }
  };

  const saveSelectedSkill = handleSubmit(async (skillPayload) => {
    if (!selectedSkill) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const nextSkill = await requestJson<SkillItem>(
        `/api/skills/${selectedSkill.id}`,
        {
          body: JSON.stringify(skillPayload),
          method: "PATCH",
        }
      );
      updateSkillInState(nextSkill);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存 Skill 失败");
    } finally {
      setIsSaving(false);
    }
  });

  const createDraftSkill = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    const draft = {
      category: "美工",
      description: "描述这个 Skill 能解决的问题。",
      instructions: "写下这个 Skill 的使用规则、触发场景和输出要求。",
      name: "New Skill",
      status: "enabled",
      trigger: "输入触发关键词或任务类型",
      usageCount: 0,
    };

    const skillPayload = skillCreateSchema.safeParse(draft);

    if (!skillPayload.success) {
      setErrorMessage(getValidationMessage(skillPayload.error));
      setIsSaving(false);
      return;
    }

    try {
      const nextSkill = await requestJson<SkillItem>("/api/skills", {
        body: JSON.stringify(skillPayload.data),
        method: "POST",
      });
      setSkills((current) => [nextSkill, ...current]);
      setSelectedSkillId(nextSkill.id);
      reset(toForm(nextSkill));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新建 Skill 失败");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSelectedSkill = async () => {
    if (!selectedSkill) {
      return;
    }

    const shouldDelete = window.confirm(
      `确认删除 Skill「${selectedSkill.name}」？此操作不可恢复。`
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await requestJson<void>(`/api/skills/${selectedSkill.id}`, {
        method: "DELETE",
      });

      const remainingSkills = skills.filter((skill) => skill.id !== selectedSkill.id);
      const nextSelectedSkill = remainingSkills[0] ?? null;

      setSkills(remainingSkills);
      setSelectedSkillId(nextSelectedSkill?.id ?? null);
      reset(nextSelectedSkill ? toForm(nextSelectedSkill) : emptyForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除 Skill 失败");
    } finally {
      setIsDeleting(false);
    }
  };

  const sidebarContent = useMemo(
    () => (
      <>
        <p className="mb-2 px-1 font-medium text-[11px] text-muted-foreground">
          Skill 分组
        </p>
        <div className="space-y-1 pb-3">
          {visibleCategoryOptions.slice(1).map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <button
                className={
                  isSelected
                    ? "flex h-8 w-full items-center gap-2 rounded-lg bg-sidebar-accent px-2 text-left text-sm text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                    : "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                }
                key={category}
                onClick={() => setSelectedCategory(category)}
                type="button"
              >
                <CircleIcon
                  className={
                    isSelected ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground/60"
                  }
                />
                <span className="truncate">{category}</span>
              </button>
            );
          })}
        </div>
      </>
    ),
    [selectedCategory, visibleCategoryOptions]
  );

  const chrome = useMemo(
    () => ({
      description: "MongoDB 持久化 Skills 配置",
      sidebarContent,
      title: "Skills 管理",
    }),
    [sidebarContent]
  );

  useWorkspaceChrome(chrome);

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[1fr_24rem]">
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
                  <p className="text-muted-foreground text-xs">总 Skills</p>
                  <p className="mt-2 font-semibold text-2xl">{skills.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-sm">
                  <p className="text-emerald-600 text-xs dark:text-emerald-400">已启用</p>
                  <p className="mt-2 font-semibold text-2xl text-emerald-700 dark:text-emerald-300">
                    {enabledCount}
                  </p>
                </div>
                <div className="rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
                  <p className="text-muted-foreground text-xs">已停用</p>
                  <p className="mt-2 font-semibold text-2xl">{disabledCount}</p>
                </div>
              </div>

              <div className="rounded-3xl border bg-card p-4 text-card-foreground shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
                      <WandSparklesIcon className="size-3.5" />
                      Skill Library
                    </div>
                    <h2 className="font-semibold text-xl tracking-tight">
                      管理 AI 工作流 Skills
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm">
                      通过后端 API 管理启用状态、触发词和说明。
                    </p>
                  </div>
                  <Button
                    className="rounded-xl"
                    disabled={isSaving}
                    onClick={createDraftSkill}
                    type="button"
                  >
                    <PlusIcon className="size-4" />
                    新建 Skill
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <label className="relative block">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-10 rounded-xl bg-background pl-9"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索名称、描述或触发词"
                      value={query}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {visibleCategoryOptions.map((category) => (
                      <button
                        className={
                          selectedCategory === category
                            ? "rounded-full bg-primary px-3 py-1.5 text-primary-foreground text-xs"
                            : "rounded-full border bg-card px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted"
                        }
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        type="button"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                    {errorMessage}
                  </div>
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {isLoading ? (
                  <div className="rounded-2xl border bg-card p-6 text-muted-foreground text-sm shadow-sm lg:col-span-2">
                    正在从后端加载 Skills…
                  </div>
                ) : null}
                {!isLoading && filteredSkills.length === 0 ? (
                  <div className="rounded-2xl border bg-card p-6 text-muted-foreground text-sm shadow-sm lg:col-span-2">
                    没有匹配的 Skill
                  </div>
                ) : null}
                {!isLoading && filteredSkills.map((skill) => {
                  const isSelected = skill.id === selectedSkill?.id;
                  const isEnabled = skill.status === "enabled";

                  return (
                    <article
                      className={
                        isSelected
                          ? "rounded-2xl border border-primary/30 bg-card p-4 shadow-sm ring-1 ring-primary/20"
                          : "rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
                      }
                      key={skill.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => selectSkill(skill)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <BrainCircuitIcon className="size-4 text-primary" />
                            <h3 className="truncate font-semibold text-card-foreground text-sm">
                              {skill.name}
                            </h3>
                          </div>
                          <p className="mt-2 line-clamp-2 text-muted-foreground text-sm leading-6">
                            {skill.description}
                          </p>
                        </button>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            void toggleSkill(skill.id, checked);
                          }}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            isEnabled
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }
                          variant="secondary"
                        >
                          {isEnabled ? "启用" : "停用"}
                        </Badge>
                        <Badge variant="outline">{skill.category}</Badge>
                        <span className="text-muted-foreground text-xs">
                          使用 {skill.usageCount} 次
                        </span>
                      </div>
                      <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-muted-foreground text-xs">
                        触发：{skill.trigger}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="rounded-3xl border bg-card p-4 text-card-foreground shadow-sm xl:sticky xl:top-6 xl:self-start">
              {selectedSkill ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground text-xs">当前 Skill</p>
                      <h2 className="mt-1 font-semibold text-lg">
                        {selectedSkill.name}
                      </h2>
                    </div>
                    <Switch
                      checked={selectedSkill.status === "enabled"}
                      onCheckedChange={(checked) =>
                        void toggleSkill(selectedSkill.id, checked)
                      }
                    />
                  </div>

                  <label className="grid gap-1.5">
                    <span className="font-medium text-muted-foreground text-xs">名称</span>
                    <Input {...register("name")} aria-invalid={!!errors.name} />
                    {errors.name ? (
                      <span className="text-rose-600 text-xs">
                        {errors.name.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="font-medium text-muted-foreground text-xs">分类</span>
                    <Input
                      {...register("category")}
                      aria-invalid={!!errors.category}
                    />
                    {errors.category ? (
                      <span className="text-rose-600 text-xs">
                        {errors.category.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="font-medium text-muted-foreground text-xs">描述</span>
                    <Textarea
                      {...register("description")}
                      aria-invalid={!!errors.description}
                      className="min-h-20 resize-none"
                    />
                    {errors.description ? (
                      <span className="text-rose-600 text-xs">
                        {errors.description.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="font-medium text-muted-foreground text-xs">触发词</span>
                    <Input
                      {...register("trigger")}
                      aria-invalid={!!errors.trigger}
                    />
                    {errors.trigger ? (
                      <span className="text-rose-600 text-xs">
                        {errors.trigger.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="font-medium text-muted-foreground text-xs">说明</span>
                    <Textarea
                      {...register("instructions")}
                      aria-invalid={!!errors.instructions}
                      className="min-h-36 resize-none"
                    />
                    {errors.instructions ? (
                      <span className="text-rose-600 text-xs">
                        {errors.instructions.message}
                      </span>
                    ) : null}
                  </label>

                  <Button
                    className="w-full rounded-xl"
                    disabled={isDeleting || isSaving}
                    onClick={saveSelectedSkill}
                    type="button"
                  >
                    <SaveIcon className="size-4" />
                    {isSaving ? "保存中…" : "保存到后端"}
                  </Button>

                  <Button
                    className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isDeleting || isSaving}
                    onClick={() => void deleteSelectedSkill()}
                    type="button"
                    variant="outline"
                  >
                    <Trash2Icon className="size-4" />
                    {isDeleting ? "删除中…" : "删除 Skill"}
                  </Button>

                  <div className="rounded-2xl bg-muted/50 p-3 text-muted-foreground text-xs leading-6">
                    最近更新：{selectedSkill.updatedAt}
                    <br />
                    当前配置已通过 FastAPI 写入 MongoDB。
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-muted/50 p-6 text-center text-muted-foreground text-sm">
                  没有匹配的 Skill
                </div>
              )}
            </aside>
      </div>
    </div>
  );
}
