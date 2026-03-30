import { strict as assert } from "node:assert";
import test from "node:test";

import {
  createEmptyGenericCaptureSession,
  markGenericCaptureSessionExtracting,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "./session";
import { deriveGenericPanelState } from "./session-view";

test("未配置模型时仍允许开始点选和读取选区", () => {
  const state = deriveGenericPanelState({
    session: createEmptyGenericCaptureSession("session-1"),
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: false
  });
  assert.equal(state.disableCaptureActions, false);
  assert.equal(state.disableExtract, true);
});

test("picked 状态使用 session 里的 previewText", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-2")),
    {
      source: { tabId: 1, url: "https://example.com", title: "Users", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: "headings: Users", pickedAt: 1 }
    }
  );
  const state = deriveGenericPanelState({
    session,
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: true
  });
  assert.equal(state.previewText, "GET /users");
  assert.equal(state.disableExtract, false);
});

test("当前 tab 与 session 不一致时显示 mismatch 提示", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-3")),
    {
      source: { tabId: 1, url: "https://example.com/users", title: "Users", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
    }
  );
  const state = deriveGenericPanelState({
    session,
    tab: { id: 2, url: "https://example.com/orders" } as chrome.tabs.Tab,
    isConfigComplete: true
  });
  assert.equal(state.isTabMismatch, true);
});

test("持久化的 extracting 状态仍然禁用采集与提取", () => {
  const session = markGenericCaptureSessionExtracting(
    markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-4")), {
      source: { tabId: 1, url: "https://example.com", title: "Users", mode: "generic-dom" },
      capture: { visibleText: "GET /users", previewText: "GET /users", domSummary: null, pickedAt: 1 }
    })
  );

  const state = deriveGenericPanelState({
    session,
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: true
  });

  assert.equal(state.disableCaptureActions, true);
  assert.equal(state.disableExtract, true);
  assert.equal(state.canStartCaptureWithoutConfig, false);
});
