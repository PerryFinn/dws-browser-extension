# Tailwind CSS v4 与依赖升级兼容性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复当前依赖升级暴露的兼容问题，将项目从 Tailwind CSS v3 迁移到 v4，并在完整验证后提交、推送 `develop`。

**Architecture:** 保留 WXT + Vite 现有构建结构，使用 `@tailwindcss/vite` 接入 Tailwind CSS v4；主题、插件和 dark variant 迁移为 CSS-first 配置。AI SDK 7 改用 `generateText` + `Output.object`，Shadow DOM 样式通过 WXT 官方 `splitShadowRootCss` 分离文档级规则与阴影根规则。

**Tech Stack:** WXT 0.20, Vite 8, React 19, TypeScript 7, Tailwind CSS 4, daisyUI 5, AI SDK 7, Biome 2.5, Vitest 4

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/background/generic-api-doc/provider.ts` | 迁移 AI SDK 7 结构化输出 API |
| `tests/background/generic-api-doc/provider.test.ts` | 验证 `Output.object` schema/name 与返回值处理 |
| `biome.jsonc` | 迁移 Biome 2.5 recommended preset |
| `package.json` / `pnpm-lock.yaml` | 固化依赖升级，移除冗余类型与旧 Tailwind 构建依赖 |
| `src/wxt/content-shadow-ui.tsx` | 拆分 Shadow DOM 与 document 级 CSS |
| `tests/wxt/content-shadow-ui.test.tsx` | 验证 `@property` 注入和卸载清理 |
| `wxt.config.ts` | 注册 `@tailwindcss/vite` 插件 |
| `src/style.css` | Tailwind v4 CSS-first 主题、插件和基础样式 |
| `src/global.d.ts` | 删除 daisyUI 旧版类型补丁 |
| `tailwind.config.ts` | 删除，配置迁入 CSS |
| `postcss.config.js` | 删除，Vite 插件接管 Tailwind 构建 |
| `src/**/*.tsx` | 迁移 Tailwind v4 不兼容候选类语法 |

---

### Task 1: 修复现有依赖升级的兼容问题

**Files:**
- Modify: `tests/background/generic-api-doc/provider.test.ts`
- Modify: `src/background/generic-api-doc/provider.ts`
- Modify: `biome.jsonc`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: 先把 provider 测试切换到 AI SDK 7 接口**

将测试依赖从 `generateObject` 改为 `generateText`，mock 返回值从 `{ object }` 改为 `{ output }`。同时从传入的 `Output.object(...)` 读取异步 `responseFormat`，验证 schema name 与 JSON Schema：

```typescript
const generateText = vi.fn(async () => ({
  output: {
    openapi: "3.0.0",
    info: { title: "Demo", version: "1.0.0" },
    paths: {}
  }
}));

const dependencies = {
  createOpenAICompatible: vi.fn(() => vi.fn(() => ({ provider: "test-model" }))),
  generateText
};

const request = generateText.mock.calls[0][0];
const responseFormat = await request.output.responseFormat;
expect(responseFormat.name).toBe("generic_api_doc_extraction");
expect(responseFormat.schema).toMatchObject({
  type: "object",
  required: ["openapi", "info", "paths"]
});
```

连接测试使用 `generic_api_doc_connectivity`，文档抽取使用 `generic_api_doc_extraction`。保留现有 prompt、错误映射与返回内容断言。

- [ ] **Step 2: 运行目标测试，确认旧实现不能满足新契约**

Run: `rtk pnpm test -- tests/background/generic-api-doc/provider.test.ts`

Expected: FAIL，错误指向 `generateObject`/`generateText` 依赖接口或 `object`/`output` 返回值不匹配。

- [ ] **Step 3: 迁移 provider 到 `generateText` + `Output.object`**

核心实现改为：

```typescript
import { generateText, jsonSchema, Output } from "ai";

interface GenericProviderDependencies {
  createOpenAICompatible: typeof createOpenAICompatible;
  generateText: (options: {
    model: GenericLanguageModel;
    output: unknown;
    prompt: string;
  }) => Promise<{ output: unknown }>;
}

const defaultDependencies: GenericProviderDependencies = {
  createOpenAICompatible,
  generateText: generateText as unknown as GenericProviderDependencies["generateText"]
};

const result = await dependencies.generateText({
  model,
  output: Output.object({
    schema: jsonSchema(connectivitySchema),
    name: "generic_api_doc_connectivity"
  }),
  prompt: connectivityPrompt
});

