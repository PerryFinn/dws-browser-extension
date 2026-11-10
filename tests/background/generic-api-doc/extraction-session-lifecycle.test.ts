import { beforeEach, expect, test, vi } from "vitest";
import sessionHandler from "@/background/messages/genericCaptureSession";
import handler from "@/background/messages/genericExtractApiDoc";
import {
  createEmptyGenericCaptureSession,
  type GenericCaptureSession,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import type { GenericExtractionResult } from "@/generic-api-doc/types";
import { Storage } from "@/lib/extension-storage";
import { deferred } from "../../helpers/react";

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), extract: vi.fn() }));
vi.mock("@/storages", () => ({ storage: { get: mocks.get, set: mocks.set } }));
vi.mock("@/background/generic-api-doc/provider", () => ({ extractGenericApiDoc: mocks.extract }));

let current: GenericCaptureSession;
beforeEach(() => {
  vi.clearAllMocks();
  current = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session")),
    {
      source: { tabId: 1, url: "https://example.com", title: "文档", mode: "generic-selection" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1,
        charCount: 10,
        truncated: false,
        qualityHints: []
      }
    }
  );
  mocks.get.mockImplementation(async () => current);
  mocks.set.mockImplementation(async (_key, next: GenericCaptureSession) => {
    current = next;
  });
  vi.spyOn(Storage.prototype, "get").mockImplementation(mocks.get);
  vi.spyOn(Storage.prototype, "set").mockImplementation(mocks.set);
});

const resetSession = async () => {
  let session!: GenericCaptureSession;
  await sessionHandler(
    { body: { type: "reset" } },
    {
      send: (value) => {
        session = value;
      }
    }
  );
  return session;
};

test.each(["resolve", "reject"] as const)("清空采集后，旧模型请求 %s 不覆盖新的 idle session", async (settle) => {
  const started = deferred<void>();
  const model = deferred<GenericExtractionResult>();
  mocks.extract.mockImplementation(() => {
    started.resolve();
    return model.promise;
  });
  const send = vi.fn();
  const pending = handler(
    {
      body: {
        sessionId: current.sessionId,
        attemptId: current.attemptId,
        config: { apiType: "openai-compatible", baseUrl: "https://example.com/v1", modelId: "test", apiKey: "test-key" }
      }
    } as never,
    { send }
  );
  await started.promise;
  const cleared = await resetSession();
  if (settle === "reject") model.reject(new Error("模型超时"));
  else
    model.resolve({
      source: { url: "https://example.com", title: "文档", mode: "generic-selection" },
      endpoint: { method: "GET", path: "/users", name: "用户列表" },
      request: { pathParams: [], queryParams: [], headers: [], body: null, auth: null },
      response: { successBody: null, errorNotes: null },
      uncertainties: []
    });
  await pending;
  expect(current).toBe(cleared);
  expect(current.status).toBe("idle");
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
});

test("结果回写与清空交错时，最终保留清空后的会话", async () => {
  const reading = deferred<void>();
  const releaseRead = deferred<GenericCaptureSession>();
  let readCount = 0;
  let snapshot!: GenericCaptureSession;
  mocks.get.mockImplementation(() => {
    if (++readCount === 3) {
      snapshot = current;
      reading.resolve();
      return releaseRead.promise;
    }
    return Promise.resolve(current);
  });
  mocks.extract.mockRejectedValue(new Error("模型失败"));
  const pending = handler(
    {
      body: {
        sessionId: current.sessionId,
        attemptId: current.attemptId,
        config: { apiType: "openai-compatible", baseUrl: "https://example.com/v1", modelId: "test", apiKey: "test-key" }
      }
    },
    { send: vi.fn() }
  );
  await reading.promise;
  const clearing = resetSession();
  releaseRead.resolve(snapshot);
  const [cleared] = await Promise.all([clearing, pending]);
  expect(current).toEqual(cleared);
  expect(current.status).toBe("idle");
});
