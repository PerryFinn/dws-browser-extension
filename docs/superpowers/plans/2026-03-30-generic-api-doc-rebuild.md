# 通用 API 文档提取重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按重做 spec 重建 Generic 提取链路，使 `popup` 只做入口与展示，页面脚本负责点选与采集，背景提取基于 `storage session` 恢复状态并在本地强制覆盖 `source`。

**Architecture:** 新链路以 `GenericCaptureSession` 为唯一状态载体，把采集、提取、错误与结果恢复统一到 local storage。`content script` 在页面内完成点选和最小化清洗，`popup` 每次打开都从 session 恢复，`background` 只接受已清洗的 capture 并在本地回收模型输出。实现顺序按 `session -> sanitize -> provider -> popup -> content script -> cleanup` 递进，每一块先补测试，再做最小实现，再跑校验。

**Tech Stack:** TypeScript, React 18, Plasmo content scripts/messaging/storage, AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`), `node:test`, `linkedom`, Biome, `pnpm verify`, `pnpm build-zip`

---

## File Structure

- Modify: `package.json`
  责任：新增 `linkedom` 作为 DOM 摘要与采集清洗的轻量测试依赖。
- Modify: `pnpm-lock.yaml`
  责任：锁定新增依赖版本。
- Create: `src/generic-api-doc/session.ts`
  责任：定义 `GenericCaptureSession` 默认值、状态迁移、tab/url 绑定判断和结果回写 helper。
- Create: `src/generic-api-doc/session.test.ts`
  责任：验证 session 默认值、状态迁移、错误恢复与 tab/url 绑定逻辑。
- Create: `src/generic-api-doc/dom-summary.ts`
  责任：从目标 DOM 生成稳定的结构摘要，不暴露原始 HTML。
- Create: `src/generic-api-doc/dom-summary.test.ts`
  责任：验证标题、表格、代码块、列表等结构摘要输出。
- Create: `src/generic-api-doc/sanitize.ts`
  责任：把点选节点或选区转换成最小必要 capture，上游只输出 `visibleText / previewText / domSummary / pickedAt`。
- Create: `src/generic-api-doc/sanitize.test.ts`
  责任：验证隐藏文本、按钮噪声、`data-*` 和 `outerHTML` 不进入最终 capture。
- Create: `src/generic-api-doc/session-view.ts`
  责任：根据 session、当前 tab、模型配置派生 `popup` 视图状态与按钮可用性，避免 `panel.tsx` 继续膨胀。
- Create: `src/generic-api-doc/session-view.test.ts`
  责任：验证 `picking / picked / extracting / done / error / mismatch` 这些 UI 态推导。
- Modify: `src/generic-api-doc/types.ts`
  责任：补充 `GenericSanitizedCapture`、提取入参与结果相关共享类型。
- Modify: `src/storages/generic-api-doc.ts`
  责任：注册 `GENERIC_CAPTURE_SESSION_STORAGE_KEY` 以及 session 读写 helper 所需常量。
- Modify: `src/storages/index.ts`
  责任：把 Generic session 默认值放进 local storage 初始值。
- Modify: `src/background/generic-api-doc/provider.ts`
  责任：限制模型输出只产生 `endpoint / request / response / uncertainties`，本地覆盖 `source`。
- Modify: `src/background/generic-api-doc/provider.test.ts`
  责任：验证 provider 忽略模型返回的 `source`。
- Modify: `src/background/messages/genericExtractApiDoc.ts`
  责任：把消息输入改成 `sessionId + config`，由背景层读取 session、更新状态并保留失败 capture。
- Create: `src/background/messages/genericExtractApiDoc.test.ts`
  责任：验证 handler 的 session 读取、错误回写和成功回写。
- Modify: `src/popup/generic/panel.tsx`
  责任：改成 session 驱动 UI，允许“先采集后配置”，并在开始点选后主动让页面接管。
- Modify: `src/contents/generic-api-doc-picker.tsx`
  责任：使用 sanitizer 生成 capture，写入 session，并在页面内显示轻提示。
- Delete: `src/generic-api-doc/capture.ts`
  责任：移除旧的“trim + truncate”采集逻辑。
- Delete: `src/generic-api-doc/capture.test.ts`
  责任：移除不再匹配新设计的旧测试。
- Create: `.changeset/generic-api-doc-rebuild.md`
  责任：记录 Generic 用户路径与数据边界变更。
- Reference: `docs/superpowers/specs/2026-03-26-generic-api-doc-rebuild-design.md`
  责任：实现过程中持续对齐新 spec。

## Implementation Constraints

- Generic session 只能放在 local storage，不迁移到 sync storage。
- `source.url/title/mode` 必须始终来自本地采集，任何模型返回值都不能覆盖它。
- 送模内容不能包含原始 `outerHTML`。
- `popup` 必须允许用户在未配置模型时完成采集预览，模型配置只拦截“提取并生成”。
- `src/options/routeTree.gen.ts` 不手改。
- SWQA 现有链路不参与这次重做。
- 最终必须跑 `pnpm verify` 和 `pnpm build-zip`。

## Task 1: 建立 Generic session 与 storage 合同

**Files:**
- Create: `src/generic-api-doc/session.ts`
- Create: `src/generic-api-doc/session.test.ts`
- Modify: `src/storages/generic-api-doc.ts`
- Modify: `src/storages/index.ts`
- Reference: `docs/superpowers/specs/2026-03-26-generic-api-doc-rebuild-design.md`

- [ ] **Step 1: 先写 session 的失败测试**

在 `src/generic-api-doc/session.test.ts` 写下面这些用例：

```ts
import { strict as assert } from "node:assert";
import test from "node:test";