const response = result.output as GenericApiDocConnectivityResponse;
```

文档抽取路径同样使用 `Output.object`，schema name 为 `generic_api_doc_extraction`，并从 `result.output` 读取结果。

- [ ] **Step 4: 迁移 Biome 2.5 配置并移除冗余类型包**

将 `biome.jsonc` 中：

```jsonc
"recommended": true
```

替换为：

```jsonc
"preset": "recommended"
```

然后执行：

Run: `rtk pnpm remove -D @types/adm-zip`

Expected: `package.json` 不再包含 `@types/adm-zip`，`adm-zip@0.6` 自带的 `types.d.ts` 继续满足类型检查。

- [ ] **Step 5: 验证兼容修复**

Run: `rtk pnpm test -- tests/background/generic-api-doc/provider.test.ts`

Expected: PASS。

Run: `rtk pnpm lint && rtk pnpm check:types`

Expected: PASS，Biome 不再出现 `linter.rules.recommended` 弃用警告。

- [ ] **Step 6: 提交当前依赖升级与兼容修复**

```bash
rtk git add package.json pnpm-lock.yaml biome.jsonc \
  src/background/generic-api-doc/provider.ts \
  tests/background/generic-api-doc/provider.test.ts
rtk git commit -m "fix: 修复依赖升级后的兼容问题"
```

---

### Task 2: 为 Tailwind v4 的 Shadow DOM 文档级规则补充回归测试

**Files:**
- Create: `tests/wxt/content-shadow-ui.test.tsx`
- Modify: `src/wxt/content-shadow-ui.tsx`

- [ ] **Step 1: 编写失败测试**

使用 `linkedom` 创建 DOM，并 mock `react-dom/client`。测试传入同时含 `:root`、`@property` 和普通 utility 的 CSS：

```typescript
import { parseHTML } from "linkedom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountContentShadowUi } from "@/wxt/content-shadow-ui";

const rootMocks = vi.hoisted(() => ({
  render: vi.fn(),
  unmount: vi.fn()
}));

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => rootMocks)
}));

