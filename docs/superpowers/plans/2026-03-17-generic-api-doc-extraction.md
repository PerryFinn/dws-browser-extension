# 通用 API 文档提取 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不影响现有 SWQA 专用提取功能的前提下，为 popup 和 options 增加“通用 API 文档提取”能力，支持用户点选或选中文本后，调用用户配置的模型端点产出统一 JSON 和可复制 Prompt。

**Architecture:** 现有 SWQA 快路径保持原样，只把其 UI 提取为独立面板；新增一条 Generic 链路，分成共享契约层、storage 配置层、background provider 层、content-script 采集层和 popup/options UI 层。Generic 链路以纯函数模块承载递归 schema、Prompt 规则和 storage helper，先用 `node --import tsx --test` 覆盖这些稳定接口，再接入运行时消息和 UI，最后通过 `pnpm verify` 与手动 smoke 验证 SWQA/Generic 两条路径共存。

**Tech Stack:** React 18, TypeScript, Plasmo messaging/content scripts, AI SDK (`ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/openai`), Plasmo storage hook, Biome, `pnpm verify`, `pnpm build-zip`

---

## File Structure

- Modify: `package.json`
  责任：添加 AI SDK 相关依赖。
- Modify: `pnpm-lock.yaml`
  责任：锁定新增依赖版本。
- Create: `src/generic-api-doc/types.ts`
  责任：定义 Generic 提取共享类型，包括递归 schema、采集上下文、模型配置、结果结构和 runtime 消息体。
- Create: `src/generic-api-doc/prompt.ts`
  责任：定义 Generic 默认 Prompt 模板、占位符替换和 uncertainties 追加规则。
- Create: `src/generic-api-doc/prompt.test.ts`
  责任：验证默认模板、复制时 fallback 和 uncertainties 附加引导语。
- Create: `src/generic-api-doc/normalize.ts`
  责任：把模型返回值规范化为统一 JSON，校验递归 schema 树并生成 `uncertainties`。
- Create: `src/generic-api-doc/normalize.test.ts`
  责任：验证递归 schema、复杂嵌套、分页壳结构和高复杂结构降级策略。
- Create: `src/generic-api-doc/capture.ts`
  责任：规范化 DOM 点选/文本选区采集结果，输出 preview 与模型输入上下文。
- Create: `src/generic-api-doc/capture.test.ts`
  责任：验证 capture 模式、截断策略和空采集错误。
- Create: `src/storages/generic-api-doc.ts`
  责任：承载 Generic 模型配置、Prompt 模板的 storage key、默认值和完整性校验 helper。
- Create: `src/storages/generic-api-doc.test.ts`
  责任：验证模型配置完整性、API 类型枚举和 Prompt 模板 fallback 规则。
- Modify: `src/storages/index.ts`
  责任：注册 Generic 提取相关 local storage 默认值。
- Create: `src/background/generic-api-doc/provider.ts`
  责任：封装 AI SDK provider 构建、测试连接请求和正式提取请求。
- Create: `src/background/generic-api-doc/provider.test.ts`
  责任：验证 provider 选择、请求参数归一化和测试连接 payload。
- Create: `src/background/messages/genericTestModelConfig.ts`
  责任：提供 options“测试连接”消息入口。
- Create: `src/background/messages/genericExtractApiDoc.ts`
  责任：接收 Generic 采集上下文，调用 provider 并返回规范化结果或错误。
- Create: `src/contents/generic-api-doc-picker.tsx`
  责任：在 `<all_urls>` 页面提供点选覆盖层、文本选区读取和 popup 通信。
- Create: `src/options/components/generic-api-doc-settings.tsx`
  责任：封装 Generic 模型配置和 Prompt 模板设置区。
- Modify: `src/options/routes/settings/base/index.tsx`
  责任：挂载 Generic 设置区，同时保持现有 SWQA 设置区可用。
- Create: `src/popup/swqa/panel.tsx`
  责任：承载当前 SWQA popup UI，避免后续 Generic UI 继续堆进 `src/popup/index.tsx`。
- Create: `src/popup/generic/panel.tsx`
  责任：承载 Generic popup 采集、提取、结果展示、复制和重试。
- Modify: `src/popup/index.tsx`
  责任：只负责路由当前标签页到 SWQA 面板或 Generic 面板。
