import { strict as assert } from "node:assert";
import test from "node:test";

import {
  canTransitionGenericCaptureSession,
  createEmptyGenericCaptureSession,
  isGenericCaptureSessionBoundToTab,
  markGenericCaptureSessionDone,
  markGenericCaptureSessionError,
  markGenericCaptureSessionExtracting,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking,
  resetGenericCaptureSession
} from "@/generic-api-doc/session";

test("createEmptyGenericCaptureSession 返回 idle 默认值", () => {
  const session = createEmptyGenericCaptureSession("session-1");
  assert.equal(session.sessionId, "session-1");
  assert.equal(session.status, "idle");
  assert.equal(session.source, null);
  assert.equal(session.capture, null);
  assert.equal(session.result, null);
  assert.equal(session.error, null);
});

test("只允许合法状态迁移", () => {
  assert.equal(canTransitionGenericCaptureSession("idle", "picking"), true);
  assert.equal(canTransitionGenericCaptureSession("idle", "picked"), false);
  assert.equal(canTransitionGenericCaptureSession("picking", "error"), true);
  assert.equal(canTransitionGenericCaptureSession("picking", "done"), false);
  assert.equal(canTransitionGenericCaptureSession("extracting", "idle"), false);
  assert.equal(canTransitionGenericCaptureSession("done", "idle"), false);
  assert.equal(canTransitionGenericCaptureSession("done", "picking"), true);
  assert.equal(canTransitionGenericCaptureSession("error", "extracting"), true);
});

test("markGenericCaptureSessionPicking 允许从 done 重启并保留旧 capture", () => {
  const done = markGenericCaptureSessionDone(
    markGenericCaptureSessionExtracting(
      markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-9")), {
        source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
        capture: {
          visibleText: "GET /users",
          previewText: "GET /users",
          domSummary: "headings: Users",
          pickedAt: 1
        }
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

  assert.equal(restarted.status, "picking");
  assert.equal(restarted.capture?.previewText, "GET /users");
  assert.equal(restarted.source?.url, "https://example.com/users");
  assert.equal(restarted.result, null);
  assert.equal(restarted.error, null);
});

test("markGenericCaptureSessionPicked 会写入 source 与 capture 并清空 error", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-2")),
    {
      source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: "headings: Users", pickedAt: 1 }
    }
  );
  assert.equal(session.status, "picked");
  assert.equal(session.source?.url, "https://example.com");
  assert.equal(session.capture?.domSummary, "headings: Users");
  assert.equal(session.error, null);
});

test("markGenericCaptureSessionError 会保留已有 capture", () => {
  const base = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-3")),
    {
      source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
    }
  );
  const session = markGenericCaptureSessionError(markGenericCaptureSessionExtracting(base), "provider timeout");
  assert.equal(session.status, "error");
  assert.equal(session.capture?.visibleText, "GET /users");
  assert.equal(session.error, "provider timeout");
});

test("markGenericCaptureSessionDone 会写入 result 并保留 capture", () => {
  const capture = {
    visibleText: "GET /users",
    previewText: "GET /users",
    domSummary: "headings: Users",
    pickedAt: 1
  };
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

  assert.equal(session.status, "done");
  assert.equal(session.result, result);
  assert.equal(session.error, null);
  assert.equal(session.capture, capture);
});

test("关键非法 helper 调用会抛错", () => {
  assert.throws(() => markGenericCaptureSessionExtracting(createEmptyGenericCaptureSession("session-7")));

  assert.throws(() =>
    markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-7"), {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1
      }
    })
  );

  const picked = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-8")),
    {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1
      }
    }
  );

  assert.throws(() =>
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
  );

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
  assert.equal(restarted.status, "picking");
  assert.equal(restarted.capture?.visibleText, "GET /users");
});

test("resetGenericCaptureSession 会回到初始 idle 状态", () => {
  const base = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-4")),
    {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
    }
  );
  const session = resetGenericCaptureSession(base);
  assert.equal(session.sessionId, "session-4");
  assert.equal(session.status, "idle");
  assert.equal(session.source, null);
  assert.equal(session.capture, null);
  assert.equal(session.result, null);
  assert.equal(session.error, null);
});

test("isGenericCaptureSessionBoundToTab 会校验 tabId 与 url", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-5")),
    {
      source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
    }
  );
  assert.equal(isGenericCaptureSessionBoundToTab(session, { id: 9, url: "https://example.com/users" }), true);
  assert.equal(isGenericCaptureSessionBoundToTab(session, { id: 10, url: "https://example.com/users" }), false);
});
