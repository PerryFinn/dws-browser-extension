import { expect, test } from "vitest";
import { executeGenericCurrentCaptureSelfCheck } from "@/background/messages/genericSelfCheckCurrentCapture";
import {
  createEmptyGenericCaptureSession,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import type { GenericExtractionResult } from "@/generic-api-doc/types";

const createPickedSession = () => {
  return markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-self-check")),
    {
      source: { tabId: 1, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: "headingPath: Users",
        pickedAt: 1,
        charCount: 10,
        truncated: false,
        qualityHints: []
      }
    }
  );
};
test("executeGenericCurrentCaptureSelfCheck 在有采集样例时返回摘要结果", async () => {
  const resultData: GenericExtractionResult = {
    source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    endpoint: { name: "获取用户详情", path: "/users", method: "GET" },
    request: { pathParams: [], queryParams: [], headers: [], body: null, auth: null },
    response: { successBody: null, errorNotes: null },
    uncertainties: [{ field: "endpoint.path", reason: "路径来自标题推断", kind: "conflict" }]
  };
  const result = await executeGenericCurrentCaptureSelfCheck({
    session: createPickedSession(),
    selfCheck(input) {
      expect(input.source.url).toBe("https://example.com/users");
      expect(input.capture.visibleText).toBe("GET /users");
      return Promise.resolve(resultData);
    }
  });
  expect(result).toEqual({
    success: true,
    message: "样例自检通过：GET /users（1 个不确定项）"
  });
});
test("executeGenericCurrentCaptureSelfCheck 在缺少采集样例时直接失败", async () => {
  const result = await executeGenericCurrentCaptureSelfCheck({
    session: createEmptyGenericCaptureSession("session-empty"),
    selfCheck() {
      throw new Error("should not run");
    }
  });
  expect(result).toEqual({
    success: false,
    message: "当前没有可用的采集样例，请先在 popup 完成一次采集"
  });
});
