---
"efficiency-assistant-extension": patch
---

将 SWQA 与通用 API 文档提取的模型相关配置编辑统一收口到 options，并改为点击保存后才写入本地 storage。popup 不再直接修改这些配置，只提供只读预览和跳转设置入口；同时为 popup 增加已保存配置加载态保护，并清理遗留的旧 storage key。
