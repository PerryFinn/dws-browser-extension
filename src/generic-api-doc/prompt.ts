import type { GenericExtractionResult, GenericUncertainty } from "./types";

export interface BuildGenericPromptParams {
  template: string;
  extractionResult: GenericExtractionResult | string;
  url: string;
  uncertainties?: GenericUncertainty[];
}

export const defaultGenericPromptTemplate = `你需要根据以下接口文档信息生成代码或变更建议：
\`\`\`json
{{json}}
\`\`\`

接口文档地址：{{url}}
`;

export const resolveGenericPromptTemplateForCopy = (template: string | null | undefined): string => {
  if (template?.trim()) {
    return template;
  }

  return defaultGenericPromptTemplate;
};

const toJsonText = (value: GenericExtractionResult | string): string => {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
};

const resolveGenericPromptUncertainties = ({
  extractionResult,
  uncertainties
}: Pick<BuildGenericPromptParams, "extractionResult" | "uncertainties">): GenericUncertainty[] => {
  if (uncertainties) {
    return uncertainties;
  }

  if (typeof extractionResult === "string") {
    return [];
  }

  return extractionResult.uncertainties;
};

const buildGenericUncertaintyPromptSuffix = (uncertainties: GenericUncertainty[]): string => {
  if (uncertainties.length === 0) {
    return "";
  }

  const items = uncertainties.map(({ field, reason }, index) => `${index + 1}. ${field}：${reason}`).join("\n");

  return `\n\n在继续之前，请先向用户确认以下不确定项：\n${items}\n\n请先列出这些不确定项，并逐条向用户确认。
在用户确认之前，不要对这些字段做主观假设；如果这些不确定项会影响实现范围，请先暂停生成最终代码。`;
};

export const buildGenericPrompt = ({
  template,
  extractionResult,
  url,
  uncertainties
}: BuildGenericPromptParams): string => {
  const jsonText = toJsonText(extractionResult);
  const replacements: Record<string, string> = {
    "{{json}}": jsonText,
    "{{url}}": url
  };

  const prompt = template.replaceAll(/{{json}}|{{url}}/g, (placeholder) => replacements[placeholder]);

  return `${prompt}${buildGenericUncertaintyPromptSuffix(
    resolveGenericPromptUncertainties({ extractionResult, uncertainties })
  )}`;
};
