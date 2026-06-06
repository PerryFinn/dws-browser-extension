import { strict as assert } from "node:assert";
import test from "node:test";
import { parseHTML } from "linkedom";
import React, { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { StorageCallback, StorageCallbackMap } from "@/lib/extension-storage";
import { useDraftedStorageValue } from "@/options/use-drafted-storage";

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
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    MutationObserver: globalThis.MutationObserver,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: globalWithActEnvironment.IS_REACT_ACT_ENVIRONMENT
  };

  globalThis.window = window as typeof globalThis.window;
  globalThis.document = window.document as typeof globalThis.document;
  globalThis.navigator = window.navigator as typeof globalThis.navigator;
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
      globalThis.navigator = previousGlobals.navigator;
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

const renderDraftHook = async (storage: FakeStorage) => {
  const dom = setupDom();
  let root: Root | null = null;
  let latestState: HookState | null = null;

  function Harness() {
    latestState = useDraftedStorageValue<string>({
      storage: storage as never,
      storageKey: STORAGE_KEY,
      defaultValue: "default-template"
    });

    return null;
  }

  await act(async () => {
    root = createRoot(dom.container);
    root.render(React.createElement(Harness));
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
    assert.equal(harness.getState().isHydrated, false);
    assert.equal(harness.getState().draftValue, "default-template");

    await act(async () => {
      deferred.resolve("saved-template");
      await deferred.promise;
    });

    assert.equal(harness.getState().isHydrated, true);
    assert.equal(harness.getState().savedValue, "saved-template");
    assert.equal(harness.getState().draftValue, "saved-template");
    assert.equal(harness.getState().isDirty, false);
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

    assert.equal(harness.getState().isHydrated, true);
    assert.equal(harness.getState().draftValue, "saved-template");
    assert.equal(harness.getState().isDirty, false);

    await act(async () => {
      storage.emitExternal(STORAGE_KEY, "saved-template-v2");
    });

    assert.equal(harness.getState().savedValue, "saved-template-v2");
    assert.equal(harness.getState().draftValue, "saved-template-v2");
    assert.equal(harness.getState().isDirty, false);
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

    assert.equal(harness.getState().isDirty, true);
    assert.equal(harness.getState().draftValue, "local-draft");

    await act(async () => {
      storage.emitExternal(STORAGE_KEY, "saved-template-v2");
    });

    assert.equal(harness.getState().savedValue, "saved-template-v2");
    assert.equal(harness.getState().draftValue, "local-draft");
    assert.equal(harness.getState().isDirty, true);

    await act(async () => {
      harness.getState().resetDraft();
    });

    assert.equal(harness.getState().draftValue, "saved-template-v2");
    assert.equal(harness.getState().isDirty, false);
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

    assert.equal(harness.getState().isHydrated, true);
    assert.equal(harness.getState().savedValue, "fresh-template");
    assert.equal(harness.getState().draftValue, "fresh-template");
    assert.equal(harness.getState().isDirty, false);
  } finally {
    await harness.cleanup();
  }
});
