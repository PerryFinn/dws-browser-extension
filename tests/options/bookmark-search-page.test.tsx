import { act, type ComponentType, createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { deferred, renderElement } from "../helpers/react";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  history: vi.fn(),
  error: vi.fn()
}));
vi.mock("@/lib/extension-messaging", () => ({ sendToBackground: mocks.send }));
vi.mock("@/storages", () => ({ storage: {} }));
vi.mock("react-toastify", () => ({ toast: { error: mocks.error } }));
vi.mock("@/options/components/bookmark-search-settings", () => ({ BookmarkSearchSettings: () => null }));
vi.mock("@/lib/extension-storage-hook", () => ({
  useStorage: ({ key }: { key: string }) => [
    key === "bookmarkSearchModelConfig"
      ? { apiType: "openai-compatible", baseUrl: "https://example.com/v1", modelId: "test", apiKey: "test-key" }
      : ["文档", "代码"],
    vi.fn(),
    { isLoading: false, setStoreValue: mocks.history }
  ]
}));

import { Route } from "@/options/routes/bookmarks";

afterEach(() => vi.clearAllMocks());

const renderPage = () => renderElement(createElement(Route.options.component as ComponentType));
const searchFromHistory = async (container: HTMLElement) => {
  const button = [...container.querySelectorAll("button")].find((element) => element.textContent === "文档");
  if (!button) throw new Error("未找到搜索历史入口");
  await act(async () => button.click());
};

test("搜索失败显示错误，不显示无匹配结果", async () => {
  mocks.send.mockResolvedValue({ success: false, message: "模型暂时不可用" });
  const page = await renderPage();
  try {
    await searchFromHistory(page.container);
    expect(page.container.textContent).toContain("模型暂时不可用");
    expect(page.container.textContent).not.toContain("未找到相关书签");
    expect(mocks.history).not.toHaveBeenCalled();
  } finally {
    await page.cleanup();
  }
});

test("成功返回空数组才显示无匹配结果", async () => {
  mocks.send.mockResolvedValue({ success: true, matches: [], truncated: false });
  const page = await renderPage();
  try {
    await searchFromHistory(page.container);
    expect(page.container.textContent).toContain("未找到相关书签");
    expect(mocks.history).toHaveBeenCalledWith(["文档", "代码"]);
  } finally {
    await page.cleanup();
  }
});

test("旧搜索结束不关闭新搜索的加载状态，也不写入结果或历史", async () => {
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  mocks.send.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const page = await renderPage();
  try {
    await searchFromHistory(page.container);
    const input = page.container.querySelector("input");
    expect(input?.disabled).toBe(false);
    await act(async () => {
      const enter = new window.Event("keydown", { bubbles: true });
      Object.defineProperty(enter, "key", { value: "Enter" });
      input?.dispatchEvent(enter);
    });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    await act(async () => first.resolve({ success: true, matches: [], truncated: true }));
    expect(page.container.textContent).toContain("正在理解你的意图");
    expect(mocks.history).not.toHaveBeenCalled();
    await act(async () => second.resolve({ success: true, matches: [], truncated: false }));
    expect(page.container.textContent).not.toContain("正在理解你的意图");
    expect(page.container.textContent).toContain("未找到相关书签");
    expect(mocks.history).toHaveBeenCalledTimes(1);
  } finally {
    await page.cleanup();
  }
});
