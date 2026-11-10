import { parseHTML } from "linkedom";
import * as React from "react";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

export const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

export const renderElement = async (element: ReactNode) => {
  const { window } = parseHTML("<!doctype html><html><body><div id='root'></div></body></html>");
  for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver", "Event", "MouseEvent"] as const) {
    vi.stubGlobal(key, key === "window" ? window : window[key]);
  }
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = window.document.getElementById("root") as HTMLElement;
  const root = createRoot(container);
  const render = async (nextElement: ReactNode) => {
    await act(async () => root.render(nextElement));
  };
  await render(element);
  return {
    container,
    render,
    cleanup: async () => {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  };
};

function HookHarness<T>({ useHook, onRender }: { useHook: () => T; onRender: (value: T) => void }) {
  onRender(useHook());
  return null;
}

export const renderHook = async <T,>(useHook: () => T) => {
  let current!: T;
  const rendered = await renderElement(
    React.createElement(HookHarness<T>, {
      useHook,
      onRender: (value) => {
        current = value;
      }
    })
  );
  return { ...rendered, current: () => current };
};