import {
  createEmptyGenericCaptureSession,
  canTransitionGenericCaptureSession,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionError,
  isGenericCaptureSessionBoundToTab
} from "./session";

test("createEmptyGenericCaptureSession 返回 idle 默认值", () => {
  const session = createEmptyGenericCaptureSession("session-1");
  assert.equal(session.sessionId, "session-1");
  assert.equal(session.status, "idle");
  assert.equal(session.source, null);
  assert.equal(session.capture, null);
  assert.equal(session.result, null);
  assert.equal(session.error, null);
});

test("只允许合法状态迁移", () => {
  assert.equal(canTransitionGenericCaptureSession("idle", "picking"), true);
  assert.equal(canTransitionGenericCaptureSession("picking", "done"), false);
  assert.equal(canTransitionGenericCaptureSession("error", "extracting"), true);
});

test("markGenericCaptureSessionPicked 会写入 source 与 capture 并清空 error", () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-2"), {
    source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: "headings: Users", pickedAt: 1 }
  });
  assert.equal(session.status, "picked");
  assert.equal(session.source?.url, "https://example.com");
  assert.equal(session.capture?.domSummary, "headings: Users");
  assert.equal(session.error, null);
});

test("markGenericCaptureSessionError 会保留已有 capture", () => {
  const base = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-3"), {
    source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });
  const session = markGenericCaptureSessionError(base, "provider timeout");
  assert.equal(session.status, "error");
  assert.equal(session.capture?.visibleText, "GET /users");
  assert.equal(session.error, "provider timeout");
});

test("isGenericCaptureSessionBoundToTab 会校验 tabId 与 url", () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-4"), {
    source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });
  assert.equal(isGenericCaptureSessionBoundToTab(session, { id: 9, url: "https://example.com/users" }), true);
  assert.equal(isGenericCaptureSessionBoundToTab(session, { id: 10, url: "https://example.com/users" }), false);
});
```

- [ ] **Step 2: 运行测试确认当前失败**

Run: `node --import tsx --test src/generic-api-doc/session.test.ts`
Expected: FAIL，错误应集中在 `./session` 尚未实现或导出缺失。

- [ ] **Step 3: 实现 session 模块**

在 `src/generic-api-doc/session.ts` 写出最小实现：

```ts
export type GenericCaptureSessionStatus = "idle" | "picking" | "picked" | "extracting" | "done" | "error";

export interface GenericCaptureSessionSource {
  tabId: number;
  url: string;
  title: string;
  mode: "generic-dom" | "generic-selection";
}

export interface GenericSanitizedCapture {
  visibleText: string;
  previewText: string;
  domSummary: string | null;
  pickedAt: number;
}

