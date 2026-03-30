import type { GenericExtractionResult } from "@/generic-api-doc/types";

export type GenericCaptureSessionStatus = "idle" | "picking" | "picked" | "extracting" | "done" | "error";

export interface GenericCaptureSource {
  tabId: number;
  url: string;
  title: string;
  mode: "generic-dom" | "generic-selection";
}

export interface GenericCaptureSnapshot {
  visibleText: string;
  previewText: string;
  domSummary: string | null;
  pickedAt: number;
}

export interface GenericCaptureSession {
  sessionId: string;
  status: GenericCaptureSessionStatus;
  source: GenericCaptureSource | null;
  capture: GenericCaptureSnapshot | null;
  result: GenericExtractionResult | null;
  error: string | null;
}

// resetGenericCaptureSession 直接回到 idle，不经过这张迁移表。
const allowedTransitions: Record<GenericCaptureSessionStatus, GenericCaptureSessionStatus[]> = {
  idle: ["picking"],
  picking: ["picked", "error"],
  picked: ["extracting", "picking"],
  extracting: ["done", "error"],
  done: ["picking"],
  error: ["extracting", "picking"]
};

export const createEmptyGenericCaptureSession = (sessionId: string): GenericCaptureSession => {
  return {
    sessionId,
    status: "idle",
    source: null,
    capture: null,
    result: null,
    error: null
  };
};

export const canTransitionGenericCaptureSession = (
  from: GenericCaptureSessionStatus,
  to: GenericCaptureSessionStatus
): boolean => {
  return allowedTransitions[from].includes(to);
};

export const markGenericCaptureSessionPicking = (session: GenericCaptureSession): GenericCaptureSession => {
  if (!canTransitionGenericCaptureSession(session.status, "picking")) {
    throw new Error(`Invalid generic capture session transition: ${session.status} -> picking`);
  }

  return {
    ...session,
    status: "picking",
    result: null,
    error: null
  };
};

export const markGenericCaptureSessionPicked = (
  session: GenericCaptureSession,
  payload: {
    source: GenericCaptureSource;
    capture: GenericCaptureSnapshot;
  }
): GenericCaptureSession => {
  if (!canTransitionGenericCaptureSession(session.status, "picked")) {
    throw new Error(`Invalid generic capture session transition: ${session.status} -> picked`);
  }

  return {
    ...session,
    status: "picked",
    source: payload.source,
    capture: payload.capture,
    result: null,
    error: null
  };
};

export const markGenericCaptureSessionExtracting = (session: GenericCaptureSession): GenericCaptureSession => {
  if (!canTransitionGenericCaptureSession(session.status, "extracting")) {
    throw new Error(`Invalid generic capture session transition: ${session.status} -> extracting`);
  }

  return {
    ...session,
    status: "extracting",
    result: null,
    error: null
  };
};

export const markGenericCaptureSessionDone = (
  session: GenericCaptureSession,
  result: GenericExtractionResult
): GenericCaptureSession => {
  if (!canTransitionGenericCaptureSession(session.status, "done")) {
    throw new Error(`Invalid generic capture session transition: ${session.status} -> done`);
  }

  return {
    ...session,
    status: "done",
    result,
    error: null
  };
};

export const markGenericCaptureSessionError = (
  session: GenericCaptureSession,
  error: string
): GenericCaptureSession => {
  if (!canTransitionGenericCaptureSession(session.status, "error")) {
    throw new Error(`Invalid generic capture session transition: ${session.status} -> error`);
  }

  return {
    ...session,
    status: "error",
    result: null,
    error
  };
};

export const resetGenericCaptureSession = (session: GenericCaptureSession): GenericCaptureSession => {
  return createEmptyGenericCaptureSession(session.sessionId);
};

export const isGenericCaptureSessionBoundToTab = (
  session: GenericCaptureSession,
  tab: { id?: number; url?: string }
): boolean => {
  if (!session.source || typeof tab.id !== "number" || typeof tab.url !== "string") {
    return false;
  }

  return session.source.tabId === tab.id && session.source.url === tab.url;
};
