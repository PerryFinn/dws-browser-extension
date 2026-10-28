# Breeze

## 1.0.0

### Major Changes

- 1b0b2cb: 品牌重命名为 Breeze

### Minor Changes

- 1b0b2cb: 实现智能书签搜索功能，支持通过 AI 模型语义搜索浏览器书签

### Patch Changes

- 29995f9: 新增通用 API 文档选区一键提取，可通过按钮或 Command/Ctrl + Enter 连续完成读取与模型提取。
- d18473c: 移除海康（Hikvision）相关功能代码，包括密码加密、会话登录及批量凭证验证模块。
- 727f6ed: 新增通用 API 文档提取能力：

  - 在保留现有 SWQA 快路径的前提下，popup 新增通用提取面板
  - 支持用户点选页面区域或读取当前选中文本，生成统一 JSON 和可复制 Prompt
  - options 新增 Generic 模型配置、测试连接和 Prompt 模板设置

- 49ce212: 通用 API 文档提取调整 AI 服务配置：

  - 移除官方 OpenAI provider，模型服务统一走 OpenAI 兼容协议（`openai-compatible`），保留 `apiType` 字段以便后续扩展其它 provider。
  - 构造模型前对 Base URL、Model ID、API Key 做首尾空白清理，避免复制粘贴携带空格或换行导致鉴权或地址错误。

- cc67c1d: 重做通用 API 文档提取流程，改为 popup 发起、页面接管、session 恢复的状态模型。

  收紧 Generic 数据边界：采集阶段增加最小化清洗与结构摘要，送模内容不再包含原始 outerHTML，结果中的 source 始终使用本地采集值。

- GitLab 页面默认按浏览器本地时区显示 `YYYY-MM-DD HH:mm:ss` 格式的绝对时间，支持翻页和动态刷新；可在基本配置中开关，自动保存并立即生效。转换和恢复时保留原文本节点、包装元素及交互，关闭后恢复 GitLab 最近写入的时间文字，后续原生更新仍正常生效。无法唯一定位时间文字的复杂内容保持原样。开关旁提供问号提示，用具体例子说明功能效果。
- 1b0b2cb: GitLab 浮动面板展开后自动聚焦搜索框
- 9032c8a: GitLab 浮动面板使用 Frecency 算法排序常访问项目
- 5e1f45a: 为 GitLab 项目浮层增加自定义项目名称展示与编辑。
- 19f3126: 修复 popup 中通用 API 文档提取面板的设置按钮跳转，点击后会直接进入基本配置页而不是设置首页。
- 50dbd41: 将 SWQA 与通用 API 文档提取的模型相关配置编辑统一收口到 options，并改为点击保存后才写入本地 storage。popup 不再直接修改这些配置，只提供只读预览和跳转设置入口；同时为 popup 增加已保存配置加载态保护，并清理遗留的旧 storage key。

## 0.4.1

### Patch Changes

- fix: 修复弹窗用途选项默认值并持久化用户选择

## 0.4.0

### Minor Changes

- f58e19c: 添加更新接口的 prompt 提示

### Patch Changes

- 49ae6b3: 支持 SWQA Prompt 模板按“更新 / 新增”双场景分别持久化编辑，并让 popup 与 options 都根据当前用途读取对应模板。

## 0.3.0

### Minor Changes

- 1423917: 添加悬浮按钮快速筛选项目

### Patch Changes

- 1f9e277: 更新依赖
- acb4aef: 修复构建脚本死循环的问题

## 0.1.1

### Patch Changes

- 7e65bca: 添加自动化打包上传脚本

## 0.1.0

### Minor Changes

- 06b4504: 添加window.config展示面板，扩展options页面
