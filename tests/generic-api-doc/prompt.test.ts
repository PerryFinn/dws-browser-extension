import { expect, test } from "vitest";
import {
  buildGenericPrompt,
  defaultGenericPromptTemplate,
  resolveGenericPromptTemplateForCopy
} from "@/generic-api-doc/prompt";
import type { GenericExtractionResult } from "@/generic-api-doc/types";

const createBaseExtractionResult = (): GenericExtractionResult => ({
  source: {
    url: "https://example.com/api/user/detail",
    title: "用户详情接口",
    mode: "generic-dom"
  },
  endpoint: {
    name: "获取用户详情",
    path: "/api/user/detail",
    method: "GET",
    description: "根据用户 ID 获取用户详情"
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
});
test("复制 Generic Prompt 时 undefined 会回退到默认模板", () => {
  expect(resolveGenericPromptTemplateForCopy(undefined)).toBe(defaultGenericPromptTemplate);
});
test("复制 Generic Prompt 时空字符串会回退到默认模板", () => {
  expect(resolveGenericPromptTemplateForCopy("")).toBe(defaultGenericPromptTemplate);
  expect(resolveGenericPromptTemplateForCopy("   ")).toBe(defaultGenericPromptTemplate);
});
test("buildGenericPrompt 会替换 {{json}} 与 {{url}}", () => {
  const extractionResult = createBaseExtractionResult();
  const prompt = buildGenericPrompt({
    template: "JSON:\n{{json}}\nURL: {{url}}",
    extractionResult,
    url: extractionResult.source.url
  });
  expect(prompt).toMatch(/"path": "\/api\/user\/detail"/);
  expect(prompt).toMatch(/URL: https:\/\/example\.com\/api\/user\/detail/);
});
test("uncertainties 为空时不追加确认引导语", () => {
  const extractionResult = createBaseExtractionResult();
  const prompt = buildGenericPrompt({
    template: defaultGenericPromptTemplate,
    extractionResult,
    url: extractionResult.source.url
  });
  expect(prompt).not.toMatch(/先向用户确认以下不确定项/);
});
test("uncertainties 非空时追加确认引导语", () => {
  const extractionResult = createBaseExtractionResult();
  extractionResult.uncertainties = [
    {
      field: "response.successBody.data.status",
      reason: "文档只有示例值，没有明确字段枚举"
    }
  ];
  const prompt = buildGenericPrompt({
    template: defaultGenericPromptTemplate,
    extractionResult,
    url: extractionResult.source.url
  });
  expect(prompt).toMatch(/先向用户确认以下不确定项/);
  expect(prompt).toMatch(/response\.successBody\.data\.status/);
  expect(prompt).toMatch(/不要对这些字段做主观假设/);
});
