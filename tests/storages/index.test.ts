import { expect, test } from "vitest";
import { LEGACY_LOCAL_STORAGE_KEYS, localStorageInitialValue } from "@/storages";

test("GitLab 绝对时间默认开启", () => {
  expect(localStorageInitialValue.gitlabAbsoluteTimeEnabled.defaultValue).toBe(true);
});

test("localStorage 初始化不再写入遗留的 SWQA prompt purpose key", () => {
  expect("swqaPromptPurpose" in localStorageInitialValue).toBe(false);
});
test("localStorage 初始化不再写入遗留的分散模型与 prompt key", () => {
  expect("swqaCreatePromptTemplate" in localStorageInitialValue).toBe(false);
  expect("swqaUpdatePromptTemplate" in localStorageInitialValue).toBe(false);
  expect("swqaPromptTemplate" in localStorageInitialValue).toBe(false);
  expect("genericApiDocProviderType" in localStorageInitialValue).toBe(false);
  expect("genericApiDocBaseUrl" in localStorageInitialValue).toBe(false);
  expect("genericApiDocModelId" in localStorageInitialValue).toBe(false);
  expect("genericApiDocApiKey" in localStorageInitialValue).toBe(false);
});
test("初始化会强制清理所有遗留 key", () => {
  expect(LEGACY_LOCAL_STORAGE_KEYS).toEqual([
    "swqaPromptPurpose",
    "swqaCreatePromptTemplate",
    "swqaUpdatePromptTemplate",
    "swqaPromptTemplate",
    "genericApiDocProviderType",
    "genericApiDocBaseUrl",
    "genericApiDocModelId",
    "genericApiDocApiKey"
  ]);
});
