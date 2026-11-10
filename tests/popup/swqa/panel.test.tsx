import { act, createElement } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { SwqaPanel } from "@/popup/swqa/panel";
import { deferred, renderElement } from "../../helpers/react";

const mocks = vi.hoisted(() => ({ send: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/extension-messaging", () => ({ sendToBackground: mocks.send }));
vi.mock("@/storages", () => ({ storage: {} }));
vi.mock("@/components/update-notice", () => ({ UpdateNotice: () => null }));
vi.mock("react-toastify", () => ({
  ToastContainer: () => null,
  toast: { error: mocks.error, success: mocks.success }
}));
vi.mock("@/lib/extension-storage-hook", () => ({
  useStorage: () => [{ create: "{{json}}", update: "{{json}}" }, vi.fn(), { isLoading: false }]
}));

const response = { success: true, data: { detail: { name: "用户列表", path: "/users", method: "GET" } } };
const renderPanel = () =>
  renderElement(
    createElement(SwqaPanel, {
      tab: { id: 1, url: "https://swqa.gz.cvte.cn/interface/1" } as chrome.tabs.Tab,
      parsedUrl: {
        ok: true,
        interfaceId: "1",
        url: "https://swqa.gz.cvte.cn/interface/1",
        hostname: "swqa.gz.cvte.cn"
      },
      onRefresh: vi.fn()
    })
  );
const button = (container: HTMLElement, label: string) => {
  const match = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes(label));
  if (!match) throw new Error(`未找到 ${label}`);
  return match;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

test("重试期间保留上次结果，失败后恢复复制并显示错误", async () => {
  mocks.send.mockResolvedValueOnce(response);
  const page = await renderPanel();
  const retry = deferred<unknown>();
  try {
    await act(async () => button(page.container, "提取并清洗").click());
    expect(page.container.querySelector("pre")?.textContent).toContain("/users");
    mocks.send.mockReturnValueOnce(retry.promise);
    await act(async () => button(page.container, "提取并清洗").click());
    expect(button(page.container, "复制 JSON").disabled).toBe(true);
    expect(page.container.querySelector("pre")?.textContent).toContain("/users");
    await act(async () => retry.resolve({ success: false, message: "SWQA 暂时不可用" }));
    expect(page.container.textContent).toContain("SWQA 暂时不可用");
    expect(button(page.container, "复制 JSON").disabled).toBe(false);
    expect(page.container.querySelector("pre")?.textContent).toContain("/users");
  } finally {
    retry.resolve(response);
    await page.cleanup();
  }
});

test("面板卸载后不为迟到响应显示成功或错误通知", async () => {
  const pending = deferred<unknown>();
  mocks.send.mockReturnValue(pending.promise);
  const page = await renderPanel();
  await act(async () => button(page.container, "提取并清洗").click());
  await page.cleanup();
  await act(async () => pending.resolve(response));
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.error).not.toHaveBeenCalled();
});
