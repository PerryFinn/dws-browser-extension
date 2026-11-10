import { act, createElement } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import sessionHandler from "@/background/messages/genericCaptureSession";
import {
  createEmptyGenericCaptureSession,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import type { GenericCaptureSessionCommand } from "@/generic-api-doc/session-command";
import { Storage } from "@/lib/extension-storage";
import { GenericPanel } from "@/popup/generic/panel";
import {
  GENERIC_CAPTURE_SESSION_STORAGE_KEY,
  GENERIC_MODEL_CONFIG_STORAGE_KEY,
  GENERIC_MODEL_CONNECTION_STATUS_KEY
} from "@/storages/generic-api-doc";
import { deferred, renderElement } from "../../helpers/react";

const mocks = vi.hoisted(() => ({
  command: vi.fn(),
  send: vi.fn(),
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  backgroundSend: vi.fn(),
  error: vi.fn()
}));
vi.mock("@/lib/extension-messaging", () => ({
  sendToBackground: (message: { name: string; body: unknown }) =>
    message.name === "genericCaptureSession" ? mocks.command(message.body) : mocks.backgroundSend(message)
}));
vi.mock("@/storages", () => ({ storage: { get: mocks.storageGet, set: mocks.storageSet } }));
vi.mock("@/components/update-notice", () => ({ UpdateNotice: () => null }));
vi.mock("react-toastify", () => ({ ToastContainer: () => null, toast: { error: mocks.error, success: vi.fn() } }));
vi.mock("@/lib/extension-storage-hook", () => ({
  useStorage: ({ key }: { key: string }) => [
    key === GENERIC_CAPTURE_SESSION_STORAGE_KEY
      ? session
      : key === GENERIC_MODEL_CONFIG_STORAGE_KEY
        ? { apiType: "openai-compatible", baseUrl: "https://example.com/v1", modelId: "test", apiKey: "test-key" }
        : key === GENERIC_MODEL_CONNECTION_STATUS_KEY
          ? "untested"
          : "{{json}}",
    vi.fn(),
    { isLoading: false }
  ]
}));

let session = createEmptyGenericCaptureSession("test-session");
const renderPanel = async () => {
  const page = await renderElement(
    createElement(GenericPanel, {
      tab: { id: 1, url: "https://example.com/docs" } as chrome.tabs.Tab,
      onRefresh: vi.fn()
    })
  );
  vi.stubGlobal("chrome", { tabs: { sendMessage: mocks.send } });
  return page;
};
const findReadSelection = (container: HTMLElement) => {
  const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes("读取选区"));
  if (!button) throw new Error("未找到读取选区按钮");
  return button;
};

beforeEach(() => {
  vi.resetAllMocks();
  session = createEmptyGenericCaptureSession("test-session");
  mocks.command.mockImplementation(async (command: GenericCaptureSessionCommand) => {
    let result!: typeof session;
    await sessionHandler(
      { body: command },
      {
        send: (value) => {
          result = value;
        }
      }
    );
    return result;
  });
  mocks.storageGet.mockImplementation(async () => session);
  mocks.storageSet.mockImplementation(async (_key, next) => {
    session = next;
  });
  vi.spyOn(Storage.prototype, "get").mockImplementation(mocks.storageGet);
  vi.spyOn(Storage.prototype, "set").mockImplementation(mocks.storageSet);
  mocks.send.mockResolvedValue({ success: true });
});

test("等待采集 session 保存时即禁用重复采集", async () => {
  const saving = deferred<void>();
  mocks.storageSet.mockReturnValue(saving.promise);
  const page = await renderPanel();
  try {
    await act(async () => findReadSelection(page.container).click());
    expect(findReadSelection(page.container).disabled).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
  } finally {
    await act(async () => saving.resolve());
    await page.cleanup();
  }
});

