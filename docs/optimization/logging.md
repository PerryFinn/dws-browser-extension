# 日志与调试输出

## 1. 生产环境 console.* 清理

- 位置（部分）：
  - `src/background/index.ts`、`src/background/messages/*`、`src/utils/*`、`scripts/*`、`popup/*` 等多处存在 `console.log / error`。
- 建议：
  - 引入简单日志工具：开发环境输出，生产环境按级别上报或禁用。
  - 对 `scripts/*` 属于构建期脚本，保留必要日志即可。

## 2. 错误信息一致性

- 建议：
  - 保持错误前缀与模块名一致，例如：`[openOrReplaceTab] error: ...`。
  - 对用户可见错误与内部错误分层处理，UI 使用友好提示，控制台输出详细栈。
