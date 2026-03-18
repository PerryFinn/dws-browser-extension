import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { BookOpen, CircleHelp, Clipboard, ClipboardCheck, RefreshCcw, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import type { ActiveTabIdResBody } from "@/background/messages/getActiveTab";
import type {
  SwqaGetInterfaceDetailReqBody,
  SwqaGetInterfaceDetailResBody
} from "@/background/messages/swqaGetInterfaceDetail";
import { Label as FieldLabel } from "@/components/catalyst-ui-kit/fieldset";
import { Radio, RadioField, RadioGroup } from "@/components/catalyst-ui-kit/radio";
import { Code } from "@/components/catalyst-ui-kit/text";
import { Textarea } from "@/components/catalyst-ui-kit/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UpdateNotice } from "@/components/update-notice";
import { storage } from "@/storages";
import {
  SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY,
  SWQA_PROMPT_PURPOSE_STORAGE_KEY,
  SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY
} from "@/storages/swqa-prompt-template";
import { cn } from "@/utils";
import { type CleanedSwqaInterfaceDetail, cleanSwqaInterfaceDetail } from "./clean";
import {
  buildPrompt,
  getSwqaCopyPromptSuccessMessage,
  getSwqaPromptTemplateTooltip,
  resolvePromptTemplateForCopy,
  type SwqaPromptPurpose,
  swqaPromptPurposeLabelMap
} from "./prompt";
import type { ParsedSwqaUrl } from "./url";

type ExtractState = "idle" | "loading" | "success" | "error";

const CVTE_KB_LOGIN_URL = "https://kb.cvte.com/pages/viewpage.action?pageId=540149803";
const promptPurposeOptions: SwqaPromptPurpose[] = ["create", "update"];

export interface SwqaPanelProps {
  tab: ActiveTabIdResBody | null;
  parsedUrl: ParsedSwqaUrl | null;
  pageError?: string | null;
  onRefresh: () => Promise<void> | void;
  onUseGeneric?: () => void;
}

export function SwqaPanel({ tab, parsedUrl, pageError, onRefresh, onUseGeneric }: SwqaPanelProps) {
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [error, setError] = useState<string | null>(pageError ?? null);
  const [cleaned, setCleaned] = useState<CleanedSwqaInterfaceDetail | null>(null);
  const [promptPurpose, setPromptPurpose] = useStorage<SwqaPromptPurpose>(
    { key: SWQA_PROMPT_PURPOSE_STORAGE_KEY, instance: storage },
    "create"
  );
  const [storedCreatePromptTemplate, setStoredCreatePromptTemplate] = useStorage<string>(
    { key: SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY, instance: storage },
    ""
  );
  const [storedUpdatePromptTemplate, setStoredUpdatePromptTemplate] = useStorage<string>(
    { key: SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY, instance: storage },
    ""
  );

  const cleanedJsonText = useMemo(() => {
    if (!cleaned) {
      return "";
    }

    return JSON.stringify(cleaned, null, 2);
  }, [cleaned]);

  const storedPromptTemplate = promptPurpose === "update" ? storedUpdatePromptTemplate : storedCreatePromptTemplate;
  const promptTemplateForCopy = resolvePromptTemplateForCopy(storedPromptTemplate, promptPurpose);

  const promptText = useMemo(() => {
    if (!cleaned || !parsedUrl?.ok) {
      return "";
    }

    return buildPrompt({
      template: promptTemplateForCopy,
      cleanedJson: cleanedJsonText,
      url: parsedUrl.url,
      interfaceId: parsedUrl.interfaceId
    });
  }, [cleaned, cleanedJsonText, parsedUrl, promptTemplateForCopy]);

  const handleExtract = async () => {
    if (!parsedUrl?.ok || !tab?.id) {
      return;
    }

    setExtractState("loading");
    setError(null);

    try {
      const response = await sendToBackground<SwqaGetInterfaceDetailReqBody, SwqaGetInterfaceDetailResBody>({
        name: "swqaGetInterfaceDetail",
        body: { tabId: tab.id, interfaceId: parsedUrl.interfaceId }
      });

      if (!response.success) {
        setExtractState("error");
        setError(response.message);
        toast.error(response.message);
        return;
      }

      const cleanedData = cleanSwqaInterfaceDetail(response.data);
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
    if (!cleanedJsonText) {
      return;
    }

    await navigator.clipboard.writeText(cleanedJsonText);
    toast.success("已复制 JSON");
  };

  const handleCopyPrompt = async () => {
    if (!promptText) {
      return;
    }

    await navigator.clipboard.writeText(promptText);
    toast.success(getSwqaCopyPromptSuccessMessage(promptPurpose));
  };

  const handlePromptTemplateChange = (value: string) => {
    if (promptPurpose === "update") {
      void setStoredUpdatePromptTemplate(value);
      return;
    }

    void setStoredCreatePromptTemplate(value);
  };

  const handlePromptPurposeChange = (value: string) => {
    void setPromptPurpose(value as SwqaPromptPurpose);
  };

  const isReady = parsedUrl?.ok === true;
  const isLoading = extractState === "loading";
  const disableExtract = !isReady || isLoading;
  const disableJsonCopy = !cleanedJsonText || isLoading;
  const disablePromptCopy = !promptText || isLoading;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-[520px] p-4 space-y-4">
        <UpdateNotice />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              SWQA 接口提取
            </h1>
            <p className="text-xs text-gray-500">
              命中 <span className="font-semibold">swqa.gz.cvte.cn/interface/:id</span> 时优先走快路径
            </p>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={CVTE_KB_LOGIN_URL}
              target="_blank"
              rel="noreferrer noopener"
              title="打开 CVTE 文档"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              使用文档
            </a>
            {onUseGeneric ? (
              <Button variant="ghost" size="sm" onClick={onUseGeneric} title="改用通用提取">
                <Wand2 className="h-4 w-4 mr-1" />
                改用通用提取
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => void onRefresh()} title="刷新当前标签页">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
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

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>用途</Label>
            </div>
            <RadioGroup
              aria-label="用途"
              value={promptPurpose}
              onChange={handlePromptPurposeChange}
              className="flex items-center gap-4 !space-y-0"
            >
              {promptPurposeOptions.map((purpose) => (
                <RadioField key={purpose}>
                  <Radio value={purpose} />
                  <FieldLabel>
                    <span className="inline-flex items-center gap-1.5">
                      {swqaPromptPurposeLabelMap[purpose]}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help text-gray-400 transition-colors hover:text-gray-600">
                            <CircleHelp className="h-3.5 w-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[320px] text-xs leading-5">
                          {getSwqaPromptTemplateTooltip(purpose)}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </FieldLabel>
                </RadioField>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-start gap-2">
              <Label htmlFor="swqa-prompt-template">Prompt 模板（持久化、可编辑）</Label>
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
            <Textarea
              id="swqa-prompt-template"
              className="w-full rounded-md p-2 text-sm font-mono focus:border-gray-400 focus:outline-none"
              rows={6}
              value={storedPromptTemplate ?? ""}
              onChange={(event) => handlePromptTemplateChange(event.target.value)}
            />
            <div className="text-xs text-gray-500">
              支持的占位符：<Code>{"{{json}}"}</Code> / <Code>{"{{url}}"}</Code> / <Code>{"{{interfaceId}}"}</Code>
            </div>
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

        {error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</div>
        ) : null}

        <ToastContainer autoClose={1500} />
      </div>
    </TooltipProvider>
  );
}
