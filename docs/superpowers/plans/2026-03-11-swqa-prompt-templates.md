# SWQA Prompt 双模板与更新流程 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SWQA popup 和 options 设置页引入“更新 / 新增”两套独立 Prompt 模板、迁移旧模板数据，并让复制行为按当前用途工作。

**Architecture:** 继续沿用现有 `src/popup/swqa/prompt.ts` 作为 SWQA Prompt 规则的单一来源，在这里集中定义用途枚举、默认模板和 Prompt 构建逻辑；把 SWQA 专属的 storage 迁移决策拆到独立纯函数模块中，先用 TypeScript 测试覆盖迁移和 fallback 语义，再由 `src/storages/index.ts` 负责接入实际 storage 初始化；popup 与 options 仅负责各自的用途切换和 UI 展示，读取同一份 storage 数据。

**Tech Stack:** React 18, TypeScript, Plasmo storage hook, Headless UI/Catalyst UI Kit, Biome, `pnpm verify`

---

## File Structure

- Modify: `src/popup/swqa/prompt.ts`
  责任：集中维护 SWQA Prompt 的用途枚举、默认模板、fallback 规则和 `buildPrompt`。
- Create: `src/popup/swqa/prompt.test.ts`
  责任：验证 create/update 默认模板文本和“仅复制时 fallback”规则。
- Create: `src/storages/swqa-prompt-template.ts`
  责任：承载 SWQA Prompt 模板 key、迁移决策和 pure helper。
- Create: `src/storages/swqa-prompt-template.test.ts`
  责任：验证 6 种 storage 状态组合的迁移决策。
- Modify: `src/storages/index.ts`
  责任：注册新 storage key，并接入经过测试的 SWQA 迁移 helper。
- Modify: `src/background/index.ts`
  责任：在启动和安装/升级时触发 storage 初始化与迁移。
- Modify: `src/popup/index.tsx`
  责任：增加 `用途` 横向单选、按用途切换模板、动态复制按钮文案和 tooltip。
- Modify: `src/options/routes/settings/base/index.tsx`
  责任：在设置页增加 `SWQA Prompt 模板` 分组，编辑同两份持久化模板。
- Create: `.changeset/swqa-prompt-templates.md`
  责任：记录用户可感知变更。
- Verify: `docs/superpowers/specs/2026-03-11-swqa-prompt-templates-design.md`
  责任：实现过程中对齐规格。

## Implementation Constraints

- 当前仓库没有 Jest/Vitest 等自动化测试命令，不新增测试框架。
- 验证边界以 `pnpm check:types`、`pnpm lint`、`pnpm verify` 和手动 smoke 为主。
- `用途` 默认值固定为 `更新`，不持久化。
- `复制 JSON` 按钮不在本次改动范围内。
- Tooltip 只描述默认模板的推荐行为，不对用户自定义模板做系统级强制注入。

## Chunk 1: 模板模型与存储迁移

### Task 1: 扩展 SWQA Prompt 共享逻辑

**Files:**
- Modify: `src/popup/swqa/prompt.ts`
- Create: `src/popup/swqa/prompt.test.ts`
- Reference: `docs/superpowers/specs/2026-03-11-swqa-prompt-templates-design.md`

- [ ] **Step 1: 先写 Prompt 规则的失败测试**

在 `src/popup/swqa/prompt.test.ts` 中先写失败用例，至少覆盖：
- `getDefaultPromptTemplate("create")` 返回 spec 中定义的完整新增模板文本
- `getDefaultPromptTemplate("update")` 返回 spec 中定义的完整更新模板文本
- `resolvePromptTemplateForCopy(undefined, purpose)` 回退到对应默认模板
- `resolvePromptTemplateForCopy("")` 和 `resolvePromptTemplateForCopy("   ")` 回退到对应默认模板
- `resolvePromptTemplateForCopy("custom", purpose)` 保留原值

Run: `node --import tsx --test src/popup/swqa/prompt.test.ts`
Expected: 至少 1 个用例失败，且失败原因是函数或默认模板尚未实现/不匹配。

- [ ] **Step 2: 为 Prompt 用途建模并拆分默认模板**

在 `src/popup/swqa/prompt.ts` 中加入清晰的用途模型和默认模板常量，至少包含以下结构：

