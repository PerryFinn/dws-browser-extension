import { defaultGenericPromptTemplate } from "@/generic-api-doc/prompt";
import type { GenericModelConfig, GenericProviderType } from "@/generic-api-doc/types";

export const GENERIC_PROVIDER_TYPE_STORAGE_KEY = "genericApiDocProviderType";
export const GENERIC_BASE_URL_STORAGE_KEY = "genericApiDocBaseUrl";
export const GENERIC_MODEL_ID_STORAGE_KEY = "genericApiDocModelId";
export const GENERIC_API_KEY_STORAGE_KEY = "genericApiDocApiKey";
export const GENERIC_PROMPT_TEMPLATE_STORAGE_KEY = "genericApiDocPromptTemplate";

export const genericProviderLabelMap: Record<GenericProviderType, string> = {
  "openai-compatible": "OpenAI Compatible",
  openai: "OpenAI"
};

export const genericApiDocStorageDefaultValues = {
  [GENERIC_PROVIDER_TYPE_STORAGE_KEY]: "openai-compatible" as GenericProviderType,
  [GENERIC_BASE_URL_STORAGE_KEY]: "",
  [GENERIC_MODEL_ID_STORAGE_KEY]: "",
  [GENERIC_API_KEY_STORAGE_KEY]: "",
  [GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]: defaultGenericPromptTemplate
} as const;

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
