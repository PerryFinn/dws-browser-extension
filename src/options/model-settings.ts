import type { GenericModelConfig } from "@/generic-api-doc/types";
import type { SwqaPromptTemplates } from "@/storages/swqa-prompt-template";

export const createSwqaPromptTemplateDraft = ({
  createTemplate,
  updateTemplate
}: {
  createTemplate: string;
  updateTemplate: string;
}): SwqaPromptTemplates => ({
  create: createTemplate,
  update: updateTemplate
});

export const areSwqaPromptTemplatesEqual = (
  savedDraft: SwqaPromptTemplates,
  currentDraft: SwqaPromptTemplates
): boolean => {
  return savedDraft.create === currentDraft.create && savedDraft.update === currentDraft.update;
};

export const hasSwqaPromptTemplateDraftChanges = (
  savedDraft: SwqaPromptTemplates,
  currentDraft: SwqaPromptTemplates
): boolean => {
  return !areSwqaPromptTemplatesEqual(savedDraft, currentDraft);
};

export const areGenericModelConfigEqual = (
  savedConfig: GenericModelConfig,
  currentDraft: GenericModelConfig
): boolean => {
  return (
    savedConfig.apiType === currentDraft.apiType &&
    savedConfig.baseUrl === currentDraft.baseUrl &&
    savedConfig.modelId === currentDraft.modelId &&
    savedConfig.apiKey === currentDraft.apiKey
  );
};

export const hasGenericModelConfigDraftChanges = (
  savedConfig: GenericModelConfig,
  currentDraft: GenericModelConfig
): boolean => {
  return !areGenericModelConfigEqual(savedConfig, currentDraft);
};

export const hasGenericPromptTemplateDraftChanges = (savedTemplate: string, currentDraft: string): boolean => {
  return savedTemplate !== currentDraft;
};
