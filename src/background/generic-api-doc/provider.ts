import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, jsonSchema } from "ai";
import { normalizeGenericExtractionResult } from "@/generic-api-doc/normalize";
import type {
  GenericExtractFromSessionInput,
  GenericExtractionResult,
  GenericModelConfig,
  GenericModelTestResult
} from "@/generic-api-doc/types";

type GenericLanguageModel = unknown;

export interface GenericProviderDependencies {
  createOpenAICompatibleProvider: (options: {
    baseURL: string;
    apiKey?: string;
    name: string;
  }) => (modelId: string) => GenericLanguageModel;
  generateObject: (options: {
    model: GenericLanguageModel;
    output: "object";
    schema: unknown;
    schemaName: string;
    prompt: string;
  }) => Promise<{ object: unknown }>;
}

const defaultDependencies: GenericProviderDependencies = {
  createOpenAICompatibleProvider: createOpenAICompatible,
  generateObject: generateObject as unknown as GenericProviderDependencies["generateObject"]
};

const genericConnectivitySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    message: { type: "string" }
  },
  required: ["ok", "message"]
} as const;

const genericParameterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    type: { type: "string" },
    required: { type: "boolean" },
    description: { type: "string" },
    example: {}
  },
  required: ["name"]
} as const;

const genericExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    endpoint: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        path: { type: "string" },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
        },
        description: { type: "string" }
      },
      required: ["name", "path", "method"]
    },
    request: {
      type: "object",
      additionalProperties: false,
      properties: {
        pathParams: { type: "array", items: genericParameterSchema },
        queryParams: { type: "array", items: genericParameterSchema },
        headers: { type: "array", items: genericParameterSchema },
        body: {},
        auth: { type: ["string", "null"] }
      },
      required: ["pathParams", "queryParams", "headers", "body"]
    },
    response: {
      type: "object",
      additionalProperties: false,
      properties: {
        successBody: {},
        errorNotes: { type: ["string", "null"] }
      },
      required: ["successBody"]
    },
    uncertainties: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          reason: { type: "string" }
        },
        required: ["field", "reason"]
      }
    }
  },
  required: ["endpoint", "request", "response", "uncertainties"]
} as const;

const getProviderName = (_apiType: GenericModelConfig["apiType"]): string => {
  return "generic-openai-compatible";
};

export const buildGenericModelConfigTestPrompt = (): string => {
  return [
    "你正在执行浏览器扩展的模型联通性测试。",
    "请只返回一个最小 JSON 对象，用于证明你可以稳定输出结构化结果。",
    "不要输出额外解释，不要引入接口文档抽取内容。"
  ].join("\n");
};

export const buildGenericExtractionPrompt = (input: GenericExtractFromSessionInput): string => {
  const sections = [
    "你是一个 API 文档结构化提取器。",
    "请基于以下采集上下文，输出统一 JSON。",
    "如果某个字段无法稳定判断，请保留外层结构，并把不确定项写入 uncertainties。",
    "",
    `页面标题：${input.source.title}`,
    `页面地址：${input.source.url}`,
    `采集模式：${input.source.mode}`,
    `预览片段：${input.capture.previewText}`,
    `原始文本：\n${input.capture.visibleText}`
  ];

  if (input.capture.domSummary?.trim()) {
    sections.push(`DOM 摘要：\n${input.capture.domSummary}`);
  }

  return sections.join("\n");
};

export const createGenericModel = (
  config: GenericModelConfig,
  dependencies: GenericProviderDependencies = defaultDependencies
): GenericLanguageModel => {
  // 统一去除首尾空白，避免复制粘贴携带空格/换行导致鉴权或地址错误。
  const baseURL = config.baseUrl.trim();
  const apiKey = config.apiKey.trim();
  const modelId = config.modelId.trim();

  // 目前仅支持 OpenAI 兼容协议；后续接入 Anthropic 等 provider 时，
  // 在此按 config.apiType 分发到不同的 provider 工厂。
  return dependencies.createOpenAICompatibleProvider({
    baseURL,
    apiKey,
    name: getProviderName(config.apiType)
  })(modelId);
};

export const testGenericModelConfig = async (
  config: GenericModelConfig,
  dependencies: GenericProviderDependencies = defaultDependencies
): Promise<GenericModelTestResult> => {
  const model = createGenericModel(config, dependencies);
  const result = await dependencies.generateObject({
    model,
    output: "object",
    schema: jsonSchema(genericConnectivitySchema),
    schemaName: "generic_model_connectivity_check",
    prompt: buildGenericModelConfigTestPrompt()
  });

  const response = result.object as { ok?: boolean; message?: string };

  return {
    ok: response.ok ?? true,
    message:
      typeof response.message === "string" && response.message.trim().length > 0 ? response.message : "连接测试成功"
  };
};

export const extractGenericApiDoc = async (
  config: GenericModelConfig,
  input: GenericExtractFromSessionInput,
  dependencies: GenericProviderDependencies = defaultDependencies
): Promise<GenericExtractionResult> => {
  const model = createGenericModel(config, dependencies);
  const result = await dependencies.generateObject({
    model,
    output: "object",
    schema: jsonSchema(genericExtractionSchema),
    schemaName: "generic_api_doc_extraction",
    prompt: buildGenericExtractionPrompt(input)
  });

  // 可信边界只来自本地 session，模型返回的 source 不参与归一化。
  const normalized = normalizeGenericExtractionResult({
    ...(result.object as Record<string, unknown>),
    source: input.source
  });

  return {
    ...normalized,
    source: input.source
  };
};
