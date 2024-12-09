import { Storage } from "@plasmohq/storage";

export const storage = new Storage({ area: "local" });
export const sessionStorage = new Storage({ area: "session" });
export const syncStorage = new Storage({ area: "sync" });

export const localStorageInitialValue = {
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
  },
  config: {
    defaultValue: {
      isOpenWindowConfig: true
    } as Config
  }
};

export type LocalStorageKey = keyof typeof localStorageInitialValue & "enabled";

export const initLocalStorage = async () => {
  for (const [key, { defaultValue }] of Object.entries(localStorageInitialValue)) {
    if (!(typeof (await storage.get(key)) === "undefined")) {
      await storage.set(key, defaultValue);
    }
  }
};

export const resetLocalStorage = async () => {
  await Promise.all(
    Object.entries(localStorageInitialValue).map(([key, { defaultValue }]) =>
      storage.set(key, defaultValue).catch((e) => console.error(`Failed to reset ${key}:`, e))
    )
  );
};