export interface GenericCaptureSession {
  sessionId: string;
  status: GenericCaptureSessionStatus;
  source: GenericCaptureSessionSource | null;
  capture: GenericSanitizedCapture | null;
  result: GenericExtractionResult | null;
  error: string | null;
}

const ALLOWED_TRANSITIONS: Record<GenericCaptureSessionStatus, GenericCaptureSessionStatus[]> = {
  idle: ["picking"],
  picking: ["idle", "picked", "error"],
  picked: ["extracting", "idle"],
  extracting: ["done", "error", "idle"],
  done: ["picking", "extracting", "idle"],
  error: ["picking", "extracting", "idle"]
};

export const createEmptyGenericCaptureSession = (sessionId = crypto.randomUUID()): GenericCaptureSession => ({
  sessionId,
  status: "idle",
  source: null,
  capture: null,
  result: null,
  error: null
});

export const canTransitionGenericCaptureSession = (
  from: GenericCaptureSessionStatus,
  to: GenericCaptureSessionStatus
): boolean => ALLOWED_TRANSITIONS[from].includes(to);
```

并继续实现：
- `markGenericCaptureSessionPicking`
- `markGenericCaptureSessionPicked`
- `markGenericCaptureSessionExtracting`
- `markGenericCaptureSessionDone`
- `markGenericCaptureSessionError`
- `resetGenericCaptureSession`
- `isGenericCaptureSessionBoundToTab`

要求：
- 进入 `picked` 时清空 `result` 与 `error`
- 进入 `error` 时保留最近一次 `capture`
- 进入 `done` 时保留 `capture`

- [ ] **Step 4: 注册 Generic session storage key**

在 `src/storages/generic-api-doc.ts` 增加：

```ts
export const GENERIC_CAPTURE_SESSION_STORAGE_KEY = "genericApiDocCaptureSession";
```

在 `src/storages/index.ts` 的 `localStorageInitialValue` 里注册：

```ts
[GENERIC_CAPTURE_SESSION_STORAGE_KEY]: {
  defaultValue: createEmptyGenericCaptureSession("default-generic-session")
},
```

要求：
- session 默认值使用 `createEmptyGenericCaptureSession`
- 不把 session 放进 `syncStorage`

- [ ] **Step 5: 重新跑测试与类型检查**

Run: `node --import tsx --test src/generic-api-doc/session.test.ts`
Expected: PASS，5 个用例全部通过。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0。

- [ ] **Step 6: Commit**

```bash
git add src/generic-api-doc/session.ts src/generic-api-doc/session.test.ts src/storages/generic-api-doc.ts src/storages/index.ts
git commit -m "feat: add generic capture session state"
```

## Task 2: 实现 DOM 摘要与最小化采集清洗

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/generic-api-doc/dom-summary.ts`
- Create: `src/generic-api-doc/dom-summary.test.ts`
- Create: `src/generic-api-doc/sanitize.ts`
- Create: `src/generic-api-doc/sanitize.test.ts`
- Modify: `src/generic-api-doc/types.ts`

- [ ] **Step 1: 安装 `linkedom` 供 DOM 单测使用**

Run: `pnpm add -D linkedom`
Expected: `package.json` 与 `pnpm-lock.yaml` 更新成功，无安装报错。

- [ ] **Step 2: 先写 `dom-summary` 与 `sanitize` 的失败测试**

在 `src/generic-api-doc/dom-summary.test.ts` 中写：

```ts
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseHTML } from "linkedom";

import { buildGenericDomSummary } from "./dom-summary";

test("buildGenericDomSummary 保留标题、表格与代码块信息", () => {
  const { document } = parseHTML(`
    <section>
      <h2>获取用户详情</h2>
      <table>
        <thead><tr><th>参数</th><th>类型</th></tr></thead>
        <tbody><tr><td>id</td><td>string</td></tr></tbody>
      </table>
      <pre><code>{ "id": "1" }</code></pre>
    </section>
  `);
  const summary = buildGenericDomSummary(document.querySelector("section") as HTMLElement);
  assert.match(summary ?? "", /headings: 获取用户详情/);
  assert.match(summary ?? "", /tables: 参数, 类型/);
  assert.match(summary ?? "", /codeBlocks: 1/);
});
```

