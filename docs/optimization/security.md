# 高风险与安全类问题

> 关注 XSS、CSP、敏感 API 调用、DOM 注入与跨域风险。

## 1. innerHTML 写入（潜在 XSS）

- 位置：
  - `src/utils/hikCrypto.ts`（`HikSessionService.decodeString`）
    - 将 `str` 写入 `dom.innerHTML` 再读取 `textContent`，若 `str` 来自不可信输入，可能触发 XSS。
- 建议：
  - 避免使用 `innerHTML` 解析；改为使用 `DOMParser` 解析受信任的固定结构，或仅进行纯文本解码（如替换实体后直接返回）。
  - 如必须使用，需先对输入进行严格白名单过滤，禁止脚本/事件属性。

## 2. fetch 跨域与明文 HTTP

- 位置：
  - `src/utils/hikCrypto.ts` `getEncryptionFactors` / `submitLogin` 使用 `http://` 请求设备接口。
- 说明：
  - 设备环境可能只能 http，但需明确风险：明文传输、可被中间人攻击。
- 建议：
  - 若设备支持，优先使用 `https://`。
  - 增加超时/重试、错误分类，并在 UI 强提示网络风险。

## 3. chrome.scripting.executeScript 注入 MAIN 世界

- 位置：
  - `src/background/messages/getWindowConfig.ts`：在 `world: "MAIN"` 中读取 `window.config`。
- 说明：
  - 虽仅读取，但注入 MAIN 世界相关代码需严格限制传入 `func` 的行为，确保无副作用。
- 建议：
  - 保持函数纯读，无动态拼接；必要时在 `content` 世界与页面通信，避免直接 MAIN 注入。

## 4. 本地存储读取 GitLab localStorage

- 位置：
  - `src/contents/gitlab-inline.tsx`：读取 `window.localStorage` 指定键。
- 说明：
  - 读取第三方页面 `localStorage` 本身安全可控，但数据不可控，需健壮性与异常处理。
- 建议：
  - 保持 `try/catch`，同时对解析后的结构进行 schema 校验（如 zod）。

## 5. 上传脚本输出与错误处理

- 位置：
  - `scripts/build-upload.ts`：构建 + 上传日志包含 URL、错误直接 `throw`。
- 建议：
  - 错误输出避免泄露敏感 token（若后续接入鉴权）。
  - 记录摘要日志，详细日志可通过 `DEBUG` 环境变量控制。
