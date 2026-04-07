import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import {
  Clipboard,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  MousePointer2,
  RefreshCcw,
  Settings2,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import type {
  GenericExtractApiDocReqBody,
  GenericExtractApiDocResBody
} from "@/background/messages/genericExtractApiDoc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UpdateNotice } from "@/components/update-notice";
import { bindGenericPickerSession } from "@/generic-api-doc/picker-message";
import { buildGenericPrompt, resolveGenericPromptTemplateForCopy } from "@/generic-api-doc/prompt";
import {
  type GenericCaptureSession,
  markGenericCaptureSessionPicking,
  resetGenericCaptureSession
} from "@/generic-api-doc/session";
import { deriveGenericPanelState } from "@/generic-api-doc/session-view";
import type { GenericModelConfig, GenericPickerMessage, GenericPickerResponse } from "@/generic-api-doc/types";
import { openGenericApiSettingsTab } from "@/popup/generic/open-options";
import { storage } from "@/storages";
import {
  GENERIC_API_KEY_STORAGE_KEY,
  GENERIC_BASE_URL_STORAGE_KEY,
  GENERIC_CAPTURE_SESSION_STORAGE_KEY,
  GENERIC_MODEL_ID_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  GENERIC_PROVIDER_TYPE_STORAGE_KEY,
  genericApiDocCaptureSessionStorageDefaultValue,
  genericApiDocStorageDefaultValues,
  isGenericModelConfigComplete
} from "@/storages/generic-api-doc";

const isUnsupportedTabUrl = (url: string | undefined): boolean => {
  if (!url) {
    return true;
  }

  return /^(chrome|edge|about|file):/i.test(url);
};

const resolveTabMessageError = (tabUrl: string | undefined, error: unknown): string => {
  if (isUnsupportedTabUrl(tabUrl)) {
    return "当前页面不支持注入通用提取脚本，请切到普通网页后重试";
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Receiving end does not exist")) {
    return "当前页面尚未建立采集桥接，请刷新页面后重试";
  }

  return message;
};

const buildModelConfig = ({
  providerType,
  baseUrl,
  modelId,
  apiKey
}: {
  providerType: GenericModelConfig["apiType"];
  baseUrl: string;
  modelId: string;
  apiKey: string;
}): GenericModelConfig => ({
  apiType: providerType,
  baseUrl,
  modelId,
  apiKey
});

export interface GenericPanelProps {
  tab: chrome.tabs.Tab | null;
  pageError?: string | null;
  isSwqaPage?: boolean;
  onRefresh: () => Promise<void> | void;
  onUseSwqa?: () => void;
}

export function GenericPanel({ tab, pageError, isSwqaPage, onRefresh, onUseSwqa }: GenericPanelProps) {
  const [providerType] = useStorage<GenericModelConfig["apiType"]>(
    { key: GENERIC_PROVIDER_TYPE_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_PROVIDER_TYPE_STORAGE_KEY]
  );
  const [baseUrl] = useStorage<string>(
    { key: GENERIC_BASE_URL_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_BASE_URL_STORAGE_KEY]
  );
  const [modelId] = useStorage<string>(
    { key: GENERIC_MODEL_ID_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_MODEL_ID_STORAGE_KEY]
  );
  const [apiKey] = useStorage<string>(
    { key: GENERIC_API_KEY_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_API_KEY_STORAGE_KEY]
  );
  const [storedPromptTemplate] = useStorage<string>(
    { key: GENERIC_PROMPT_TEMPLATE_STORAGE_KEY, instance: storage },
    genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]
  );
  const [session, , sessionSetter] = useStorage<GenericCaptureSession>(
    { key: GENERIC_CAPTURE_SESSION_STORAGE_KEY, instance: storage },
    genericApiDocCaptureSessionStorageDefaultValue
  );
  const [transientError, setTransientError] = useState<string | null>(pageError ?? null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const shouldResetPickerOnUnmountRef = useRef(true);

  useEffect(() => {
    setTransientError(pageError ?? null);
  }, [pageError]);

  useEffect(() => {
    return () => {
      if (tab?.id && shouldResetPickerOnUnmountRef.current) {
        void chrome.tabs
          .sendMessage(tab.id, { type: "generic-picker:reset" } satisfies GenericPickerMessage)
          .catch(() => {});
      }
    };
  }, [tab?.id]);

  const modelConfig = useMemo(
    () =>
      buildModelConfig({
        providerType,
        baseUrl,
        modelId,
        apiKey
      }),
    [apiKey, baseUrl, modelId, providerType]
  );

  const isConfigComplete = isGenericModelConfigComplete(modelConfig);
  const isPageSupported = !!tab?.id && !isUnsupportedTabUrl(tab.url);
  const promptTemplateForCopy = resolveGenericPromptTemplateForCopy(storedPromptTemplate);
  const viewState = deriveGenericPanelState({
    session,
    tab,
    isConfigComplete,
    isCapturing,
    isExtracting,
    isPageSupported
  });
  const result = session.result;
  const errorMessage = transientError ?? session.error;

  const promptText = useMemo(() => {
    if (!result) {
      return "";
    }

    return buildGenericPrompt({
      template: promptTemplateForCopy,
      extractionResult: result,
      url: result.source.url
    });
  }, [promptTemplateForCopy, result]);

  const resultJsonText = useMemo(() => {
    if (!result) {
      return "";
    }

    return JSON.stringify(result, null, 2);
  }, [result]);

  const sendPickerMessage = async (message: GenericPickerMessage): Promise<GenericPickerResponse> => {
    if (!tab?.id) {
      return { success: false, message: "未找到当前标签页" };
    }

    try {
      const response = (await chrome.tabs.sendMessage(tab.id, message)) as GenericPickerResponse | undefined;

      if (!response) {
        return { success: false, message: "页面未返回采集结果" };
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: resolveTabMessageError(tab.url, error)
      };
    }
  };

  const ensureReadyToCapture = (): boolean => {
    if (!isPageSupported) {
      const message = resolveTabMessageError(tab?.url, pageError ?? "当前页面不支持通用提取");
      setTransientError(message);
      toast.error(message);
      return false;
    }

    return true;
  };

  const handleCapture = async (message: GenericPickerMessage) => {
    if (!ensureReadyToCapture()) {
      return;
    }

    const previousSession = session;
    // popup 先把 session 标记成 picking，再把 sessionId 交给页面脚本接管，避免 popup 关闭后状态丢失。
    const pickingSession = markGenericCaptureSessionPicking(session);
    await sessionSetter.setStoreValue(pickingSession);
    setIsCapturing(true);
    setTransientError(null);

    const response = await sendPickerMessage(
      bindGenericPickerSession(message, pickingSession.sessionId, pickingSession.attemptId, tab?.id)
    );

    if (!response.success) {
      await sessionSetter.setStoreValue(previousSession);
      setIsCapturing(false);
      setTransientError(response.message);
      toast.error(response.message);
      return;
    }

    setIsCapturing(false);

    if (message.type === "generic-picker:start") {
      // 点选模式下 popup 一定会因为回到页面而关闭，这里显式避免卸载时把刚启动的 picker 重置掉。
      shouldResetPickerOnUnmountRef.current = false;
      window.close();
    }
  };

  const handleExtract = async () => {
    if (!session.capture || !session.source || viewState.isTabMismatch) {
      const message = "请先点选区域或读取当前选中文本";
      setTransientError(message);
      toast.error(message);
      return;
    }

    if (!isConfigComplete) {
      const message = "通用提取模型配置未完成，请先到设置页填写";
      setTransientError(message);
      toast.error(message);
      return;
    }

    setIsExtracting(true);
    setTransientError(null);

    try {
      const response = await sendToBackground<GenericExtractApiDocReqBody, GenericExtractApiDocResBody>({
        name: "genericExtractApiDoc" as never,
        body: {
          sessionId: session.sessionId,
          attemptId: session.attemptId,
          config: modelConfig
        }
      });

      if (!response.success) {
        setTransientError(response.message);
        toast.error(response.message);
        return;
      }

      toast.success("通用提取完成");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTransientError(message);
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearSession = async () => {
    if (tab?.id) {
      await chrome.tabs
        .sendMessage(tab.id, { type: "generic-picker:reset" } satisfies GenericPickerMessage)
        .catch(() => {});
    }

    shouldResetPickerOnUnmountRef.current = true;
    await sessionSetter.setStoreValue(resetGenericCaptureSession(session));
    setTransientError(null);
  };

  const handleCopyJson = async () => {
    if (!resultJsonText) {
      return;
    }

    await navigator.clipboard.writeText(resultJsonText);
    toast.success("已复制 Generic JSON");
  };

  const handleCopyPrompt = async () => {
    if (!promptText) {
      return;
    }

    await navigator.clipboard.writeText(promptText);
    toast.success("已复制 Generic Prompt");
  };

  const handleOpenOptions = () => {
    void openGenericApiSettingsTab({
      runtimeGetURL: (path) => chrome.runtime.getURL(path),
      createTab: (createProperties) => chrome.tabs.create(createProperties)
    });
  };

  return (
    <div className="w-[520px] p-4 space-y-4">
      <UpdateNotice />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-500" />
            通用 API 文档提取
          </h1>
          <p className="text-xs text-gray-500">支持任意域名下的单接口文档提取，需用户辅助定位。</p>
        </div>
        <div className="flex items-center gap-1">
          {isSwqaPage && onUseSwqa ? (
            <Button variant="ghost" size="sm" onClick={onUseSwqa}>
              <ExternalLink className="h-4 w-4 mr-1" />
              改回 SWQA
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={handleOpenOptions}>
            <Settings2 className="h-4 w-4 mr-1" />
            设置
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void onRefresh()}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-3 text-sm space-y-2">
        <div className="font-semibold">{tab?.title || "当前页面"}</div>
        <div className="break-all text-gray-600">{tab?.url || "未读取到当前页面 URL"}</div>
        <div className={isConfigComplete ? "text-green-600" : "text-amber-600"}>
          模型配置：
          {isConfigComplete
            ? "已完成"
            : viewState.canStartCaptureWithoutConfig
              ? "未完成，但仍可先采集，提取前需到设置页填写"
              : "未完成，请先到设置页填写"}
        </div>
      </div>

      {viewState.isTabMismatch ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 space-y-2">
          <div>当前采集内容来自其他标签页，不能直接提取。请清空后重新采集，或直接在当前页重新点选。</div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="default"
          disabled={viewState.disableCaptureActions}
          loading={isCapturing}
          onClick={() => void handleCapture({ type: "generic-picker:start" })}
        >
          <MousePointer2 className="h-4 w-4 mr-1" />
          开始点选
        </Button>
        <Button
          variant="default"
          disabled={viewState.disableCaptureActions}
          loading={isCapturing}
          onClick={() => void handleCapture({ type: "generic-picker:read-selection" })}
        >
          <FileSearch className="h-4 w-4 mr-1" />
          读取选区
        </Button>
        <Button
          variant="default"
          disabled={viewState.disableExtract}
          loading={isExtracting}
          onClick={() => void handleExtract()}
        >
          提取并生成
        </Button>
      </div>

      {viewState.canClearSession ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void handleClearSession()}>
            取消/清空当前采集
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>采集预览</Label>
          {session.source ? (
            <span className="text-xs text-gray-500">
              {session.source.mode === "generic-dom" ? "DOM 点选" : "文本选区"}
            </span>
          ) : null}
        </div>
        <div className="min-h-24 rounded-md border bg-gray-50 p-2 text-xs text-gray-700 whitespace-pre-wrap">
          {viewState.previewText}
        </div>
      </div>

      {viewState.captureDiagnostics ? (
        <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
          <div>采集来源：{viewState.captureDiagnostics.sourceModeLabel}</div>
          <div>结构摘要：{viewState.captureDiagnostics.hasDomSummary ? "已生成" : "缺失"}</div>
          <div>正文长度：{viewState.captureDiagnostics.charCount} 字</div>
          <div>已截断：{viewState.captureDiagnostics.truncated ? "是" : "否"}</div>
          <div>不确定项：{viewState.captureDiagnostics.uncertaintyCount} 个</div>
          {viewState.captureDiagnostics.shouldRepick ? (
            <div className="text-amber-700">当前采集证据偏弱，建议重新点选更聚焦的接口文档区域。</div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-start gap-2">
          <Label>Prompt 预览</Label>
          <Button
            variant="default"
            size="sm"
            disabled={!promptText || isExtracting}
            onClick={() => void handleCopyPrompt()}
          >
            <ClipboardCheck className="h-4 w-4 mr-1" />
            复制 Prompt
          </Button>
        </div>
        <div className="h-36 overflow-auto rounded-md border bg-gray-50 p-2 text-xs font-mono whitespace-pre-wrap">
          {promptText || "提取完成后会在这里显示最终 Prompt"}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-start gap-2">
          <Label>统一 JSON</Label>
          <Button
            variant="default"
            size="sm"
            disabled={!resultJsonText || isExtracting}
            onClick={() => void handleCopyJson()}
          >
            <Clipboard className="h-4 w-4 mr-1" />
            复制 JSON
          </Button>
        </div>
        <div className="h-40 overflow-auto rounded-md border bg-gray-50 p-2 text-xs font-mono whitespace-pre-wrap">
          {resultJsonText || "提取完成后会在这里显示结构化 JSON"}
        </div>
      </div>

      <div className="space-y-2">
        <Label>不确定项</Label>
        <div className="rounded-md border bg-gray-50 p-2 text-xs text-gray-700 space-y-2">
          {result?.uncertainties.length ? (
            result.uncertainties.map((item) => (
              <div key={`${item.field}:${item.reason}`} className="rounded bg-white p-2 border">
                <div className="font-semibold">{item.field}</div>
                <div className="text-gray-600">{item.reason}</div>
              </div>
            ))
          ) : (
            <span className="text-gray-400">暂无不确定项</span>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <ToastContainer autoClose={1500} />
    </div>
  );
}
