import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type {
  GenericSelfCheckCurrentCaptureReqBody,
  GenericSelfCheckCurrentCaptureResBody
} from "@/background/messages/genericSelfCheckCurrentCapture";
import type {
  GenericTestModelConfigReqBody,
  GenericTestModelConfigResBody
} from "@/background/messages/genericTestModelConfig";
import { Description, Field, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Select } from "@/components/catalyst-ui-kit/select";
import { Code } from "@/components/catalyst-ui-kit/text";
import { Textarea } from "@/components/catalyst-ui-kit/textarea";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { SettingsSection } from "@/options/components/settings-section";
import { areGenericModelConfigEqual } from "@/options/model-settings";
import { useDraftedStorageValue } from "@/options/use-drafted-storage";
import { storage } from "@/storages";
import {
  GENERIC_CAPTURE_SESSION_STORAGE_KEY,
  GENERIC_MODEL_CONFIG_STORAGE_KEY,
  GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
  genericApiDocCaptureSessionStorageDefaultValue,
  genericApiDocModelConfigDefaultValue,
  genericApiDocStorageDefaultValues,
  genericProviderLabelMap,
  isGenericModelConfigComplete
} from "@/storages/generic-api-doc";
import { Button } from "../../components/catalyst-ui-kit/button";

interface GenericApiDocSettingsProps {
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

export function GenericApiDocSettings({ onUnsavedChangesChange }: GenericApiDocSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSelfChecking, setIsSelfChecking] = useState(false);
  const [captureSession] = useStorage(
    { key: GENERIC_CAPTURE_SESSION_STORAGE_KEY, instance: storage },
    genericApiDocCaptureSessionStorageDefaultValue
  );
  const {
    savedValue: savedModelConfig,
    draftValue: modelConfigDraft,
    setDraftValue: setModelConfigDraft,
    isHydrated: isModelConfigHydrated,
    isSaving: isSavingModelConfig,
    isDirty: isModelConfigDirty,
    resetDraft: resetModelConfigDraft,
    saveDraft: saveModelConfigDraft
  } = useDraftedStorageValue<GenericModelConfig>({
    storage,
    storageKey: GENERIC_MODEL_CONFIG_STORAGE_KEY,
    defaultValue: genericApiDocModelConfigDefaultValue,
    isEqual: areGenericModelConfigEqual
  });
  const {
    draftValue: promptTemplateDraft,
    setDraftValue: setPromptTemplateDraft,
    isHydrated: isPromptTemplateHydrated,
    isSaving: isSavingPromptTemplate,
    isDirty: isPromptTemplateDirty,
    resetDraft: resetPromptTemplateDraft,
    saveDraft: savePromptTemplateDraft
  } = useDraftedStorageValue<string>({
    storage,
    storageKey: GENERIC_PROMPT_TEMPLATE_STORAGE_KEY,
    defaultValue: genericApiDocStorageDefaultValues[GENERIC_PROMPT_TEMPLATE_STORAGE_KEY]
  });