- Create: `.changeset/generic-api-doc-extraction.md`
  责任：记录用户可感知的新功能与行为变化。
- Verify: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`
  责任：实现过程中对齐规格，避免把 SWQA 与 Generic 混成一条链路。

## Implementation Constraints

- 不要手改 `src/options/routeTree.gen.ts`。
- 现有 SWQA 的页面识别、接口拉取、清洗与 Prompt 双模板逻辑不得重写成 Generic 分支。
- Generic Prompt `v1` 只维护一套模板，不引入 create/update 双用途。
- Generic Prompt 只显式支持 `{{json}}` 与 `{{url}}` 占位符；不要求用户手动维护 `{{uncertainties}}`。
- Generic 的 `request.body` 与 `response.successBody` 必须按递归 schema 树表达，不允许为了省事退回平面字段表。
- `oneOf / anyOf / 多态 / 递归树` 只做降级支持：保留外层结构、深层无法确定时写 `unknown` 并追加 `uncertainties`。
- `API Key` 只能放在 local storage，不得迁移到 sync storage。
- 由于新增运行时依赖，除了 `pnpm verify` 之外，还要跑一次 `pnpm build-zip` 检查扩展打包兼容性。

## Chunk 1: 共享契约、Prompt 规则与 Storage

### Task 1: 建立 Generic 共享类型、递归 schema 与 Prompt 规则

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/generic-api-doc/types.ts`
- Create: `src/generic-api-doc/prompt.ts`
- Create: `src/generic-api-doc/prompt.test.ts`
- Create: `src/generic-api-doc/normalize.ts`
- Create: `src/generic-api-doc/normalize.test.ts`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 安装 Generic provider 需要的依赖**

Run: `pnpm add ai @ai-sdk/openai-compatible @ai-sdk/openai`
Expected: `package.json` 与 `pnpm-lock.yaml` 更新成功，依赖安装无报错。

- [ ] **Step 2: 先写 Prompt 与递归 schema 的失败测试**

在 `src/generic-api-doc/prompt.test.ts` 中先写失败用例，至少覆盖：
- `resolveGenericPromptTemplateForCopy(undefined)` 回退到默认 Generic 模板
- `resolveGenericPromptTemplateForCopy("")` 和 `resolveGenericPromptTemplateForCopy("   ")` 回退到默认模板
- `buildGenericPrompt` 会替换 `{{json}}` 与 `{{url}}`
- 当 `uncertainties` 为空时，不会追加“先向用户确认”的附加引导语
- 当 `uncertainties` 非空时，会在 Prompt 末尾附加确认说明

在 `src/generic-api-doc/normalize.test.ts` 中先写失败用例，至少覆盖：
- 顶层 `source / endpoint / request / response / uncertainties` 缺字段时报错
- `request.body` 能接受多层 `object / array` 嵌套
- `response.successBody` 能保留 `data -> list -> total` 这类分页壳
- 碰到未知深层节点时会把类型归一为 `unknown`
- 高复杂结构输入会落到 `uncertainties`，而不是直接抛弃整个结果

Run: `node --import tsx --test src/generic-api-doc/prompt.test.ts src/generic-api-doc/normalize.test.ts`
Expected: 至少有 1 个用例失败，且失败原因是共享模块尚未实现。

- [ ] **Step 3: 定义 Generic 共享类型和最小递归 schema 树**

在 `src/generic-api-doc/types.ts` 中定义共享类型，至少包含：

```ts
export type GenericProviderType = "openai-compatible" | "openai";

export type GenericSchemaNode =
  | {
      type: "object";
      description?: string;
      required?: boolean;
      properties: Record<string, GenericSchemaNode>;
    }
  | {
      type: "array";
      description?: string;
      required?: boolean;
      items: GenericSchemaNode;
    }
  | {
      type: "string" | "number" | "boolean" | "null" | "unknown";
      description?: string;
      required?: boolean;
    };

export interface GenericExtractionResult {
  source: { url: string; title: string; mode: "generic-dom" | "generic-selection" };
  endpoint: { name: string; path: string; method: string; description?: string };
  request: { pathParams: unknown[]; queryParams: unknown[]; headers: unknown[]; body: GenericSchemaNode | null; auth?: string | null };
  response: { successBody: GenericSchemaNode | null; errorNotes?: string | null };
  uncertainties: Array<{ field: string; reason: string }>;
}
```