在 `src/generic-api-doc/sanitize.test.ts` 中写：

```ts
import { strict as assert } from "node:assert";
import test from "node:test";
import { parseHTML } from "linkedom";

import { sanitizePickedElement } from "./sanitize";

test("sanitizePickedElement 过滤按钮文案、隐藏文本和 data 属性噪声", () => {
  const { document } = parseHTML(`
    <section data-secret="abc">
      <h2>获取用户详情</h2>
      <button>复制代码</button>
      <div hidden>隐藏调试信息</div>
      <p>请求路径：/api/user/detail</p>
    </section>
  `);
  const result = sanitizePickedElement({
    element: document.querySelector("section") as HTMLElement,
    url: "https://example.com/users",
    title: "Users"
  });

  assert.match(result.capture.visibleText, /请求路径：\/api\/user\/detail/);
  assert.doesNotMatch(result.capture.visibleText, /复制代码/);
  assert.doesNotMatch(result.capture.visibleText, /隐藏调试信息/);
  assert.doesNotMatch(result.capture.domSummary ?? "", /data-secret/);
});

test("sanitizeSelectionText 为选区模式生成无 DOM 摘要的最小 capture", () => {
  const result = sanitizeSelectionText({
    text: "  请求方法：GET\n请求路径：/api/user/detail  ",
    url: "https://example.com/users",
    title: "Users"
  });

  assert.equal(result.source.mode, "generic-selection");
  assert.equal(result.capture.visibleText, "请求方法：GET\n请求路径：/api/user/detail");
  assert.equal(result.capture.domSummary, null);
});
```

- [ ] **Step 3: 运行测试确认当前失败**

Run: `node --import tsx --test src/generic-api-doc/dom-summary.test.ts src/generic-api-doc/sanitize.test.ts`
Expected: FAIL，错误应来自 `buildGenericDomSummary` 和 `sanitizePickedElement` 尚未实现。

- [ ] **Step 4: 在共享类型里定义 sanitized capture**

在 `src/generic-api-doc/types.ts` 加入：

```ts
export interface GenericSanitizedCapture {
  visibleText: string;
  previewText: string;
  domSummary: string | null;
  pickedAt: number;
}
```

要求：
- `source` 继续复用现有 Generic source 类型
- 不把原始 HTML 放入共享 capture 类型

- [ ] **Step 5: 实现 `dom-summary` 与 `sanitize`**

在 `src/generic-api-doc/dom-summary.ts` 写：

```ts
const collectHeadingTexts = (root: HTMLElement): string[] => {
  return Array.from(root.querySelectorAll("h1, h2, h3")).map((node) => node.textContent?.trim() ?? "").filter(Boolean);
};

const collectTableHeaders = (root: HTMLElement): string[] => {
  return Array.from(root.querySelectorAll("table")).flatMap((table) =>
    Array.from(table.querySelectorAll("th")).map((th) => th.textContent?.trim() ?? "").filter(Boolean)
  );
};

export const buildGenericDomSummary = (root: HTMLElement): string | null => {
  const headings = collectHeadingTexts(root);
  const tableHeaders = collectTableHeaders(root);
  const codeBlocks = root.querySelectorAll("pre code, code").length;
  const parts = [
    headings.length ? `headings: ${headings.join(" | ")}` : "",
    tableHeaders.length ? `tables: ${tableHeaders.join(", ")}` : "",
    codeBlocks ? `codeBlocks: ${codeBlocks}` : ""
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
};
```

在 `src/generic-api-doc/sanitize.ts` 写：

