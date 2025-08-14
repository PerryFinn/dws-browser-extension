# Web/Chrome API 使用规范建议

## 1. tabs 与 webNavigation

- 位置：`src/background/messages/openOrReplaceTab.ts`
- 问题：
  - `waitWebNavigationCompleted` 依赖 `chrome.webNavigation.onCompleted`，但切换到新 URL 时使用的是 `chrome.tabs.update`，与监听 tabId 一致性 OK，但需注意并发/多次触发。
- 建议：
  - 考虑使用 `chrome.tabs.onUpdated` 结合 `changeInfo.status === "complete"` 验证 URL 匹配，避免遗漏。

## 2. downloads/scripting 等权限使用

- 位置：`src/background/messages/download.ts`、`getWindowConfig.ts`
- 建议：
  - 调用前进行参数校验与错误分层；对 `scripting.executeScript` 保持纯读操作。

## 3. fetch/AbortController 超时

- 位置：`src/background/messages/ping.ts` 使用 `AbortController` 超时，实践良好。
- 建议：
  - 将超时作为参数或常量配置，便于统一治理。

## 4. XMLHttpRequest 适配

- 位置：`src/services/index.ts` 自封装 `xhrRequest`
- 建议：
  - 若仅少量使用，优先统一到 `fetch + AbortController`；
  - 若必须兼容特定环境，保持单一入口，补充超时与取消能力。
