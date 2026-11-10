import type { GenericCaptureSession, GenericCaptureSnapshot, GenericCaptureSource } from "@/generic-api-doc/session";
import type { GenericExtractionResult } from "@/generic-api-doc/types";
import { sendToBackground } from "@/lib/extension-messaging";

type SessionTarget = Pick<GenericCaptureSession, "sessionId" | "attemptId">;

export type GenericCaptureSessionCommand =
  | { type: "initialize" | "reset" }
  | { type: "start"; previousSession: GenericCaptureSession }
  | { type: "restore"; target: SessionTarget; previousSession: GenericCaptureSession }
  | { type: "picked"; target: SessionTarget; source: GenericCaptureSource; capture: GenericCaptureSnapshot }
  | { type: "extracting"; target: SessionTarget }
  | { type: "done"; target: SessionTarget; result: GenericExtractionResult }
  | { type: "error"; target: SessionTarget; message: string };

export const sendGenericCaptureSessionCommand = (command: GenericCaptureSessionCommand) =>
  sendToBackground<GenericCaptureSessionCommand, GenericCaptureSession>({
    name: "genericCaptureSession",
    body: command
  });
