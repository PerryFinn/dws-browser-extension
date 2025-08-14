# 样式与 UI 体验

## 1. Toast 与可访问性

- 位置：`src/options/routes/__root.tsx` 引入 `ToastContainer`。
- 建议：
  - 统一全局配置（位置、自动关闭、主题）。
  - 控制并发吐司数量（已设置 `limit={6}`）。

## 2. 链接预览组件 `LinkPreview`

- 问题：`handleMouseMove(event: any)` 类型过宽。
- 建议：
  - 使用 `React.MouseEvent<HTMLElement>` 并在触发器上限定元素类型。

## 3. 交互动效 `Expandable`

- 建议：
  - 组件已封装良好；如用于高频交互，考虑降级动画和减少 reflow。
