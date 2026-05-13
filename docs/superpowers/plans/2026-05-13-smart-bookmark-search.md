# 智能书签搜索 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Options 页面新增智能书签搜索功能，用户输入自然语言调用大模型对浏览器书签做语义搜索。

**Architecture:** 新增 `/bookmarks` 路由页面，通过 background message 调用 `@ai-sdk/openai-compatible` 做语义搜索。书签服务负责读取和预过滤，搜索服务负责 prompt 组装和模型调用。模型配置复用现有 `GenericModelConfig` 类型，独立 storage key。

**Tech Stack:** React, TypeScript, TanStack Router, Plasmo messaging, @ai-sdk/openai-compatible, chrome.bookmarks API

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/services/bookmark-search/types.ts` | 书签搜索相关类型定义 |
| `src/services/bookmark-search/bookmarks.ts` | 书签读取、扁平化、预过滤 |
| `src/services/bookmark-search/prompt.ts` | Prompt 组装与结果解析 |
| `src/services/bookmark-search/storage.ts` | Storage key 常量与默认值 |
| `src/background/messages/bookmarkSearch.ts` | Background message handler |
| `src/background/messages/bookmarkSearchTestModel.ts` | 模型连接测试 message handler |
| `src/options/routes/bookmarks/index.tsx` | 书签搜索路由页面 |
| `src/options/components/bookmark-search-settings.tsx` | 模型配置 UI 组件 |
| `src/options/components/sidebar.tsx` | 修改：注册新菜单项 |
| `package.json` | 修改：添加 `bookmarks` 权限 |

---

### Task 1: 添加 bookmarks 权限

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 在 package.json 中添加 bookmarks 权限**

在 `permissions` 数组中添加 `"bookmarks"`：

```json
"permissions": [
  "storage",
  "unlimitedStorage",
  "scripting",
  "tabs",
  "notifications",
  "bookmarks"
]
```

找到 `permissions` 数组，在最后一个现有权限后添加 `"bookmarks"`。

- [ ] **Step 2: 运行 verify 确认无报错**

Run: `pnpm verify`
Expected: PASS，无类型错误或 lint 问题

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: 添加 bookmarks 权限以支持智能书签搜索"
```

---

### Task 2: 类型定义与 Storage 常量

**Files:**
- Create: `src/services/bookmark-search/types.ts`
- Create: `src/services/bookmark-search/storage.ts`

- [ ] **Step 1: 创建类型定义文件**

创建 `src/services/bookmark-search/types.ts`：

```typescript
import type { GenericModelConfig } from "@/generic-api-doc/types";

export interface FlatBookmark {
  index: number;
  title: string;
  url: string;
  path: string;
}

export interface BookmarkSearchMatch {
  index: number;
  reason: string;
}

export interface BookmarkSearchResult {
  ok: true;
  matches: BookmarkSearchMatch[];
  truncated: boolean;
}

export interface BookmarkSearchFailure {
  ok: false;
  message: string;
  code: "invalid-config" | "no-bookmarks" | "network-error" | "parse-error" | "unknown-error";
}

export type BookmarkSearchResponse = BookmarkSearchResult | BookmarkSearchFailure;

export type BookmarkSearchModelConfig = GenericModelConfig;
```

- [ ] **Step 2: 创建 Storage 常量文件**

创建 `src/services/bookmark-search/storage.ts`：

```typescript
import type { BookmarkSearchModelConfig } from "./types";

export const BOOKMARK_SEARCH_MODEL_CONFIG_KEY = "bookmarkSearchModelConfig";
export const BOOKMARK_SEARCH_HISTORY_KEY = "bookmarkSearchHistory";

export const bookmarkSearchModelConfigDefault: BookmarkSearchModelConfig = {
  apiType: "openai-compatible",
  baseUrl: "",
  modelId: "",
  apiKey: ""
};

export const BOOKMARK_SEARCH_HISTORY_MAX = 5;
```

- [ ] **Step 3: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/bookmark-search/types.ts src/services/bookmark-search/storage.ts
git commit -m "feat: 添加书签搜索类型定义与 storage 常量"
```

---

### Task 3: 书签服务 — 读取、扁平化、预过滤

**Files:**
- Create: `src/services/bookmark-search/bookmarks.ts`

- [ ] **Step 1: 创建书签服务**

创建 `src/services/bookmark-search/bookmarks.ts`：

```typescript
import type { FlatBookmark } from "./types";

