import {
  doesGenericCaptureSessionMatchAttempt,
  type GenericCaptureSession,
  markGenericCaptureSessionDone,
  markGenericCaptureSessionError,
  markGenericCaptureSessionExtracting,
  markGenericCaptureSessionPicked,
  markGenericCaptureSessionPicking,
  resetGenericCaptureSession
} from "@/generic-api-doc/session";
import type { GenericCaptureSessionCommand } from "@/generic-api-doc/session-command";
import { Storage } from "@/lib/extension-storage";
import { GENERIC_CAPTURE_SESSION_STORAGE_KEY, genericApiDocCaptureSessionStorageDefaultValue } from "./generic-api-doc";

const storage = new Storage({ area: "local" });
let pendingWrite: Promise<void> = Promise.resolve();

const applyCommand = (current: GenericCaptureSession, command: GenericCaptureSessionCommand): GenericCaptureSession => {
  switch (command.type) {
    case "initialize":
      return current;
    case "reset":
      return resetGenericCaptureSession(current);
    case "start":
      if (
        !doesGenericCaptureSessionMatchAttempt(current, command.previousSession) ||
        current.status !== command.previousSession.status
      ) {
        throw new Error("当前采集会话已变化，请重新采集后重试");
      }
      return markGenericCaptureSessionPicking(current);
    case "restore":
      return doesGenericCaptureSessionMatchAttempt(current, command.target) &&
        (current.status === "picking" || current.status === "error")
        ? command.previousSession
        : current;
  }

  if (!doesGenericCaptureSessionMatchAttempt(current, command.target)) {
    throw new Error("当前采集会话已失效，请重新采集后重试");
  }

  switch (command.type) {
    case "picked":
      return markGenericCaptureSessionPicked(current, command);
    case "extracting":
      return markGenericCaptureSessionExtracting(current);
    case "done":
      return markGenericCaptureSessionDone(current, command.result);
    case "error":
      return markGenericCaptureSessionError(current, command.message);
  }
};

/** 仅由 background 调用；UI 和 content script 通过消息进入同一条写入队列。 */
export const updateGenericCaptureSession = (command: GenericCaptureSessionCommand): Promise<GenericCaptureSession> => {
  const operation = pendingWrite.then(async () => {
    const stored = await storage.get<GenericCaptureSession>(GENERIC_CAPTURE_SESSION_STORAGE_KEY);
    const current =
      stored ?? (command.type === "start" ? command.previousSession : genericApiDocCaptureSessionStorageDefaultValue);
    const next = applyCommand(current, command);
    if (next !== stored) await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, next);
    return next;
  });
  // 写入失败只影响当前动作，不能阻塞后续 reset 或重试。
  pendingWrite = operation.then(
    () => {},
    () => {}
  );
  return operation;
};
