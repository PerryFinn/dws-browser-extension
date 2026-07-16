# Tailwind CSS v4 与依赖兼容修复设计

## 背景

项目刚完成一批依赖升级，其中包含 AI SDK、Biome、WXT、Vitest、Axios、Radix UI 和 `adm-zip` 等版本变化。现有工作区在升级后能够通过 `pnpm run verify` 和 `pnpm run package`，但检查发现三项应同步处理的问题：

- Biome 2.5 已弃用 `linter.rules.recommended`，需要改为 `linter.rules.preset: "recommended"`。
- AI SDK 7 仍兼容当前 `generateObject` 调用，但该 API 已弃用，需要迁移到 `generateText` 与 `Output.object`。
- `adm-zip@0.6` 已内置 TypeScript 类型，旧的 `@types/adm-zip@0.5` 已冗余并可能与运行时声明漂移。

用户同时要求将 Tailwind CSS 从 v3 升级到 v4，并确认采用 WXT 官方推荐的 CSS-first + Vite 插件方案。

## 目标

1. 将 Tailwind CSS 升级到 `4.3.2`，采用 `@tailwindcss/vite@4.3.2` 集成 WXT/Vite。
2. 保持 popup、options 和三个 Shadow DOM content script 的现有视觉语义与暗色模式行为。
3. 升级 `tailwind-merge` 到 `3.6.0`，使运行时 class 合并规则匹配 Tailwind v4。
4. 保留 daisyUI 5 和 `tailwindcss-animate` 的现有功能，并改用 Tailwind v4 的 CSS 插件声明。
5. 同步修复 Biome、AI SDK 和 `adm-zip` 类型问题。
6. 通过完整静态检查、测试、WXT 打包和关键页面冒烟验证后提交并推送 `develop`。

## 非目标

- 不重新设计 UI，不主动调整现有配色、间距、字体或组件结构。
- 不升级 pnpm 9。pnpm 在 Node 24 下的 `url.parse()` 警告来自包管理器自身，单独升级 pnpm 10 应作为后续工具链任务处理。
- 不修改生成文件 `src/options/routeTree.gen.ts`。
- 不引入新的浏览器权限或发布 changeset；本次为构建链和内部兼容迁移，不应产生用户可感知的新功能。

## 已确认的兼容性

- WXT 官方 Tailwind 示例使用 `@tailwindcss/vite` 和 Tailwind v4；当前项目的 WXT `0.20.27` 高于示例使用的 `0.20.5`。
- `@tailwindcss/vite@4.3.2` 的 peer dependency 覆盖 Vite 5 至 8，兼容项目当前 Vite `8.0.16`。
- daisyUI 5 官方支持 Tailwind v4，并支持通过 `@plugin "daisyui"` 从 CSS 加载。
- `tailwind-merge@2.6.0` 仅支持 Tailwind v3；v4 需要升级到 3.x。
- Tailwind v4 的浏览器基线是 Chrome 111+、Safari 16.4+ 和 Firefox 128+。当前 Chrome MV3 构建满足目标，但不再承诺更旧浏览器。

参考资料：