export function flattenBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  parentPath = ""
): FlatBookmark[] {
  const result: FlatBookmark[] = [];
  let index = 0;

  function walk(nodes: chrome.bookmarks.BookmarkTreeNode[], currentPath: string) {
    for (const node of nodes) {
      if (node.url) {
        result.push({
          index: index++,
          title: node.title || "",
          url: node.url,
          path: currentPath
        });
      }
      if (node.children) {
        const nextPath = currentPath ? `${currentPath}/${node.title}` : node.title;
        walk(node.children, nextPath);
      }
    }
  }

  walk(nodes, parentPath);
  return result;
}

export function preFilterBookmarks(
  bookmarks: FlatBookmark[],
  query: string,
  maxCount = 500
): { filtered: FlatBookmark[]; totalCount: number } {
  const totalCount = bookmarks.length;

  if (totalCount <= maxCount) {
    return { filtered: bookmarks, totalCount };
  }

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 0);

  if (keywords.length === 0) {
    return { filtered: bookmarks.slice(0, maxCount), totalCount };
  }

  const scored = bookmarks.map((b) => {
    const text = `${b.title} ${b.url} ${b.path}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    return { bookmark: b, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const filtered = scored.slice(0, maxCount).map((s) => ({
    ...s.bookmark,
    index: 0
  }));

  filtered.forEach((b, i) => {
    b.index = i;
  });

  return { filtered, totalCount };
}

export async function getAllBookmarks(): Promise<FlatBookmark[]> {
  const tree = await chrome.bookmarks.getTree();
  return flattenBookmarks(tree);
}
```

- [ ] **Step 2: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/bookmark-search/bookmarks.ts
git commit -m "feat: 实现书签读取、扁平化与预过滤服务"
```

---

### Task 4: Prompt 组装与结果解析

**Files:**
- Create: `src/services/bookmark-search/prompt.ts`

- [ ] **Step 1: 创建 Prompt 服务**

创建 `src/services/bookmark-search/prompt.ts`：

```typescript
import type { BookmarkSearchMatch, FlatBookmark } from "./types";

export function buildBookmarkSearchPrompt(
  bookmarks: FlatBookmark[],
  query: string
): string {
  const bookmarkLines = bookmarks
    .map((b) => `${b.index + 1}. ${b.title} | ${b.url} | 目录: ${b.path || "(根目录)"}`)
    .join("\n");

  return [
    "你是一个书签搜索助手。用户有以下书签列表，请根据用户查询找出最相关的书签。",
    "",
    "## 书签列表",
    bookmarkLines,
    "",
    "## 用户查询",
    query,
    "",
    "## 要求",
    "- 返回最多 10 条最相关的结果",
    "- 按相关度从高到低排序",
    '- 以 JSON 数组格式返回: [{"index": 1, "reason": "匹配理由"}]',
    "- index 对应书签列表中的序号",
    "- 如果没有相关结果，返回空数组 []"
  ].join("\n");
}

export function parseBookmarkSearchResponse(raw: string): BookmarkSearchMatch[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (item): item is { index: number; reason: string } =>
        typeof item === "object" &&
        item !== null &&
        "index" in item &&
        typeof (item as Record<string, unknown>).index === "number"
    )
    .map((item) => ({
      index: item.index,
      reason: typeof item.reason === "string" ? item.reason : ""
    }));
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3);
}
```

- [ ] **Step 2: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/bookmark-search/prompt.ts
git commit -m "feat: 实现书签搜索 prompt 组装与结果解析"
```

---

### Task 5: Background Message Handler — 书签搜索

**Files:**
- Create: `src/background/messages/bookmarkSearch.ts`

- [ ] **Step 1: 创建搜索 message handler**

创建 `src/background/messages/bookmarkSearch.ts`：

