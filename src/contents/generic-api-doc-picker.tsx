import { useEffect } from "react";
import { resolveGenericPickerTabId } from "@/generic-api-doc/picker-message";
import { sanitizePickedElement, sanitizeSelectionText } from "@/generic-api-doc/sanitize";
import {
  doesGenericCaptureSessionMatchAttempt,
  type GenericCaptureSession,
  markGenericCaptureSessionError,
  markGenericCaptureSessionPicked
} from "@/generic-api-doc/session";
import type { GenericPickerMessage, GenericPickerResponse, GenericSanitizedCapture } from "@/generic-api-doc/types";
import { storage } from "@/storages";
import { GENERIC_CAPTURE_SESSION_STORAGE_KEY } from "@/storages/generic-api-doc";

// 页面采集不能依赖 popup 生命周期，因为用户一旦回到页面点击，popup 就会自动关闭，只能由页面脚本接管并直接写 session。

const PICKER_OVERLAY_ID = "__generic-api-doc-picker-overlay__";
const PICKER_NOTICE_ID = "__generic-api-doc-picker-notice__";
const PICKER_SUCCESS_NOTICE = "已采集接口文档片段，请重新打开插件继续提取";

let activePickerCleanup: (() => void) | null = null;
let activeNoticeTimer: number | null = null;

const getPickerOverlay = (): HTMLDivElement => {
  let overlay = document.getElementById(PICKER_OVERLAY_ID) as HTMLDivElement | null;

  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = PICKER_OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    border: "2px solid #2563eb",
    background: "rgba(37, 99, 235, 0.12)",
    boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.32)",
    borderRadius: "8px",
    display: "none"
  });
  document.documentElement.append(overlay);

  return overlay;
};

const hidePickerOverlay = () => {
  const overlay = document.getElementById(PICKER_OVERLAY_ID) as HTMLDivElement | null;

  if (!overlay) {
    return;
  }

  overlay.style.display = "none";
};

const showPickerNotice = (message: string) => {
  let notice = document.getElementById(PICKER_NOTICE_ID) as HTMLDivElement | null;

  if (!notice) {
    notice = document.createElement("div");
    notice.id = PICKER_NOTICE_ID;
    Object.assign(notice.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "2147483647",
      maxWidth: "320px",
      padding: "12px 16px",
      borderRadius: "12px",
      background: "rgba(15, 23, 42, 0.92)",
      color: "#f8fafc",
      fontSize: "14px",
      lineHeight: "20px",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.28)"
    });
    document.documentElement.append(notice);
  }

  notice.textContent = message;
  notice.style.display = "block";

  if (activeNoticeTimer) {
    window.clearTimeout(activeNoticeTimer);
  }

  activeNoticeTimer = window.setTimeout(() => {
    notice?.remove();
    activeNoticeTimer = null;
  }, 2400);
};

const updatePickerOverlay = (target: HTMLElement | null) => {
  const overlay = getPickerOverlay();

  if (!target) {
    overlay.style.display = "none";
    return;
  }

  const rect = target.getBoundingClientRect();

  overlay.style.display = "block";
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
};

const resolvePickTarget = (eventTarget: EventTarget | null): HTMLElement | null => {
  if (!(eventTarget instanceof HTMLElement)) {
    return null;
  }

  const overlay = document.getElementById(PICKER_OVERLAY_ID);

  if (overlay?.contains(eventTarget)) {
    return null;
  }

  if (eventTarget === document.body || eventTarget === document.documentElement) {
    return null;
  }

  return eventTarget.closest("*");
};

const cleanupActivePicker = () => {
  if (activePickerCleanup) {
    activePickerCleanup();
    activePickerCleanup = null;
  }

  hidePickerOverlay();
};

const readActiveGenericCaptureSession = async (
  sessionId: string,
  attemptId: string
): Promise<GenericCaptureSession> => {
  const session = (await storage.get(GENERIC_CAPTURE_SESSION_STORAGE_KEY)) as GenericCaptureSession | undefined;

  if (!session || !doesGenericCaptureSessionMatchAttempt(session, { sessionId, attemptId })) {
    throw new Error("当前采集会话已失效，请重新打开插件后重试");
  }

  return session;
};

