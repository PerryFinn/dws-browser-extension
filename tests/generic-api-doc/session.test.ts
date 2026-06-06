import { expect, test } from "vitest";
import {
  canTransitionGenericCaptureSession,
  createEmptyGenericCaptureSession,
  doesGenericCaptureSessionMatchAttempt,
  isGenericCaptureSessionBoundToTab,
  markGenericCaptureSessionDone,
  markGenericCaptureSessionError,
  markGenericCaptureSessionExtracting,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking,
  resetGenericCaptureSession
} from "@/generic-api-doc/session";

const createCapture = (domSummary: string | null) => ({
  visibleText: "GET /users",
  previewText: "GET /users",
  domSummary,
  pickedAt: 1,
  charCount: 10,
  truncated: false,
  qualityHints: domSummary
    ? ([] as Array<"truncated-visible-text" | "missing-dom-summary">)
    : (["missing-dom-summary"] as Array<"truncated-visible-text" | "missing-dom-summary">)
});
test("createEmptyGenericCaptureSession 返回 idle 默认值", () => {
  const session = createEmptyGenericCaptureSession("session-1");
  expect(session.sessionId).toBe("session-1");
  expect(typeof session.attemptId).toBe("string");
  expect(session.attemptId.length).toBeGreaterThan(0);
  expect(session.status).toBe("idle");
  expect(session.source).toBe(null);
  expect(session.capture).toBe(null);
  expect(session.result).toBe(null);
  expect(session.error).toBe(null);
});
test("只允许合法状态迁移", () => {
  expect(canTransitionGenericCaptureSession("idle", "picking")).toBe(true);
  expect(canTransitionGenericCaptureSession("idle", "picked")).toBe(false);
  expect(canTransitionGenericCaptureSession("picking", "error")).toBe(true);
  expect(canTransitionGenericCaptureSession("picking", "done")).toBe(false);
  expect(canTransitionGenericCaptureSession("extracting", "idle")).toBe(false);
  expect(canTransitionGenericCaptureSession("done", "idle")).toBe(false);
  expect(canTransitionGenericCaptureSession("done", "picking")).toBe(true);
  expect(canTransitionGenericCaptureSession("error", "extracting")).toBe(true);
});
test("markGenericCaptureSessionPicking 允许从 done 重启并保留旧 capture", () => {
  const done = markGenericCaptureSessionDone(
    markGenericCaptureSessionExtracting(
      markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-9")), {
        source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
        capture: createCapture("headingPath: Users")
      })
    ),
    {
      source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" as const },
      endpoint: { name: "列表", path: "/api/users", method: "GET" },
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
  );
  const restarted = markGenericCaptureSessionPicking(done);
  expect(restarted.status).toBe("picking");
  expect(restarted.attemptId).not.toBe(done.attemptId);
  expect(restarted.capture?.previewText).toBe("GET /users");
  expect(restarted.source?.url).toBe("https://example.com/users");
  expect(restarted.result).toBe(null);
  expect(restarted.error).toBe(null);
});
test("doesGenericCaptureSessionMatchAttempt 同时校验 sessionId 和 attemptId", () => {
  const session = createEmptyGenericCaptureSession("session-attempt");
  expect(
    doesGenericCaptureSessionMatchAttempt(session, {
      sessionId: "session-attempt",
      attemptId: session.attemptId
    })
  ).toBe(true);
  expect(
    doesGenericCaptureSessionMatchAttempt(session, {
      sessionId: "session-attempt",
      attemptId: "stale-attempt"
    })
  ).toBe(false);
});
test("markGenericCaptureSessionPicked 会写入 source 与 capture 并清空 error", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-2")),
    {
      source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
      capture: createCapture("headingPath: Users")
    }
  );
  expect(session.status).toBe("picked");
  expect(session.source?.url).toBe("https://example.com");
  expect(session.capture?.domSummary).toBe("headingPath: Users");
  expect(session.error).toBe(null);
});
test("markGenericCaptureSessionError 会保留已有 capture", () => {
  const base = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-3")),
    {
      source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
      capture: createCapture(null)
    }
  );
  const session = markGenericCaptureSessionError(markGenericCaptureSessionExtracting(base), "provider timeout");
  expect(session.status).toBe("error");
  expect(session.capture?.visibleText).toBe("GET /users");
  expect(session.error).toBe("provider timeout");
});
test("markGenericCaptureSessionDone 会写入 result 并保留 capture", () => {
  const capture = createCapture("headingPath: Users");
  const result = {
    source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" as const },
    endpoint: { name: "列表", path: "/api/users", method: "GET" },
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
  };
  const session = markGenericCaptureSessionDone(
    markGenericCaptureSessionExtracting(
      markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-6")), {
        source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
        capture
      })
    ),
    result
  );
  expect(session.status).toBe("done");
  expect(session.result).toBe(result);
  expect(session.error).toBe(null);
  expect(session.capture).toBe(capture);
});
test("关键非法 helper 调用会抛错", () => {
  expect(() => markGenericCaptureSessionExtracting(createEmptyGenericCaptureSession("session-7"))).toThrow();
  expect(() =>
    markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-7"), {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: createCapture(null)
    })
  ).toThrow();
  const picked = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-8")),
    {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: createCapture(null)
    }
  );
  expect(() =>
    markGenericCaptureSessionDone(picked, {
      source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" as const },
      endpoint: { name: "列表", path: "/api/users", method: "GET" },
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
    })
  ).toThrow();
  const done = markGenericCaptureSessionDone(markGenericCaptureSessionExtracting(picked), {
    source: { url: "https://example.com/users", title: "Users", mode: "generic-dom" as const },
    endpoint: { name: "列表", path: "/api/users", method: "GET" },
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
  const restarted = markGenericCaptureSessionPicking(done);
  expect(restarted.status).toBe("picking");
  expect(restarted.capture?.visibleText).toBe("GET /users");
});
test("resetGenericCaptureSession 会回到初始 idle 状态", () => {
  const base = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-4")),
    {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: createCapture(null)
    }
  );
  const session = resetGenericCaptureSession(base);
  expect(session.sessionId).toBe("session-4");
  expect(session.status).toBe("idle");
  expect(session.source).toBe(null);
  expect(session.capture).toBe(null);
  expect(session.result).toBe(null);
  expect(session.error).toBe(null);
});
test("isGenericCaptureSessionBoundToTab 会校验 tabId 与 url", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-5")),
    {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: createCapture(null)
    }
  );
  expect(isGenericCaptureSessionBoundToTab(session, { id: 9, url: "https://example.com/users" })).toBe(true);
  expect(isGenericCaptureSessionBoundToTab(session, { id: 10, url: "https://example.com/users" })).toBe(false);
});