```typescript
import type { PlasmoMessaging } from "@plasmohq/messaging";
import { createGenericModel } from "@/background/generic-api-doc/provider";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { getAllBookmarks, preFilterBookmarks } from "@/services/bookmark-search/bookmarks";
import {
  buildBookmarkSearchPrompt,
  estimateTokenCount,
  parseBookmarkSearchResponse
} from "@/services/bookmark-search/prompt";
import type { BookmarkSearchMatch } from "@/services/bookmark-search/types";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export type BookmarkSearchReqBody = {
  config: GenericModelConfig;
  query: string;
};

export type BookmarkSearchResBody =
  | { success: true; matches: BookmarkSearchMatch[]; truncated: boolean }
  | { success: false; message: string };

const MAX_PROMPT_TOKENS = 30000;

const handler: PlasmoMessaging.MessageHandler<BookmarkSearchReqBody, BookmarkSearchResBody> = async (req, res) => {
  const { config, query } = req.body ?? {};

  if (!config || !query) {
    res.send({ success: false, message: "缺少模型配置或查询内容" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整" });
    return;
  }

  try {
    const allBookmarks = await getAllBookmarks();

    if (allBookmarks.length === 0) {
      res.send({ success: false, message: "未找到浏览器书签" });
      return;
    }

    const { filtered, totalCount } = preFilterBookmarks(allBookmarks, query);

    let candidates = filtered;
    let truncated = totalCount > filtered.length;

    const prompt = buildBookmarkSearchPrompt(candidates, query);
    const estimatedTokens = estimateTokenCount(prompt);

    if (estimatedTokens > MAX_PROMPT_TOKENS) {
      const ratio = MAX_PROMPT_TOKENS / estimatedTokens;
      const targetCount = Math.floor(candidates.length * ratio);
      candidates = candidates.slice(0, Math.max(targetCount, 10));
      candidates.forEach((b, i) => {
        b.index = i;
      });
      truncated = true;
    }

    const finalPrompt = buildBookmarkSearchPrompt(candidates, query);

    const model = createGenericModel(config);
    const { generateText } = await import("ai");
    const result = await generateText({
      model: model as Parameters<typeof generateText>[0]["model"],
      prompt: finalPrompt
    });

    const matches = parseBookmarkSearchResponse(result.text);

    const resolvedMatches = matches
      .filter((m) => m.index >= 1 && m.index <= candidates.length)
      .map((m) => {
        const bookmark = candidates[m.index - 1];
        return {
          index: m.index,
          reason: m.reason,
          title: bookmark.title,
          url: bookmark.url,
          path: bookmark.path
        };
      });

    res.send({ success: true, matches: resolvedMatches, truncated });
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export default handler;
```

- [ ] **Step 2: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/background/messages/bookmarkSearch.ts
git commit -m "feat: 实现书签搜索 background message handler"
```

---

### Task 6: Background Message Handler — 模型连接测试

**Files:**
- Create: `src/background/messages/bookmarkSearchTestModel.ts`

- [ ] **Step 1: 创建连接测试 handler**

创建 `src/background/messages/bookmarkSearchTestModel.ts`：

```typescript
import type { PlasmoMessaging } from "@plasmohq/messaging";
import { testGenericModelConfig } from "@/background/generic-api-doc/provider";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export type BookmarkSearchTestModelReqBody = { config: GenericModelConfig };
export type BookmarkSearchTestModelResBody = { success: true } | { success: false; message: string };

const handler: PlasmoMessaging.MessageHandler<
  BookmarkSearchTestModelReqBody,
  BookmarkSearchTestModelResBody
