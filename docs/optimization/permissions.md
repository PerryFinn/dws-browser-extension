# 权限最小化建议（manifest）

> 来自 `package.json` 中的 `manifest` 字段（Plasmo 将合成 MV3 manifest）。

当前声明：
- host_permissions: `<all_urls>`
- permissions:
  - `storage`, `unlimitedStorage`, `scripting`, `tabs`, `notifications`, `debugger`, `contextMenus`, `webRequest`, `webNavigation`, `downloads`

建议分级：
- 必要：`storage`, `scripting`, `tabs`, `downloads`（视功能保留）
- 条件/可选：`notifications`, `contextMenus`（按实际功能开启）
- 高敏感：`debugger`, `webRequest`, `webNavigation`, `unlimitedStorage`, `host_permissions: <all_urls>`

优化方向：
1. 尽量以匹配规则最小化 `host_permissions`（如限定到 `gitlab.gz.cvte.cn/*` 和需要的设备地址段）。
2. 将 `webRequest`, `webNavigation` 挪为可选权限，按需申请。
3. 评估是否需要 `debugger`（极高敏感权限）。
4. 如非强需求，移除 `unlimitedStorage`。
