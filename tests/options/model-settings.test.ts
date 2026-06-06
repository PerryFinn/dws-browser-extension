import { expect, test } from "vitest";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import {
  createSwqaPromptTemplateDraft,
  hasGenericModelConfigDraftChanges,
  hasGenericPromptTemplateDraftChanges,
  hasSwqaPromptTemplateDraftChanges
} from "@/options/model-settings";

const createSavedGenericModelConfig = (): GenericModelConfig => ({
  apiType: "openai-compatible",
  baseUrl: "https://example.com/v1",
  modelId: "gpt-5.1",
  apiKey: "sk-test"
});
test("SWQA prompt 草稿在 create 与 update 都未变化时视为已保存", () => {
  const savedDraft = createSwqaPromptTemplateDraft({
    createTemplate: "create-template",
    updateTemplate: "update-template"
  });
  expect(hasSwqaPromptTemplateDraftChanges(savedDraft, savedDraft)).toBe(false);
  expect(
    hasSwqaPromptTemplateDraftChanges(savedDraft, {
      create: "create-template-2",
      update: "update-template"
    })
  ).toBe(true);
  expect(
    hasSwqaPromptTemplateDraftChanges(savedDraft, {
      create: "create-template",
      update: "update-template-2"
    })
  ).toBe(true);
});
test("Generic 模型配置草稿按字段比较脏值", () => {
  const savedConfig = createSavedGenericModelConfig();
  expect(hasGenericModelConfigDraftChanges(savedConfig, savedConfig)).toBe(false);
  expect(
    hasGenericModelConfigDraftChanges(savedConfig, {
      ...savedConfig,
      baseUrl: "https://proxy.example.com/v1"
    })
  ).toBe(true);
  expect(
    hasGenericModelConfigDraftChanges(savedConfig, {
      ...savedConfig,
      apiKey: "sk-other"
    })
  ).toBe(true);
});
test("Generic Prompt 模板草稿只有文本变化时才标记未保存", () => {
  expect(hasGenericPromptTemplateDraftChanges("{{json}}", "{{json}}")).toBe(false);
  expect(hasGenericPromptTemplateDraftChanges("{{json}}", "URL: {{url}}")).toBe(true);
});
