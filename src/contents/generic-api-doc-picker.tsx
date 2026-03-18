import type { PlasmoCSConfig } from "plasmo";
import { useEffect } from "react";
import { createDomCaptureContext, createSelectionCaptureContext } from "@/generic-api-doc/capture";
import type { GenericPickerMessage, GenericPickerResponse } from "@/generic-api-doc/types";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
};

const PICKER_OVERLAY_ID = "__generic-api-doc-picker-overlay__";

let activePickerCleanup: (() => void) | null = null;

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

const startDomPicker = (): Promise<GenericPickerResponse> => {
  cleanupActivePicker();

  return new Promise((resolve) => {
    let currentTarget: HTMLElement | null = null;

    const finish = (response: GenericPickerResponse) => {
      cleanup();
      resolve(response);
    };

    const handleMouseMove = (event: MouseEvent) => {
      currentTarget = resolvePickTarget(event.target);
      updatePickerOverlay(currentTarget);
    };

    const handleClick = (event: MouseEvent) => {
      if (!currentTarget) {
        finish({ success: false, message: "未找到可提取的文档区域" });
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      try {
        const context = createDomCaptureContext({
          url: window.location.href,
          title: document.title,
          text: currentTarget.innerText || currentTarget.textContent || "",
          htmlSnippet: currentTarget.outerHTML
        });

        finish({ success: true, data: context });
      } catch (error) {
        finish({
          success: false,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finish({ success: false, message: "已取消点选" });
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
  });
};

const readSelection = (): GenericPickerResponse => {
  try {
    const context = createSelectionCaptureContext({
      url: window.location.href,
      title: document.title,
      text: window.getSelection()?.toString() ?? ""
    });

    return {
      success: true,
      data: context
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
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

      if (message.type === "generic-picker:read-selection") {
        sendResponse(readSelection());
        return undefined;
      }

      void startDomPicker().then(sendResponse);

      return true;
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      cleanupActivePicker();
    };
  }, []);

  return null;
}

export default GenericApiDocPicker;
