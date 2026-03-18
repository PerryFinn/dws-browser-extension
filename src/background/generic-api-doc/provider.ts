import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { normalizeGenericExtractionResult } from "@/generic-api-doc/normalize";
import type {
  GenericCaptureContext,
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
  createOpenAIProvider: (options: {
    baseURL?: string;
    apiKey?: string;
    name?: string;
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
  createOpenAIProvider: createOpenAI,
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

const genericExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        mode: {
          type: "string",
          enum: ["generic-dom", "generic-selection"]
        }
      },
      required: ["url", "title", "mode"]
    },
    endpoint: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        path: { type: "string" },
        method: { type: "string" },
        description: { type: "string" }
      },
      required: ["name", "path", "method"]
    },
    request: {
      type: "object",
      additionalProperties: false,
      properties: {
        pathParams: { type: "array", items: {} },
        queryParams: { type: "array", items: {} },
        headers: { type: "array", items: {} },
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
  required: ["source", "endpoint", "request", "response", "uncertainties"]
} as const;

const getProviderName = (apiType: GenericModelConfig["apiType"]): string => {
  return apiType === "openai" ? "generic-openai" : "generic-openai-compatible";
};

export const buildGenericModelConfigTestPrompt = (): string => {
  return [
    "你正在执行浏览器扩展的模型联通性测试。",
    "请只返回一个最小 JSON 对象，用于证明你可以稳定输出结构化结果。",
    "不要输出额外解释，不要引入接口文档抽取内容。"
  ].join("\n");
};

export const buildGenericExtractionPrompt = (context: GenericCaptureContext): string => {
  const sections = [
    "你是一个 API 文档结构化提取器。",
    "请基于以下采集上下文，输出统一 JSON。",
    "如果某个字段无法稳定判断，请保留外层结构，并把不确定项写入 uncertainties。",
    "",
    `页面标题：${context.source.title}`,
    `页面地址：${context.source.url}`,
    `采集模式：${context.source.mode}`,
    `预览片段：${context.previewText}`,
    `原始文本：\n${context.rawText}`
  ];

  if (context.domSummary?.trim()) {
    sections.push(`DOM 摘要：\n${context.domSummary}`);
  }

  return sections.join("\n");
};

export const createGenericModel = (
  config: GenericModelConfig,
  dependencies: GenericProviderDependencies = defaultDependencies
): GenericLanguageModel => {
  if (config.apiType === "openai-compatible") {
    return dependencies.createOpenAICompatibleProvider({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      name: getProviderName(config.apiType)
    })(config.modelId);
  }

  return dependencies.createOpenAIProvider({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    name: getProviderName(config.apiType)
  })(config.modelId);
};

export const testGenericModelConfig = async (
  config: GenericModelConfig,
  dependencies: GenericProviderDependencies = defaultDependencies
): Promise<GenericModelTestResult> => {
  const model = createGenericModel(config, dependencies);
  const result = await dependencies.generateObject({
    model,
    output: "object",
    schema: genericConnectivitySchema,
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
  context: GenericCaptureContext,
  dependencies: GenericProviderDependencies = defaultDependencies
): Promise<GenericExtractionResult> => {
  const model = createGenericModel(config, dependencies);
  const result = await dependencies.generateObject({
    model,
    output: "object",
    schema: genericExtractionSchema,
    schemaName: "generic_api_doc_extraction",
    prompt: buildGenericExtractionPrompt(context)
  });

  return normalizeGenericExtractionResult(result.object);
};
