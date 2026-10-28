import { NodeFilter, parseHTML } from "linkedom";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { storage } from "@/storages";

const timestamp = new Date(2026, 0, 2, 3, 4, 5).toISOString();
const values: Record<string, unknown> = {};
type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
const listeners = new Set<StorageListener>();
let invalidate: (() => void) | undefined;

const startContentScript = async () => {
  const { default: contentScript } = await import("@/entrypoints/gitlab-ux-optimize.content");
  await contentScript.main({
    isInvalid: false,
    onInvalidated: (callback: () => void) => {
      invalidate = callback;
    }
  } as unknown as ContentScriptContext);
};

describe("GitLab 绝对时间配置", () => {
  beforeEach(() => {
    delete values.gitlabAbsoluteTimeEnabled;
    const { window } = parseHTML(
      `<!doctype html><html><body><input type="search"><time datetime="${timestamp}">2 weeks ago</time></body></html>`
    );
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("Element", window.Element);
    vi.stubGlobal("NodeFilter", NodeFilter);
    vi.stubGlobal("MutationObserver", window.MutationObserver);
    vi.stubGlobal("defineContentScript", (definition: unknown) => definition);
    vi.stubGlobal("chrome", {
      runtime: {},
      storage: {
        local: {
          get: (key: string, callback: (items: Record<string, unknown>) => void) => callback({ [key]: values[key] }),
          set: (items: Record<string, unknown>, callback: () => void) => {
            Object.assign(values, items);
            for (const listener of listeners) {
              listener(
                Object.fromEntries(Object.entries(items).map(([key, newValue]) => [key, { newValue }])),
                "local"
              );
            }
            callback();
          }
        },
        onChanged: {
          addListener: (listener: StorageListener) => listeners.add(listener),
          removeListener: (listener: StorageListener) => listeners.delete(listener)
        }
      }
    });
  });

  afterEach(() => {
    invalidate?.();
    invalidate = undefined;
    listeners.clear();
    vi.unstubAllGlobals();
  });

  it("未保存配置时默认显示绝对时间", async () => {
    await startContentScript();

    expect(document.querySelector("time")?.textContent).toBe("2026-01-02 03:04:05");
  });

  it("尊重已保存的关闭配置，仍保留搜索框优化", async () => {
    values.gitlabAbsoluteTimeEnabled = false;

    await startContentScript();

    expect(document.querySelector("time")?.textContent).toBe("2 weeks ago");
    expect(document.querySelector("input")?.getAttribute("autocomplete")).toBe("off");
  });

  it("设置变化会立即开关时间转换，重新加载仍保留关闭状态", async () => {
    const time = document.querySelector("time");
    assert(time);
    const textNode = time.firstChild as Text;
    await startContentScript();
    expect(time.firstChild).toBe(textNode);

    await storage.set("gitlabAbsoluteTimeEnabled", false);
    expect(time.textContent).toBe("2 weeks ago");
    textNode.data = "3 weeks ago";
    expect(time.textContent).toBe("3 weeks ago");

    await storage.set("gitlabAbsoluteTimeEnabled", true);
    expect(time.firstChild).toBe(textNode);
    expect(time.textContent).toBe("2026-01-02 03:04:05");

    await storage.set("gitlabAbsoluteTimeEnabled", false);
    invalidate?.();
    await startContentScript();
    expect(time.firstChild).toBe(textNode);
    expect(time.textContent).toBe("3 weeks ago");
  });

  it("内容脚本失效后清理配置监听并恢复原显示", async () => {
    await startContentScript();

    invalidate?.();

    expect(listeners.size).toBe(0);
    expect(document.querySelector("time")?.textContent).toBe("2 weeks ago");
    await storage.set("gitlabAbsoluteTimeEnabled", true);
    expect(document.querySelector("time")?.textContent).toBe("2 weeks ago");
  });
});
