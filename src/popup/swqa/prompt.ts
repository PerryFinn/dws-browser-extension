import type { CleanedSwqaInterfaceDetail } from "./clean";

export interface BuildPromptParams {
  template: string;
  cleanedJson: CleanedSwqaInterfaceDetail | string;
  url: string;
  interfaceId: string;
}

// 默认 Prompt：给大模型的最小上下文模板，可在 Popup 内编辑持久化。
export const defaultPromptTemplate = `向 \`src/services/models\` 添加一个新的接口请求，以下是该接口的描述信息：
\`\`\`json
{{json}}
\`\`\`
`;

const toJsonText = (value: CleanedSwqaInterfaceDetail | string): string => {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

/**
 * 将模板中的占位符替换为上下文数据，便于一键复制喂给大模型。
 */
export const buildPrompt = ({ template, cleanedJson, url, interfaceId }: BuildPromptParams): string => {
  const jsonText = toJsonText(cleanedJson);

  return template
    .replaceAll("{{json}}", jsonText)
    .replaceAll("{{url}}", url)
    .replaceAll("{{interfaceId}}", interfaceId);
};
