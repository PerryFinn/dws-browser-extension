# TypeScript 类型与可维护性

## 1. 隐式 any 与广义 any

- 位置（代表性）：
  - `src/background/messages/exportXLSX.ts`: `ExportXLSXReqBody = { data: any }`, `ExportXLSXResBody = { success: boolean; error?: any }`
  - `src/background/messages/fetch.ts`: `data: any`，`let data: any = null`
  - `src/components/complex-ui/link-preview.tsx`: `handleMouseMove(event: any)`
  - `src/background/libs/xlsx/index.d.ts`：第三方声明中大量 `any`（可忽略或用本地封装限制暴露）。
- 建议：
  - 为消息体定义精确接口（如 `ExportXlsxRow`、`FetchRequestPayload`）。
  - UI 事件定义具体类型：`React.MouseEvent<HTMLDivElement>`。
  - 对第三方库 `any` 暴露，编写本地窄接口适配层，限制调用点泛型。

## 2. 错误类型收窄

- 问题：多数 `catch (error)` 后直接使用 `error.message`，在 TS 下建议使用 `unknown` 并做类型守卫。
- 示例位置：
  - `src/background/messages/fetch.ts`、`download.ts`、`parsingXLSX.ts`、`ping.ts`、`utils/*`。
- 建议：
  - 使用 `catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e) }`。

## 3. 全局类型与模块声明

- 位置：
  - `src/global.d.ts`：包含 `CommitInfo`、`WindowConfig`、资产模块声明。
- 建议：
  - 保持此文件精简稳定；如仅在少量文件使用，考虑局部类型导出（但对全局 `window.config` 声明保留合理）。

## 4. parseXMLtoObject 的健壮性

- 位置：`src/utils/index.ts`。
- 问题：使用正则解析 XML，只支持简单扁平结构，遇到嵌套或属性将失效。
- 建议：
  - 若协议稳定且简单，可保留；否则建议改用 `DOMParser` + 选择器解析，或引入轻量 XML 解析库。

## 5. Storage 初始化逻辑

- 位置：`src/storages/index.ts` 中 `initLocalStorage`
- 问题：
  - 逻辑疑似反了：当前写法仅当已有值时才写入默认值。
- 建议：
  - 逻辑应为：当取到的值是 `undefined` 时写默认值。
  - 示例：
    ```ts
    if (typeof (await storage.get(key)) === "undefined") {
      await storage.set(key, defaultValue)
    }
    ```

## 6. Storage 键类型可能过窄

- 位置：`src/storages/index.ts` 定义 `type StorageType = typeof storage.area;`，并用于 `storageMap` 的键。
- 风险：
  - 若 `storage.area` 在实例化后被推断为字面量类型 `"local"`，则 `storageMap` 中的 `"session"`/`"sync"` 会与类型不符（取决于 `@plasmohq/storage` 的类型定义）。
- 建议：
  - 显式定义联合：`type StorageType = "local" | "session" | "sync"`；或使用 `Record`：
    ```ts
    const storageMap: Record<"local" | "session" | "sync", Storage> = {
      local: storage,
      session: sessionStorage,
      sync: syncStorage
    } as const
    ```

## 7. tsconfig 增强建议

- 建议开启：`"strict": true`、`"noUncheckedIndexedAccess": true`、`"exactOptionalPropertyTypes": true`、`"noImplicitOverride": true`。
- 确认 `resolveJsonModule: true`（已从 Plasmo 基础模板继承时通常开启）。