```ts
const NOISE_TEXTS = ["复制", "复制代码", "展开", "收起"];

const normalizeVisibleText = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !NOISE_TEXTS.includes(line))
    .join("\n");

export const sanitizePickedElement = ({
  element,
  url,
  title
}: {
  element: HTMLElement;
  url: string;
  title: string;
}) => {
  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.querySelectorAll("[hidden], script, style, noscript, template").forEach((node) => node.remove());
  const visibleText = normalizeVisibleText(clonedElement.innerText || clonedElement.textContent || "");
  if (!visibleText) {
    throw new Error("未从目标区域读取到有效文本");
  }
  return {
    source: { url, title, mode: "generic-dom" as const },
    capture: {
      visibleText,
      previewText: visibleText.replace(/\s+/g, " ").slice(0, 240),
      domSummary: buildGenericDomSummary(clonedElement),
      pickedAt: Date.now()
    }
  };
};

export const sanitizeSelectionText = ({
  text,
  url,
  title
}: {
  text: string;
  url: string;
  title: string;
}) => {
  const visibleText = normalizeVisibleText(text);
  if (!visibleText) {
    throw new Error("当前页面没有可用的选中文本");
  }
  return {
    source: { url, title, mode: "generic-selection" as const },
    capture: {
      visibleText,
      previewText: visibleText.replace(/\s+/g, " ").slice(0, 240),
      domSummary: null,
      pickedAt: Date.now()
    }
  };
};
```

要求：
- 复制一份节点再删噪，避免直接破坏页面原 DOM
- `previewText` 截断到 240 个字符
- `domSummary` 只走结构摘要，不拼 HTML

- [ ] **Step 6: 运行测试确认通过**

Run: `node --import tsx --test src/generic-api-doc/dom-summary.test.ts src/generic-api-doc/sanitize.test.ts`
Expected: PASS，所有结构摘要和清洗断言通过。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/generic-api-doc/types.ts src/generic-api-doc/dom-summary.ts src/generic-api-doc/dom-summary.test.ts src/generic-api-doc/sanitize.ts src/generic-api-doc/sanitize.test.ts
git commit -m "feat: add generic capture sanitization"
```

## Task 3: 收紧 provider 边界并改造背景提取消息

**Files:**
- Modify: `src/background/generic-api-doc/provider.ts`
- Modify: `src/background/generic-api-doc/provider.test.ts`
- Modify: `src/background/messages/genericExtractApiDoc.ts`
- Create: `src/background/messages/genericExtractApiDoc.test.ts`
- Modify: `src/generic-api-doc/types.ts`
- Modify: `src/generic-api-doc/session.ts`

- [ ] **Step 1: 先写 provider 与消息 handler 的失败测试**

在 `src/background/generic-api-doc/provider.test.ts` 新增：

```ts
test("extractGenericApiDoc 会忽略模型返回的 source 并使用本地 source", async () => {
  const { dependencies } = createDependencies();
  dependencies.generateObject = async () => ({
    object: {
      source: { url: "https://wrong.example.com", title: "Wrong", mode: "generic-selection" },
      endpoint: { name: "获取用户详情", path: "/api/user/detail", method: "GET" },
      request: { pathParams: [], queryParams: [], headers: [], body: null, auth: null },
      response: { successBody: null, errorNotes: null },
      uncertainties: []
    }
  });

  const result = await extractGenericApiDoc(createConfig("openai-compatible"), {
    source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /api/user/detail", previewText: "GET /api/user/detail", domSummary: null, pickedAt: 1 }
  }, dependencies);

  assert.equal(result.source.url, "https://example.com/users");
  assert.equal(result.source.mode, "generic-dom");
});
```

在 `src/background/messages/genericExtractApiDoc.test.ts` 写：

```ts
import { strict as assert } from "node:assert";
import test from "node:test";

import { executeGenericExtractApiDoc } from "./genericExtractApiDoc";

test("executeGenericExtractApiDoc 提取失败时保留 capture 并回写 error", async () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-1"), {
    source: { tabId: 1, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });

  const states: string[] = [];
  const result = await executeGenericExtractApiDoc({
    session,
    config: { apiType: "openai-compatible", baseUrl: "https://example.com/v1", modelId: "gpt-test", apiKey: "sk-test" },
    onSessionUpdate(next) {
      states.push(next.status);
    },
    extract() {
      throw new Error("provider timeout");
    }
  });

  assert.equal(result.success, false);
  assert.deepEqual(states, ["extracting", "error"]);
});
```

- [ ] **Step 2: 运行测试确认当前失败**

Run: `node --import tsx --test src/background/generic-api-doc/provider.test.ts src/background/messages/genericExtractApiDoc.test.ts`
Expected: FAIL，错误应集中在函数签名、`sessionId` 入参和本地 `source` 覆盖逻辑尚未实现。

- [ ] **Step 3: 改造 provider 入参与回收逻辑**

把 `src/background/generic-api-doc/provider.ts` 的正式提取入参改成：

```ts
export interface GenericExtractFromSessionInput {
  source: GenericExtractionSource;
  capture: GenericSanitizedCapture;
}

