# 性能与资源使用

## 1. 计时器与轮询

- 位置：
  - `src/components/complex-ui/background-beams-with-collision.tsx`: `setInterval` 检测碰撞、多个 `setTimeout` 重置状态。
- 建议：
  - 在组件卸载时清理，现有已清理 interval；可进一步：
    - 合并多个 `setTimeout` 到单个调度函数。
    - 降低轮询频率或使用 `requestAnimationFrame`（与 50ms 对比再评估）。

## 2. 懒加载与按需加载

- 建议：
  - 大型 UI 组件（如 `background-beams-with-collision`）在非必要页面按需加载，结合动态导入。
  - 视频资源在 Preview 中已做静态/动态区分，进一步可按视窗懒加载。

## 3. 列表排序与渲染

- 位置：`src/contents/gitlab-inline.tsx` 对项目列表排序再渲染。
- 建议：
  - 使用 `useMemo` 已在，良好；可考虑列表虚拟化（大量数据时）。
