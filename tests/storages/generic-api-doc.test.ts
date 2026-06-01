import { strict as assert } from "node:assert";
import test from "node:test";

import { defaultGenericPromptTemplate, resolveGenericPromptTemplateForCopy } from "@/generic-api-doc/prompt";
import {
  GENERIC_MODEL_CONFIG_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  genericApiDocModelConfigDefaultValue,
  genericApiDocStorageDefaultValues,
  getGenericProviderLabel,
  isGenericModelConfigComplete
} from "@/storages/generic-api-doc";

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

test("openai-compatible provider 仍然要求填写 baseUrl", () => {
  assert.equal(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "",
      modelId: "deepseek-chat",
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
});

test("Generic storage 默认值符合 v1 约束", () => {
  assert.deepEqual(genericApiDocModelConfigDefaultValue, {
    apiType: "openai-compatible",
    baseUrl: "",
    modelId: "",
    apiKey: ""
  });
  assert.deepEqual(
    genericApiDocStorageDefaultValues[GENERIC_MODEL_CONFIG_STORAGE_KEY],
    genericApiDocModelConfigDefaultValue
  );
  assert.equal(genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY], defaultGenericPromptTemplate);
});