export const extractGenericApiDoc = async (
  config: GenericModelConfig,
  input: GenericExtractFromSessionInput,
  dependencies: GenericProviderDependencies = defaultDependencies
): Promise<GenericExtractionResult> => {
  const model = createGenericModel(config, dependencies);
  const result = await dependencies.generateObject({
    model,
    output: "object",
    schema: genericExtractionSchemaWithoutSource,
    schemaName: "generic_api_doc_extraction",
    prompt: buildGenericExtractionPrompt(input)
  });

  const normalized = normalizeGenericExtractionResult({
    source: input.source,
    ...result.object
  });

  return {
    ...normalized,
    source: input.source
  };
};
```

要求：
- 新 schema 去掉 `source`
- `buildGenericExtractionPrompt` 继续展示本地 `source`
- 最终 `normalize` 前和 `normalize` 后都以本地 `source` 为准

- [ ] **Step 4: 把消息 handler 改成基于 session 提取**

把 `src/background/messages/genericExtractApiDoc.ts` 的消息体改成：

```ts
export type GenericExtractApiDocReqBody = {
  sessionId: string;
  config: GenericModelConfig;
};
```

并导出一个纯执行函数供测试：

```ts
export const executeGenericExtractApiDoc = async ({
  session,
  config,
  onSessionUpdate,
  extract
}: {
  session: GenericCaptureSession;
  config: GenericModelConfig;
  onSessionUpdate: (next: GenericCaptureSession) => void | Promise<void>;
  extract: typeof extractGenericApiDoc;
}) => { ... };
```

核心流程改成：

```ts
const session = await storage.get<GenericCaptureSession>(GENERIC_CAPTURE_SESSION_STORAGE_KEY);
if (!session || session.sessionId !== req.body.sessionId || !session.capture || !session.source) {
  res.send({ success: false, message: "缺少可用的采集结果" });
  return;
}

await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, markGenericCaptureSessionExtracting(session));

try {
  const data = await extractGenericApiDoc(req.body.config, { source: session.source, capture: session.capture });
  await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, markGenericCaptureSessionDone(session, data));
  res.send({ success: true, data });
} catch (error) {
  await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, markGenericCaptureSessionError(session, String(error)));
  res.send({ success: false, message: error instanceof Error ? error.message : String(error) });
}
```

要求：
- `extracting` 失败时保留 `capture`
- `success` 时回写 `done`
- 不再从 `popup` 直接接收整份 capture context

- [ ] **Step 5: 运行测试与类型检查**

Run: `node --import tsx --test src/background/generic-api-doc/provider.test.ts src/background/messages/genericExtractApiDoc.test.ts`
Expected: PASS，provider 使用本地 `source`，handler 成功/失败路径可运行。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0。

- [ ] **Step 6: Commit**

```bash
git add src/background/generic-api-doc/provider.ts src/background/generic-api-doc/provider.test.ts src/background/messages/genericExtractApiDoc.ts src/background/messages/genericExtractApiDoc.test.ts src/generic-api-doc/types.ts src/generic-api-doc/session.ts
git commit -m "feat: move generic extraction to session flow"
```

## Task 4: 把 `popup` 改成 session 驱动并允许先采集后配置

**Files:**
- Create: `src/generic-api-doc/session-view.ts`
- Create: `src/generic-api-doc/session-view.test.ts`
- Modify: `src/popup/generic/panel.tsx`
- Modify: `src/storages/generic-api-doc.ts`

- [ ] **Step 1: 先写 view-model 的失败测试**

在 `src/generic-api-doc/session-view.test.ts` 中写：

```ts
import { strict as assert } from "node:assert";
import test from "node:test";

