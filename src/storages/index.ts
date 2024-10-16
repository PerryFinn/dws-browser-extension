import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });
const sessionStorage = new Storage({ area: "session" });
const syncStorage = new Storage({ area: "sync" });

const localStorageInitialValue = {
  gitlabUserName: {
    defaultValue: ""
  },
  verifiedIpList: {
    defaultValue: []
  },
  processInfo: {
    defaultValue: []
  },
  isRunningTask: {
    defaultValue: false
  },
  taskResult: {
    defaultValue: { success: [], failed: [], error: [] }
  }
};

export type LocalStorageKey = keyof typeof localStorageInitialValue & "enabled";

const initLocalStorage = async () => {
  for (const [key, { defaultValue }] of Object.entries(localStorageInitialValue)) {
    if (!(await storage.get(key))) {
      await storage.set(key, defaultValue);
    }
  }
};

const resetLocalStorage = async () => {
  await Promise.all(
    Object.entries(localStorageInitialValue).map(([key, { defaultValue }]) =>
      storage.set(key, defaultValue).catch((e) => console.error(`Failed to reset ${key}:`, e))
    )
  );
};

export { storage, sessionStorage, syncStorage, initLocalStorage, resetLocalStorage };
