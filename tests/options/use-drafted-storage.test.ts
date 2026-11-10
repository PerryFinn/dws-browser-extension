import { parseHTML } from "linkedom";
import React, { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import type { StorageCallback, StorageCallbackMap } from "@/lib/extension-storage";
import { useDraftedStorageValue } from "@/options/use-drafted-storage";
import { renderElement } from "../helpers/react";

const STORAGE_KEY = "drafted-setting";
type GlobalThisWithActEnvironment = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
interface HookState {
  savedValue: string;
  draftValue: string;
  setDraftValue: React.Dispatch<React.SetStateAction<string>>;
  isHydrated: boolean;
  isSaving: boolean;
  isDirty: boolean;
  resetDraft: () => void;
  saveDraft: () => Promise<string>;
}
const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};
class FakeStorage {
  private readonly values = new Map<string, unknown>();
  private readonly getResolvers = new Map<string, () => Promise<unknown>>();
  private readonly watchers = new Map<string, Set<StorageCallback>>();
  constructor(initialValues: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initialValues)) {
      this.values.set(key, value);
    }
  }
  setDeferredGet(key: string, promise: Promise<unknown>) {
    this.getResolvers.set(key, () => promise);
  }
  async get<T>(key: string): Promise<T | undefined> {
    const getResolver = this.getResolvers.get(key);
    if (getResolver) {
      return (await getResolver()) as T | undefined;
    }
    return this.values.get(key) as T | undefined;
  }
  async set(key: string, value: unknown): Promise<null> {
    const oldValue = this.values.get(key);
    this.values.set(key, value);
    this.emit(key, oldValue, value);
    return null;
  }
  watch(callbackMap: StorageCallbackMap): boolean {
    for (const [key, callback] of Object.entries(callbackMap)) {
      const callbackSet = this.watchers.get(key) ?? new Set();
      callbackSet.add(callback);
      this.watchers.set(key, callbackSet);
    }
    return true;
  }
  unwatch(callbackMap: StorageCallbackMap): boolean {
    for (const [key, callback] of Object.entries(callbackMap)) {
      const callbackSet = this.watchers.get(key);
      if (!callbackSet) {
        continue;
      }
      callbackSet.delete(callback);
      if (callbackSet.size === 0) {
        this.watchers.delete(key);
      }
    }
    return true;
  }
  emitExternal(key: string, value: unknown) {
    const oldValue = this.values.get(key);
    this.values.set(key, value);
    this.emit(key, oldValue, value);
  }
  private emit(key: string, oldValue: unknown, newValue: unknown) {
    const callbackSet = this.watchers.get(key);
    if (!callbackSet) {
      return;
    }
    for (const callback of callbackSet) {
      callback({ oldValue, newValue });
    }
  }
}
const setupDom = () => {
  const { window } = parseHTML("<!doctype html><html><body><div id='root'></div></body></html>");
  const globalWithActEnvironment = globalThis as GlobalThisWithActEnvironment;
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    navigatorDescriptor: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    MutationObserver: globalThis.MutationObserver,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT
  };
  globalThis.window = window as typeof globalThis.window;
  globalThis.document = window.document as typeof globalThis.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
    writable: true
  });
  globalThis.HTMLElement = window.HTMLElement as typeof globalThis.HTMLElement;
  globalThis.Node = window.Node as typeof globalThis.Node;
  globalThis.MutationObserver = window.MutationObserver as typeof globalThis.MutationObserver;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((handle: number) => {
    clearTimeout(handle);
  }) as typeof globalThis.cancelAnimationFrame;
  globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  return {
    container: window.document.getElementById("root") as HTMLElement,
    restore: () => {
      globalThis.window = previousGlobals.window;
      globalThis.document = previousGlobals.document;
      if (previousGlobals.navigatorDescriptor) {
        Object.defineProperty(globalThis, "navigator", previousGlobals.navigatorDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "navigator");
      }
      globalThis.HTMLElement = previousGlobals.HTMLElement;
      globalThis.Node = previousGlobals.Node;
      globalThis.MutationObserver = previousGlobals.MutationObserver;
      globalThis.requestAnimationFrame = previousGlobals.requestAnimationFrame;
      globalThis.cancelAnimationFrame = previousGlobals.cancelAnimationFrame;
      globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT = previousGlobals.IS_REACT_ACT_ENVIRONMENT;
    }
  };
};
const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
function DraftHookHarness({
  storage,
  onRender,
  isEqual
}: {
  storage: FakeStorage;
  onRender: (state: HookState) => void;
  isEqual?: (saved: string, draft: string) => boolean;
}) {
  const state = useDraftedStorageValue<string>({
    storage: storage as never,
    storageKey: STORAGE_KEY,
    defaultValue: "default-template",
    isEqual
  });
  onRender(state);
  return null;
}
const renderDraftHook = async (storage: FakeStorage) => {
  const dom = setupDom();
  let root: Root | null = null;
  let latestState: HookState | null = null;
  await act(async () => {
    root = createRoot(dom.container);
    root.render(
      React.createElement(DraftHookHarness, {
        storage,
        onRender: (state) => {
          latestState = state;
        }
      })
    );
  });
  return {
    getState: () => {
      if (!latestState) {
        throw new Error("Hook state is not ready");
      }
      return latestState;
    },
    cleanup: async () => {
      const currentRoot = root;
      if (currentRoot) {
        await act(async () => {
          currentRoot.unmount();
        });
      }
      dom.restore();
    }
  };
};
test("useDraftedStorageValue 在 hydration 完成前保持 loading 状态，完成后再暴露已保存值", async () => {
  const storage = new FakeStorage();
  const deferred = createDeferred<string | undefined>();
  storage.setDeferredGet(STORAGE_KEY, deferred.promise);
  const harness = await renderDraftHook(storage);
  try {
    expect(harness.getState().isHydrated).toBe(false);
    expect(harness.getState().draftValue).toBe("default-template");
    await act(async () => {
      deferred.resolve("saved-template");
      await deferred.promise;
    });
    expect(harness.getState().isHydrated).toBe(true);
    expect(harness.getState().savedValue).toBe("saved-template");
    expect(harness.getState().draftValue).toBe("saved-template");
    expect(harness.getState().isDirty).toBe(false);
  } finally {
    await harness.cleanup();
  }
});
test("useDraftedStorageValue 在草稿未修改时跟随外部已保存值更新", async () => {
  const storage = new FakeStorage({
    [STORAGE_KEY]: "saved-template"
  });
  const harness = await renderDraftHook(storage);
  try {
    await flushEffects();
    expect(harness.getState().isHydrated).toBe(true);
    expect(harness.getState().draftValue).toBe("saved-template");
    expect(harness.getState().isDirty).toBe(false);
    await act(async () => {
      storage.emitExternal(STORAGE_KEY, "saved-template-v2");
    });
    expect(harness.getState().savedValue).toBe("saved-template-v2");
    expect(harness.getState().draftValue).toBe("saved-template-v2");
    expect(harness.getState().isDirty).toBe(false);
  } finally {
    await harness.cleanup();
  }
});
test("useDraftedStorageValue 在草稿已修改时不覆盖本地输入，但会刷新 saved 值", async () => {
  const storage = new FakeStorage({
    [STORAGE_KEY]: "saved-template"
  });
  const harness = await renderDraftHook(storage);
  try {
    await flushEffects();
    await act(async () => {
      harness.getState().setDraftValue("local-draft");
    });
    expect(harness.getState().isDirty).toBe(true);
    expect(harness.getState().draftValue).toBe("local-draft");
    await act(async () => {
      storage.emitExternal(STORAGE_KEY, "saved-template-v2");
    });
    expect(harness.getState().savedValue).toBe("saved-template-v2");
    expect(harness.getState().draftValue).toBe("local-draft");
    expect(harness.getState().isDirty).toBe(true);
    await act(async () => {
      harness.getState().resetDraft();
    });
    expect(harness.getState().draftValue).toBe("saved-template-v2");
    expect(harness.getState().isDirty).toBe(false);
  } finally {
    await harness.cleanup();
  }
});
test("useDraftedStorageValue 在 hydration 期间收到外部更新时不被过期 get 结果回滚", async () => {
  const storage = new FakeStorage();
  const deferred = createDeferred<string | undefined>();
  storage.setDeferredGet(STORAGE_KEY, deferred.promise);
  const harness = await renderDraftHook(storage);
  try {
    await act(async () => {
      storage.emitExternal(STORAGE_KEY, "fresh-template");
    });
    await act(async () => {
      deferred.resolve("stale-template");
      await deferred.promise;
    });
    expect(harness.getState().isHydrated).toBe(true);
    expect(harness.getState().savedValue).toBe("fresh-template");
    expect(harness.getState().draftValue).toBe("fresh-template");
    expect(harness.getState().isDirty).toBe(false);
  } finally {
    await harness.cleanup();
  }
});