```ts
export type SwqaPromptPurpose = "update" | "create";

export const defaultCreatePromptTemplate = `...`;
export const defaultUpdatePromptTemplate = `...`;

export const getDefaultPromptTemplate = (purpose: SwqaPromptPurpose) =>
  purpose === "update" ? defaultUpdatePromptTemplate : defaultCreatePromptTemplate;
```

要求：
- “新增”模板直接写入 spec 中的完整默认文案，不自行删减句子。
- “更新”模板直接写入 spec 中的完整 8 步默认文案。
- 保留 `buildPrompt`，但改为接受任意模板字符串和 fallback 结果。

- [ ] **Step 3: 保留兼容导出，避免在 UI 改造前把现有 popup 弄坏**

在同一文件里暂时保留旧导出别名，确保中间提交仍能通过类型检查：

```ts
export const defaultPromptTemplate = defaultCreatePromptTemplate;
```

这样在 `src/popup/index.tsx` 尚未切换到双模板之前，旧 import 不会立刻失效。

- [ ] **Step 4: 明确空模板 fallback 只发生在复制时**

在 `src/popup/swqa/prompt.ts` 中补一个纯函数，专门处理“storage 原值”和“复制时实际使用值”的区别：

```ts
export const resolvePromptTemplateForCopy = (template: string | null | undefined, purpose: SwqaPromptPurpose) => {
  if (!template || template.trim().length === 0) {
    return getDefaultPromptTemplate(purpose);
  }
  return template;
};
```

要求：
- 不要在这个阶段写 UI 逻辑。
- 只把“空字符串/纯空白 -> fallback 默认模板”编码为共享规则。

- [ ] **Step 5: 先跑测试再跑类型检查**

Run: `node --import tsx --test src/popup/swqa/prompt.test.ts`
Expected: 全部通过，且默认模板文本与 fallback 行为符合 spec。

Run: `pnpm check:types`
Expected: `tsc --noEmit` 退出码为 0，没有新增类型错误。

- [ ] **Step 6: Commit**

```bash
git add src/popup/swqa/prompt.ts src/popup/swqa/prompt.test.ts
git commit -m "refactor: expand swqa prompt template helpers"
```

### Task 2: 为 SWQA Prompt 模板加入迁移感知初始化

**Files:**
- Create: `src/storages/swqa-prompt-template.ts`
- Create: `src/storages/swqa-prompt-template.test.ts`
- Modify: `src/storages/index.ts`
- Modify: `src/background/index.ts`
- Reference: `docs/superpowers/specs/2026-03-11-swqa-prompt-templates-design.md`

- [ ] **Step 1: 先写迁移决策的失败测试**

在 `src/storages/swqa-prompt-template.test.ts` 中先写失败用例，直接覆盖 6 种状态组合和“空字符串也算已存在”的语义。

Run: `node --import tsx --test src/storages/swqa-prompt-template.test.ts`
Expected: 至少 1 个用例失败，且失败原因是迁移 helper 尚未实现/返回值不符合预期。

- [ ] **Step 2: 提取 SWQA 专属 storage helper，并在默认值中注册新 key**

在 `src/storages/swqa-prompt-template.ts` 中定义：
- storage key 常量
- 默认模板映射
- 迁移决策 pure helper

在 `src/storages/index.ts` 中接入这些常量和默认值，但不要让通用初始化抢先覆盖旧模板。

在 `src/storages/index.ts` 中加入两份默认值：

```ts
swqaCreatePromptTemplate: {
  defaultValue: defaultCreatePromptTemplate
},
swqaUpdatePromptTemplate: {
  defaultValue: defaultUpdatePromptTemplate
}
```

同时调整 `initLocalStorage`，让 SWQA Prompt 模板走单独的迁移感知流程，而不是直接被 `Object.entries(localStorageInitialValue)` 的通用逻辑覆盖。

- [ ] **Step 3: 按 spec 的 partial-state 表实现迁移辅助函数**

在 `src/storages/swqa-prompt-template.ts` 中新增一个 pure helper，例如：

```ts
export const resolveSwqaPromptTemplateState = ({ createTemplate, updateTemplate, legacyTemplate }) => {
  // new keys 优先；old key 只补 create；update 缺失时走 update 默认值
};
```