import { deriveGenericPanelState } from "./session-view";
import { createEmptyGenericCaptureSession, markGenericCaptureSessionPicked } from "./session";

test("未配置模型时仍允许开始点选和读取选区", () => {
  const state = deriveGenericPanelState({
    session: createEmptyGenericCaptureSession("session-1"),
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: false
  });
  assert.equal(state.disableCaptureActions, false);
  assert.equal(state.disableExtract, true);
});

test("picked 状态使用 session 里的 previewText", () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-2"), {
    source: { tabId: 1, url: "https://example.com", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: "headings: Users", pickedAt: 1 }
  });
  const state = deriveGenericPanelState({
    session,
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: true
  });
  assert.equal(state.previewText, "GET /users");
  assert.equal(state.disableExtract, false);
});

test("当前 tab 与 session 不一致时显示 mismatch 提示", () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-3"), {
    source: { tabId: 1, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });
  const state = deriveGenericPanelState({
    session,
    tab: { id: 2, url: "https://example.com/orders" } as chrome.tabs.Tab,
    isConfigComplete: true
  });
  assert.equal(state.isTabMismatch, true);
});
```

- [ ] **Step 2: 运行测试确认当前失败**

Run: `node --import tsx --test src/generic-api-doc/session-view.test.ts`
Expected: FAIL，错误应来自 `deriveGenericPanelState` 尚未实现。

- [ ] **Step 3: 实现 `session-view` 并重构 `popup`**

在 `src/generic-api-doc/session-view.ts` 写：

```ts
export const deriveGenericPanelState = ({
  session,
  tab,
  isConfigComplete
}: {
  session: GenericCaptureSession;
  tab: chrome.tabs.Tab | null;
  isConfigComplete: boolean;
}) => {
  const isTabMismatch = !!session.source && (!!tab?.id && (tab.id !== session.source.tabId || tab.url !== session.source.url));

  return {
    isTabMismatch,
    previewText: session.capture?.previewText ?? "",
    disableCaptureActions: session.status === "picking" || session.status === "extracting",
    disableExtract: !session.capture || !isConfigComplete || isTabMismatch || session.status === "extracting",
    canStartCaptureWithoutConfig: true
  };
};
```

然后修改 `src/popup/generic/panel.tsx`：

```ts
const [session, setSession] = useStorage<GenericCaptureSession>(
  { key: GENERIC_CAPTURE_SESSION_STORAGE_KEY, instance: storage },
  createEmptyGenericCaptureSession("default-generic-session")
);

