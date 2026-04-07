import { strict as assert } from "node:assert";
import test from "node:test";

import {
  createEmptyGenericCaptureSession,
  markGenericCaptureSessionExtracting,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import { deriveGenericPanelState } from "@/generic-api-doc/session-view";

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
  const state = deriveGenericPanelState({
    session,
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: true
  });
  assert.equal(state.previewText, "GET /users");
  assert.equal(state.disableExtract, false);
  assert.deepEqual(state.captureDiagnostics, {
    sourceModeLabel: "DOM 点选",
    hasDomSummary: true,
    truncated: false,
    charCount: 10,
    uncertaintyCount: 0,
    shouldRepick: false
  });
});

test("当前 tab 与 session 不一致时显示 mismatch 提示", () => {
  const session = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-3")),
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
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1,
        charCount: 10,
        truncated: false,
        qualityHints: ["missing-dom-summary"]
      }
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

test("重新进入 picking 时仍显示旧 previewText，避免失败后丢失上下文", () => {
  const session = markGenericCaptureSessionPicking(
    markGenericCaptureSessionPicked(markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-5")), {
      source: { tabId: 1, url: "https://example.com", title: "Users", mode: "generic-dom" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1,
        charCount: 10,
        truncated: false,
        qualityHints: ["missing-dom-summary"]
      }
    })
  );

  const state = deriveGenericPanelState({
    session,
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: true
  });

  assert.equal(state.previewText, "GET /users");
  assert.equal(state.disableCaptureActions, true);
  assert.equal(state.disableExtract, true);
});

test("picking 或已采集状态都提供通用清空入口，并基于诊断给出重采集建议", () => {
  const picked = markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("session-6")),
    {
      source: { tabId: 1, url: "https://example.com", title: "Users", mode: "generic-selection" },
      capture: {
        visibleText: "GET /users",
        previewText: "GET /users",
        domSummary: null,
        pickedAt: 1,
        charCount: 3800,
        truncated: true,
        qualityHints: ["truncated-visible-text", "missing-dom-summary"]
      }
    }
  );
  const state = deriveGenericPanelState({
    session: picked,
    tab: { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    isConfigComplete: true
  });

  assert.equal(state.canClearSession, true);
  assert.deepEqual(state.captureDiagnostics, {
    sourceModeLabel: "文本选区",
    hasDomSummary: false,
    truncated: true,
    charCount: 3800,
    uncertaintyCount: 0,
    shouldRepick: true
  });
});