实现要求：
- 任一新 key 已存在时，以其自身值为准，即使它是空字符串或纯空白。
- `swqaPromptTemplate` 只能回填 `swqaCreatePromptTemplate`，不能回填 update。
- 两个新 key 都缺失且 old key 存在时：迁入 create，update 写默认值。
- 旧 key 保留，不做删除。

必须显式覆盖以下 6 种状态：
- `create 存在 / update 存在 / old 任意` -> 直接保留 create/update，不参考 old
- `create 存在 / update 不存在 / old 任意` -> 保留 create；update 写更新默认模板
- `create 不存在 / update 存在 / old 存在` -> create 迁入 old；保留 update
- `create 不存在 / update 存在 / old 不存在` -> create 写新增默认模板；保留 update
- `create 不存在 / update 不存在 / old 存在` -> create 迁入 old；update 写更新默认模板
- `create 不存在 / update 不存在 / old 不存在` -> create 写新增默认模板；update 写更新默认模板

- [ ] **Step 4: 先跑迁移测试，再把 SWQA 迁移初始化挂到 background 的启动和安装/升级路径**

Run: `node --import tsx --test src/storages/swqa-prompt-template.test.ts`
Expected: 全部通过，6 种状态和空字符串语义都符合 spec。

修改 `src/background/index.ts`：
- `chrome.runtime.onStartup` 中 `await initLocalStorage()`
- `chrome.runtime.onInstalled` 中无论 `install` 还是 `update` 都执行 `await initLocalStorage()`

这样可以覆盖：
- 浏览器重启后的常规启动
- 扩展升级后的迁移入口
- 新安装用户的默认值写入

补充约束：
- popup 与 options 不实现各自的迁移逻辑。
- popup 与 options 只在用户交互修改模板时写 storage，不能因为首次渲染读到默认值而主动回写。

- [ ] **Step 5: 手动验证 6 种迁移状态组合**

使用扩展 service worker 的调试环境验证迁移入口，而不是只看类型检查。

验证方法：
1. 进入扩展的 background/service worker 调试控制台
2. 对每一种状态组合，先清空相关 key，再按场景写入旧值或新值
3. 通过重新加载 unpacked extension 触发 `onInstalled(update)`，或在 service worker console 中直接调用导出的初始化函数，只保留一种固定方式并全程沿用
4. 读取 `swqaCreatePromptTemplate` / `swqaUpdatePromptTemplate` / `swqaPromptTemplate`
5. 对照上面的 6 条预期，确认：
   - new key 优先
   - old key 只补 create
   - 空字符串/纯空白字符串只要 key 已存在，就不会被覆盖
   - old key 会保留

- [ ] **Step 6: 运行仓库要求的全量校验**

Run: `pnpm verify`
Expected:
- `biome check --write .` 完成且无报错
- `tsc --noEmit` 退出码为 0

- [ ] **Step 7: Commit**

```bash
git add src/storages/swqa-prompt-template.ts src/storages/swqa-prompt-template.test.ts src/storages/index.ts src/background/index.ts
git commit -m "feat: migrate swqa prompt templates into dual storage keys"
```

## Chunk 2: Popup、Options 与最终验收

### Task 3: 改造 popup 为单按钮双模板模式

**Files:**
- Modify: `src/popup/index.tsx`
- Modify: `src/popup/swqa/prompt.ts`
- Reference: `src/components/ui/tooltip.tsx`
- Reference: `src/components/catalyst-ui-kit/radio.tsx`

- [ ] **Step 1: 用本地 state 表示当前用途，默认 `update`**

在 `src/popup/index.tsx` 中增加：

```ts
const [promptPurpose, setPromptPurpose] = useState<SwqaPromptPurpose>("update");
```

要求：
- 不要把用途写入 storage。
- popup 每次打开都回到 `更新`。

- [ ] **Step 2: 同时订阅 create/update 两份模板 storage**

把当前单一 `useStorage<string>({ key: "swqaPromptTemplate" ... })` 拆成两份：

```ts
const [storedCreatePromptTemplate, setStoredCreatePromptTemplate] = useStorage(...);
const [storedUpdatePromptTemplate, setStoredUpdatePromptTemplate] = useStorage(...);
```

并通过 `promptPurpose` 派生：
- 当前显示的 storage 原值 `storedTemplate`
- 当前写入的 setter
- 当前复制时才使用的 `templateForCopy`