> = async (req, res) => {
  const config = req.body?.config;

  if (!config) {
    res.send({ success: false, message: "缺少模型配置" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整，请先填写 API 类型、Base URL、Model ID 和 API Key" });
    return;
  }

  try {
    const result = await testGenericModelConfig(config);

    if (!result.ok) {
      res.send({ success: false, message: result.message });
      return;
    }

    res.send({ success: true });
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export default handler;
```

- [ ] **Step 2: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/background/messages/bookmarkSearchTestModel.ts
git commit -m "feat: 实现书签搜索模型连接测试 handler"
```

---

### Task 7: 模型配置 UI 组件

**Files:**
- Create: `src/options/components/bookmark-search-settings.tsx`

- [ ] **Step 1: 创建模型配置组件**

创建 `src/options/components/bookmark-search-settings.tsx`。这个组件复用 `GenericModelConfig` 类型和 `useDraftedStorageValue` hook，与现有的 `GenericApiDocSettings` 模式一致：

```typescript
import { sendToBackground } from "@plasmohq/messaging";
import { useState } from "react";
import { toast } from "react-toastify";
import type {
  BookmarkSearchTestModelReqBody,
  BookmarkSearchTestModelResBody
} from "@/background/messages/bookmarkSearchTestModel";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Field, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Select } from "@/components/catalyst-ui-kit/select";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { SettingsSection } from "@/options/components/settings-section";
import { areGenericModelConfigEqual } from "@/options/model-settings";
import { useDraftedStorageValue } from "@/options/use-drafted-storage";
import {
  BOOKMARK_SEARCH_MODEL_CONFIG_KEY,
  bookmarkSearchModelConfigDefault
} from "@/services/bookmark-search/storage";
import { storage } from "@/storages";
import { genericProviderLabelMap, isGenericModelConfigComplete } from "@/storages/generic-api-doc";

interface BookmarkSearchSettingsProps {
  defaultExpanded?: boolean;
}

export function BookmarkSearchSettings({ defaultExpanded = false }: BookmarkSearchSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const {
    draftValue: modelConfigDraft,
    setDraftValue: setModelConfigDraft,
    isHydrated,
    isSaving,
    isDirty,
    resetDraft,
    saveDraft
  } = useDraftedStorageValue<GenericModelConfig>({
    storage,
    storageKey: BOOKMARK_SEARCH_MODEL_CONFIG_KEY,
    defaultValue: bookmarkSearchModelConfigDefault,
    isEqual: areGenericModelConfigEqual
  });

  const canTestConnection = isGenericModelConfigComplete(modelConfigDraft) && !isTesting;

  const handleTestConnection = async () => {
    if (!isGenericModelConfigComplete(modelConfigDraft)) {
      toast.error("请先填写完整的模型配置");
      return;
    }

    setIsTesting(true);
    try {
      const response = await sendToBackground<BookmarkSearchTestModelReqBody, BookmarkSearchTestModelResBody>({
        name: "bookmarkSearchTestModel" as never,
        body: { config: modelConfigDraft }
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }
      toast.success("模型连接测试成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveDraft();
      toast.success("书签搜索模型配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  if (!isExpanded) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-white/10">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">模型配置</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isGenericModelConfigComplete(modelConfigDraft) ? "已配置" : "未配置，点击展开进行设置"}
          </p>
        </div>
        <Button outline onClick={() => setIsExpanded(true)}>
          {isGenericModelConfigComplete(modelConfigDraft) ? "修改配置" : "开始配置"}
        </Button>
      </div>
    );
  }

  return (
    <SettingsSection
      title="模型配置"
      description="配置书签语义搜索使用的大模型服务。需要一个兼容 OpenAI Chat Completions API 的模型服务。"
    >
      {!isGenericModelConfigComplete(modelConfigDraft) && isHydrated && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">首次使用指引</p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            书签语义搜索需要接入大模型服务。你需要准备一个兼容 OpenAI API 的模型服务地址和 API Key。
            常见选择：OpenAI、DeepSeek、通义千问等。填写完成后点击"测试连接"验证配置。
          </p>
        </div>
      )}

      <Field>
        <Label htmlFor="bookmark-provider-type">API 类型</Label>
        <Select
          id="bookmark-provider-type"
          value={modelConfigDraft.apiType}
          disabled={!isHydrated || isSaving}
          onChange={(e) =>
            setModelConfigDraft((c) => ({ ...c, apiType: e.target.value as GenericModelConfig["apiType"] }))
          }
        >
          {Object.entries(genericProviderLabelMap).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label htmlFor="bookmark-base-url">Base URL</Label>
        <Input
          id="bookmark-base-url"
          type="url"
          placeholder="https://api.openai.com/v1"
          value={modelConfigDraft.baseUrl ?? ""}
          disabled={!isHydrated || isSaving}
          onChange={(e) => setModelConfigDraft((c) => ({ ...c, baseUrl: e.target.value }))}
        />
      </Field>

      <Field>
        <Label htmlFor="bookmark-model-id">Model ID</Label>
        <Input
          id="bookmark-model-id"
          placeholder="gpt-4o-mini"
          value={modelConfigDraft.modelId ?? ""}
          disabled={!isHydrated || isSaving}
          onChange={(e) => setModelConfigDraft((c) => ({ ...c, modelId: e.target.value }))}
        />
      </Field>

      <Field>
        <Label htmlFor="bookmark-api-key">API Key</Label>
        <Description>仅保存在本地扩展 storage，不会同步到其它设备。</Description>
        <Input
          id="bookmark-api-key"
          type="password"
          autoComplete="off"
          value={modelConfigDraft.apiKey ?? ""}
          disabled={!isHydrated || isSaving}
          onChange={(e) => setModelConfigDraft((c) => ({ ...c, apiKey: e.target.value }))}
        />
      </Field>

      <Field>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>测试连接</Label>
            <Description>验证当前配置是否可正常调用模型。</Description>
          </div>
          <Button onClick={() => void handleTestConnection()} disabled={!isHydrated || !canTestConnection}>
            {isTesting ? "测试中..." : "测试连接"}
          </Button>
        </div>
      </Field>

      <Field>
        <div className="flex justify-end gap-2">
          <Button outline disabled={!isHydrated || isSaving || !isDirty} onClick={resetDraft}>
            重置
          </Button>
          <Button disabled={!isHydrated || isSaving || !isDirty} onClick={() => void handleSave()}>
            {isSaving ? "保存中..." : "保存模型配置"}
          </Button>
        </div>
      </Field>
    </SettingsSection>
  );
}
```

- [ ] **Step 2: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/options/components/bookmark-search-settings.tsx
git commit -m "feat: 实现书签搜索模型配置 UI 组件"
```

---

### Task 8: 书签搜索路由页面

**Files:**
- Create: `src/options/routes/bookmarks/index.tsx`

- [ ] **Step 1: 创建路由页面**

创建 `src/options/routes/bookmarks/index.tsx`：

```typescript
import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { BookmarkSearchReqBody, BookmarkSearchResBody } from "@/background/messages/bookmarkSearch";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Field, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { BookmarkSearchSettings } from "@/options/components/bookmark-search-settings";
import {
  BOOKMARK_SEARCH_HISTORY_KEY,
  BOOKMARK_SEARCH_HISTORY_MAX,
  BOOKMARK_SEARCH_MODEL_CONFIG_KEY,
  bookmarkSearchModelConfigDefault
} from "@/services/bookmark-search/storage";
import { storage } from "@/storages";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarkSearchPage
});

interface SearchResultItem {
  index: number;
  reason: string;
  title: string;
  url: string;
  path: string;
}

function BookmarkSearchPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const [modelConfig] = useStorage<GenericModelConfig>(
    { key: BOOKMARK_SEARCH_MODEL_CONFIG_KEY, instance: storage },
    bookmarkSearchModelConfigDefault
  );

  const [searchHistory, , searchHistorySetter] = useStorage<string[]>(
    { key: BOOKMARK_SEARCH_HISTORY_KEY, instance: storage },
    []
  );

  const isConfigComplete = isGenericModelConfigComplete(modelConfig);

  const addToHistory = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...(searchHistory || []).filter((h) => h !== trimmed)].slice(
        0,
        BOOKMARK_SEARCH_HISTORY_MAX
      );
      searchHistorySetter.setStoreValue(updated);
    },
    [searchHistory, searchHistorySetter]
  );

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) return;

      if (!isConfigComplete) {
        toast.error("请先配置模型");
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSearching(true);
      setHasSearched(true);
      setResults([]);
      setExpandedReasons(new Set());

      try {
        const response = await sendToBackground<BookmarkSearchReqBody, BookmarkSearchResBody>({
          name: "bookmarkSearch" as never,
          body: { config: modelConfig, query: q }
        });

        if (!response.success) {
          toast.error(response.message);
          return;
        }

        setResults(response.matches as SearchResultItem[]);
        setTruncated(response.truncated);
        addToHistory(q);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        setIsSearching(false);
      }
    },
    [query, isConfigComplete, modelConfig, addToHistory]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSearch();
    }
  };

  const toggleReason = (index: number) => {
    setExpandedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleHistoryClick = (q: string) => {
    setQuery(q);
    void handleSearch(q);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">智能书签搜索</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          用自然语言描述你要找的书签，AI 帮你从浏览器书签中找到最相关的结果。
        </p>
      </div>

      <Field>
        <Label htmlFor="bookmark-search-input">搜索</Label>
        <div className="flex gap-2">
          <Input
            id="bookmark-search-input"
            placeholder="描述你要找的书签..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
          />
          <Button onClick={() => void handleSearch()} disabled={isSearching || !query.trim() || !isConfigComplete}>
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>
      </Field>

      {searchHistory && searchHistory.length > 0 && !isSearching && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 leading-6">最近搜索：</span>
          {searchHistory.map((h) => (
            <button
              key={h}
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
              onClick={() => handleHistoryClick(h)}
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="flex items-center gap-2 py-8 justify-center text-zinc-500 dark:text-zinc-400">
          <Loader2 className="size-5 animate-spin" />
          <span>正在理解你的意图...</span>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="py-8 text-center text-zinc-400 dark:text-zinc-500">
          <p>未找到相关书签</p>
          <p className="mt-1 text-sm">试试换个描述方式？</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          {truncated && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              书签数量较多，结果可能不完整。
            </p>
          )}
          {results.map((r, i) => (
            <div
              key={`${r.url}-${i}`}
              className="rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.title || r.url}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                  <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">{r.url}</p>
                  {r.path && (
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">📁 {r.path}</p>
                  )}
                </div>
                <Button
                  outline
                  className="shrink-0 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(r.url);
                    toast.success("链接已复制");
                  }}
                >
                  复制
                </Button>
              </div>
              {r.reason && (
                <button
                  type="button"
                  className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  onClick={() => toggleReason(i)}
                >
                  {expandedReasons.has(i) ? `💡 ${r.reason}` : "💡 查看匹配理由"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-200 pt-6 dark:border-white/10">
        <BookmarkSearchSettings defaultExpanded={!isConfigComplete} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 运行 `pnpm tsr generate` 生成路由树**

Run: `pnpm tsr generate`
Expected: `routeTree.gen.ts` 被更新，包含新的 `/bookmarks/` 路由

- [ ] **Step 3: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/options/routes/bookmarks/index.tsx src/options/routeTree.gen.ts
git commit -m "feat: 实现智能书签搜索页面"
```

---

### Task 9: 注册侧边栏导航

**Files:**
- Modify: `src/options/components/sidebar.tsx`

- [ ] **Step 1: 在侧边栏添加书签搜索菜单项**

在 `src/options/components/sidebar.tsx` 中，在 `posts` 菜单项之后、`about` 菜单项之前，添加新的菜单项：

在文件顶部的 import 中添加 `Bookmark` 图标（从 lucide-react）：

```typescript
import { Bookmark, GalleryVerticalEnd } from "lucide-react";
```

在 `SidebarMenu` 中 `posts` 和 `about` 之间插入：

```tsx
<SidebarMenuItem key="bookmarks">
  <SidebarMenuButton asChild isActive={activeRoute?.fullPath.startsWith("/bookmarks")}>
    <Link to="/bookmarks" className="font-medium">
      <Bookmark className="size-4" />
      智能书签
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 2: 运行 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/options/components/sidebar.tsx
git commit -m "feat: 在侧边栏注册智能书签搜索菜单项"
```

---

### Task 10: 手动冒烟测试

**Files:** 无新增

- [ ] **Step 1: 启动开发服务器（如未运行）**

Run: `pnpm dev`

- [ ] **Step 2: 冒烟测试清单**

在浏览器中加载扩展后，依次验证：

1. **侧边栏导航**：Options 页面侧边栏出现"智能书签"菜单项，点击跳转到 `/bookmarks`
2. **页面渲染**：搜索框、搜索按钮、模型配置区域正常渲染
3. **模型未配置**：模型配置区默认展开，显示首次使用引导卡片
4. **填写模型配置**：填写 API 类型、Base URL、Model ID、API Key，点击"测试连接"，验证 toast 提示
5. **保存配置**：点击"保存模型配置"，刷新页面后配置仍在
6. **搜索功能**：输入自然语言查询，回车或点击搜索按钮，验证 loading 状态和结果展示
7. **结果交互**：点击结果标题在新标签页打开、点击"复制"复制 URL、点击"查看匹配理由"展开/折叠
8. **搜索历史**：搜索后历史记录出现在搜索框下方，点击历史记录项可重新搜索
9. **空结果**：输入无关查询，验证"未找到相关书签"空状态
10. **其他页面回归**：设置页、文章页等现有功能不受影响

- [ ] **Step 3: 修复冒烟测试中发现的问题**

根据测试结果修复发现的 bug。

- [ ] **Step 4: 最终 verify**

Run: `pnpm verify`
Expected: PASS

- [ ] **Step 5: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: 修复智能书签搜索冒烟测试中发现的问题"
```
