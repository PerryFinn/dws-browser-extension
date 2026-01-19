import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { Clipboard, ClipboardCheck, RefreshCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "@/style.css";

import type { ActiveTabIdReqBody, ActiveTabIdResBody } from "@/background/messages/getActiveTab";
import type {
  SwqaGetInterfaceDetailReqBody,
  SwqaGetInterfaceDetailResBody
} from "@/background/messages/swqaGetInterfaceDetail";
import { Code } from "@/components/catalyst-ui-kit/text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UpdateNotice } from "@/components/update-notice";
import { storage } from "@/storages";
import { cn } from "@/utils";
import { type CleanedSwqaInterfaceDetail, cleanSwqaInterfaceDetail } from "./swqa/clean";
import { buildPrompt, defaultPromptTemplate } from "./swqa/prompt";
import { type ParsedSwqaUrl, parseSwqaInterfaceUrl } from "./swqa/url";

type ExtractState = "idle" | "loading" | "success" | "error";

function IndexPopup() {
  const [tab, setTab] = useState<ActiveTabIdResBody | null>(null);
  const [parsedUrl, setParsedUrl] = useState<ParsedSwqaUrl | null>(null);
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState<CleanedSwqaInterfaceDetail | null>(null);
  const [promptTemplate = defaultPromptTemplate, setPromptTemplate] = useStorage<string>(
    { key: "swqaPromptTemplate", instance: storage },
    defaultPromptTemplate
  );

  const refreshActiveTab = useCallback(async () => {
    setError(null);
    setCleaned(null);
    try {
      const activeTab = await sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({
        name: "getActiveTab"
      });
      setTab(activeTab);
      const parsed = parseSwqaInterfaceUrl(activeTab?.url);
      setParsedUrl(parsed);
      if (!parsed.ok) {
        setError("请在 swqa.gz.cvte.cn 的 /interface/:id 页面使用");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setParsedUrl(null);
    }
  }, []);

  useEffect(() => {
    void refreshActiveTab();
  }, [refreshActiveTab]);

  const cleanedJsonText = useMemo(() => {
    if (!cleaned) return "";
    return JSON.stringify(cleaned, null, 2);
  }, [cleaned]);

  const promptText = useMemo(() => {
    if (!cleaned || !parsedUrl?.ok) return "";
    return buildPrompt({
      template: promptTemplate || defaultPromptTemplate,
      cleanedJson: cleanedJsonText,
      url: parsedUrl.url,
      interfaceId: parsedUrl.interfaceId
    });
  }, [cleaned, cleanedJsonText, parsedUrl, promptTemplate]);

  const handleExtract = async () => {
    if (!parsedUrl?.ok || !tab?.id) return;
    setExtractState("loading");
    setError(null);
    try {
      const resp = await sendToBackground<SwqaGetInterfaceDetailReqBody, SwqaGetInterfaceDetailResBody>({
        name: "swqaGetInterfaceDetail" as never,
        body: { tabId: tab.id, interfaceId: parsedUrl.interfaceId }
      });
      if (!resp.success) {
        setExtractState("error");
        setError(resp.message);
        toast.error(resp.message);
        return;
      }
      const cleanedData = cleanSwqaInterfaceDetail(resp.data);
      setCleaned(cleanedData);
      setExtractState("success");
      toast.success("提取并清洗成功");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setExtractState("error");
      toast.error(message);
    }
  };

  const handleCopyJson = async () => {
    if (!cleanedJsonText) return;
    await navigator.clipboard.writeText(cleanedJsonText);
    toast.success("已复制 JSON");
  };

  const handleCopyPrompt = async () => {
    if (!promptText) return;
    await navigator.clipboard.writeText(promptText);
    toast.success("已复制 Prompt");
  };

  const isReady = parsedUrl?.ok === true;
  const isLoading = extractState === "loading";
  const disableExtract = !isReady || isLoading;
  const disableJsonCopy = !cleanedJsonText || isLoading;
  const disablePromptCopy = !promptText || isLoading;

  return (
    <div className="w-[520px] p-4 space-y-4">
      <UpdateNotice />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            SWQA 接口提取
          </h1>
          <p className="text-xs text-gray-500">
            仅在 <span className="font-semibold">swqa.gz.cvte.cn/interface/:id</span> 生效
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refreshActiveTab()}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <div
        className={cn("rounded-md border p-3 text-sm", {
          "border-green-500 bg-green-50": parsedUrl?.ok,
          "border-red-400 bg-red-50": parsedUrl && !parsedUrl.ok
        })}
      >
        {parsedUrl?.ok ? (
          <div className="space-y-1">
            <div className="font-semibold text-green-700">已匹配接口详情页</div>
            <div>interfaceId：{parsedUrl.interfaceId}</div>
            <div className="break-all text-gray-700">{parsedUrl.url}</div>
          </div>
        ) : (
          <div className="space-y-1 text-red-700">
            <div className="font-semibold">当前页面不符合要求</div>
            <div>{error || "请切到 swqa.gz.cvte.cn 的接口详情页后再尝试"}</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" disabled={disableExtract} loading={isLoading} onClick={() => void handleExtract()}>
          提取并清洗
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-start gap-2">
          <Label htmlFor="prompt-template">Prompt 模板（持久化保存，可编辑占位符）</Label>
          <Button
            variant="default"
            size="sm"
            disabled={disablePromptCopy}
            onClick={() => void handleCopyPrompt()}
            className="shrink-0"
          >
            <ClipboardCheck className="h-4 w-4 mr-1" />
            复制 Prompt
          </Button>
        </div>
        <textarea
          id="prompt-template"
          className="w-full rounded-md border border-gray-300 p-2 text-sm font-mono focus:border-gray-400 focus:outline-none"
          rows={6}
          value={promptTemplate || ""}
          onChange={(e) => {
            void setPromptTemplate(e.target.value);
          }}
        />
        <div className="text-xs text-gray-500">
          支持的占位符：<Code>{"{{json}}"}</Code> / <Code>{"{{url}}"}</Code> / <Code>{"{{interfaceId}}"}</Code>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-start gap-2">
          <Label>清洗后的 JSON</Label>
          <Button
            variant="default"
            size="sm"
            disabled={disableJsonCopy}
            onClick={() => void handleCopyJson()}
            className="shrink-0"
          >
            <Clipboard className="h-4 w-4 mr-1" />
            复制 JSON
          </Button>
        </div>
        <div className="h-48 overflow-auto rounded-md border bg-gray-50 p-2 text-xs font-mono">
          {cleaned ? <pre>{cleanedJsonText}</pre> : <span className="text-gray-400">暂无数据，请先提取</span>}
        </div>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <ToastContainer autoClose={1500} />
    </div>
  );
}

export default IndexPopup;
