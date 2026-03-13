import { defaultCreatePromptTemplate, defaultUpdatePromptTemplate } from "@/popup/swqa/prompt";

export const SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY = "swqaCreatePromptTemplate";
export const SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY = "swqaUpdatePromptTemplate";
export const SWQA_LEGACY_PROMPT_TEMPLATE_STORAGE_KEY = "swqaPromptTemplate";
export const SWQA_PROMPT_PURPOSE_STORAGE_KEY = "swqaPromptPurpose";

export const swqaPromptTemplateDefaultValues = {
  [SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY]: defaultCreatePromptTemplate,
  [SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY]: defaultUpdatePromptTemplate
} as const;

export type SwqaPromptTemplateMigrationState =
  | "create-and-update-exist"
  | "create-exists-update-missing"
  | "create-missing-update-exists-legacy-exists"
  | "create-missing-update-exists-legacy-missing"
  | "create-and-update-missing-legacy-exists"
  | "create-and-update-missing-legacy-missing";

export interface ResolveSwqaPromptTemplateMigrationInput {
  createTemplate?: string;
  updateTemplate?: string;
  legacyTemplate?: string;
}

export interface ResolveSwqaPromptTemplateMigrationResult {
  state: SwqaPromptTemplateMigrationState;
  create: {
    shouldWrite: boolean;
    value: string;
  };
  update: {
    shouldWrite: boolean;
    value: string;
  };
}

export const hasStoredSwqaPromptTemplate = (value: string | undefined): value is string => {
  return typeof value !== "undefined";
};

const requireStoredSwqaPromptTemplate = (value: string | undefined, key: string): string => {
  if (hasStoredSwqaPromptTemplate(value)) {
    return value;
  }

  throw new Error(`Expected existing SWQA prompt template for key: ${key}`);
};

export const getSwqaPromptTemplateMigrationState = ({
  createTemplate,
  updateTemplate,
  legacyTemplate
}: ResolveSwqaPromptTemplateMigrationInput): SwqaPromptTemplateMigrationState => {
  const hasCreateTemplate = hasStoredSwqaPromptTemplate(createTemplate);
  const hasUpdateTemplate = hasStoredSwqaPromptTemplate(updateTemplate);
  const hasLegacyTemplate = hasStoredSwqaPromptTemplate(legacyTemplate);

  if (hasCreateTemplate && hasUpdateTemplate) {
    return "create-and-update-exist";
  }

  if (hasCreateTemplate) {
    return "create-exists-update-missing";
  }

  if (hasUpdateTemplate && hasLegacyTemplate) {
    return "create-missing-update-exists-legacy-exists";
  }

  if (hasUpdateTemplate) {
    return "create-missing-update-exists-legacy-missing";
  }

  if (hasLegacyTemplate) {
    return "create-and-update-missing-legacy-exists";
  }

  return "create-and-update-missing-legacy-missing";
};

export const resolveSwqaPromptTemplateMigration = ({
  createTemplate,
  updateTemplate,
  legacyTemplate
}: ResolveSwqaPromptTemplateMigrationInput): ResolveSwqaPromptTemplateMigrationResult => {
  const state = getSwqaPromptTemplateMigrationState({
    createTemplate,
    updateTemplate,
    legacyTemplate
  });

  switch (state) {
    case "create-and-update-exist":
      return {
        state,
        create: {
          shouldWrite: false,
          value: requireStoredSwqaPromptTemplate(createTemplate, SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY)
        },
        update: {
          shouldWrite: false,
          value: requireStoredSwqaPromptTemplate(updateTemplate, SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY)
        }
      };
    case "create-exists-update-missing":
      return {
        state,
        create: {
          shouldWrite: false,
          value: requireStoredSwqaPromptTemplate(createTemplate, SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY)
        },
        update: {
          shouldWrite: true,
          value: swqaPromptTemplateDefaultValues[SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY]
        }
      };
    case "create-missing-update-exists-legacy-exists":
      return {
        state,
        create: {
          shouldWrite: true,
          value: requireStoredSwqaPromptTemplate(legacyTemplate, SWQA_LEGACY_PROMPT_TEMPLATE_STORAGE_KEY)
        },
        update: {
          shouldWrite: false,
          value: requireStoredSwqaPromptTemplate(updateTemplate, SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY)
        }
      };
    case "create-missing-update-exists-legacy-missing":
      return {
        state,
        create: {
          shouldWrite: true,
          value: swqaPromptTemplateDefaultValues[SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY]
        },
        update: {
          shouldWrite: false,
          value: requireStoredSwqaPromptTemplate(updateTemplate, SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY)
        }
      };
    case "create-and-update-missing-legacy-exists":
      return {
        state,
        create: {
          shouldWrite: true,
          value: requireStoredSwqaPromptTemplate(legacyTemplate, SWQA_LEGACY_PROMPT_TEMPLATE_STORAGE_KEY)
        },
        update: {
          shouldWrite: true,
          value: swqaPromptTemplateDefaultValues[SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY]
        }
      };
    case "create-and-update-missing-legacy-missing":
      return {
        state,
        create: {
          shouldWrite: true,
          value: swqaPromptTemplateDefaultValues[SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY]
        },
        update: {
          shouldWrite: true,
          value: swqaPromptTemplateDefaultValues[SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY]
        }
      };
  }
};
