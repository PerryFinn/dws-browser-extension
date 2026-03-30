import { type GenericCaptureSession, isGenericCaptureSessionBoundToTab } from "@/generic-api-doc/session";

const EMPTY_PREVIEW_TEXT = "暂无采集内容，请先点选区域或读取当前选中文本";

interface DeriveGenericPanelStateOptions {
  session: GenericCaptureSession;
  tab: chrome.tabs.Tab | null;
  isConfigComplete: boolean;
  isCapturing?: boolean;
  isExtracting?: boolean;
  isPageSupported?: boolean;
}

export interface GenericPanelViewState {
  isTabMismatch: boolean;
  previewText: string;
  disableCaptureActions: boolean;
  disableExtract: boolean;
  canStartCaptureWithoutConfig: boolean;
}

export const deriveGenericPanelState = ({
  session,
  tab,
  isConfigComplete,
  isCapturing = false,
  isExtracting = false,
  isPageSupported = true
}: DeriveGenericPanelStateOptions): GenericPanelViewState => {
  const hasCapture = !!session.source && !!session.capture;
  const isSessionPicking = session.status === "picking";
  const isSessionExtracting = session.status === "extracting";
  const isBusy = isCapturing || isExtracting || isSessionPicking || isSessionExtracting;
  // 采集结果一旦和当前标签页不匹配，只允许清空或重采集，避免误提取旧页面内容。
  const isTabMismatch = hasCapture ? !isGenericCaptureSessionBoundToTab(session, tab ?? {}) : false;
  const disableCaptureActions = !isPageSupported || isBusy;

  return {
    isTabMismatch,
    previewText: session.capture?.previewText ?? EMPTY_PREVIEW_TEXT,
    disableCaptureActions,
    disableExtract: !hasCapture || !isConfigComplete || isTabMismatch || isBusy,
    canStartCaptureWithoutConfig: isPageSupported && !isBusy
  };
};
