import { Storage } from "@/lib/extension-storage";
import { GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY, gitlabProjectCustomNamesDefaultValue } from "@/utils/gitlab";
import {
  GENERIC_CAPTURE_SESSION_STORAGE_KEY,
  GENERIC_MODEL_CONFIG_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  genericApiDocCaptureSessionStorageDefaultValue,
  genericApiDocModelConfigDefaultValue,
  genericApiDocStorageDefaultValues
} from "./generic-api-doc";
import { SWQA_PROMPT_TEMPLATES_STORAGE_KEY, swqaPromptTemplatesDefaultValue } from "./swqa-prompt-template";

export const storage = new Storage({ area: "local" });
export const sessionStorage = new Storage({ area: "session" });
export const syncStorage = new Storage({ area: "sync" });

export type StorageType = "local" | "session" | "sync";
export type GitlabProjectsDisplayMode = "inline" | "overlay" | "off";
export const storageMap = new Map<StorageType, Storage>([
  ["local", storage],
  ["session", sessionStorage],
  ["sync", syncStorage]
]);

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
  versionCheckUrl: {
    defaultValue: "http://172.20.124.81:12306/extension/info"
  },
  versionCheckTtlMinutes: {
    defaultValue: 6 * 60
  },
  gitlabProjectsDisplayMode: {
    defaultValue: "overlay" as GitlabProjectsDisplayMode
  },
  gitlabAbsoluteTimeEnabled: {
    defaultValue: true
  },
  [GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY]: {
    defaultValue: gitlabProjectCustomNamesDefaultValue
  },
  [SWQA_PROMPT_TEMPLATES_STORAGE_KEY]: {
    defaultValue: swqaPromptTemplatesDefaultValue
  },
  [GENERIC_MODEL_CONFIG_STORAGE_KEY]: {
    defaultValue: genericApiDocModelConfigDefaultValue
  },
  [GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]: {
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]
  },
  [GENERIC_CAPTURE_SESSION_STORAGE_KEY]: {
    defaultValue: genericApiDocCaptureSessionStorageDefaultValue
  },
  config: {
    defaultValue: {
      isOpenWindowConfig: true // 该配置在 MAIN 不可用
    } as Config
  }
};

export type LocalStorageKey = keyof typeof localStorageInitialValue;

export const LEGACY_LOCAL_STORAGE_KEYS = [
  "swqaPromptPurpose",
  "swqaCreatePromptTemplate",
  "swqaUpdatePromptTemplate",
  "swqaPromptTemplate",
  "genericApiDocProviderType",
  "genericApiDocBaseUrl",
  "genericApiDocModelId",
  "genericApiDocApiKey"
] as const;

const cleanupLegacyLocalStorage = async () => {
  await storage.removeMany([...LEGACY_LOCAL_STORAGE_KEYS]);
};

export const initLocalStorage = async () => {
  await cleanupLegacyLocalStorage();

  for (const [key, { defaultValue }] of Object.entries(localStorageInitialValue)) {
    const currentValue = await storage.get(key);
    if (typeof currentValue === "undefined") {
      await storage.set(key as keyof typeof localStorageInitialValue, defaultValue);
    }
  }
};

export const resetLocalStorage = async () => {
  await cleanupLegacyLocalStorage();
  await Promise.all(
    Object.entries(localStorageInitialValue).map(([key, { defaultValue }]) =>
      storage.set(key, defaultValue).catch((e) => console.error(`Failed to reset ${key}:`, e))
    )
  );
};
