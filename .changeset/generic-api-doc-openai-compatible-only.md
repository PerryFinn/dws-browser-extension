---
"efficiency-assistant-extension": patch
---

通用 API 文档提取调整 AI 服务配置：

- 移除官方 OpenAI provider，模型服务统一走 OpenAI 兼容协议（`openai-compatible`），保留 `apiType` 字段以便后续扩展其它 provider。
- 构造模型前对 Base URL、Model ID、API Key 做首尾空白清理，避免复制粘贴携带空格或换行导致鉴权或地址错误。
