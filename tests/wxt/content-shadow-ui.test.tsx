import { parseHTML } from "linkedom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReactShadowUi } from "@/wxt/content-shadow-ui";

const reactRoot = vi.hoisted(() => ({
  render: vi.fn(),
  unmount: vi.fn()
}));

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => reactRoot)
}));

const cssText = `
  :root { --color: red; }
  @property --tw-test {
    syntax: "*";
    inherits: false;
  }
  .block { display: block; }
`;

const mountTestUi = () =>
  mountReactShadowUi({
    name: "test-shadow-ui",
    anchor: () => document.querySelector("#anchor"),
    cssText,
    render: () => null
  });

describe("mountReactShadowUi", () => {
  beforeEach(() => {
    const { window } = parseHTML("<!doctype html><html><head></head><body><main id='anchor'></main></body></html>");
    vi.stubGlobal("window", window);
    vi.stubGlobal("document", window.document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("将 @property 注入 document 并保留其余 Shadow DOM 样式", async () => {
    const mounted = await mountTestUi();

    expect(mounted).not.toBeNull();
    const shadowCss = mounted?.host.shadowRoot?.querySelector("style")?.textContent ?? "";
    const documentStyle = document.head.querySelector(
      "style[data-breeze-shadow-root-document-styles='breeze-test-shadow-ui']"
    );

    expect(shadowCss).toContain(":host");
    expect(shadowCss).toContain(".block");
    expect(shadowCss).not.toContain("@property");
    expect(documentStyle?.textContent).toContain("@property --tw-test");

    mounted?.unmount();
  });

  it("卸载时同时清理 React、host 和 document 样式", async () => {
    const mounted = await mountTestUi();
    const documentStyle = document.head.querySelector(
      "style[data-breeze-shadow-root-document-styles='breeze-test-shadow-ui']"
    );

    expect(mounted).not.toBeNull();
    expect(documentStyle).not.toBeNull();

    mounted?.unmount();

    expect(reactRoot.unmount).toHaveBeenCalledOnce();
    expect(document.querySelector("#breeze-test-shadow-ui")).toBeNull();
    expect(documentStyle?.isConnected).toBe(false);
  });
});