test("编辑与外部更新在同一轮发生时保留刚输入的草稿", async () => {
  const storage = new FakeStorage({ [STORAGE_KEY]: "saved-template" });
  const harness = await renderDraftHook(storage);
  try {
    await act(async () => {
      harness.getState().setDraftValue("new-local-draft");
      storage.emitExternal(STORAGE_KEY, "external-template");
    });
    expect(harness.getState().draftValue).toBe("new-local-draft");
    expect(harness.getState().savedValue).toBe("external-template");
    expect(harness.getState().isDirty).toBe(true);
  } finally {
    await harness.cleanup();
  }
});

test("更换比较函数不重新加载草稿，外部更新使用最新比较策略", async () => {
  const storage = new FakeStorage({ [STORAGE_KEY]: "saved-template" });
  let state!: HookState;
  const onRender = (value: HookState) => {
    state = value;
  };
  const page = await renderElement(React.createElement(DraftHookHarness, { storage, onRender, isEqual: Object.is }));
  try {
    await act(async () => state.setDraftValue("SAVED-TEMPLATE"));
    await page.render(
      React.createElement(DraftHookHarness, { storage, onRender, isEqual: (saved, draft) => saved === draft })
    );
    expect(state.draftValue).toBe("SAVED-TEMPLATE");
    expect(state.isDirty).toBe(true);

    await page.render(
      React.createElement(DraftHookHarness, {
        storage,
        onRender,
        isEqual: (saved, draft) => saved.toLowerCase() === draft.toLowerCase()
      })
    );
    expect(state.draftValue).toBe("SAVED-TEMPLATE");
    expect(state.isDirty).toBe(false);
    await act(async () => storage.emitExternal(STORAGE_KEY, "new-saved-template"));
    expect(state.draftValue).toBe("new-saved-template");
    expect(state.savedValue).toBe("new-saved-template");
  } finally {
    await page.cleanup();
  }
});