const viewState = useMemo(
  () => deriveGenericPanelState({ session, tab, isConfigComplete }),
  [session, tab, isConfigComplete]
);
```

开始点选时：

```ts
const nextSession = markGenericCaptureSessionPicking(session, {
  tabId: tab.id,
  url: tab.url ?? "",
  title: tab.title ?? "当前页面"
});
await setSession(nextSession);
await chrome.tabs.sendMessage(tab.id, { type: "generic-picker:start", sessionId: nextSession.sessionId });
window.close();
```

要求：
- 取消 `ensureReadyToCapture` 对模型配置的拦截
- `handleExtract` 改成发送 `{ sessionId, config }`
- 当 `isTabMismatch` 为真时，显示显式警告和 `清空并重新采集`

- [ ] **Step 4: 运行 view-model 测试与类型检查**

Run: `node --import tsx --test src/generic-api-doc/session-view.test.ts`
Expected: PASS，3 个场景全部通过。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0。

- [ ] **Step 5: Commit**

```bash
git add src/generic-api-doc/session-view.ts src/generic-api-doc/session-view.test.ts src/popup/generic/panel.tsx src/storages/generic-api-doc.ts
git commit -m "feat: drive generic popup from session state"
```

## Task 5: 重写页面 picker、删除旧 capture 逻辑并完成验证

**Files:**
- Modify: `src/contents/generic-api-doc-picker.tsx`
- Delete: `src/generic-api-doc/capture.ts`
- Delete: `src/generic-api-doc/capture.test.ts`
- Create: `.changeset/generic-api-doc-rebuild.md`
- Reference: `docs/superpowers/specs/2026-03-26-generic-api-doc-rebuild-design.md`

- [ ] **Step 1: 先记录当前失败的手动路径**

手动记录以下失败基线，写进本地笔记或 PR 描述草稿：

1. 未配置模型时，当前实现无法继续验证点选链路。
2. 点击“开始点选”后，`popup` 生命周期会中断页面交互。
3. 当前 Generic 结果会直接使用模型回填的 `source`。

Expected: 有一份清晰的“重做前表现”列表，便于后面对照 smoke。

- [ ] **Step 2: 改写内容脚本，接管页面点选并写入 session**

把 `src/contents/generic-api-doc-picker.tsx` 的消息处理改成基于 `sessionId`：

```ts
if (message.type === "generic-picker:start") {
  activeSessionId = message.sessionId;
  void startDomPicker().then(async ({ source, capture }) => {
    const current = await storage.get<GenericCaptureSession>(GENERIC_CAPTURE_SESSION_STORAGE_KEY);
    if (!current || current.sessionId !== activeSessionId) return;
    await storage.set(
      GENERIC_CAPTURE_SESSION_STORAGE_KEY,
      markGenericCaptureSessionPicked(current, {
        source: { ...source, tabId: sender.tab?.id ?? current.source?.tabId ?? -1 },
        capture
      })
    );
    showGenericPageToast("已采集接口文档片段，请重新打开插件继续提取");
  });
  sendResponse({ success: true });
  return true;
}
```

读取选区时改成：

```ts
const { source, capture } = sanitizeSelectionText({
  text: window.getSelection()?.toString() ?? "",
  url: window.location.href,
  title: document.title
});
```

要求：
- 页面内轻提示必须可自动消失
- 失败时写 `error`，但不覆盖旧 `capture`
- 文件头注释说明为什么这里不能依赖 `popup` 生命周期

- [ ] **Step 3: 删除旧 capture 逻辑并新增 changeset**

删除：

```bash
rm src/generic-api-doc/capture.ts
rm src/generic-api-doc/capture.test.ts
```

新增 `.changeset/generic-api-doc-rebuild.md`：

```md
---
"efficiency-assistant-extension": patch
---

重做通用 API 文档提取流程，改为 popup 发起、页面接管、session 恢复的状态模型。

收紧 Generic 数据边界：采集阶段增加最小化清洗与结构摘要，送模内容不再包含原始 outerHTML，结果中的 source 始终使用本地采集值。
```

- [ ] **Step 4: 跑全量验证**

Run: `node --import tsx --test src/generic-api-doc/session.test.ts src/generic-api-doc/dom-summary.test.ts src/generic-api-doc/sanitize.test.ts src/background/generic-api-doc/provider.test.ts src/background/messages/genericExtractApiDoc.test.ts src/generic-api-doc/session-view.test.ts`
Expected: PASS，新增与改造后的 Generic 测试全部通过。

Run: `pnpm verify`
Expected: `biome check --write .` 与 `tsc --noEmit` 全部通过。

Run: `pnpm build-zip`
Expected: 打包成功，`build/` 下生成新的 zip 产物。

- [ ] **Step 5: 手动 smoke 验证**

按下面顺序验证：

1. 打开普通网页，保持模型配置为空，打开 `popup`
2. 点击“开始点选”，确认 `popup` 关闭，页面可见高亮与轻提示
3. 点选一个接口文档节点，重新打开 `popup`，确认出现采集预览
4. 补全模型配置，点击“提取并生成”，确认结果页展示 JSON、Prompt 和不确定项
5. 人为制造模型失败，确认再次打开 `popup` 仍可直接重试，无需重新点选
6. 切换到另一标签页重新打开 `popup`，确认显示 mismatch 提示

Expected: 六个场景全部符合 spec。

- [ ] **Step 6: Commit**

```bash
git add src/contents/generic-api-doc-picker.tsx .changeset/generic-api-doc-rebuild.md docs/superpowers/specs/2026-03-26-generic-api-doc-rebuild-design.md docs/superpowers/plans/2026-03-30-generic-api-doc-rebuild.md
git add -u src/generic-api-doc/capture.ts src/generic-api-doc/capture.test.ts
git commit -m "feat: rebuild generic api doc capture flow"
```
