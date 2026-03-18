import { strict as assert } from "node:assert";
import test from "node:test";

import { buildGenericPrompt, defaultGenericPromptTemplate, resolveGenericPromptTemplateForCopy } from "./prompt";
import type { GenericExtractionResult } from "./types";

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
  assert.equal(resolveGenericPromptTemplateForCopy(undefined), defaultGenericPromptTemplate);
});

test("复制 Generic Prompt 时空字符串会回退到默认模板", () => {
  assert.equal(resolveGenericPromptTemplateForCopy(""), defaultGenericPromptTemplate);
  assert.equal(resolveGenericPromptTemplateForCopy("   "), defaultGenericPromptTemplate);
});

test("buildGenericPrompt 会替换 {{json}} 与 {{url}}", () => {
  const extractionResult = createBaseExtractionResult();
  const prompt = buildGenericPrompt({
    template: "JSON:\n{{json}}\nURL: {{url}}",
    extractionResult,
    url: extractionResult.source.url
  });

  assert.match(prompt, /"path": "\/api\/user\/detail"/);
  assert.match(prompt, /URL: https:\/\/example\.com\/api\/user\/detail/);
});

test("uncertainties 为空时不追加确认引导语", () => {
  const extractionResult = createBaseExtractionResult();
  const prompt = buildGenericPrompt({
    template: defaultGenericPromptTemplate,
    extractionResult,
    url: extractionResult.source.url
  });

  assert.doesNotMatch(prompt, /先向用户确认以下不确定项/);
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

  assert.match(prompt, /先向用户确认以下不确定项/);
  assert.match(prompt, /response\.successBody\.data\.status/);
  assert.match(prompt, /不要对这些字段做主观假设/);
});
