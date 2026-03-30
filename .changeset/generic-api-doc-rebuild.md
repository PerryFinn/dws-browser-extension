---
"efficiency-assistant-extension": patch
---

重做通用 API 文档提取流程，改为 popup 发起、页面接管、session 恢复的状态模型。

收紧 Generic 数据边界：采集阶段增加最小化清洗与结构摘要，送模内容不再包含原始 outerHTML，结果中的 source 始终使用本地采集值。
