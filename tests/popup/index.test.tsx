import { act, createElement } from "react";
import { expect, test, vi } from "vitest";
import { renderElement } from "../helpers/react";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/extension-messaging", () => ({ sendToBackground: mocks.send }));
vi.mock("@/popup/generic/panel", () => ({
  GenericPanel: ({
    tab,
    pageError,
    onRefresh
  }: {
    tab: { url?: string } | null;
    pageError: string | null;
    onRefresh: () => void;
  }) =>
    createElement(
      "div",
      null,
      tab?.url,
      pageError,
      createElement("button", { type: "button", onClick: onRefresh }, "刷新")
    )
}));
vi.mock("@/popup/swqa/panel", () => ({ SwqaPanel: () => null }));

import IndexPopup from "@/popup";

test("刷新标签页失败后清理旧页面上下文，显示当前错误", async () => {
  mocks.send.mockResolvedValueOnce({ id: 1, url: "https://example.com/previous-page" });
  const page = await renderElement(createElement(IndexPopup));
  try {
    expect(page.container.textContent).toContain("https://example.com/previous-page");
    mocks.send.mockRejectedValueOnce(new Error("无法读取当前标签页"));
    await act(async () => page.container.querySelector("button")?.click());
    expect(page.container.textContent).toContain("无法读取当前标签页");
    expect(page.container.textContent).not.toContain("https://example.com/previous-page");
  } finally {
    await page.cleanup();
  }
});
