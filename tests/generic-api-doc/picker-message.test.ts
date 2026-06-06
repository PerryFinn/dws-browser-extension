import { expect, test } from "vitest";
import { bindGenericPickerSession, resolveGenericPickerTabId } from "@/generic-api-doc/picker-message";

test("bindGenericPickerSession 为点选消息补齐 sessionId 与 tabId", () => {
  const message = bindGenericPickerSession({ type: "generic-picker:start" }, "session-1", "attempt-1", 12);
  expect(message).toEqual({
    type: "generic-picker:start",
    sessionId: "session-1",
    attemptId: "attempt-1",
    tabId: 12
  });
});
test("bindGenericPickerSession 为选区消息补齐 sessionId 与 tabId", () => {
  const message = bindGenericPickerSession({ type: "generic-picker:read-selection" }, "session-2", "attempt-2", 21);
  expect(message).toEqual({
    type: "generic-picker:read-selection",
    sessionId: "session-2",
    attemptId: "attempt-2",
    tabId: 21
  });
});
test("bindGenericPickerSession 不修改 reset 消息", () => {
  const message = bindGenericPickerSession({ type: "generic-picker:reset" }, "session-3", "attempt-3", 34);
  expect(message).toEqual({ type: "generic-picker:reset" });
});
test("resolveGenericPickerTabId 只从采集消息读取 tabId", () => {
  expect(
    resolveGenericPickerTabId({
      type: "generic-picker:start",
      sessionId: "session-4",
      attemptId: "attempt-4",
      tabId: 7
    })
  ).toBe(7);
  expect(
    resolveGenericPickerTabId({
      type: "generic-picker:read-selection",
      sessionId: "session-5",
      attemptId: "attempt-5"
    })
  ).toBe(undefined);
  expect(resolveGenericPickerTabId({ type: "generic-picker:reset" })).toBe(undefined);
});
