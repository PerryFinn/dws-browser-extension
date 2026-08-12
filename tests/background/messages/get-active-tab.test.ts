import { afterEach, expect, test, vi } from "vitest";
import { getActiveTab } from "@/background/messages/getActiveTab";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("getActiveTab 返回当前活动标签页", async () => {
  const activeTab = { id: 42, title: "当前页面" } as chrome.tabs.Tab;
  const query = vi.fn((_queryInfo: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
    callback([activeTab]);
  });
  vi.stubGlobal("chrome", { tabs: { query } });

  await expect(getActiveTab()).resolves.toBe(activeTab);
  expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true }, expect.any(Function));
});

test("getActiveTab 在没有活动标签页时抛出明确错误", async () => {
  vi.stubGlobal("chrome", {
    tabs: {
      query: vi.fn((_queryInfo: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => callback([]))
    }
  });

  await expect(getActiveTab()).rejects.toThrow("未找到当前活动标签页");
});
