# Repository Guidelines

## 项目结构与模块组织

本仓库是基于 Plasmo 的浏览器扩展，技术栈为 React + TypeScript。

- `src/background`：后台入口与消息处理（`messages/*`）。
- `src/contents`：内容脚本与页面内覆盖层逻辑。
- `src/popup`：扩展弹窗；`src/options`：选项页应用（TanStack Router，含生成文件 `routeTree.gen.ts`）。
- `src/components`：共享组件（`ui`、`catalyst-ui-kit`、`complex-ui`）。
- `src/utils`、`src/services`、`src/storages`：工具函数、服务调用与存储封装。
- `assets`：静态资源；`scripts`：构建/上传脚本；`docs`：工程文档。

## 构建、测试与开发命令

- `pnpm dev`：并行启动 `tsr watch` 与 `plasmo dev`，用于本地开发。
- `pnpm lint`：执行 Biome 检查并自动修复格式与部分规则问题。
- `pnpm check:types`：执行 TypeScript 类型检查（不产出构建文件）。
- `pnpm verify`：执行基础校验（当前为 `pnpm lint && pnpm check:types`）。
- `pnpm build-zip`：生成路由产物并输出 zip 包到 `build/`。
- `pnpm build`：执行 `scripts/build-upload.ts`（构建并上传 CDN），仅在发布场景使用。
- `pnpm package`：通过 Plasmo 打包扩展。
- `pnpm changeset`：创建版本变更记录（写入 `.changeset/*.md`）。
- `pnpm changeset version`：根据 changeset 更新版本号并写入 `CHANGELOG.md`。
- `pnpm changeset status`：查看待发布的变更摘要。

## 任务完成标准

在完成代码变更（新增/修改/重构等）后，无需运行 `pnpm dev`，通常已手动开启，但**必须**运行 `pnpm verify` 确保代码质量与规范；若有错误，修复后再次执行 `pnpm verify`。

## 代码风格与命名规范

- 使用 TypeScript，2 空格缩进，分号，双引号，行宽上限 120。
- 以 `biome.jsonc` 为主规范；Prettier 用于导入排序。
- 文件名优先使用 kebab-case，例如 `copy-btn.tsx`、`getActiveTab.ts`。
- TanStack 路由文件遵循约定命名，如 `__root.tsx`、`$postId.tsx`。
- 不要手动编辑生成文件（如 `src/options/routeTree.gen.ts`）。

## 测试指南

当前 `package.json` 未提供 Jest/Vitest 等自动化测试命令。

- PR 最低验证要求：运行 `pnpm verify`，并手动冒烟验证 popup/options/content-script 关键路径。
- 新增可测试模块时，建议在同目录添加 `*.test.ts` 或 `*.test.tsx`，便于维护归属。

## Changeset 版本变更流程

- 用户可感知变更（`feat`、行为变更的 `fix`）提交 PR 时，需新增 changeset 文件。
- 执行 `pnpm changeset`，按提示选择包与版本级别（通常为 `patch`）。
- 合并前确认 `.changeset/*.md` 已提交；发布前执行 `pnpm changeset version` 生成最终版本与日志。
- 示例流程：`pnpm changeset` → `pnpm verify` → 提交 PR → 发布前 `pnpm changeset version`。

## 提交与 Pull Request 规范

- 提交信息建议沿用现有风格：`feat:`、`fix:`、`refactor:`、`chore:` + 简洁摘要。
- 保持提交原子性，避免把重构与功能改动混在同一提交中。
- PR 需包含：变更说明、影响范围/风险、手动验证步骤；涉及 UI 变更需附截图或录屏。
- 建议在发起 PR 前执行 `pnpm verify`，并在描述中注明验证结果。
- 面向版本发布或用户可感知变更时，补充 `.changeset/*.md`（见上方 Changeset 流程）。

## 安全与配置提示

- 扩展权限较宽（如 `<all_urls>`、`webRequest`、`downloads`），新增权限必须说明必要性。
- 禁止提交密钥、令牌或未审查的内部地址。
- 运行 `scripts/upload-*` 前先确认上传目标路径和环境，避免误传生产资源。