  const canTestConnection = isGenericModelConfigComplete(savedModelConfig) && !isModelConfigDirty && !isTesting;
  const canSelfCheck =
    isGenericModelConfigComplete(savedModelConfig) &&
    !isModelConfigDirty &&
    !isSelfChecking &&
    !!captureSession.source &&
    !!captureSession.capture &&
    captureSession.status !== "picking";
  const hasUnsavedChanges = isModelConfigDirty || isPromptTemplateDirty;

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const handleTestConnection = async () => {
    if (!isGenericModelConfigComplete(savedModelConfig)) {
      toast.error("请先填写完整的 Generic 模型配置");
      return;
    }

    setIsTesting(true);

    try {
      const response = await sendToBackground<GenericTestModelConfigReqBody, GenericTestModelConfigResBody>({
        name: "genericTestModelConfig" as never,
        body: { config: savedModelConfig }
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success("Generic 模型连接测试成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelfCheckCurrentCapture = async () => {
    if (!captureSession.source || !captureSession.capture) {
      toast.error("当前没有可用的采集样例，请先在 popup 完成一次采集");
      return;
    }

    if (!isGenericModelConfigComplete(savedModelConfig)) {
      toast.error("请先填写完整的 Generic 模型配置");
      return;
    }

    setIsSelfChecking(true);

    try {
      const response = await sendToBackground<
        GenericSelfCheckCurrentCaptureReqBody,
        GenericSelfCheckCurrentCaptureResBody
      >({
        name: "genericSelfCheckCurrentCapture" as never,
        body: {
          sessionId: captureSession.sessionId,
          attemptId: captureSession.attemptId,
          config: savedModelConfig
        }
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSelfChecking(false);
    }
  };

  const handleResetModelConfigDraft = () => {
    resetModelConfigDraft();
  };

  const handleSaveModelConfigDraft = async () => {
    try {
      await saveModelConfigDraft();
      toast.success("Generic 模型配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleResetPromptTemplateDraft = () => {
    resetPromptTemplateDraft();
  };

  const handleSavePromptTemplateDraft = async () => {
    try {
      await savePromptTemplateDraft();
      toast.success("Generic Prompt 模板已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <SettingsSection
        title="通用 API 文档提取 - 模型配置"
        description="配置通用 API 文档提取使用的模型服务，并提供连接测试与当前采集样例自检。"
      >
        <Field>
          <Label htmlFor="generic-provider-type">API 类型</Label>
          <Description>
            {isModelConfigHydrated
              ? "修改后点击保存才会生效；测试连接和样例自检只使用已保存配置。"
              : "正在加载已保存模型配置，加载完成前不可编辑。"}
          </Description>
          <Select
            id="generic-provider-type"
            name="generic-provider-type"
            value={modelConfigDraft.apiType}
            disabled={!isModelConfigHydrated || isSavingModelConfig}
            onChange={(event) =>
              setModelConfigDraft((current) => ({
                ...current,
                apiType: event.target.value as GenericModelConfig["apiType"]
              }))
            }
          >
            {Object.entries(genericProviderLabelMap).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="generic-base-url">Base URL</Label>
          <Description>填写模型接口的基础地址，例如 OpenAI 兼容网关或官方 API 地址。</Description>
          <Input
            id="generic-base-url"
            name="generic-base-url"
            type="url"
            placeholder="https://api.openai.com/v1"
            value={modelConfigDraft.baseUrl ?? ""}
            disabled={!isModelConfigHydrated || isSavingModelConfig}
            onChange={(event) =>
              setModelConfigDraft((current) => ({
                ...current,
                baseUrl: event.target.value
              }))
            }
          />
        </Field>

        <Field>
          <Label htmlFor="generic-model-id">Model ID</Label>
          <Description>例如 `gpt-5.1`、`deepseek-chat` 等。</Description>
          <Input
            id="generic-model-id"
            name="generic-model-id"
            value={modelConfigDraft.modelId ?? ""}
            disabled={!isModelConfigHydrated || isSavingModelConfig}
            onChange={(event) =>
              setModelConfigDraft((current) => ({
                ...current,
                modelId: event.target.value
              }))
            }
          />
        </Field>

        <Field>
          <Label htmlFor="generic-api-key">API Key</Label>
          <Description>仅保存在本地扩展 storage，不会同步到其它设备。</Description>
          <Input
            id="generic-api-key"
            name="generic-api-key"
            type="password"
            autoComplete="off"
            value={modelConfigDraft.apiKey ?? ""}
            disabled={!isModelConfigHydrated || isSavingModelConfig}
            onChange={(event) =>
              setModelConfigDraft((current) => ({
                ...current,
                apiKey: event.target.value
              }))
            }
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>测试连接</Label>
              <Description>只验证已保存配置是否可发起请求以及是否能返回结构化对象。</Description>
            </div>
            <Button onClick={() => void handleTestConnection()} disabled={!isModelConfigHydrated || !canTestConnection}>
              {isTesting ? "测试中..." : "测试连接"}
            </Button>
          </div>
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>样例自检</Label>
              <Description>使用最近一次采集样例做一次真实提取，帮助判断已保存配置是否适合当前文档。</Description>
            </div>
            <Button
              onClick={() => void handleSelfCheckCurrentCapture()}
              disabled={!isModelConfigHydrated || !canSelfCheck}
            >
              {isSelfChecking ? "自检中..." : "自检当前样例"}
            </Button>
          </div>
        </Field>

        {isModelConfigDirty ? (
          <Field>
            <Description className="text-amber-600">
              当前有未保存的模型配置变更，请先保存，再执行测试连接或样例自检。
            </Description>
          </Field>
        ) : null}

        <Field>
          <div className="flex justify-end gap-2">
            <Button
              outline
              disabled={!isModelConfigHydrated || isSavingModelConfig || !isModelConfigDirty}
              onClick={handleResetModelConfigDraft}
            >
              重置
            </Button>
            <Button
              disabled={!isModelConfigHydrated || isSavingModelConfig || !isModelConfigDirty}
              onClick={() => void handleSaveModelConfigDraft()}
            >
              {isSavingModelConfig ? "保存中..." : "保存模型配置"}
            </Button>
          </div>
        </Field>
      </SettingsSection>

      <SettingsSection
        title="通用 API 文档提取 - Prompt 模板"
        description="维护通用 API 文档提取的 Prompt 草稿，保存后用于后续采集与提取流程。"
      >
        <Field>
          <Label htmlFor="generic-prompt-template">Prompt 模板</Label>
          <Description>
            {isPromptTemplateHydrated ? (
              <>
                当前为页面内草稿，修改后点击保存才会生效。支持的占位符：<Code>{"{{json}}"}</Code> /{" "}
                <Code>{"{{url}}"}</Code>
              </>
            ) : (
              "正在加载已保存 Prompt 模板，加载完成前不可编辑。"
            )}
          </Description>
          <Textarea
            id="generic-prompt-template"
            data-slot="control"
            rows={12}
            value={isPromptTemplateHydrated ? (promptTemplateDraft ?? "") : ""}
            disabled={!isPromptTemplateHydrated || isSavingPromptTemplate}
            onChange={(event) => setPromptTemplateDraft(event.target.value)}
            className="relative block w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent px-[calc(theme(spacing[3.5])-1px)] py-[calc(theme(spacing[2.5])-1px)] text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:data-[hover]:border-white/20"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              outline
              disabled={!isPromptTemplateHydrated || isSavingPromptTemplate || !isPromptTemplateDirty}
              onClick={handleResetPromptTemplateDraft}
            >
              重置
            </Button>
            <Button
              disabled={!isPromptTemplateHydrated || isSavingPromptTemplate || !isPromptTemplateDirty}
              onClick={() => void handleSavePromptTemplateDraft()}
            >
              {isSavingPromptTemplate ? "保存中..." : "保存 Prompt 模板"}
            </Button>
          </div>
        </Field>
      </SettingsSection>
    </>
  );
}
