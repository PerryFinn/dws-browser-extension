import { expect, test } from "vitest";
import { executeGenericExtractApiDoc } from "@/background/messages/genericExtractApiDoc";
import {
  createEmptyGenericCaptureSession,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import type { GenericExtractionResult, GenericModelConfig } from "@/generic-api-doc/types";

const createConfig = (): GenericModelConfig => ({
  apiType: "openai-compatible",
  baseUrl: "https://example.com/v1",
  modelId: "gpt-test",
  apiKey: "sk-test"
});
test("executeGenericExtractApiDoc 提取失败时保留 capture 并回写 error", async () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-1")),
    {
      source: { tabId: 1, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1,
        charCount: 10,
        truncated: false,
        qualityHints: ["missing-dom-summary"]
      }
    }
  );
  const states: string[] = [];
  const result = await executeGenericExtractApiDoc({
    session,
    config: createConfig(),
    onSessionUpdate(next) {
      states.push(next.status);
    },
    extract() {
      throw new Error("provider timeout");
    }
  });
  expect(result.success).toBe(false);
  expect(states).toEqual(["extracting", "error"]);
});
test("executeGenericExtractApiDoc 提取成功时回写 done 并返回结果", async () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-2")),
    {
      source: { tabId: 1, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1,
        charCount: 10,
        truncated: false,
        qualityHints: ["missing-dom-summary"]
      }
    }
  );
  const resultData: GenericExtractionResult = {
    source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    endpoint: { name: "获取用户详情", path: "/users", method: "GET" },
    request: { pathParams: [], queryParams: [], headers: [], body: null, auth: null },
    response: { successBody: null, errorNotes: null },
    uncertainties: []
  };
  const states: string[] = [];
  const result = await executeGenericExtractApiDoc({
    session,
    config: createConfig(),
    onSessionUpdate(next) {
      states.push(next.status);
    },
    extract(input) {
      expect(input.source.url).toBe("https://example.com/users");
      expect(input.capture.visibleText).toBe("GET /users");
      return Promise.resolve(resultData);
    }
  });
  expect(states).toEqual(["extracting", "done"]);
  expect(result).toEqual({ success: true, data: resultData });
});
test("executeGenericExtractApiDoc 在 session 缺少可用采集结果时直接失败", async () => {
  const states: string[] = [];
  const result = await executeGenericExtractApiDoc({
    session: createEmptyGenericCaptureSession("session-3"),
    config: createConfig(),
    onSessionUpdate(next) {
      states.push(next.status);
    },
    extract() {
      throw new Error("should not run");
    }
  });
  expect(states).toEqual([]);
  expect(result).toEqual({ success: false, message: "缺少可用的采集结果" });
});