describe("mountContentShadowUi", () => {
  beforeEach(() => {
    const { window, document } = parseHTML("<html><head></head><body><main id='anchor'></main></body></html>");
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", document);
    vi.stubGlobal("MutationObserver", window.MutationObserver);
    rootMocks.render.mockClear();
    rootMocks.unmount.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("将 document 级规则与 shadow 样式分离并在卸载时清理", async () => {
    const ui = await mountContentShadowUi({
      anchorSelector: "#anchor",
      hostId: "test-shadow-ui",
      cssText: ":root{--color:red}@property --tw-test{syntax:'*';inherits:false}.block{display:block}",
      render: () => null
    });

    const host = document.querySelector("#test-shadow-ui");
    const shadowCss = host?.shadowRoot?.querySelector("style")?.textContent ?? "";
    const documentStyle = document.querySelector("style[data-breeze-shadow-root-document-styles='test-shadow-ui']");

    expect(shadowCss).toContain(":host");
    expect(shadowCss).toContain(".block");
    expect(shadowCss).not.toContain("@property");
    expect(documentStyle?.textContent).toContain("@property --tw-test");

    ui.unmount();
    expect(document.querySelector("#test-shadow-ui")).toBeNull();
    expect(documentStyle?.isConnected).toBe(false);
    expect(rootMocks.unmount).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行新测试并确认失败**

Run: `rtk pnpm test -- tests/wxt/content-shadow-ui.test.tsx`

Expected: FAIL，当前实现仍把 `@property` 放入 Shadow Root，也不会创建 document style。

- [ ] **Step 3: 使用 WXT 官方工具拆分 CSS**

在 `src/wxt/content-shadow-ui.tsx` 中引入：

```typescript
import { splitShadowRootCss } from "wxt/utils/split-shadow-root-css";
```

挂载逻辑改为：

```typescript
const { documentCss, shadowCss } = splitShadowRootCss(cssText.replaceAll(":root", ":host"));

const style = document.createElement("style");
style.textContent = shadowCss;

let documentStyle: HTMLStyleElement | null = null;
if (documentCss) {
  documentStyle = document.createElement("style");
  documentStyle.textContent = documentCss;
  documentStyle.setAttribute("data-breeze-shadow-root-document-styles", hostId);
  (document.head ?? document.body).append(documentStyle);
}
```

卸载时依次卸载 React、删除 document style、删除 host：

```typescript
unmount() {
  root.unmount();
  documentStyle?.remove();
  host.remove();
}
```

- [ ] **Step 4: 验证并提交 Shadow DOM 修复**

Run: `rtk pnpm test -- tests/wxt/content-shadow-ui.test.tsx`

Expected: PASS。

Run: `rtk pnpm check:types`

Expected: PASS。

```bash
rtk git add src/wxt/content-shadow-ui.tsx tests/wxt/content-shadow-ui.test.tsx
rtk git commit -m "fix: 兼容 Shadow DOM 文档级样式"
```

---

### Task 3: 运行官方升级器并切换到 Tailwind CSS v4 构建链路

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `wxt.config.ts`
- Modify: `src/style.css`
- Modify: `src/global.d.ts`
- Delete: `tailwind.config.ts`
- Delete: `postcss.config.js`
- Modify: Tailwind 升级器识别到的 `src/**/*.tsx`

- [ ] **Step 1: 暂时从 v3 配置移除第三方插件并运行官方升级器**

先在 `tailwind.config.ts` 中暂时把 `plugins` 改为空数组，避免升级器加载 daisyUI/tailwindcss-animate 时产生非核心迁移噪声。然后运行：

Run: `rtk pnpm dlx @tailwindcss/upgrade@4.3.2 -c tailwind.config.ts --force`

Expected: 升级器迁移模板候选类、把 Tailwind 升到 v4，并生成可继续手工整理的 CSS 迁移结果。

- [ ] **Step 2: 固化 v4 依赖并移除旧 PostCSS 链路**

```bash
rtk pnpm add -D tailwindcss@^4.3.2 @tailwindcss/vite@^4.3.2
rtk pnpm add tailwind-merge@^3.6.0
rtk pnpm remove -D postcss autoprefixer
```

Expected:

- `tailwindcss` 与 `@tailwindcss/vite` 为 `^4.3.2`
- `tailwind-merge` 为 `^3.6.0`
- 直接依赖中不再有 `postcss`、`autoprefixer`
- daisyUI 5 与 `tailwindcss-animate` 保留

- [ ] **Step 3: 在 WXT 的 Vite 配置中注册 Tailwind 插件**

`wxt.config.ts` 增加：

```typescript
import tailwindcss from "@tailwindcss/vite";
```

并在现有 `vite` 返回对象中加入：

```typescript
plugins: [tailwindcss()],
```

保留现有 aliases、`optimizeDeps` 与其他 WXT 配置。

- [ ] **Step 4: 将主题和插件迁移到 CSS-first 配置**

`src/style.css` 顶部构建入口使用：

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap");
@import "tailwindcss";
@plugin "daisyui";
@plugin "tailwindcss-animate";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-sidebar: hsl(var(--sidebar-background));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
  --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-ring: hsl(var(--sidebar-ring));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --font-sans: "Inter", sans-serif;
}

@utility container {
  margin-inline: auto;
  padding-inline: 2rem;

  @media (width >= 96rem) {
    max-width: 1400px;
  }
}
```

保留现有 `:root`/`.dark` CSS 变量和 `.code` 组件样式；基础边框兼容 v3 行为：

```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    @apply border-border;
  }

  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: 删除旧配置与旧类型补丁**

删除 `tailwind.config.ts` 与 `postcss.config.js`。从 `src/global.d.ts` 删除引用 `tailwindcss/types/config` 的 `declare module "daisyui"`，保留 `*.css?inline` 声明。

- [ ] **Step 6: 执行首轮类型与构建检查**

Run: `rtk pnpm check:types`

Expected: PASS。

Run: `rtk pnpm package`

Expected: 构建成功；若 Tailwind 报 unknown utility/candidate，进入 Task 4 逐项修复，不绕过错误。

---

### Task 4: 清理 Tailwind v4 不兼容模板语法

**Files:**
- Modify as reported: `src/components/catalyst-ui-kit/{avatar,badge,button,checkbox,description-list,dialog,dropdown,input,listbox,radio,select,switch,table,textarea}.tsx`
- Modify as reported: `src/components/ui/{badge,button,input,sheet,sidebar,switch}.tsx`
- Modify as reported: `src/components/complex-ui/{expandable,text-generate-effect,background-beams-with-collision}.tsx`
- Modify as reported: `src/contents/gitlab-overlay.tsx`
- Modify as reported: `src/options/components/generic-api-doc-settings.tsx`
- Modify as reported: `src/options/routes/settings/base/index.tsx`
- Modify as reported: `src/popup/swqa/panel.tsx`

- [ ] **Step 1: 检查升级器遗漏的旧语法**

```bash
rtk rg -n 'theme\(' src
rtk rg -n '\[--[[:alnum:]_-]+' src
rtk rg -n 'outline-none|(^|:)ring([ /"`]|$)|shadow-sm|rounded-sm|blur-sm|grid-cols-\[[^]]*,[^]]*\]' src --glob '*.tsx'
```

Expected: 前两项无残留；第三项只保留经 Tailwind v4 语义确认后的结果。

- [ ] **Step 2: 手工修复语义变化**

按官方 v4 映射检查并修复升级器输出：

- `[--btn-color:...]` → `[--btn-color:...]` 的合法 v4 arbitrary property 形式；仅把旧 variable shorthand `bg-[--btn-color]` 改为 `bg-(--btn-color)`
- `theme(colors.foo)` → `var(--color-foo)`
- `theme(spacing.4)` → `var(--spacing-4)`
- `rounded-sm`/`shadow-sm`/`blur-sm` 按 v3 视觉语义分别升级为 `rounded-xs`/`shadow-xs`/`blur-xs`
- `outline-none` → `outline-hidden`
- 裸 `ring` → `ring-3`
- arbitrary grid track 中逗号改为空格编码（下划线），例如 `grid-cols-[1fr,auto]` → `grid-cols-[1fr_auto]`
- 检查 variant 栈顺序以及任意变量 shorthand，避免只通过编译却改变视觉语义

- [ ] **Step 3: 反复构建直至候选类全部可生成**

Run: `rtk pnpm lint`

Expected: PASS；如 Biome 不认识 CSS-first at-rules，只在 `biome.jsonc` 的 CSS parser ignore 中加入实际需要的 `@theme`、`@custom-variant`、`@plugin`、`@utility`。

Run: `rtk pnpm check:types`

Expected: PASS。

Run: `rtk pnpm package`

Expected: PASS，WXT、Vite 8、Tailwind v4 和 daisyUI 5 共同完成打包。

- [ ] **Step 4: 检查构建产物中的关键样式**

```bash
rtk rg -l 'bg-background|--color-background|@property|animate-in|\.btn' dist
```

Expected: popup/options/content-script 产物中能找到主题变量、Tailwind utilities、Tailwind 动画或 daisyUI 规则；Shadow DOM 内联样式包含拆分前的 `@property` 来源。

- [ ] **Step 5: 提交 Tailwind v4 迁移**

```bash
rtk git add package.json pnpm-lock.yaml wxt.config.ts src/style.css src/global.d.ts \
  tailwind.config.ts postcss.config.js src
