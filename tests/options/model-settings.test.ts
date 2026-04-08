import { strict as assert } from "node:assert";
import test from "node:test";

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

  assert.equal(hasSwqaPromptTemplateDraftChanges(savedDraft, savedDraft), false);
  assert.equal(
    hasSwqaPromptTemplateDraftChanges(savedDraft, {
      create: "create-template-2",
      update: "update-template"
    }),
    true
  );
  assert.equal(
    hasSwqaPromptTemplateDraftChanges(savedDraft, {
      create: "create-template",
      update: "update-template-2"
    }),
    true
  );
});

test("Generic 模型配置草稿按字段比较脏值", () => {
  const savedConfig = createSavedGenericModelConfig();

  assert.equal(hasGenericModelConfigDraftChanges(savedConfig, savedConfig), false);
  assert.equal(
    hasGenericModelConfigDraftChanges(savedConfig, {
      ...savedConfig,
      baseUrl: "https://proxy.example.com/v1"
    }),
    true
  );
  assert.equal(
    hasGenericModelConfigDraftChanges(savedConfig, {
      ...savedConfig,
      apiKey: "sk-other"
    }),
    true
  );
});

test("Generic Prompt 模板草稿只有文本变化时才标记未保存", () => {
  assert.equal(hasGenericPromptTemplateDraftChanges("{{json}}", "{{json}}"), false);
  assert.equal(hasGenericPromptTemplateDraftChanges("{{json}}", "URL: {{url}}"), true);
});