- [WXT Tailwind CSS 示例](https://github.com/wxt-dev/examples/tree/main/examples/tailwindcss)
- [Tailwind CSS v4 升级指南](https://tailwindcss.com/docs/upgrade-guide)
- [daisyUI 5 升级指南](https://daisyui.com/docs/upgrade/)
- [tailwind-merge 支持矩阵](https://github.com/dcastil/tailwind-merge)
- [WXT Shadow Root 文档级 CSS 修复](https://github.com/wxt-dev/wxt/pull/1594)

## 方案选择

### 采用：CSS-first + Tailwind Vite 插件

在 `wxt.config.ts` 中加载 `@tailwindcss/vite`，在 `src/style.css` 中使用 `@import "tailwindcss"`、`@theme inline`、`@custom-variant` 和 `@plugin` 表达所有 Tailwind 配置。删除旧 PostCSS 和 JavaScript 配置。

该方案与 WXT、Tailwind 和 daisyUI 的当前官方用法一致，避免继续维护过渡性的 `@config` 入口。

### 未采用：保留 `tailwind.config.ts`

通过 CSS 的 `@config` 指令继续加载旧配置可以缩小短期 diff，但会保留 Tailwind v3 风格的配置边界，后续仍需再次迁移。

### 未采用：`@tailwindcss/postcss`

Tailwind v4 提供独立 PostCSS 插件，但项目由 WXT/Vite 构建；官方对 Vite 项目推荐专用 Vite 插件，因此不保留 PostCSS 链路。

## 详细设计

### 1. 依赖与构建配置

`package.json` 和锁文件按以下规则调整：

- `tailwindcss`: `^4.3.2`
- 新增 `@tailwindcss/vite`: `^4.3.2`
- `tailwind-merge`: `^3.6.0`
- 保留 `daisyui@^5.6.18` 和 `tailwindcss-animate@^1.0.7`
- 删除直接依赖 `autoprefixer`、`postcss` 和 `@types/adm-zip`

Tailwind v4 Vite 插件负责 CSS 导入、厂商前缀和构建优化。`wxt.config.ts` 在现有 Vite 配置中增加 `plugins: [tailwindcss()]`，其余依赖预构建与路径别名保持不变。

删除：

- `postcss.config.js`
- `tailwind.config.ts`
- `src/global.d.ts` 中仅为旧 daisyUI/Tailwind 配置补充的模块声明

### 2. CSS-first 主题迁移

`src/style.css` 使用单一 Tailwind 入口，并保留 Google Fonts 导入：

- 使用 `@import "tailwindcss"` 替代三个 `@tailwind` 指令。
- 使用 `@plugin "daisyui"` 与 `@plugin "tailwindcss-animate"` 加载插件。
- 使用 `@custom-variant dark (&:where(.dark, .dark *))` 保持 `.dark` class 驱动的暗色模式。
- 使用 `@theme inline` 将现有 `background`、`foreground`、`primary`、`sidebar` 等 CSS 变量映射为 `--color-*` 主题 token。
- 将现有 `lg`、`md`、`sm` 圆角和 `sans` 字体映射为 v4 主题变量。
- 用自定义 `@utility container` 保留容器居中、`2rem` padding 和 `1400px` 的 2xl 最大宽度语义。
- 删除没有业务调用点的 `accordion-down`、`accordion-up` 自定义动画；实际使用的 `animate-in`、`fade-in-*`、`slide-in-*` 等继续由 `tailwindcss-animate` 提供。
- 保留现有 `:root`、`.dark` 变量、base layer、`.code` component layer 和 `@apply` 行为。
- 将默认 border color 的兼容 selector 扩展到伪元素、backdrop 和 file selector，继续使用项目的 `border` token。
- 保留 v3 的可点击按钮鼠标指针行为，避免升级后所有未显式声明 cursor 的按钮变成默认箭头。

Tailwind v4 默认样式存在少量基础行为变化，因此构建通过后仍需对 popup、options 和 content script 覆盖层做视觉冒烟检查。

### 3. 模板 class 语法迁移

项目的 Catalyst UI Kit 大量使用 `theme(colors.*)`、`bg-[--variable]` 等 Tailwind v3 语法，仅迁移 CSS 入口不足以保证视觉等价。

实施时使用官方 `@tailwindcss/upgrade@4.3.2` 处理模板 class 迁移，并逐项审查其 diff。迁移后执行针对性扫描并人工处理剩余模式：

- 把 v3 默认 scale 的 `shadow-sm`、`shadow`、`blur-sm`、`blur` 等迁为 v4 等价名称，保持原视觉值。
- 保留项目自行定义的 `rounded-sm`、`rounded-md`、`rounded-lg` token 语义；不因默认 scale 改名而破坏自定义圆角。
- 把用于无障碍焦点样式的 `outline-none` 迁为 `outline-hidden`。
- 把依赖 v3 三像素默认值的裸 `ring` 迁为 `ring-3`；已经显式使用 `ring-1` 等宽度的 class 不变。
- 把 CSS 变量任意值简写从 `[--variable]` 迁为 `(--variable)`。
- 把 arbitrary property 中的 `theme(colors.*)` 改为 v4 CSS theme variable 表达，避免继续依赖兼容函数。
- 检查带逗号的 grid/object-position 任意值、order-sensitive stacked variants、旧 important modifier 和已删除 utility，确保没有遗留 v3-only 写法。

迁移后的 source scan 不得再出现旧 CSS 变量简写或 `theme(colors.*)`；视觉相关 scale class 必须经过构建产物或冒烟验证确认。

### 4. Shadow DOM 样式隔离

三个 content script 通过 `?inline` 导入同一份 CSS，再由 `mountReactShadowUi` 写入自建 shadow root。Tailwind v4 会生成 `@property`，该规则必须位于文档级样式表，不能只写入 shadow root。

`src/wxt/content-shadow-ui.tsx` 使用 WXT 已导出的 `splitShadowRootCss`：

1. 先把 CSS 中的 `:root` 替换成 `:host`。
2. 将结果拆分为 `shadowCss` 和 `documentCss`。
3. `shadowCss` 写入 shadow root 内的 `<style>`。
4. 非空 `documentCss` 写入页面 `<head>` 或 `<body>` 的独立 `<style>`，并用当前 UI 实例可定位的属性标记。
5. `unmount()` 同时移除 React root、host 和文档级样式，避免扩展更新或页面重挂载后泄漏。

新增对应单元测试，覆盖 CSS 拆分、文档样式挂载、shadow 样式挂载和卸载清理。

### 5. AI SDK 7 结构化输出迁移

`src/background/generic-api-doc/provider.ts` 改用：

- `generateText`
- `Output.object({ schema, name })`
- `result.output`

依赖注入接口同步从 `generateObject` 调整为语义明确的结构化 `generateText` 调用，现有 JSON Schema、schema name、prompt 和本地 source 可信边界保持不变。

`tests/background/generic-api-doc/provider.test.ts` 先改测试期望，再改实现，继续验证连接测试、正式提取、schema 内容和忽略模型 source 的行为。

### 6. Biome 2.5 配置迁移

`biome.jsonc` 把：

```json
"recommended": true
```

改为：

```json
"preset": "recommended"
```

保留现有 `suspicious` 规则覆盖。最终 lint 输出不得再包含该弃用提示。

## 错误处理与回滚

- 如果 Tailwind 编译失败，优先根据 Vite 插件错误定位 CSS directive 或插件加载问题，不回退到旧 PostCSS 方案。
- 如果某个 v3 class 在 v4 中语义变化，优先在源组件中迁移为等价 v4 class；不通过全局兼容 hack 掩盖问题。
- 如果 Shadow DOM 样式出现缺失，检查构建 CSS 中的 `@property`、`:host` 和关键 utility 是否正确分流。
- 所有改动按原子提交组织。若冒烟验证暴露不可接受的视觉回归，可以独立回滚 Tailwind v4 提交，同时保留其他依赖兼容修复。

## 验证标准

自动验证：

1. `pnpm install --frozen-lockfile`
2. `pnpm run verify`
3. `pnpm run package`
4. `git diff --check`

针对性验证：

- AI provider 测试证明 `generateText + Output.object` 的请求和结果映射保持原行为。
- Shadow UI 测试证明文档级 CSS 与 shadow CSS 分流且卸载后无残留。
- 构建产物包含常用自定义 token utility、dark variant、动画 utility 和 daisyUI 样式。
- 扫描确认源码中不再保留 `theme(colors.*)`、`bg-[--*]` 等已迁移的 v3 模式。

手动冒烟：

- popup 正常渲染。
- options 的设置页、书签页和深色模式正常。
- GitLab inline、GitLab overlay、DWS config inline 三类 Shadow DOM UI 样式正常。

## 提交策略

设计文档单独提交。实施完成后至少拆分为两个原子提交：

1. `fix: 修复依赖升级后的兼容问题`
2. `chore: 升级 Tailwind CSS 至 v4`

最终在 fresh verify 和打包通过后，将当前 `develop` 分支连同已有的 TypeScript 7 提交一起推送到 `origin/develop`。