要求：
- 把 popup、background、content script 通信需要的消息体和采集上下文也放在这个文件里，避免跨层重复定义。
- `method` 先保留为字符串，后续靠校验层限制到允许值集合。

- [ ] **Step 4: 实现 Generic Prompt 规则**

在 `src/generic-api-doc/prompt.ts` 中定义：
- `defaultGenericPromptTemplate`
- `resolveGenericPromptTemplateForCopy`
- `buildGenericPrompt`

最小结构建议：

```ts
export const defaultGenericPromptTemplate = `你需要根据以下接口文档信息生成代码或变更建议：
\`\`\`json
{{json}}
\`\`\`

接口文档地址：{{url}}
`;
```

实现要求：
- `resolveGenericPromptTemplateForCopy` 的行为与现有 SWQA 模板一致，只在复制时 fallback。
- `buildGenericPrompt` 先做占位符替换，再在 `uncertainties.length > 0` 时追加统一的“先确认再继续”段落。
- 这个追加段落必须显式要求下游模型先列出不确定项、先向用户确认，再决定是否继续生成代码。

- [ ] **Step 5: 实现模型输出规范化与递归 schema 校验**

在 `src/generic-api-doc/normalize.ts` 中提供纯函数，建议拆成三个层次：

```ts
export const normalizeGenericSchemaNode = (value: unknown, path: string): { node: GenericSchemaNode | null; uncertainties: GenericExtractionResult["uncertainties"] } => { ... };
export const normalizeGenericExtractionResult = (value: unknown): GenericExtractionResult => { ... };
export const isSupportedHttpMethod = (value: string): boolean => { ... };
```

要求：
- `normalizeGenericSchemaNode` 递归处理 `object` 和 `array`。
- 对深层无法确定类型的节点返回 `unknown`，并在 `uncertainties` 中记录路径。
- 对 `oneOf / anyOf / allOf / discriminator` 这类高复杂结构，不做完整展开，而是保留外层节点并追加不确定项。
- 如果顶层结构严重缺失，抛出明确错误，不要返回半成品。

- [ ] **Step 6: 跑纯函数测试与类型检查**

Run: `node --import tsx --test src/generic-api-doc/prompt.test.ts src/generic-api-doc/normalize.test.ts`
Expected: 全部通过，且复杂嵌套与 Prompt 追加规则符合 spec。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0，没有新增类型错误。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/generic-api-doc/types.ts src/generic-api-doc/prompt.ts src/generic-api-doc/prompt.test.ts src/generic-api-doc/normalize.ts src/generic-api-doc/normalize.test.ts
git commit -m "feat: add generic api extraction contracts"
```

### Task 2: 建立 Generic storage key、默认值与配置完整性校验

**Files:**
- Create: `src/storages/generic-api-doc.ts`
- Create: `src/storages/generic-api-doc.test.ts`
- Modify: `src/storages/index.ts`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 先写 Generic storage helper 的失败测试**

在 `src/storages/generic-api-doc.test.ts` 中先写失败用例，至少覆盖：
- `isGenericModelConfigComplete` 在 `apiType / baseUrl / modelId / apiKey` 缺任一项时返回 `false`
- 当 `apiType === "openai"` 时，`baseUrl` 仍然要求必填，保持与 `openai-compatible` 一致，避免 popup 与 options 分叉校验逻辑
- `resolveGenericPromptTemplateForCopy` 经过 storage 原值为空字符串时能回退到默认模板
- `getGenericProviderLabel("openai-compatible")` 与 `getGenericProviderLabel("openai")` 文案稳定

Run: `node --import tsx --test src/storages/generic-api-doc.test.ts`
Expected: 至少 1 个用例失败，且失败原因是 helper 尚未实现。

- [ ] **Step 2: 抽离 Generic storage 常量与类型**

在 `src/storages/generic-api-doc.ts` 中定义：
- storage key 常量
- 默认值映射
- provider 标签映射
- 配置完整性 helper

最小结构建议：

