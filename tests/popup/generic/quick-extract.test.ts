import { expect, test } from "vitest";
import {
  createEmptyGenericCaptureSession,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking
} from "@/generic-api-doc/session";
import { isQuickExtractShortcut, resolveQuickExtractSession } from "@/popup/generic/quick-extract";

const shortcutEvent = (overrides: Partial<Parameters<typeof isQuickExtractShortcut>[0]> = {}) => ({
  key: "Enter",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides
});

test("macOS 下使用 Command + Enter 触发一键提取", () => {
  expect(isQuickExtractShortcut(shortcutEvent({ metaKey: true }))).toBe(true);
});

test("Windows 和 Linux 下使用 Ctrl + Enter 触发一键提取", () => {
  expect(isQuickExtractShortcut(shortcutEvent({ ctrlKey: true }))).toBe(true);
});

test("忽略普通 Enter 和包含额外修饰键的组合", () => {
  expect(isQuickExtractShortcut(shortcutEvent())).toBe(false);
  expect(isQuickExtractShortcut(shortcutEvent({ metaKey: true, shiftKey: true }))).toBe(false);
  expect(isQuickExtractShortcut(shortcutEvent({ ctrlKey: true, altKey: true }))).toBe(false);
});

const createPickedSession = () => {
  return markGenericCaptureSessionPicked(
    markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("quick-session")),
    {
      source: {
        tabId: 8,
        url: "https://example.com/api/users",
        title: "用户接口",
        mode: "generic-selection"
      },
      capture: {
        visibleText: "GET /api/users",
        previewText: "GET /api/users",
        domSummary: null,
        pickedAt: 1,
        charCount: 14,
        truncated: false,
        qualityHints: ["missing-dom-summary"]
      }
    }
  );
};

test("只接受当前尝试在当前标签页写回的选区", () => {
  const pickedSession = createPickedSession();
  const resolution = resolveQuickExtractSession(pickedSession, pickedSession, {
    id: 8,
    url: "https://example.com/api/users"
  });

  expect(resolution).toEqual({ success: true, session: pickedSession });
});

test("拒绝过期尝试或其他标签页的选区，避免误提取", () => {
  const pickedSession = createPickedSession();
  const stalePickingSession = markGenericCaptureSessionPicking(pickedSession);

  expect(
    resolveQuickExtractSession(pickedSession, stalePickingSession, {
      id: 8,
      url: "https://example.com/api/users"
    })
  ).toEqual({ success: false, message: "读取选区后未得到可用内容，请重新选择文本后重试" });

  expect(
    resolveQuickExtractSession(pickedSession, pickedSession, {
      id: 9,
      url: "https://example.com/api/orders"
    })
  ).toEqual({ success: false, message: "读取选区后未得到可用内容，请重新选择文本后重试" });
});
