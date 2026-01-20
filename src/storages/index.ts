import { Storage } from "@plasmohq/storage";

export const storage = new Storage({ area: "local" });
export const sessionStorage = new Storage({ area: "session" });
export const syncStorage = new Storage({ area: "sync" });

export type StorageType = "local" | "session" | "sync";
export const storageMap = new Map<StorageType, Storage>([
  ["local", storage],
  ["session", sessionStorage],
  ["sync", syncStorage]
]);

export const localStorageInitialValue = {
  enabled: {
    defaultValue: true
  },
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
  versionCheckUrl: {
    defaultValue: "http://172.20.124.81:12306/extension/info"
  },
  versionCheckTtlMinutes: {
    defaultValue: 6 * 60
  },
  config: {
    defaultValue: {
      isOpenWindowConfig: true, // 该配置在 MAIN 不可用
      isOpenGitlabProjects: true
    } as Config
  }
};

export type LocalStorageKey = keyof typeof localStorageInitialValue;

export const initLocalStorage = async () => {
  for (const [key, { defaultValue }] of Object.entries(localStorageInitialValue)) {
    const currentValue = await storage.get(key);
    if (typeof currentValue === "undefined") {
      await storage.set(key as keyof typeof localStorageInitialValue, defaultValue);
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