```ts
export const GENERIC_PROVIDER_TYPE_STORAGE_KEY = "genericApiDocProviderType";
export const GENERIC_BASE_URL_STORAGE_KEY = "genericApiDocBaseUrl";
export const GENERIC_MODEL_ID_STORAGE_KEY = "genericApiDocModelId";
export const GENERIC_API_KEY_STORAGE_KEY = "genericApiDocApiKey";
export const GENERIC_PROMPT_TEMPLATE_STORAGE_KEY = "genericApiDocPromptTemplate";

export const isGenericModelConfigComplete = (config: GenericModelConfig) => { ... };
```

要求：
- 默认 Prompt 模板来自 `src/generic-api-doc/prompt.ts`，不要在 storage 文件里重复写一份字符串。
- `API Key` 默认值为空字符串。
- `API 类型` 默认值固定为 `openai-compatible`，除非你在实现前有充分理由调整，并同步改 spec。

- [ ] **Step 3: 在 local storage 默认值中注册 Generic 配置**

修改 `src/storages/index.ts`：
- 在 `localStorageInitialValue` 中加入 Generic provider 配置和 Generic Prompt 模板
- 保持这些 key 全部落在 local storage
- 不要动现有 SWQA storage key 名称与迁移顺序

要求：
- 新 key 注册后，popup 和 options 可以直接通过 `useStorage` 读取。
- 不新增 sync storage 版本，也不做迁移逻辑。

- [ ] **Step 4: 跑 helper 测试并执行一次全量校验**

Run: `node --import tsx --test src/storages/generic-api-doc.test.ts`
Expected: 全部通过，配置完整性与 provider 标签规则稳定。

Run: `pnpm verify`
Expected:
- `biome check --write .` 完成且无报错
- `tsc --noEmit` 退出码为 0

- [ ] **Step 5: Commit**

```bash
git add src/storages/generic-api-doc.ts src/storages/generic-api-doc.test.ts src/storages/index.ts
git commit -m "feat: add generic api extraction storage helpers"
```

## Chunk 2: Provider 与采集运行时链路

### Task 3: 封装 AI SDK provider 并接入 background 消息

**Files:**
- Create: `src/background/generic-api-doc/provider.ts`
- Create: `src/background/generic-api-doc/provider.test.ts`
- Create: `src/background/messages/genericTestModelConfig.ts`
- Create: `src/background/messages/genericExtractApiDoc.ts`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 先写 provider 选择与请求构建的失败测试**

在 `src/background/generic-api-doc/provider.test.ts` 中先写失败用例，至少覆盖：
- `openai-compatible` 会走兼容 provider 工厂
- `openai` 会走 OpenAI provider 工厂
- 测试连接会构建一个最小结构化响应请求，而不是直接复用正式提取 Prompt
- 正式提取会把 capture context 序列化成模型输入文本

Run: `node --import tsx --test src/background/generic-api-doc/provider.test.ts`
Expected: 至少 1 个用例失败，且失败原因是 provider helper 尚未实现。

- [ ] **Step 2: 实现 provider 工厂与测试连接请求**

在 `src/background/generic-api-doc/provider.ts` 中封装：

```ts
export const createGenericModel = (config: GenericModelConfig) => { ... };
export const testGenericModelConfig = async (config: GenericModelConfig) => { ... };
export const extractGenericApiDoc = async (config: GenericModelConfig, context: GenericCaptureContext) => { ... };
```

实现要求：
- 使用 `ai` 生态和 AI SDK provider 包，不直接引入官方 `openai` SDK。
- `testGenericModelConfig` 发一个最小结构化请求，只验证联通性和对象化能力。
- `extractGenericApiDoc` 只关心：
  - 调用模型
  - 获取文本或对象返回
  - 交给 `normalizeGenericExtractionResult`
- 不在 provider 层拼接 popup 文案、toast 文案或 UI 状态。

- [ ] **Step 3: 增加 background 消息入口**

新增两个 message handler：

`src/background/messages/genericTestModelConfig.ts`

```ts
export type GenericTestModelConfigReqBody = { config: GenericModelConfig };
export type GenericTestModelConfigResBody = { success: true } | { success: false; message: string };
```

`src/background/messages/genericExtractApiDoc.ts`

```ts
export type GenericExtractApiDocReqBody = { config: GenericModelConfig; context: GenericCaptureContext };
export type GenericExtractApiDocResBody =
  | { success: true; data: GenericExtractionResult }
  | { success: false; message: string };
```

