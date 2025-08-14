# 后续可实施路线图

## 第一阶段（本周可落地）
- 修复 `initLocalStorage` 逻辑（仅在值缺失时写默认值）。
- 收窄 `any` 类型：`link-preview` 事件类型、`fetch` 消息体与返回体结构化。
- 为所有 `catch` 使用 `unknown` 并添加类型守卫。
- 为 `scripts/*` 保留日志，业务代码按环境裁剪 `console.*`。
- 权限梳理：移除不必要的 `debugger / unlimitedStorage`（若确实无用）。

## 第二阶段（本月内）
- 为 `getFrequentProjects` 加 JSON schema 校验（zod）。
- 为 `parseXMLtoObject` 替换为 `DOMParser` 实现或轻量库。
- 统一网络层（封装 `fetch` 带超时/取消/重试），替代零散 `XMLHttpRequest`。
- 对 `Hik` 设备接口增加更明确错误码与 UI 友好提示。

## 第三阶段
- 按需构建与懒加载重型组件（如复杂动效组件）。
- 单元测试：对工具函数与消息处理器补充基础用例。
- 引入错误上报与性能监控（可选）。
