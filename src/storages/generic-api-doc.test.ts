import { strict as assert } from "node:assert";
import test from "node:test";

import { defaultGenericPromptTemplate, resolveGenericPromptTemplateForCopy } from "@/generic-api-doc/prompt";
import {
  GENERIC_API_KEY_STORAGE_KEY,
  GENERIC_BASE_URL_STORAGE_KEY,
  GENERIC_MODEL_ID_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  GENERIC_PROVIDER_TYPE_STORAGE_KEY,
  genericApiDocStorageDefaultValues,
  getGenericProviderLabel,
  isGenericModelConfigComplete
} from "./generic-api-doc";

test("模型配置缺少任一项时都不完整", () => {
  assert.equal(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4.1",
      apiKey: "sk-test"
    }),
    true
  );

  assert.equal(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "",
      modelId: "gpt-4.1",
      apiKey: "sk-test"
    }),
    false
  );

  assert.equal(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "",
      apiKey: "sk-test"
    }),
    false
  );

  assert.equal(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4.1",
      apiKey: ""
    }),
    false
  );
});

test("openai provider 仍然要求填写 baseUrl", () => {
  assert.equal(
    isGenericModelConfigComplete({
      apiType: "openai",
      baseUrl: "",
      modelId: "gpt-5.1",
      apiKey: "sk-test"
    }),
    false
  );
});

test("storage 中的空 prompt 模板在复制时回退到默认模板", () => {
  assert.equal(
    resolveGenericPromptTemplateForCopy(genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]),
    defaultGenericPromptTemplate
  );
  assert.equal(resolveGenericPromptTemplateForCopy(""), defaultGenericPromptTemplate);
});

test("provider 标签文案稳定", () => {
  assert.equal(getGenericProviderLabel("openai-compatible"), "OpenAI Compatible");
  assert.equal(getGenericProviderLabel("openai"), "OpenAI");
});

test("Generic storage 默认值符合 v1 约束", () => {
  assert.equal(genericApiDocStorageDefaultValues[GENERIC_PROVIDER_TYPE_STORAGE_KEY], "openai-compatible");
  assert.equal(genericApiDocStorageDefaultValues[GENERIC_BASE_URL_STORAGE_KEY], "");
  assert.equal(genericApiDocStorageDefaultValues[GENERIC_MODEL_ID_STORAGE_KEY], "");
  assert.equal(genericApiDocStorageDefaultValues[GENERIC_API_KEY_STORAGE_KEY], "");
});
