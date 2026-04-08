import { defaultGenericPromptTemplate } from "@/generic-api-doc/prompt";
import { createEmptyGenericCaptureSession } from "@/generic-api-doc/session";
import type { GenericModelConfig, GenericProviderType } from "@/generic-api-doc/types";

export const GENERIC_MODEL_CONFIG_STORAGE_KEY = "genericApiDocModelConfig";
export const GENERIC_PROMPT_TEMPLATE_STORAGE_KEY = "genericApiDocPromptTemplate";
export const GENERIC_CAPTURE_SESSION_STORAGE_KEY = "genericApiDocCaptureSession";

export const genericProviderLabelMap: Record<GenericProviderType, string> = {
  "openai-compatible": "OpenAI Compatible",
  openai: "OpenAI"
};

export const genericApiDocModelConfigDefaultValue: GenericModelConfig = {
  apiType: "openai-compatible",
  baseUrl: "",
  modelId: "",
  apiKey: ""
};

export const genericApiDocStorageDefaultValues = {
  [GENERIC_MODEL_CONFIG_STORAGE_KEY]: genericApiDocModelConfigDefaultValue,
  [GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]: defaultGenericPromptTemplate
} as const;

export const genericApiDocCaptureSessionStorageDefaultValue =
  createEmptyGenericCaptureSession("default-generic-session");

const hasNonEmptyValue = (value: string): boolean => value.trim().length > 0;

export const isGenericModelConfigComplete = (config: GenericModelConfig): boolean => {
  return (
    hasNonEmptyValue(config.apiType) &&
    hasNonEmptyValue(config.baseUrl) &&
    hasNonEmptyValue(config.modelId) &&
    hasNonEmptyValue(config.apiKey)
  );
};

export const getGenericProviderLabel = (providerType: GenericProviderType): string => {
  return genericProviderLabelMap[providerType];
};
