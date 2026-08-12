import {
  doesGenericCaptureSessionMatchAttempt,
  type GenericCaptureSession,
  isGenericCaptureSessionBoundToTab
} from "@/generic-api-doc/session";

export interface QuickExtractShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export const isQuickExtractShortcut = (event: QuickExtractShortcutEvent): boolean => {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
};

export type QuickExtractSessionResolution =
  | { success: true; session: GenericCaptureSession }
  | { success: false; message: string };

export const resolveQuickExtractSession = (
  capturedSession: GenericCaptureSession | undefined,
  pickingSession: GenericCaptureSession,
  tab: { id?: number; url?: string }
): QuickExtractSessionResolution => {
  if (!capturedSession || !doesGenericCaptureSessionMatchAttempt(capturedSession, pickingSession)) {
    return { success: false, message: "读取选区后未得到可用内容，请重新选择文本后重试" };
  }

  if (
    capturedSession.status !== "picked" ||
    !capturedSession.source ||
    !capturedSession.capture ||
    !isGenericCaptureSessionBoundToTab(capturedSession, tab)
  ) {
    return {
      success: false,
      message: capturedSession.error ?? "读取选区后未得到可用内容，请重新选择文本后重试"
    };
  }

  return { success: true, session: capturedSession };
};
