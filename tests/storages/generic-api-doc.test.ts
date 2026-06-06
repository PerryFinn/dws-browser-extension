import { expect, test } from "vitest";
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
  expect(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4.1",
      apiKey: "sk-test"
    })
  ).toBe(true);
  expect(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "",
      modelId: "gpt-4.1",
      apiKey: "sk-test"
    })
  ).toBe(false);
  expect(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "",
      apiKey: "sk-test"
    })
  ).toBe(false);
  expect(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "https://example.com/v1",
      modelId: "gpt-4.1",
      apiKey: ""
    })
  ).toBe(false);
});
test("openai-compatible provider 仍然要求填写 baseUrl", () => {
  expect(
    isGenericModelConfigComplete({
      apiType: "openai-compatible",
      baseUrl: "",
      modelId: "deepseek-chat",
      apiKey: "sk-test"
    })
  ).toBe(false);
});
test("storage 中的空 prompt 模板在复制时回退到默认模板", () => {
  expect(
    resolveGenericPromptTemplateForCopy(genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY])
  ).toBe(defaultGenericPromptTemplate);
  expect(resolveGenericPromptTemplateForCopy("")).toBe(defaultGenericPromptTemplate);
});
test("provider 标签文案稳定", () => {
  expect(getGenericProviderLabel("openai-compatible")).toBe("OpenAI Compatible");
});
test("Generic storage 默认值符合 v1 约束", () => {
  expect(genericApiDocModelConfigDefaultValue).toEqual({
    apiType: "openai-compatible",
    baseUrl: "",
    modelId: "",
    apiKey: ""
  });
  expect(genericApiDocStorageDefaultValues[GENERIC_MODEL_CONFIG_STORAGE_KEY]).toEqual(
    genericApiDocModelConfigDefaultValue
  );
  expect(genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]).toBe(defaultGenericPromptTemplate);
});
