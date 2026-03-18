import { strict as assert } from "node:assert";
import test from "node:test";

import type { GenericCaptureContext, GenericModelConfig } from "@/generic-api-doc/types";
import {
  buildGenericExtractionPrompt,
  buildGenericModelConfigTestPrompt,
  createGenericModel,
  extractGenericApiDoc,
  testGenericModelConfig,
  type GenericProviderDependencies
} from "./provider";

const createConfig = (apiType: GenericModelConfig["apiType"]): GenericModelConfig => ({
  apiType,
  baseUrl: "https://example.com/v1",
  modelId: apiType === "openai" ? "gpt-5.1" : "deepseek-chat",
  apiKey: "sk-test"
});

const createCaptureContext = (): GenericCaptureContext => ({
  source: {
    url: "https://example.com/docs/user-detail",
    title: "用户详情接口",
    mode: "generic-dom"
  },
  rawText: "接口名称：获取用户详情\n请求路径：/api/user/detail\n请求方法：GET",
  previewText: "获取用户详情 /api/user/detail GET",
  domSummary: "<section><h2>获取用户详情</h2></section>"
});

const createDependencies = () => {
  const calls = {
    compatibleFactory: [] as Array<Record<string, unknown>>,
    openaiFactory: [] as Array<Record<string, unknown>>,
    generated: [] as Array<Record<string, unknown>>
  };

  const compatibleProvider = ((modelId: string) => ({
    providerId: "compatible",
    modelId
  })) as (modelId: string) => unknown;

  const openaiProvider = ((modelId: string) => ({
    providerId: "openai",
    modelId
  })) as (modelId: string) => unknown;

  const dependencies: GenericProviderDependencies = {
    createOpenAICompatibleProvider: (options) => {
      calls.compatibleFactory.push(options as unknown as Record<string, unknown>);
      return compatibleProvider as ReturnType<GenericProviderDependencies["createOpenAICompatibleProvider"]>;
    },
    createOpenAIProvider: (options) => {
      calls.openaiFactory.push(options as unknown as Record<string, unknown>);
      return openaiProvider as ReturnType<GenericProviderDependencies["createOpenAIProvider"]>;
    },
    generateObject: async (options) => {
      calls.generated.push(options as unknown as Record<string, unknown>);

      return {
        object: {
          source: {
            url: "https://example.com/docs/user-detail",
            title: "用户详情接口",
            mode: "generic-dom"
          },
          endpoint: {
            name: "获取用户详情",
            path: "/api/user/detail",
            method: "GET"
          },
          request: {
            pathParams: [],
            queryParams: [],
            headers: [],
            body: null,
            auth: null
          },
          response: {
            successBody: null,
            errorNotes: null
          },
          uncertainties: []
        }
      } as Awaited<ReturnType<GenericProviderDependencies["generateObject"]>>;
    }
  };

  return {
    calls,
    dependencies
  };
};

test("openai-compatible 会走兼容 provider 工厂", () => {
  const { calls, dependencies } = createDependencies();
  const model = createGenericModel(createConfig("openai-compatible"), dependencies) as unknown as {
    providerId: string;
    modelId: string;
  };

  assert.equal(calls.compatibleFactory.length, 1);
  assert.equal(calls.openaiFactory.length, 0);
  assert.equal(model.providerId, "compatible");
  assert.equal(model.modelId, "deepseek-chat");
});

test("openai 会走 OpenAI provider 工厂", () => {
  const { calls, dependencies } = createDependencies();
  const model = createGenericModel(createConfig("openai"), dependencies) as unknown as {
    providerId: string;
    modelId: string;
  };

  assert.equal(calls.compatibleFactory.length, 0);
  assert.equal(calls.openaiFactory.length, 1);
  assert.equal(model.providerId, "openai");
  assert.equal(model.modelId, "gpt-5.1");
});

test("测试连接使用最小结构化请求", async () => {
  const { calls, dependencies } = createDependencies();
  await testGenericModelConfig(createConfig("openai-compatible"), dependencies);

  assert.equal(calls.generated.length, 1);
  const [request] = calls.generated;
  assert.equal(request.schemaName, "generic_model_connectivity_check");
  assert.equal(request.prompt, buildGenericModelConfigTestPrompt());
  assert.equal(request.output, "object");
  assert.doesNotMatch(String(request.prompt), /接口名称：获取用户详情/);
});

test("正式提取会把 capture context 序列化到模型输入中", async () => {
  const { calls, dependencies } = createDependencies();
  const context = createCaptureContext();
  const result = await extractGenericApiDoc(createConfig("openai-compatible"), context, dependencies);

  assert.equal(calls.generated.length, 1);
  const [request] = calls.generated;
  assert.equal(request.schemaName, "generic_api_doc_extraction");
  assert.equal(request.prompt, buildGenericExtractionPrompt(context));
  assert.match(String(request.prompt), /页面标题：用户详情接口/);
  assert.match(String(request.prompt), /原始文本：/);
  assert.equal(result.endpoint.path, "/api/user/detail");
});
