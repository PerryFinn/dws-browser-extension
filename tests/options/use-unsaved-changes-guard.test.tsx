import { expect, test, vi } from "vitest";
import { useUnsavedChangesGuard } from "@/options/use-unsaved-changes-guard";
import { renderHook } from "../helpers/react";

const mocks = vi.hoisted(() => ({ blocker: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useBlocker: mocks.blocker }));

test.each([
  { confirms: true, shouldBlock: false },
  { confirms: false, shouldBlock: true }
])("有草稿时确认离开=$confirms 对应阻止导航=$shouldBlock", async ({ confirms, shouldBlock }) => {
  const hook = await renderHook(() => useUnsavedChangesGuard({ isDirty: true, confirmMessage: "离开设置？" }));
  try {
    const confirm = vi.fn(() => confirms);
    window.confirm = confirm;
    const options = mocks.blocker.mock.lastCall?.[0];
    expect(options.disabled).toBe(false);
    expect(options.enableBeforeUnload()).toBe(true);
    expect(options.shouldBlockFn()).toBe(shouldBlock);
    expect(confirm).toHaveBeenCalledWith("离开设置？");
  } finally {
    await hook.cleanup();
  }
});

test("没有未保存修改时不启用路由与关闭页面拦截", async () => {
  const hook = await renderHook(() => useUnsavedChangesGuard({ isDirty: false }));
  try {
    const options = mocks.blocker.mock.lastCall?.[0];
    expect(options.disabled).toBe(true);
    expect(options.enableBeforeUnload()).toBe(false);
  } finally {
    await hook.cleanup();
  }
});