test.each(["读取选区", "一键提取", "开始点选"])("%s 初始化期间卸载后恢复原会话，再次进入可继续采集", async (label) => {
  session = markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(session), {
    source: { tabId: 1, url: "https://example.com/docs", title: "文档", mode: "generic-selection" },
    capture: {
      visibleText: "GET /users",
      previewText: "GET /users",
      domSummary: null,
      pickedAt: 1,
      charCount: 10,
      truncated: false,
      qualityHints: []
    }
  });
  const previousSession = session;
  const saving = deferred<void>();
  mocks.storageSet.mockImplementationOnce(async (_key, next) => {
    session = next;
    await saving.promise;
  });
  const page = await renderPanel();
  try {
    const button = [...page.container.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(label)
    );
    if (!button) throw new Error(`未找到 ${label} 按钮`);
    await act(async () => button.click());
    expect(session.status).toBe("picking");

    await page.render(null);
    await act(async () => saving.resolve());

    expect(session).toEqual(previousSession);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(1, { type: "generic-picker:reset" });
    expect(mocks.backgroundSend).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();

    await page.render(
      createElement(GenericPanel, {
        tab: { id: 1, url: "https://example.com/docs" } as chrome.tabs.Tab,
        onRefresh: vi.fn()
      })
    );
    expect(findReadSelection(page.container).disabled).toBe(false);
  } finally {
    await act(async () => saving.resolve());
    await page.cleanup();
  }
});

test.each(["清空", "新采集"])("失效采集的收尾不覆盖后续%s会话", async (nextAction) => {
  const saving = deferred<void>();
  mocks.storageSet.mockImplementationOnce(async (_key, next) => {
    session = next;
    await saving.promise;
  });
  const page = await renderPanel();
  try {
    await act(async () => findReadSelection(page.container).click());
    await page.render(null);
    let nextSession = session;
    await act(async () => {
      const clearing = mocks.command({ type: "reset" });
      saving.resolve();
      nextSession = await clearing;
      if (nextAction === "新采集") nextSession = await mocks.command({ type: "start", previousSession: nextSession });
    });

    expect(session).toEqual(nextSession);
    expect(mocks.storageSet).toHaveBeenCalledTimes(nextAction === "新采集" ? 3 : 2);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(1, { type: "generic-picker:reset" });
  } finally {
    await act(async () => saving.resolve());
    await page.cleanup();
  }
});

test("清空提取后可以立即重新采集，旧错误不会重新出现", async () => {
  session = markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(session), {
    source: { tabId: 1, url: "https://example.com/docs", title: "文档", mode: "generic-selection" },
    capture: {
      visibleText: "GET /users",
      previewText: "GET /users",
      domSummary: null,
      pickedAt: 1,
      charCount: 10,
      truncated: false,
      qualityHints: []
    }
  });
  const extracting = deferred<unknown>();
  const capturing = deferred<void>();
  mocks.backgroundSend.mockReturnValue(extracting.promise);
  const page = await renderPanel();
  const clickButton = async (text: string) => {
    const button = [...page.container.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(text)
    );
    if (!button) throw new Error(`未找到 ${text} 按钮`);
    await act(async () => button.click());
  };
  try {
    await clickButton("提取并生成");
    await clickButton("取消/清空当前采集");
    expect(findReadSelection(page.container).disabled).toBe(false);
    mocks.storageSet.mockReturnValueOnce(capturing.promise);
    await clickButton("读取选区");
    await act(async () => extracting.resolve({ success: false, message: "旧请求失败" }));
    expect(findReadSelection(page.container).disabled).toBe(true);
    expect(page.container.textContent).not.toContain("旧请求失败");
    expect(mocks.error).not.toHaveBeenCalled();
  } finally {
    await act(async () => extracting.resolve({ success: false, message: "旧请求失败" }));
    await act(async () => capturing.resolve());
    await page.cleanup();
  }
});

test.each(["读取选区", "一键提取", "开始点选"])("%s 保存 session 失败时显示错误并恢复操作", async (label) => {
  mocks.storageSet.mockRejectedValueOnce(new Error("存储写入失败"));
  const page = await renderPanel();
  try {
    const button = [...page.container.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(label)
    );
    await act(async () => button?.click());
    expect(page.container.textContent).toContain("存储写入失败");
    expect(findReadSelection(page.container).disabled).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(session.status).toBe("idle");
  } finally {
    await page.cleanup();
  }
});