rtk git commit -m "chore: 升级 Tailwind CSS 至 v4"
```

---

### Task 5: 完整验证、检查提交并推送

**Files:**
- Verify only

- [ ] **Step 1: 验证 lockfile 可冻结安装**

Run: `rtk pnpm install --frozen-lockfile`

Expected: PASS。允许记录 pnpm 9 自身 `url.parse` 的 Node 24 弃用警告，但不得出现 peer dependency 或 lockfile 错误。

- [ ] **Step 2: 执行仓库强制验证**

Run: `rtk pnpm run verify`

Expected: PASS（Biome、TypeScript、全部 Vitest 测试）。

- [ ] **Step 3: 执行生产打包验证**

Run: `rtk pnpm run package`

Expected: PASS，生成浏览器扩展 zip。

- [ ] **Step 4: 检查工作树和提交范围**

```bash
rtk git diff --check
rtk git status --short --branch
rtk git log --oneline origin/develop..HEAD
```

Expected: 无未提交文件、无空白错误，提交依次覆盖设计、计划、依赖兼容、Shadow DOM、Tailwind v4。

- [ ] **Step 5: 推送 develop**

Run: `rtk git push origin develop`

Expected: 推送成功，远端 `develop` 包含全部提交。

- [ ] **Step 6: 汇报结果与已知边界**

汇报实际版本、提交哈希、`verify`/`package` 结果，以及两个非阻塞边界：Tailwind v4 的最低浏览器基线（Chrome 111、Safari 16.4、Firefox 128）和 pnpm 9 在 Node 24 下的内部弃用警告。此次工程迁移不新增 changeset，因为不直接改变扩展的用户功能或发布版本。
