import type { CleanedSwqaInterfaceDetail } from "./clean";

export type SwqaPromptPurpose = "update" | "create";

export const swqaPromptPurposeLabelMap: Record<SwqaPromptPurpose, string> = {
  update: "更新",
  create: "新增"
};

export interface BuildPromptParams {
  template: string;
  cleanedJson: CleanedSwqaInterfaceDetail | string;
  url: string;
  interfaceId: string;
}

export const defaultCreatePromptTemplate = `向 \`src/services/models\` 添加一个新的接口请求，以下是该接口的描述信息：
\`\`\`json
{{json}}
\`\`\`

请遵循项目现有的接口封装、命名和类型定义方式进行处理。
如果信息不足以支持实现，请先指出缺失项，不要自行猜测。
输出时请说明需要新增或修改哪些文件。`;

export const defaultUpdatePromptTemplate = `你需要更新 \`src/services/models\` 中一个已有接口请求实现，以下是该接口最新的描述信息：
\`\`\`json
{{json}}
\`\`\`

请严格按以下流程执行：

1. 先不要直接修改代码。
2. 先根据接口路径、请求方法、名称和字段信息，在代码库中搜索对应的现有接口实现及相关类型定义。
3. 如果找到候选实现，先输出一份“差异清单”，至少包含：
   - 请求路径或请求方法是否变化
   - 请求参数是否变化
   - 响应结构或字段是否变化
   - 字段的新增、删除、重命名或类型变化
   - 兼容性风险
   - 可能受影响的文件
4. 差异清单输出后，等待我确认；在我明确确认之前，不要直接给出修改后的代码。
5. 如果我确认需要修改，再根据确认后的范围给出具体改动方案或代码。
6. 如果没有找到对应实现，不要直接新增；先明确说明“未找到对应实现”，再询问我是否要按新增接口处理。
7. 如果对比后没有实质差异，请明确说明“无需修改”以及原因。
8. 如果接口文档信息不足，请明确指出缺失项，不要猜测。`;

/**
 * @deprecated 兼容旧 import 的别名，语义上等同于 `defaultCreatePromptTemplate`。
 * 新代码请显式使用 `defaultCreatePromptTemplate`，避免误把它当作通用默认模板。
 */
export const defaultPromptTemplate = defaultCreatePromptTemplate;

export const getDefaultPromptTemplate = (purpose: SwqaPromptPurpose): string => {
  return purpose === "update" ? defaultUpdatePromptTemplate : defaultCreatePromptTemplate;
};

export const resolvePromptTemplateForCopy = (
  template: string | null | undefined,
  purpose: SwqaPromptPurpose
): string => {
  if (template?.trim()) return template;
  return getDefaultPromptTemplate(purpose);
};

const swqaUpdatePromptGuidance =
  "默认更新模板会引导模型先搜索现有实现、先列出差异，待你确认后再修改；如果未找到对应实现，再询问是否按新增接口处理。若你已自定义模板，则以当前模板内容为准。";

const swqaCreatePromptGuidance = "用于新增一个接口实现。若你已自定义模板，则以当前模板内容为准。";

export const getSwqaPromptTemplateTooltip = (purpose: SwqaPromptPurpose): string => {
  if (purpose === "update") {
    return `“更新”模板说明：${swqaUpdatePromptGuidance}`;
  }

  return `“新增”模板说明：${swqaCreatePromptGuidance}`;
};

export const getSwqaCopyPromptSuccessMessage = (purpose: SwqaPromptPurpose): string => {
  return `已复制${swqaPromptPurposeLabelMap[purpose]} Prompt`;
};

const toJsonText = (value: CleanedSwqaInterfaceDetail | string): string => {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

/**
 * 将模板中的占位符替换为上下文数据，便于一键复制喂给大模型。
 */
export const buildPrompt = ({ template, cleanedJson, url, interfaceId }: BuildPromptParams): string => {
  const jsonText = toJsonText(cleanedJson);
  const replacements: Record<string, string> = {
    "{{json}}": jsonText,
    "{{url}}": url,
    "{{interfaceId}}": interfaceId
  };

  return template.replaceAll(/{{json}}|{{url}}|{{interfaceId}}/g, (placeholder) => replacements[placeholder]);
};