要求：
- handler 只转发到 provider 层，不重复实现 normalize。
- 返回错误时要把 message 保持为用户可读字符串。
- 不要在 background 层访问 popup 的 storage hook。

- [ ] **Step 4: 跑 provider 测试与类型检查**

Run: `node --import tsx --test src/background/generic-api-doc/provider.test.ts`
Expected: 全部通过，provider 选择和请求构建稳定。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0。

- [ ] **Step 5: Commit**

```bash
git add src/background/generic-api-doc/provider.ts src/background/generic-api-doc/provider.test.ts src/background/messages/genericTestModelConfig.ts src/background/messages/genericExtractApiDoc.ts
git commit -m "feat: add generic api extraction provider pipeline"
```

### Task 4: 实现通用页面点选覆盖层与文本选区读取

**Files:**
- Create: `src/generic-api-doc/capture.ts`
- Create: `src/generic-api-doc/capture.test.ts`
- Create: `src/contents/generic-api-doc-picker.tsx`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 先写 capture 规范化 helper 的失败测试**

在 `src/generic-api-doc/capture.test.ts` 中先写失败用例，至少覆盖：
- DOM 点选结果会保留 `url / title / mode / rawText / preview`
- 文本选区为空时抛出明确错误
- 过长文本会被截断或摘要，但不会把 URL 和标题丢掉
- 点选模式会优先保留目标节点文本，不把整页正文全部塞进去

Run: `node --import tsx --test src/generic-api-doc/capture.test.ts`
Expected: 至少 1 个用例失败，且失败原因是 capture helper 尚未实现。

- [ ] **Step 2: 实现采集结果规范化 helper**

在 `src/generic-api-doc/capture.ts` 中实现纯函数，建议结构如下：

```ts
export const createSelectionCaptureContext = (input: { url: string; title: string; text: string }): GenericCaptureContext => { ... };
export const createDomCaptureContext = (input: { url: string; title: string; text: string; htmlSnippet?: string }): GenericCaptureContext => { ... };
```

要求：
- 输出 `GenericCaptureContext` 时统一附带 `preview`，供 popup 结果页显示。
- 对文本内容做长度限制，避免把整页内容全量发给模型。
- 不在 helper 里做站点特化清洗。

- [ ] **Step 3: 实现内容脚本消息桥接**

在 `src/contents/generic-api-doc-picker.tsx` 中实现一个常驻 content script：
- `matches` 设为 `<all_urls>`，但要接受并处理“当前页面无法注入/无法读取”的异常
- 监听来自 popup 的消息：
  - `generic-picker:start`
  - `generic-picker:read-selection`
  - `generic-picker:reset`
- `generic-picker:start` 进入点选覆盖层模式：
  - 鼠标 hover 高亮当前节点
  - 点击后阻止默认行为
  - 读取目标节点文本与精简 HTML 片段
  - 回复给 popup
- `generic-picker:read-selection` 读取 `window.getSelection()`

要求：
- 覆盖层 UI 尽量轻量，不引入一套重型样式系统。
- 选择完成后必须清理事件监听器与高亮节点。
- 如果当前页面是浏览器内部页面，popup 侧要能拿到友好错误，而不是 message timeout。

- [ ] **Step 4: 跑 pure helper 测试，再做一次手动采集 smoke**

Run: `node --import tsx --test src/generic-api-doc/capture.test.ts`
Expected: 全部通过，capture context 结构稳定。

手动验证：
1. 打开任意普通网页
2. 重新加载扩展
3. 在该页面执行一次文本选区读取
4. 再执行一次 DOM 点选
5. 确认两者都能返回非空 preview，且不会把整页所有文本都塞进去

- [ ] **Step 5: Commit**

```bash
git add src/generic-api-doc/capture.ts src/generic-api-doc/capture.test.ts src/contents/generic-api-doc-picker.tsx
git commit -m "feat: add generic api doc capture bridge"
```

## Chunk 3: Options 与 Popup 集成

### Task 5: 在设置页增加 Generic 模型配置与 Prompt 模板设置

**Files:**
- Create: `src/options/components/generic-api-doc-settings.tsx`
- Modify: `src/options/routes/settings/base/index.tsx`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 新建独立设置组件，不把 base 设置页继续堆大**

