# 通用 API 文档提取重做设计

## 背景

现有 Generic 链路已经暴露出三类结构性问题：

1. `popup` 内发起 `DOM picking` 后，交互依赖 `popup` 生命周期，导致主路径在真实浏览器里不稳。
2. `source.url/title/mode` 这类本地确定值被交给模型回填，结果存在可信边界错误。
3. 采集阶段没有真正实现“轻量预处理 + DOM 摘要”，而是把截断后的 `innerText` 和 `outerHTML` 直接送模。

由于该功能尚未实际投入使用，本次不再继续沿用当前 Generic 实现修补，而是进行一次完整重做。

## 重做目标

1. 保留 Generic 功能入口，但重做 Generic 数据流与状态管理。
2. 让 `popup -> 页面接管 -> storage session -> background extraction` 成为稳定主路径。
3. 让采集与模型配置解耦，用户可以先验证采集，再补模型配置。
4. 明确本地可信边界，模型不再决定 `source`。
5. 在送模前完成最小必要的文本清洗与结构摘要，默认不发送原始 `outerHTML`。
6. 为 Generic 重做补齐状态、清洗、边界和恢复相关测试。
7. 在关键边界处补充清晰代码注释，方便后续维护。

## 非目标

1. 不继续兼容当前 Generic 的内部状态模型。
2. 不引入 `Side Panel` 或独立页面承载新流程。
3. 不做 provider marketplace、复杂模型路由或批量提取。
4. 不在本次重做里扩展 SWQA 专用提取能力。
5. 默认不保留 `raw model output` 作为常规调试数据。

## 方案概览

本次确认采用以下形态：

1. 入口仍然在 `popup`。
2. 点击“开始点选”后，由页面内 `content script` 接管点选流程。
3. 点选结果写入本地 `storage session`。
4. 页面内给出轻量提示，引导用户重新打开 `popup`。
5. `popup` 重新打开后，从 `storage session` 恢复采集态、结果态和错误态。
6. 背景提取只读取“已清洗 capture + 本地 source”，并在本地覆盖最终结果中的 `source`。

## 模块设计

### Popup Orchestrator

职责：

1. 展示当前 Generic 状态。
2. 发起 `DOM picking` 或读取 `selection`。
3. 基于 `storage session` 恢复 `picked / extracting / done / error`。
4. 承担复制 JSON、复制 Prompt、重新采集、重新提取等动作。

边界：

1. 不再依赖 `useState` 持有关键采集结果。
2. 不再等待一个跨 `popup` 生命周期的异步消息响应。

### Page Picker Controller

职责：

1. 在页面内显示 hover 高亮。
2. 执行节点点选或读取选区。
3. 将原始命中目标交给 `Capture Sanitizer`。
4. 将清洗后的结果写入 `storage session`。
5. 在页面内显示轻提示，引导用户回到 `popup`。

边界：

1. 不负责模型调用。
2. 不负责定义最终提取结果结构。

### Capture Sanitizer

职责：

1. 从点选目标生成最小必要上下文。
2. 清理明显无关的 UI 文本噪声。
3. 生成稳定的 `previewText` 和 `domSummary`。

输出字段：

1. `visibleText`
2. `previewText`
3. `domSummary`
4. `pickedAt`

### Background Extractor

职责：

1. 读取已清洗的 capture。
2. 调用模型进行结构化提取。
3. 本地 normalize 并补齐可信字段。
4. 回写最终结果到 `storage session`。

关键原则：

1. `source` 是本地可信边界。
2. 模型只允许生成 `endpoint / request / response / uncertainties`。
3. 最终结果中的 `source` 一律以本地采集值为准。

## storage session 设计

新增一个独立 Generic session，用于连接 `popup`、页面脚本和背景提取：

```ts
type GenericCaptureSession = {
  sessionId: string;
  status: "idle" | "picking" | "picked" | "extracting" | "done" | "error";
  source: {
    tabId: number;
    url: string;
    title: string;
    mode: "generic-dom" | "generic-selection";
  } | null;
  capture: {
    visibleText: string;
    previewText: string;
    domSummary: string | null;
    pickedAt: number;
  } | null;
  result: GenericExtractionResult | null;
  error: string | null;
};
```

状态约束：

1. `idle -> picking`
2. `picking -> picked`
3. `picked -> extracting`
4. `extracting -> done`
5. `extracting -> error`
6. `error -> extracting`
7. 任意状态都可以显式 `reset` 回到 `idle`

恢复原则：

1. `popup` 每次打开都从 session 恢复状态。
2. 采集成功后，即使 `popup` 已经关闭，也不会丢失结果。
3. 提取失败时保留 `capture`，允许直接重试。

## 采集与预处理规则

### 采集模式

支持两种模式：

