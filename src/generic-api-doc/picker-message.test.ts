import { strict as assert } from "node:assert";
import test from "node:test";

import { bindGenericPickerSession, resolveGenericPickerTabId } from "./picker-message";

test("bindGenericPickerSession 为点选消息补齐 sessionId 与 tabId", () => {
  const message = bindGenericPickerSession({ type: "generic-picker:start" }, "session-1", 12);

  assert.deepEqual(message, {
    type: "generic-picker:start",
    sessionId: "session-1",
    tabId: 12
  });
});

test("bindGenericPickerSession 为选区消息补齐 sessionId 与 tabId", () => {
  const message = bindGenericPickerSession({ type: "generic-picker:read-selection" }, "session-2", 21);

  assert.deepEqual(message, {
    type: "generic-picker:read-selection",
    sessionId: "session-2",
    tabId: 21
  });
});

test("bindGenericPickerSession 不修改 reset 消息", () => {
  const message = bindGenericPickerSession({ type: "generic-picker:reset" }, "session-3", 34);

  assert.deepEqual(message, { type: "generic-picker:reset" });
});

test("resolveGenericPickerTabId 只从采集消息读取 tabId", () => {
  assert.equal(resolveGenericPickerTabId({ type: "generic-picker:start", sessionId: "session-4", tabId: 7 }), 7);
  assert.equal(resolveGenericPickerTabId({ type: "generic-picker:read-selection", sessionId: "session-5" }), undefined);
  assert.equal(resolveGenericPickerTabId({ type: "generic-picker:reset" }), undefined);
});
