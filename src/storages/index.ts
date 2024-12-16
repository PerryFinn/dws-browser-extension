import { Storage } from "@plasmohq/storage";

export const storage = new Storage({ area: "local" });
export const sessionStorage = new Storage({ area: "session" });
export const syncStorage = new Storage({ area: "sync" });

export type StorageType = typeof storage.area;
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
