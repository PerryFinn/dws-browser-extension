# scripts 目录约定

## 脚本语言

- 新增脚本必须使用 TypeScript，文件扩展名使用 `.ts`。
- package script 或文档中的执行方式应使用 `tsx scripts/<name>.ts`。
- 不要再新增 `.js` 脚本；除非外部工具链只能执行 JavaScript，且需要在代码或 PR 说明中写明原因。
- 修改现有 `.js` 脚本时，优先迁移为 `.ts` 并同步更新调用方。

## 执行约定

- 需要直接运行脚本时，优先使用 `pnpm tsx scripts/<name>.ts`。
- 脚本内保持 Node.js 运行时兼容，不依赖浏览器环境。

## 测试约定

- 脚本测试放在仓库顶层 `tests/scripts/`，不要放在 `scripts/` 目录内。
- 脚本测试使用 Node.js test runner 编写，并通过 `pnpm test` 统一执行。
