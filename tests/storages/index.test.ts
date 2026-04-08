import { strict as assert } from "node:assert";
import test from "node:test";

import { LEGACY_LOCAL_STORAGE_KEYS, localStorageInitialValue } from "@/storages";

test("localStorage 初始化不再写入遗留的 SWQA prompt purpose key", () => {
  assert.equal("swqaPromptPurpose" in localStorageInitialValue, false);
});

test("localStorage 初始化不再写入遗留的分散模型与 prompt key", () => {
  assert.equal("swqaCreatePromptTemplate" in localStorageInitialValue, false);
  assert.equal("swqaUpdatePromptTemplate" in localStorageInitialValue, false);
  assert.equal("swqaPromptTemplate" in localStorageInitialValue, false);
  assert.equal("genericApiDocProviderType" in localStorageInitialValue, false);
  assert.equal("genericApiDocBaseUrl" in localStorageInitialValue, false);
  assert.equal("genericApiDocModelId" in localStorageInitialValue, false);
  assert.equal("genericApiDocApiKey" in localStorageInitialValue, false);
});

test("初始化会强制清理所有遗留 key", () => {
  assert.deepEqual(LEGACY_LOCAL_STORAGE_KEYS, [
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
