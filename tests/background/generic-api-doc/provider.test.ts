import { expect, test } from "vitest";
import {
  buildGenericExtractionPrompt,
  buildGenericModelConfigTestPrompt,
  createGenericModel,
  extractGenericApiDoc,
  type GenericProviderDependencies,
  testGenericModelConfig
} from "@/background/generic-api-doc/provider";
import type { GenericExtractFromSessionInput, GenericModelConfig } from "@/generic-api-doc/types";

const createConfig = (apiType: GenericModelConfig["apiType"]): GenericModelConfig => ({
  apiType,
  baseUrl: "https://example.com/v1",
  modelId: "deepseek-chat",
  apiKey: "sk-test"
});
const createCaptureContext = (): GenericExtractFromSessionInput => ({
  source: {
    url: "https://example.com/docs/user-detail",
    title: "用户详情接口",
    mode: "generic-dom"
  },
  capture: {
    visibleText: "接口名称：获取用户详情\n请求路径：/api/user/detail\n请求方法：GET",
    previewText: "获取用户详情 /api/user/detail GET",
    domSummary: "headingPath: 获取用户详情",
    pickedAt: 1,
    charCount: 36,
    truncated: false,
    qualityHints: []
  }
});
const createDependencies = () => {
  const calls = {
    compatibleFactory: [] as Array<Record<string, unknown>>,
    generated: [] as Array<Record<string, unknown>>
  };
  const compatibleProvider = ((modelId: string) => ({
    providerId: "compatible",
    modelId
  })) as (modelId: string) => unknown;
  const dependencies: GenericProviderDependencies = {
    createOpenAICompatibleProvider: (options) => {
      calls.compatibleFactory.push(options as unknown as Record<string, unknown>);
      return compatibleProvider as ReturnType<GenericProviderDependencies["createOpenAICompatibleProvider"]>;
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
  expect(calls.compatibleFactory.length).toBe(1);
  expect(model.providerId).toBe("compatible");
  expect(model.modelId).toBe("deepseek-chat");
});
test("createGenericModel 会去除配置首尾空白", () => {
  const { calls, dependencies } = createDependencies();
  createGenericModel(
    {
      apiType: "openai-compatible",
      baseUrl: "  https://example.com/v1  ",
      modelId: " deepseek-chat\n",
      apiKey: " sk-test "
    },
    dependencies
  );
  expect(calls.compatibleFactory.length).toBe(1);
  const [options] = calls.compatibleFactory;
  expect(options.baseURL).toBe("https://example.com/v1");
  expect(options.apiKey).toBe("sk-test");
});
test("测试连接使用最小结构化请求", async () => {
  const { calls, dependencies } = createDependencies();
  await testGenericModelConfig(createConfig("openai-compatible"), dependencies);
  expect(calls.generated.length).toBe(1);
  const [request] = calls.generated;
  expect(request.schemaName).toBe("generic_model_connectivity_check");
  expect(request.prompt).toBe(buildGenericModelConfigTestPrompt());
  expect(request.output).toBe("object");
  expect(String(request.prompt)).not.toMatch(/接口名称：获取用户详情/);
});
test("正式提取会把 capture context 序列化到模型输入中", async () => {
  const { calls, dependencies } = createDependencies();
  const context = createCaptureContext();
  const result = await extractGenericApiDoc(createConfig("openai-compatible"), context, dependencies);
  expect(calls.generated.length).toBe(1);
  const [request] = calls.generated;
  expect(request.schemaName).toBe("generic_api_doc_extraction");
  expect(request.prompt).toBe(buildGenericExtractionPrompt(context));
  expect(String(request.prompt)).toMatch(/页面标题：用户详情接口/);
  expect(String(request.prompt)).toMatch(/原始文本：/);
  expect(
    (
      request.schema as {
        jsonSchema: {
          properties: {
            endpoint: {
              properties: {
                method: {
                  enum: string[];
                };
              };
            };
          };
        };
      }
    ).jsonSchema.properties.endpoint.properties.method.enum
  ).toEqual(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
  expect(
    (
      request.schema as {
        jsonSchema: {
          properties: {
            request: {
              properties: {
                pathParams: {
                  items: {
                    type: string;
                    additionalProperties: boolean;
                    required: string[];
                  };
                };
              };
            };
          };
        };
      }
    ).jsonSchema.properties.request.properties.pathParams.items
  ).toEqual({
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
  });
  expect(result.endpoint.path).toBe("/api/user/detail");
});
test("extractGenericApiDoc 会忽略模型返回的 source 并使用本地 source", async () => {
  const { dependencies } = createDependencies();
  dependencies.generateObject = async () => ({
    object: {
      source: { url: "https://wrong.example.com", title: "Wrong", mode: "generic-selection" },
      endpoint: { name: "获取用户详情", path: "/api/user/detail", method: "GET" },
      request: { pathParams: [], queryParams: [], headers: [], body: null, auth: null },
      response: { successBody: null, errorNotes: null },
      uncertainties: []
    }
  });
  const result = await extractGenericApiDoc(
    createConfig("openai-compatible"),
    {
      source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /api/user/detail",
        previewText: "GET /api/user/detail",
        domSummary: null,
        pickedAt: 1,
        charCount: 20,
        truncated: false,
        qualityHints: ["missing-dom-summary"]
      }
    },
    dependencies
  );
  expect(result.source.url).toBe("https://example.com/users");
  expect(result.source.mode).toBe("generic-dom");
});
