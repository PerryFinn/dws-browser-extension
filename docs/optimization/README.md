# 代码质量与性能优化总览

本文档汇总本仓库的潜在问题与可落地优化建议，按风险与影响排序，并提供定位信息与建议方案。所有条目均来自于全仓库静态检索与快速审阅，非运行期结果，建议在修复后结合 `pnpm build` 与实际浏览器调试验证。

- 宗旨：渐进式治理，先修正高风险问题，再处理体验与风格优化。
- 参考规范：TypeScript 最佳实践、Chrome MV3 安全与权限、Plasmo 官方建议、Tailwind/Shadcn/Radix 组件规范。

## 快速导航

- [高风险与安全类问题](./security.md)
- [TypeScript 类型与可维护性](./typescript.md)
- [日志与调试输出](./logging.md)
- [Web/Chrome API 使用规范](./browser-apis.md)
- [性能与资源使用优化](./performance.md)
- [样式与 UI 体验](./ui.md)
- [权限最小化建议（manifest）](./permissions.md)
- [后续可实施路线图](./roadmap.md)
