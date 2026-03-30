import { strict as assert } from "node:assert";
import test from "node:test";

import {
  canTransitionGenericCaptureSession,
  createEmptyGenericCaptureSession,
  isGenericCaptureSessionBoundToTab,
  markGenericCaptureSessionError,
  markGenericCaptureSessionPicked,
  resetGenericCaptureSession
} from "./session";

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
  assert.equal(canTransitionGenericCaptureSession("picking", "done"), false);
  assert.equal(canTransitionGenericCaptureSession("error", "extracting"), true);
});

test("markGenericCaptureSessionPicked 会写入 source 与 capture 并清空 error", () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-2"), {
    source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: "headings: Users", pickedAt: 1 }
  });
  assert.equal(session.status, "picked");
  assert.equal(session.source?.url, "https://example.com");
  assert.equal(session.capture?.domSummary, "headings: Users");
  assert.equal(session.error, null);
});

test("markGenericCaptureSessionError 会保留已有 capture", () => {
  const base = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-3"), {
    source: { tabId: 9, url: "https://example.com", title: "Example", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });
  const session = markGenericCaptureSessionError(base, "provider timeout");
  assert.equal(session.status, "error");
  assert.equal(session.capture?.visibleText, "GET /users");
  assert.equal(session.error, "provider timeout");
});

test("resetGenericCaptureSession 会回到初始 idle 状态", () => {
  const base = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-4"), {
    source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });
  const session = resetGenericCaptureSession(base);
  assert.equal(session.sessionId, "session-4");
  assert.equal(session.status, "idle");
  assert.equal(session.source, null);
  assert.equal(session.capture, null);
  assert.equal(session.result, null);
  assert.equal(session.error, null);
});

test("isGenericCaptureSessionBoundToTab 会校验 tabId 与 url", () => {
  const session = markGenericCaptureSessionPicked(createEmptyGenericCaptureSession("session-5"), {
    source: { tabId: 9, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
    capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
  });
  assert.equal(isGenericCaptureSessionBoundToTab(session, { id: 9, url: "https://example.com/users" }), true);
  assert.equal(isGenericCaptureSessionBoundToTab(session, { id: 10, url: "https://example.com/users" }), false);
});
