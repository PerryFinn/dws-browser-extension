import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { splitShadowRootCss } from "wxt/utils/split-shadow-root-css";

type InsertPosition = "beforebegin" | "afterbegin" | "beforeend" | "afterend";

export interface MountReactShadowUiOptions {
  name: string;
  anchor: () => Element | null | Promise<Element | null>;
  insertPosition?: InsertPosition;
  cssText: string;
  render: () => ReactNode;
  timeoutMs?: number;
}

export interface MountedReactShadowUi {
  host: HTMLElement;
  root: Root;
  unmount: () => void;
}

const waitForAnchor = async (
  resolveAnchor: () => Element | null | Promise<Element | null>,
  timeoutMs: number
): Promise<Element | null> => {
  const immediateAnchor = await resolveAnchor();

  if (immediateAnchor) {
    return immediateAnchor;
  }

  return new Promise((resolve) => {
    let isSettled = false;

    const settle = (anchor: Element | null) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(anchor);
    };

    const observer = new MutationObserver(() => {
      void Promise.resolve(resolveAnchor()).then((anchor) => {
        if (anchor) {
          settle(anchor);
        }
      });
    });

    const timer = window.setTimeout(() => settle(null), timeoutMs);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  });
};

export const mountReactShadowUi = async ({
  name,
  anchor,
  insertPosition = "beforeend",
  cssText,
  render,
  timeoutMs = 10000
}: MountReactShadowUiOptions): Promise<MountedReactShadowUi | null> => {
  const hostId = `breeze-${name}`;

  if (document.getElementById(hostId)) {
    return null;
  }

  const resolvedAnchor = await waitForAnchor(anchor, timeoutMs);

  if (!resolvedAnchor) {
    return null;
  }

  const host = document.createElement("div");
  host.id = hostId;
  resolvedAnchor.insertAdjacentElement(insertPosition, host);

  const shadow = host.attachShadow({ mode: "open" });
  const { documentCss, shadowCss } = splitShadowRootCss(cssText.replaceAll(":root", ":host"));
  const style = document.createElement("style");
  style.textContent = shadowCss;

  let documentStyle: HTMLStyleElement | null = null;
  if (documentCss) {
    documentStyle = document.createElement("style");
    documentStyle.textContent = documentCss;
    documentStyle.setAttribute("data-breeze-shadow-root-document-styles", hostId);
    (document.head ?? document.body).append(documentStyle);
  }

  const rootElement = document.createElement("div");
  shadow.append(style, rootElement);

  const root = createRoot(rootElement);
  root.render(render());

  return {
    host,
    root,
    unmount() {
      root.unmount();
      documentStyle?.remove();
      host.remove();
    }
  };
};
