import { beforeEach, expect, test, vi } from "vitest";
import {
  createEmptyGenericCaptureSession,
  type GenericCaptureSession,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import { Storage } from "@/lib/extension-storage";
import { updateGenericCaptureSession } from "@/storages/generic-capture-session";
import { deferred } from "../helpers/react";

let current: GenericCaptureSession;
beforeEach(() => {
  current = createEmptyGenericCaptureSession("session");
  vi.spyOn(Storage.prototype, "get").mockImplementation(async () => current);
  vi.spyOn(Storage.prototype, "set").mockImplementation(async (_key, next) => {
    current = next as GenericCaptureSession;
  });
});

test("初始化不会覆盖已存在或刚开始采集的会话", async () => {
  const previous = current;
  expect(await updateGenericCaptureSession({ type: "initialize" })).toBe(previous);
  const started = updateGenericCaptureSession({ type: "start", previousSession: previous });
  const initialized = updateGenericCaptureSession({ type: "initialize" });
  expect(await initialized).toBe(await started);
  expect(current.status).toBe("picking");
  expect(Storage.prototype.set).toHaveBeenCalledTimes(1);
});

test("一次写入失败后，清空仍可执行", async () => {
  const previous = current;
  vi.mocked(Storage.prototype.set).mockRejectedValueOnce(new Error("存储写入失败"));
  await expect(updateGenericCaptureSession({ type: "start", previousSession: current })).rejects.toThrow(
    "存储写入失败"
  );
  const cleared = await updateGenericCaptureSession({ type: "reset" });
  expect(cleared.status).toBe("idle");
  expect(cleared.attemptId).not.toBe(previous.attemptId);
  expect(current).toBe(cleared);
});

test("清空尚在读存储时到达的旧页面错误，必须排队后再核对 attempt", async () => {
  current = markGenericCaptureSessionPicking(current);
  const previous = current;
  const reading = deferred<void>();
  const releaseRead = deferred<GenericCaptureSession>();
  vi.mocked(Storage.prototype.get).mockImplementationOnce(() => {
    reading.resolve();
    return releaseRead.promise;
  });
  const clearing = updateGenericCaptureSession({ type: "reset" });
  await reading.promise;
  const lateError = updateGenericCaptureSession({ type: "error", target: previous, message: "旧页面错误" });
  const rejected = expect(lateError).rejects.toThrow("当前采集会话已失效");
  releaseRead.resolve(previous);
  const cleared = await clearing;
  await rejected;
  expect(current).toBe(cleared);
  expect(current.status).toBe("idle");
  expect(current.error).toBeNull();
});

test("采集初始化的回滚不会覆盖页面已提交的选区", async () => {
  const previous = current;
  const picking = await updateGenericCaptureSession({ type: "start", previousSession: previous });
  const picked = await updateGenericCaptureSession({
    type: "picked",
    target: picking,
    source: { tabId: 1, url: "https://example.com", title: "接口", mode: "generic-selection" },
    capture: {
      visibleText: "GET /users",
      previewText: "GET /users",
      domSummary: null,
      pickedAt: 1,
      charCount: 10,
      truncated: false,
      qualityHints: []
    }
  });
  await updateGenericCaptureSession({ type: "restore", target: picking, previousSession: previous });
  expect(current).toBe(picked);
  expect(current.capture?.visibleText).toBe("GET /users");
});