要求：
- 不要在 `useStorage` 解构时直接用 `defaultCreatePromptTemplate` / `defaultUpdatePromptTemplate` 作为渲染默认值。
- 输入框显示的是 storage 原值；如果 storage 里是空字符串，输入框就显示空字符串。
- 只有复制动作才调用 `resolvePromptTemplateForCopy` 做 fallback。

- [ ] **Step 3: 把复制逻辑改成“当前用途模板 + 复制时 fallback”**

重写 `promptText` 的计算逻辑，使用 `resolvePromptTemplateForCopy`：

```ts
const storedTemplate = promptPurpose === "update" ? storedUpdatePromptTemplate : storedCreatePromptTemplate;
const templateForCopy = resolvePromptTemplateForCopy(storedTemplate, promptPurpose);

const promptText = buildPrompt({
  template: templateForCopy,
  cleanedJson: cleanedJsonText,
  url: parsedUrl.url,
  interfaceId: parsedUrl.interfaceId
});
```

要求：
- textarea 仍显示 storage 原值。
- 复制 toast 文案同步改成 `已复制更新 Prompt` / `已复制新增 Prompt`。

- [ ] **Step 4: 在 popup 中加入用途横向单选和 tooltip**

在 `Prompt 模板（持久化保存，可编辑占位符）` 上方或同分组内加入横向单选：
- `更新`
- `新增`

直接复用：
- `TooltipProvider` / `Tooltip` / `TooltipTrigger` / `TooltipContent`
- `RadioGroup` / `RadioField` / `Radio`

同时把复制按钮改成动态文案：
- `复制更新 Prompt`
- `复制新增 Prompt`

UI 要求：
- 现有 `复制 JSON` 区块保持不动。
- popup 至少补齐两处 tooltip：
  - `用途` 单选的 tooltip
  - 单个 Prompt 复制按钮的 tooltip，且文案随 `更新 / 新增` 切换
- 复制按钮 tooltip 文案对齐 spec，但明确“默认更新模板”的描述只对默认模板成立。

- [ ] **Step 5: 运行类型检查，确保 popup 状态和 UI 组件接线正确**

Run: `pnpm check:types`
Expected: 退出码为 0；`src/popup/index.tsx` 不再引用旧单 key。

- [ ] **Step 6: Commit**

```bash
git add src/popup/index.tsx src/popup/swqa/prompt.ts
git commit -m "feat: add swqa prompt purpose switching in popup"
```

### Task 4: 在 options 设置页加入 SWQA Prompt 模板编辑入口

**Files:**
- Modify: `src/options/routes/settings/base/index.tsx`
- Reference: `src/components/catalyst-ui-kit/fieldset.tsx`
- Reference: `src/components/catalyst-ui-kit/radio.tsx`
- Reference: `src/components/catalyst-ui-kit/textarea.tsx`
- Reference: `src/components/ui/tooltip.tsx`

- [ ] **Step 1: 在设置页添加 `SWQA Prompt 模板` 分组**

在 `src/options/routes/settings/base/index.tsx` 中增加一个新的 `Fieldset`，避免把 SWQA 配置混进“版本检查”或“功能开关”。

分组内容至少包括：
- `用途` 横向单选
- `Prompt 模板（持久化保存，可编辑占位符）`
- 占位符提示 `{{json}} / {{url}} / {{interfaceId}}`

- [ ] **Step 2: 复用与 popup 相同的双模板 storage 读写逻辑**

在 options 页也使用：

```ts
const [promptPurpose, setPromptPurpose] = useState<SwqaPromptPurpose>("update");
const [storedCreatePromptTemplate, , createPromptTemplateSetter] = useStorage(...);
const [storedUpdatePromptTemplate, , updatePromptTemplateSetter] = useStorage(...);
```

要求：
- 默认用途同样是 `更新`。
- options 页编辑的就是 popup 使用的同两份 storage 数据。
- 输入框使用现成的 `Textarea` 组件，不继续使用裸 `textarea`。
- options 输入框同样显示 storage 原值，不在渲染阶段 fallback 默认模板。

- [ ] **Step 3: 为设置页补 tooltip 和说明文案，但不要承诺系统强制行为**