在 `src/options/components/generic-api-doc-settings.tsx` 中封装 Generic 设置区，至少包含：
- `API 类型` 选择框
- `Base URL` 输入框
- `Model ID` 输入框
- `API Key` 输入框
- `测试连接` 按钮
- `Prompt 模板` Textarea
- 占位符说明：`{{json}} / {{url}}`

要求：
- 全部通过 `useStorage` 直接读写 local storage。
- `测试连接` 通过 `sendToBackground` 调 `genericTestModelConfig`，成功/失败都走 toast。
- `API Key` 输入框使用密码态或隐藏展示，避免 settings 页明文暴露。

- [ ] **Step 2: 在设置页挂载 Generic 设置区**

修改 `src/options/routes/settings/base/index.tsx`：
- 引入并渲染 `GenericApiDocSettings`
- 保留现有 `SWQA Prompt 模板` 分组
- 不动 `routeTree.gen.ts`

要求：
- Generic 设置区与 SWQA 设置区并列，不互相复用 storage key。
- 若设置页已有 `TooltipProvider`，直接复用，不新增第二层 provider。

- [ ] **Step 3: 手动验证 settings 行为**

手动验证：
1. 打开 options 设置页
2. 修改 Generic provider 配置并刷新页面
3. 确认配置能持久化
4. 点击 `测试连接`，能看到成功/失败 toast
5. 修改 Generic Prompt 模板后刷新页面，确认仍保留自定义值

Run: `pnpm check:types`
Expected: 设置页和新组件类型检查通过。

- [ ] **Step 4: Commit**

```bash
git add src/options/components/generic-api-doc-settings.tsx src/options/routes/settings/base/index.tsx
git commit -m "feat: add generic api doc settings"
```

### Task 6: 拆分 popup 面板并接入 Generic 提取链路

**Files:**
- Create: `src/popup/swqa/panel.tsx`
- Create: `src/popup/generic/panel.tsx`
- Modify: `src/popup/index.tsx`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 先抽出 SWQA 现有面板，确保中间状态仍可工作**

把 `src/popup/index.tsx` 现有 SWQA UI 提取到 `src/popup/swqa/panel.tsx`，要求：
- 保持现有 SWQA 行为不变
- 把原先的 hook、toast 和按钮逻辑整体搬过去
- 新面板额外支持一个次级动作：`改用通用提取`

中间态完成后，`src/popup/index.tsx` 只负责：
- 读取当前 tab
- 判断是否命中 SWQA
- 渲染 `SwqaPanel`

Run: `pnpm check:types`
Expected: 仅重构文件位置时，SWQA popup 仍通过类型检查。

- [ ] **Step 2: 实现 Generic popup 面板**

在 `src/popup/generic/panel.tsx` 中实现 Generic 面板，至少包含：
- 当前 tab 可用性判断
- 读取 Generic 配置并计算 `isGenericConfigComplete`
- `开始点选区域`
- `使用当前选中文本`
- `提取并生成`
- `复制 JSON`
- `复制 Prompt`
- `重新点选 / 重新读取选区 / 重新提取`
- JSON 预览区
- Prompt 预览区
- uncertainties 列表

实现建议：

```ts
type GenericExtractState = "idle" | "capturing" | "captured" | "extracting" | "success" | "error";
```

要求：
- 通过 `chrome.tabs.sendMessage` 与 `src/contents/generic-api-doc-picker.tsx` 通信。
- 通过 `sendToBackground` 调 `genericExtractApiDoc`。
- 配置不完整时禁用 Generic 提取主按钮，并提供去 settings 的提示。
- 模型调用失败时保留当前 capture context。
- 如果当前 tab 是 `chrome://` 之类无法通信的页面，展示友好错误。

- [ ] **Step 3: 在 popup 入口做 SWQA / Generic 分流**

修改 `src/popup/index.tsx`：
- 继续使用现有 `getActiveTab` 消息
- 若命中 SWQA 页面，默认渲染 `SwqaPanel`
- 非 SWQA 页面渲染 `GenericPanel`
- 在 `SwqaPanel` 中允许切到 `GenericPanel`，但不要把 Generic 设成默认主视图

要求：
- `index.tsx` 只保留最薄的一层分流逻辑。
- 不要把 Generic 的 hook 和 SWQA 的 hook 混在同一个文件里。

