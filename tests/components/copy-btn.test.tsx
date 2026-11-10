import { act, createElement } from "react";
import { expect, test, vi } from "vitest";
import CopyButton from "@/components/copy-btn";
import { deferred, renderElement } from "../helpers/react";

const mocks = vi.hoisted(() => ({ copy: vi.fn() }));
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  copyToClipboard: mocks.copy
}));

test("复制未完成时阻止重复提交，失败后允许重试", async () => {
  const copying = deferred<boolean>();
  mocks.copy.mockReturnValueOnce(copying.promise).mockResolvedValueOnce(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  const page = await renderElement(createElement(CopyButton, { text: "GET /users" }));
  try {
    const button = page.container.querySelector("button");
    await act(async () => button?.click());
    expect(button?.disabled).toBe(true);
    await act(async () => copying.resolve(false));
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute("aria-label")).toBe("复制");
    await act(async () => button?.click());
    expect(button?.getAttribute("aria-label")).toBe("已复制");
    expect(mocks.copy).toHaveBeenCalledTimes(2);
  } finally {
    await page.cleanup();
  }
});

test("成功反馈一秒后恢复，卸载时清理反馈计时器", async () => {
  mocks.copy.mockResolvedValue(true);
  const page = await renderElement(createElement(CopyButton, { text: "GET /users" }));
  vi.useFakeTimers();
  try {
    const button = page.container.querySelector("button");
    await act(async () => button?.click());
    expect(button?.getAttribute("aria-label")).toBe("已复制");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(button?.getAttribute("aria-label")).toBe("复制");
    await act(async () => button?.click());
  } finally {
    await page.cleanup();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  }
});