1. `generic-dom`
2. `generic-selection`

主路径为 `generic-dom`，`generic-selection` 作为兜底。

### 清洗规则

`visibleText` 只保留可见且有信息量的文本，默认过滤：

1. `script/style/noscript/template`
2. 按钮文案、复制提示、展开收起等明显 UI 噪声
3. 隐藏节点文本
4. 对提取无帮助的空白和重复短句

### DOM 摘要规则

`domSummary` 不是 HTML 片段，而是稳定结构摘要文本，建议只保留：

1. 标题层级
2. 表格存在信息，如列数、行数、表头
3. 列表存在信息
4. 代码块存在信息
5. 明显的“请求参数 / 返回参数 / 示例”分段信息

默认不保留：

1. 原始 `outerHTML`
2. `data-*`
3. `aria-*`
4. `class`
5. 内联事件属性

## Provider 输入与结果回收

### Provider 输入

送模输入包含：

1. 本地 `source`
2. `visibleText`
3. `previewText`
4. `domSummary`

不包含：

1. 原始 `outerHTML`
2. 原始页面属性集合

### 模型输出约束

模型输出只负责：

1. `endpoint`
2. `request`
3. `response`
4. `uncertainties`

本地回收阶段负责：

1. 用本地 `source` 覆盖最终结果
2. 做 schema 校验
3. 做基础语义校验
4. 把可恢复但不确定的内容写入 `uncertainties`

## 错误处理与回退策略

### 模型配置

采集不依赖模型配置。即使用户尚未填写 `API Key / Base URL / Model ID`，也允许先完成点选和采集预览。

只有在点击“提取并生成”时，才阻止缺失配置继续执行。

### 页面不支持

对 `chrome://`、`edge://`、`about:`、`file:` 这类页面，在 Generic 入口处直接报错，不进入 `picking`。

### picking 失败

当发生以下情况时：

1. 用户取消点选
2. 目标节点无有效文本
3. 页面脚本异常

处理原则：

1. 如果已有旧结果，保留旧结果。
2. 如果没有旧结果，回到 `idle`。
3. 页面内或 `popup` 内给出明确错误提示。

### extracting 失败

当模型调用、结构化或 normalize 失败时：

1. session 进入 `error`
2. 保留最后一次 `capture`
3. 用户可以直接重试

### 当前标签页不一致

如果 session 里的 `tabId/url` 与当前活动页面不一致：

1. `popup` 要明确提示结果来自其它页面
2. 提供 `清空并重新采集`
3. 不自动静默复用旧数据

## 文件拆分

建议文件形态如下：

1. `src/generic-api-doc/session.ts`
2. `src/generic-api-doc/sanitize.ts`
3. `src/generic-api-doc/dom-summary.ts`
4. `src/contents/generic-api-doc-picker.tsx`
5. `src/background/generic-api-doc/provider.ts`
6. `src/background/messages/genericExtractApiDoc.ts`
7. `src/popup/generic/panel.tsx`

## 迁移顺序

1. 先新增 `session / sanitize / dom-summary` 和对应测试。
2. 再改页面 picker，打通 `popup -> 页面接管 -> session`。
3. 再改 `popup`，切到 session 驱动。
4. 再收紧 `provider` 边界，移除模型对 `source` 的控制权。
5. 最后删除旧 Generic capture 逻辑与不再需要的消息形态。

## 测试策略

### 纯逻辑测试

1. `sanitize` 过滤隐藏文本
2. `sanitize` 不带出 `data-*`
3. `dom-summary` 保留标题、表格、代码块等结构
4. `session` 状态迁移合法

### 行为测试

1. `popup` 重新打开后可以恢复 `picked`
2. `extracting` 失败后仍可直接重试
3. 模型返回错误 `source` 时，最终结果仍使用本地 `source`
4. 当前页面与 session 页面不一致时，UI 给出明确提示

## 代码注释策略

本次重做要求在关键边界加上清晰注释，但不做逐行解释。

必须加注释的位置：

1. 页面 picker 文件头，解释为什么不能依赖 `popup` 生命周期。
2. `sanitize` 文件头，解释为什么只保留最小必要上下文。
3. `provider` 中覆盖 `source` 的位置，解释这是可信边界。
4. `session` 状态迁移处，解释各状态的含义和允许迁移。

## 验收标准

1. 用户可以在未配置模型时完成一次采集并在 `popup` 看到预览。
2. 用户从 `popup` 发起 `DOM picking` 后，页面内流程不受 `popup` 关闭影响。
3. 送模内容不包含原始 `outerHTML`。
4. 最终结果中的 `source` 始终来自本地采集。
5. 提取失败后不需要重新点选即可重试。
6. Generic 重做后的关键状态与边界都有测试覆盖。