const persistPickedSession = async (input: {
  sessionId: string;
  attemptId: string;
  tabId?: number;
  source: { url: string; title: string; mode: "generic-dom" | "generic-selection" };
  capture: GenericSanitizedCapture;
}) => {
  // 页面脚本只允许写回当前激活的 session，避免旧 popup 或旧页面结果串写到新的采集流程里。
  const session = await readActiveGenericCaptureSession(input.sessionId, input.attemptId);

  if (typeof input.tabId !== "number") {
    throw new Error("未找到当前标签页信息");
  }

  const nextSession = markGenericCaptureSessionPicked(session, {
    source: {
      tabId: input.tabId,
      url: input.source.url,
      title: input.source.title,
      mode: input.source.mode
    },
    capture: input.capture
  });

  await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, nextSession);
};

const persistPickerError = async (sessionId: string, attemptId: string, message: string) => {
  try {
    const session = await readActiveGenericCaptureSession(sessionId, attemptId);
    const nextSession = markGenericCaptureSessionError(session, message);
    await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, nextSession);
  } catch (error) {
    console.warn("[generic-api-doc-picker] failed to persist error", error);
  }
};

const startDomPicker = (handlers: {
  onPicked: (target: HTMLElement) => void | Promise<void>;
  onCancel: (message: string) => void | Promise<void>;
}) => {
  cleanupActivePicker();

  let currentTarget: HTMLElement | null = null;

  const finish = (task: void | Promise<void>) => {
    cleanup();
    void task;
  };

  const handleMouseMove = (event: MouseEvent) => {
    currentTarget = resolvePickTarget(event.target);
    updatePickerOverlay(currentTarget);
  };

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!currentTarget) {
      finish(handlers.onCancel("未找到可提取的文档区域"));
      return;
    }

    finish(handlers.onPicked(currentTarget));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      finish(handlers.onCancel("已取消点选"));
    }
  };

  const handleViewportChange = () => {
    updatePickerOverlay(currentTarget);
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    hidePickerOverlay();
    activePickerCleanup = null;
  };

  activePickerCleanup = cleanup;

  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("scroll", handleViewportChange, true);
  window.addEventListener("resize", handleViewportChange);
};

const startSessionBackedPicker = (sessionId: string, attemptId: string, tabId?: number) => {
  startDomPicker({
    async onPicked(target) {
      try {
        // 点选完成后立即在页面侧完成 sanitize 并落 storage，popup 重新打开时直接从 session 恢复。
        const result = sanitizePickedElement({
          element: target,
          url: window.location.href,
          title: document.title
        });
        await persistPickedSession({
          sessionId,
          attemptId,
          tabId,
          source: result.source,
          capture: result.capture
        });
        showPickerNotice(PICKER_SUCCESS_NOTICE);
      } catch (error) {
        await persistPickerError(sessionId, attemptId, error instanceof Error ? error.message : String(error));
      }
    },
    async onCancel(message) {
      await persistPickerError(sessionId, attemptId, message);
    }
  });
};

const readSelectionIntoSession = async (
  sessionId: string,
  attemptId: string,
  tabId?: number
): Promise<GenericPickerResponse> => {
  try {
    const result = sanitizeSelectionText({
      text: window.getSelection()?.toString() ?? "",
      url: window.location.href,
      title: document.title
    });
    await persistPickedSession({
      sessionId,
      attemptId,
      tabId,
      source: result.source,
      capture: result.capture
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await persistPickerError(sessionId, attemptId, message);
    return { success: false, message };
  }
};

const isGenericPickerMessage = (value: unknown): value is GenericPickerMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as { type?: string }).type;

  return type === "generic-picker:start" || type === "generic-picker:read-selection" || type === "generic-picker:reset";
};

function GenericApiDocPicker() {
  useEffect(() => {
    const listener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: GenericPickerResponse) => void
    ) => {
      if (!isGenericPickerMessage(message)) {
        return undefined;
      }

      if (message.type === "generic-picker:reset") {
        cleanupActivePicker();
        sendResponse({ success: true });
        return undefined;
      }

      if (!message.sessionId || !message.attemptId) {
        sendResponse({ success: false, message: "缺少采集会话标识" });
        return undefined;
      }

      const targetTabId = resolveGenericPickerTabId(message);

      if (message.type === "generic-picker:read-selection") {
        // 等待选区写入 session 后再响应，保证 popup 可以安全地紧接着发起模型提取。
        void readSelectionIntoSession(message.sessionId, message.attemptId, targetTabId).then(sendResponse);
        return true;
      }

      sendResponse({ success: true });
      startSessionBackedPicker(message.sessionId, message.attemptId, targetTabId);
      return undefined;
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      cleanupActivePicker();
      if (activeNoticeTimer) {
        window.clearTimeout(activeNoticeTimer);
        activeNoticeTimer = null;
      }
      document.getElementById(PICKER_NOTICE_ID)?.remove();
    };
  }, []);

  return null;
}

export default GenericApiDocPicker;
