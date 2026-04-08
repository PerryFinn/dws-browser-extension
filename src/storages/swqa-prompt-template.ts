import { defaultCreatePromptTemplate, defaultUpdatePromptTemplate } from "@/popup/swqa/prompt";

export const SWQA_PROMPT_TEMPLATES_STORAGE_KEY = "swqaPromptTemplates";

export interface SwqaPromptTemplates {
  create: string;
  update: string;
}

export const swqaPromptTemplatesDefaultValue: SwqaPromptTemplates = {
  create: defaultCreatePromptTemplate,
  update: defaultUpdatePromptTemplate
};
