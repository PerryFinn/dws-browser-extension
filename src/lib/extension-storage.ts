export type StorageAreaName = "local" | "session" | "sync";

export type StorageCallback<T = unknown> = (change: { newValue?: T; oldValue?: T }) => void;

export type StorageCallbackMap = Record<string, StorageCallback>;

export interface StorageOptions {
  area?: StorageAreaName;
}

const listenerMap = new WeakMap<
  StorageCallbackMap,
  (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
>();

const resolveStorageArea = (area: StorageAreaName): chrome.storage.StorageArea => {
  return chrome.storage[area];
};

const rejectLastError = (reject: (reason?: unknown) => void) => {
  const lastError = chrome.runtime.lastError;

  if (lastError) {
    reject(new Error(lastError.message));
    return true;
  }

  return false;
};

export class Storage {
  readonly area: StorageAreaName;

  constructor(options: StorageOptions = {}) {
    this.area = options.area ?? "local";
  }

  get<T = unknown>(key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      resolveStorageArea(this.area).get(key, (items) => {
        if (rejectLastError(reject)) {
          return;
        }

        resolve(items[key] as T | undefined);
      });
    });
  }

  set<T = unknown>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      resolveStorageArea(this.area).set({ [key]: value }, () => {
        if (rejectLastError(reject)) {
          return;
        }

        resolve();
      });
    });
  }

  remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      resolveStorageArea(this.area).remove(key, () => {
        if (rejectLastError(reject)) {
          return;
        }

        resolve();
      });
    });
  }

  removeMany(keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      resolveStorageArea(this.area).remove(keys, () => {
        if (rejectLastError(reject)) {
          return;
        }

        resolve();
      });
    });
  }

  watch(callbackMap: StorageCallbackMap): void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== this.area) {
        return;
      }

      for (const [key, callback] of Object.entries(callbackMap)) {
        const change = changes[key];

        if (!change) {
          continue;
        }

        callback({
          newValue: change.newValue,
          oldValue: change.oldValue
        });
      }
    };

    listenerMap.set(callbackMap, listener);
    chrome.storage.onChanged.addListener(listener);
  }

  unwatch(callbackMap: StorageCallbackMap): void {
    const listener = listenerMap.get(callbackMap);

    if (!listener) {
      return;
    }

    chrome.storage.onChanged.removeListener(listener);
    listenerMap.delete(callbackMap);
  }
}