- [ ] **Step 4: 进行 popup 手动 smoke**

手动验证：
1. 打开 `swqa.gz.cvte.cn/interface/:id`
2. 确认 SWQA 面板仍然可提取并复制 JSON / Prompt
3. 在 SWQA 面板点击“改用通用提取”，确认能进入 Generic 面板
4. 打开普通 API 文档页面
5. 用文本选区做一次通用提取
6. 用 DOM 点选做一次通用提取
7. 确认 JSON、Prompt、不确定项同时展示
8. 人为制造一次模型失败，确认可以直接重试而不必重新采集

Run: `pnpm verify`
Expected:
- `biome check --write .` 无报错
- `tsc --noEmit` 无报错

- [ ] **Step 5: Commit**

```bash
git add src/popup/swqa/panel.tsx src/popup/generic/panel.tsx src/popup/index.tsx
git commit -m "feat: add generic api extraction popup flow"
```

## Chunk 4: 发布元数据与最终验收

### Task 7: 添加 changeset 并对齐最终用户文案

**Files:**
- Create: `.changeset/generic-api-doc-extraction.md`
- Modify: `src/popup/generic/panel.tsx`
- Modify: `src/options/components/generic-api-doc-settings.tsx`
- Reference: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`

- [ ] **Step 1: 写 changeset**

创建 `.changeset/generic-api-doc-extraction.md`，使用 `patch`，摘要至少覆盖：
- 新增通用 API 文档提取
- 支持用户自配模型端点
- SWQA 原能力保持不变

- [ ] **Step 2: 对齐文案与风险提示**

检查并补齐以下用户可见文案：
- 通用提取会把所选页面内容发送到你配置的模型端点
- 配置未完成时的禁用提示
- 测试连接失败时的错误文案
- 遇到 uncertainties 时的结果说明

要求：
- 文案写在实际使用位置，不集中堆进一个常量大文件。
- 不要在此步骤再改动提取逻辑。

- [ ] **Step 3: Commit**

```bash
git add .changeset/generic-api-doc-extraction.md src/popup/generic/panel.tsx src/options/components/generic-api-doc-settings.tsx
git commit -m "docs: add generic api extraction release notes"
```

### Task 8: 完成最终验证并准备执行 handoff

**Files:**
- Verify: `docs/superpowers/specs/2026-03-17-generic-api-doc-extraction-design.md`
- Verify: `docs/superpowers/plans/2026-03-17-generic-api-doc-extraction.md`

- [ ] **Step 1: 跑纯函数与 provider 相关测试**

Run: `node --import tsx --test src/generic-api-doc/prompt.test.ts src/generic-api-doc/normalize.test.ts src/generic-api-doc/capture.test.ts src/storages/generic-api-doc.test.ts src/background/generic-api-doc/provider.test.ts`
Expected: 全部通过，无跳过的关键用例。

- [ ] **Step 2: 跑仓库要求的全量校验**

Run: `pnpm verify`
Expected:
- `biome check --write .` 成功
- `tsc --noEmit` 成功

- [ ] **Step 3: 额外跑一次扩展打包检查**

Run: `pnpm build-zip`
Expected: `build/` 下生成新的 zip 产物，且没有因为 AI SDK 或 content script 造成构建失败。

- [ ] **Step 4: 完成最终手动 smoke**

手动验证 checklist：
1. `SWQA` 页面旧流程不回归
2. 非 `SWQA` 页面 Generic 配置缺失时会被阻止并引导去 settings
3. Generic `测试连接` 成功/失败都能给出明确反馈
4. 文本选区提取可用
5. DOM 点选提取可用
6. 多层嵌套结构结果能保留为递归 schema 树
7. 常见分页壳结构不会被拍平
8. 遇到高复杂结构时，结果里会出现 `uncertainties`
9. Prompt 在有 `uncertainties` 时会追加“先确认再继续”的说明

- [ ] **Step 5: 记录最终状态并准备执行**

执行完成后，在计划文件顶部或执行记录中补充：
- `pnpm verify` 结果
- `pnpm build-zip` 结果
- 手动 smoke 结论
- 是否存在已知残留风险

本任务不再新开实现分支逻辑，完成后直接进入 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 执行。
