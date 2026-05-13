import { sendToBackground } from "@plasmohq/messaging";
import { useState } from "react";
import { toast } from "react-toastify";
import type {
  BookmarkSearchTestModelReqBody,
  BookmarkSearchTestModelResBody
} from "@/background/messages/bookmarkSearchTestModel";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Field, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Select } from "@/components/catalyst-ui-kit/select";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { SettingsSection } from "@/options/components/settings-section";
import { areGenericModelConfigEqual } from "@/options/model-settings";
import { useDraftedStorageValue } from "@/options/use-drafted-storage";
import { BOOKMARK_SEARCH_MODEL_CONFIG_KEY, bookmarkSearchModelConfigDefault } from "@/services/bookmark-search/storage";
import { storage } from "@/storages";
import { genericProviderLabelMap, isGenericModelConfigComplete } from "@/storages/generic-api-doc";

interface BookmarkSearchSettingsProps {
  defaultExpanded?: boolean;
}

export function BookmarkSearchSettings({ defaultExpanded = false }: BookmarkSearchSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const {
    draftValue: modelConfigDraft,
    setDraftValue: setModelConfigDraft,
    isHydrated,
    isSaving,
    isDirty,
    resetDraft,
    saveDraft
  } = useDraftedStorageValue<GenericModelConfig>({
    storage,
    storageKey: BOOKMARK_SEARCH_MODEL_CONFIG_KEY,
    defaultValue: bookmarkSearchModelConfigDefault,
    isEqual: areGenericModelConfigEqual
  });

  const canTestConnection = isGenericModelConfigComplete(modelConfigDraft) && !isTesting;

  const handleTestConnection = async () => {
    if (!isGenericModelConfigComplete(modelConfigDraft)) {
      toast.error("请先填写完整的模型配置");
      return;
    }

    setIsTesting(true);
    try {
      const response = await sendToBackground<BookmarkSearchTestModelReqBody, BookmarkSearchTestModelResBody>({
        name: "bookmarkSearchTestModel" as never,
        body: { config: modelConfigDraft }
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }
      toast.success("模型连接测试成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveDraft();
      toast.success("书签搜索模型配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  if (!isExpanded) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-white/10">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">模型配置</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isGenericModelConfigComplete(modelConfigDraft) ? "已配置" : "未配置，点击展开进行设置"}
          </p>
        </div>
        <Button outline onClick={() => setIsExpanded(true)}>
          {isGenericModelConfigComplete(modelConfigDraft) ? "修改配置" : "开始配置"}
        </Button>
      </div>
    );
  }

  return (
    <SettingsSection
      title="模型配置"
      description="配置书签语义搜索使用的大模型服务。需要一个兼容 OpenAI Chat Completions API 的模型服务。"
    >
      {!isGenericModelConfigComplete(modelConfigDraft) && isHydrated && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">首次使用指引</p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            书签语义搜索需要接入大模型服务。你需要准备一个兼容 OpenAI API 的模型服务地址和 API Key。
            常见选择：OpenAI、DeepSeek、通义千问等。填写完成后点击"测试连接"验证配置。
          </p>
        </div>
      )}

      <Field>
        <Label htmlFor="bookmark-provider-type">API 类型</Label>
        <Select
          id="bookmark-provider-type"
          value={modelConfigDraft.apiType}
          disabled={!isHydrated || isSaving}
          onChange={(e) =>
            setModelConfigDraft((c) => ({ ...c, apiType: e.target.value as GenericModelConfig["apiType"] }))
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
        <Label htmlFor="bookmark-base-url">Base URL</Label>
        <Input
          id="bookmark-base-url"
          type="url"
          placeholder="https://api.openai.com/v1"
          value={modelConfigDraft.baseUrl ?? ""}
          disabled={!isHydrated || isSaving}
          onChange={(e) => setModelConfigDraft((c) => ({ ...c, baseUrl: e.target.value }))}
        />
      </Field>

      <Field>
        <Label htmlFor="bookmark-model-id">Model ID</Label>
        <Input
          id="bookmark-model-id"
          placeholder="gpt-4o-mini"
          value={modelConfigDraft.modelId ?? ""}
          disabled={!isHydrated || isSaving}
          onChange={(e) => setModelConfigDraft((c) => ({ ...c, modelId: e.target.value }))}
        />
      </Field>

      <Field>
        <Label htmlFor="bookmark-api-key">API Key</Label>
        <Description>仅保存在本地扩展 storage，不会同步到其它设备。</Description>
        <Input
          id="bookmark-api-key"
          type="password"
          autoComplete="off"
          value={modelConfigDraft.apiKey ?? ""}
          disabled={!isHydrated || isSaving}
          onChange={(e) => setModelConfigDraft((c) => ({ ...c, apiKey: e.target.value }))}
        />
      </Field>

      <Field>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>测试连接</Label>
            <Description>验证当前配置是否可正常调用模型。</Description>
          </div>
          <Button onClick={() => void handleTestConnection()} disabled={!isHydrated || !canTestConnection}>
            {isTesting ? "测试中..." : "测试连接"}
          </Button>
        </div>
      </Field>

      <Field>
        <div className="flex justify-end gap-2">
          <Button outline disabled={!isHydrated || isSaving || !isDirty} onClick={resetDraft}>
            重置
          </Button>
          <Button disabled={!isHydrated || isSaving || !isDirty} onClick={() => void handleSave()}>
            {isSaving ? "保存中..." : "保存模型配置"}
          </Button>
        </div>
      </Field>
    </SettingsSection>
  );
}
