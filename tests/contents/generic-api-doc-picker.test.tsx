import { act, createElement } from "react";
import { expect, test, vi } from "vitest";
import sessionHandler from "@/background/messages/genericCaptureSession";
import GenericApiDocPicker from "@/contents/generic-api-doc-picker";
import { createEmptyGenericCaptureSession, markGenericCaptureSessionPicking } from "@/generic-api-doc/session";
import type { GenericCaptureSessionCommand } from "@/generic-api-doc/session-command";
import type { GenericPickerMessage, GenericPickerResponse } from "@/generic-api-doc/types";
import { Storage } from "@/lib/extension-storage";
import { deferred, renderElement } from "../helpers/react";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/extension-messaging", () => ({ sendToBackground: mocks.send }));

test.each([false, true])("页面选区通过后台提交，空选区=%s 时回写错误", async (empty) => {
  let session = markGenericCaptureSessionPicking(createEmptyGenericCaptureSession("picker"));
  vi.spyOn(Storage.prototype, "get").mockImplementation(async () => session);
  vi.spyOn(Storage.prototype, "set").mockImplementation(async (_key, value) => {
    session = value as typeof session;
  });
  mocks.send.mockImplementation(async ({ body }: { body: GenericCaptureSessionCommand }) => {
    let result!: typeof session;
    await sessionHandler(
      { body },
      {
        send: (value) => {
          result = value;
        }
      }
    );
    return result;
  });
  let listener!: (
    message: GenericPickerMessage,
    sender: object,
    respond: (response: GenericPickerResponse) => void
  ) => boolean | undefined;
  const removeListener = vi.fn();
  vi.stubGlobal("chrome", {
    runtime: {
      onMessage: {
        addListener: (value: typeof listener) => {
          listener = value;
        },
        removeListener
      }
    }
  });
  const page = await renderElement(createElement(GenericApiDocPicker));
  Object.defineProperty(window, "location", { configurable: true, value: { href: "https://example.com/api" } });
  window.getSelection = vi.fn().mockReturnValue({ toString: () => (empty ? "" : "GET /users") });
  try {
    const response = deferred<GenericPickerResponse>();
    await act(async () => {
      expect(
        listener(
          {
            type: "generic-picker:read-selection",
            sessionId: session.sessionId,
            attemptId: session.attemptId,
            tabId: 1
          },
          {},
          response.resolve
        )
      ).toBe(true);
      await response.promise;
    });
    expect((await response.promise).success).toBe(!empty);
    expect(session.status).toBe(empty ? "error" : "picked");
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ name: "genericCaptureSession" }));
    if (!empty) expect(session.capture?.visibleText).toBe("GET /users");
  } finally {
    await page.cleanup();
  }
  expect(removeListener).toHaveBeenCalledWith(listener);
});