设置页可以复用 popup 的 tooltip 文案，但要保持同一口径：
- “默认更新模板会引导模型先搜索现有实现……”
- “若你已自定义模板，则以当前模板内容为准”

不要在 options 页实现任何额外的模板校验、注入或阻止保存逻辑。

- [ ] **Step 4: 运行类型检查，确保 options 设置页通过**

Run: `pnpm check:types`
Expected: 退出码为 0；设置页新增字段不会破坏路由类型或组件导入。

- [ ] **Step 5: Commit**

```bash
git add src/options/routes/settings/base/index.tsx
git commit -m "feat: add swqa prompt template settings"
```

### Task 5: 完成变更记录、全量校验和手动 smoke

**Files:**
- Create: `.changeset/swqa-prompt-templates.md`
- Modify: `src/popup/index.tsx`
- Modify: `src/options/routes/settings/base/index.tsx`
- Modify: `src/storages/index.ts`
- Modify: `src/background/index.ts`
- Modify: `src/popup/swqa/prompt.ts`

- [ ] **Step 1: 添加 changeset**

创建一个 `patch` 级别的 changeset，摘要聚焦：
- SWQA Prompt 模板支持“更新 / 新增”双场景
- 更新模板可在 popup 和 options 中持久化编辑

- [ ] **Step 2: 运行全量校验**

Run: `pnpm verify`
Expected:
- `biome check --write .` 完成且无报错
- `tsc --noEmit` 退出码为 0

- [ ] **Step 3: 手动 smoke 验证 popup**

在已运行的开发环境中手动验证：
1. 打开 `swqa.gz.cvte.cn/interface/:id` 页面
2. 打开扩展 popup，确认默认用途为 `更新`
3. 在尚未点击 `提取并清洗` 前，确认页面始终只有一个 Prompt 复制按钮，默认文案为 `复制更新 Prompt`，且处于禁用态
4. 切换到 `新增`，确认仍然只有同一个 Prompt 复制按钮，文案变为 `复制新增 Prompt`，且仍处于禁用态
5. 点击 `提取并清洗`，确认提取成功后当前用途对应的 Prompt 复制按钮变为可点击
6. 将更新模板清空为空白，只点击 `复制更新 Prompt`，确认：
   - 剪贴板内容回退为默认更新模板生成的 Prompt
   - 输入区仍保持空白值
   - 关闭并重新打开 popup 后，更新模板仍保持空白值，说明 fallback 没有自动写回 storage
7. 确认 `用途` tooltip 存在；确认单个 Prompt 复制按钮 tooltip 会随 `更新 / 新增` 切换
8. 修改任一模板后关闭并重新打开 popup，确认模板值持久化
9. 确认 `复制 JSON` 按钮行为未受影响

- [ ] **Step 4: 手动 smoke 验证 options**

1. 打开 options 设置页 `/settings/base`
2. 找到 `SWQA Prompt 模板` 分组
3. 在 `更新` / `新增` 间切换，确认显示不同模板
4. 在 options 中写入一份自定义更新模板并保存
5. 刷新或重新打开 options 页面，确认自定义更新模板仍被保留
6. 重新打开 popup，确认能读到相同最新值
7. 确认 tooltip 文案存在，且“默认更新模板”说明不会阻止自定义模板保存

- [ ] **Step 5: 手动 smoke 验证旧模板迁移**

以一个包含旧 key 的升级态做验证：
1. 在扩展 storage 中只保留旧 `swqaPromptTemplate`，移除 `swqaCreatePromptTemplate` / `swqaUpdatePromptTemplate`
2. 触发扩展重新加载或执行升级初始化入口
3. 打开 popup 或 options，确认：
   - `swqaCreatePromptTemplate` 已继承旧模板值
   - `swqaUpdatePromptTemplate` 已写入更新默认模板
   - 旧模板不会覆盖任何已存在的新 key
4. 再构造“只有 create 存在”“只有 update 存在”的 partial state，确认结果与 spec 的优先级表一致

- [ ] **Step 6: Commit**

```bash
git add .changeset/swqa-prompt-templates.md src/popup/index.tsx src/options/routes/settings/base/index.tsx src/storages/index.ts src/background/index.ts src/popup/swqa/prompt.ts
git commit -m "feat: support create and update swqa prompt templates"
```
