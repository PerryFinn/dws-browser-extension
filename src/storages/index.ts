import { Storage } from "@plasmohq/storage";
import {
  GENERIC_API_KEY_STORAGE_KEY,
  GENERIC_BASE_URL_STORAGE_KEY,
  GENERIC_MODEL_ID_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  GENERIC_PROVIDER_TYPE_STORAGE_KEY,
  genericApiDocStorageDefaultValues
} from "./generic-api-doc";
import {
  resolveSwqaPromptTemplateMigration,
  SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY,
  SWQA_LEGACY_PROMPT_TEMPLATE_STORAGE_KEY,
  SWQA_PROMPT_PURPOSE_STORAGE_KEY,
  SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY,
  swqaPromptTemplateDefaultValues
} from "./swqa-prompt-template";

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
  [SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY]: {
    defaultValue: swqaPromptTemplateDefaultValues[SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY]
  },
  [SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY]: {
    defaultValue: swqaPromptTemplateDefaultValues[SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY]
  },
  [SWQA_PROMPT_PURPOSE_STORAGE_KEY]: {
    defaultValue: "create"
  },
  [GENERIC_PROVIDER_TYPE_STORAGE_KEY]: {
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_PROVIDER_TYPE_STORAGE_KEY]
  },
  [GENERIC_BASE_URL_STORAGE_KEY]: {
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_BASE_URL_STORAGE_KEY]
  },
  [GENERIC_MODEL_ID_STORAGE_KEY]: {
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_MODEL_ID_STORAGE_KEY]
  },
  [GENERIC_API_KEY_STORAGE_KEY]: {
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_API_KEY_STORAGE_KEY]
  },
  [GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]: {
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]
  },
  config: {
    defaultValue: {
      isOpenWindowConfig: true // 该配置在 MAIN 不可用
    } as Config
  }
};

export type LocalStorageKey = keyof typeof localStorageInitialValue;

const initSwqaPromptTemplateStorage = async () => {
  const [createTemplate, updateTemplate, legacyTemplate] = (await Promise.all([
    storage.get(SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY),
    storage.get(SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY),
    storage.get(SWQA_LEGACY_PROMPT_TEMPLATE_STORAGE_KEY)
  ])) as [string | undefined, string | undefined, string | undefined];

  const migration = resolveSwqaPromptTemplateMigration({
    createTemplate,
    updateTemplate,
    legacyTemplate
  });

  const tasks: Promise<null>[] = [];

  if (migration.create.shouldWrite) {
    tasks.push(storage.set(SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY, migration.create.value));
  }

  if (migration.update.shouldWrite) {
    tasks.push(storage.set(SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY, migration.update.value));
  }

  await Promise.all(tasks);
};

export const initLocalStorage = async () => {
  await initSwqaPromptTemplateStorage();

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
