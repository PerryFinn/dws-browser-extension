import { createFileRoute } from "@tanstack/react-router";
import windowConfigPreviewVideo from "assets/previews/dws-window-config.mp4?url";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Field, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Radio, RadioField, RadioGroup } from "@/components/catalyst-ui-kit/radio";
import { Select } from "@/components/catalyst-ui-kit/select";
import { Switch, SwitchField } from "@/components/catalyst-ui-kit/switch";
import { Code } from "@/components/catalyst-ui-kit/text";
import { Textarea } from "@/components/catalyst-ui-kit/textarea";
import { LinkPreview } from "@/components/complex-ui/link-preview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStorage } from "@/lib/extension-storage-hook";
import { GenericApiDocSettings } from "@/options/components/generic-api-doc-settings";
import { SettingsSection } from "@/options/components/settings-section";
import { areSwqaPromptTemplatesEqual } from "@/options/model-settings";
import { useDraftedStorageValue } from "@/options/use-drafted-storage";
import { useUnsavedChangesGuard } from "@/options/use-unsaved-changes-guard";
import { getSwqaPromptTemplateTooltip, type SwqaPromptPurpose, swqaPromptPurposeLabelMap } from "@/popup/swqa/prompt";
import { type GitlabProjectsDisplayMode, localStorageInitialValue, storage } from "@/storages";
import {
  SWQA_PROMPT_TEMPLATES_STORAGE_KEY,
  type SwqaPromptTemplates,
  swqaPromptTemplatesDefaultValue
} from "@/storages/swqa-prompt-template";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

const {
  config: {
    defaultValue: { isOpenWindowConfig: defaultOpenWindowConfig }
  },
  gitlabProjectsDisplayMode: { defaultValue: defaultGitlabProjectsDisplayMode },
  gitlabAbsoluteTimeEnabled: { defaultValue: defaultGitlabAbsoluteTimeEnabled },
  versionCheckUrl: { defaultValue: defaultVersionCheckUrl },
  versionCheckTtlMinutes: { defaultValue: defaultVersionCheckTtlMinutes }
} = localStorageInitialValue;

const promptPurposeOptions: SwqaPromptPurpose[] = ["create", "update"];

function RouteComponent() {
  const [promptPurpose, setPromptPurpose] = useState<SwqaPromptPurpose>("update");
  const [hasGenericUnsavedChanges, setHasGenericUnsavedChanges] = useState(false);
  const [isOpenWindowConfig, , isOpenWindowConfigSetter] = useStorage<boolean>(
    { key: "isOpenWindowConfig", instance: storage },
    defaultOpenWindowConfig
  );
  const [gitlabProjectsDisplayMode, , gitlabProjectsDisplayModeSetter] = useStorage<GitlabProjectsDisplayMode>(
    { key: "gitlabProjectsDisplayMode", instance: storage },
    defaultGitlabProjectsDisplayMode
  );
  const [gitlabAbsoluteTimeEnabled, , gitlabAbsoluteTimeSetter] = useStorage<boolean>(
    { key: "gitlabAbsoluteTimeEnabled", instance: storage },
    defaultGitlabAbsoluteTimeEnabled
  );
  const [versionCheckUrl, , versionCheckUrlSetter] = useStorage<string>(
    { key: "versionCheckUrl", instance: storage },
    defaultVersionCheckUrl
  );
  const [versionCheckTtlMinutes, , versionCheckTtlMinutesSetter] = useStorage<number>(
    { key: "versionCheckTtlMinutes", instance: storage },
    defaultVersionCheckTtlMinutes
  );
  const {
    draftValue: swqaPromptDraft,
    isDirty: isSwqaPromptDraftDirty,
    isHydrated: isSwqaPromptHydrated,
    isSaving: isSavingSwqaPromptDraft,
    setDraftValue: setSwqaPromptDraft,
    resetDraft: resetSwqaPromptDraft,
    saveDraft: saveSwqaPromptDraft
  } = useDraftedStorageValue<SwqaPromptTemplates>({
    storage,
    storageKey: SWQA_PROMPT_TEMPLATES_STORAGE_KEY,
    defaultValue: swqaPromptTemplatesDefaultValue,
    isEqual: areSwqaPromptTemplatesEqual
  });
  const handleOpenWindowConfigChange = (checked: boolean) => {
    isOpenWindowConfigSetter.setStoreValue(checked);
  };
  const handleGitlabProjectsDisplayModeChange = (value: string) => {
    const nextMode: GitlabProjectsDisplayMode =
      value === "inline" || value === "overlay" || value === "off" ? value : "overlay";
    gitlabProjectsDisplayModeSetter.setStoreValue(nextMode);
  };
  const handleVersionCheckUrlChange = (value: string) => {
    versionCheckUrlSetter.setStoreValue(value);
  };
  const handleVersionCheckTtlMinutesChange = (value: string) => {
    const nextValue = Number(value);
    // 仅允许正整数分钟，非法输入回退默认值
    if (Number.isFinite(nextValue) && nextValue > 0) {
      versionCheckTtlMinutesSetter.setStoreValue(Math.floor(nextValue));
      return;
    }
    versionCheckTtlMinutesSetter.setStoreValue(defaultVersionCheckTtlMinutes);
  };

  const storedPromptTemplate = isSwqaPromptHydrated
    ? promptPurpose === "update"
      ? swqaPromptDraft.update
      : swqaPromptDraft.create
    : "";

  const handlePromptTemplateChange = (value: string) => {
    if (promptPurpose === "update") {
      setSwqaPromptDraft((current) => ({
        ...current,
        update: value
      }));
      return;
    }

    setSwqaPromptDraft((current) => ({
      ...current,
      create: value
    }));
  };

  const handlePromptPurposeChange = (value: string) => {
    setPromptPurpose(value as SwqaPromptPurpose);
  };

  const handleResetSwqaPromptDraft = () => {
    resetSwqaPromptDraft();
  };

  const handleSaveSwqaPromptDraft = async () => {
    try {
      await saveSwqaPromptDraft();
      toast.success("SWQA Prompt 模板已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };
  const hasUnsavedChanges = isSwqaPromptDraftDirty || hasGenericUnsavedChanges;

  useUnsavedChangesGuard({
    isDirty: hasUnsavedChanges
  });

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8">
        <SettingsSection
          title="页面功能"
          description="控制扩展注入页面后的基础交互入口，以及 Gitlab 项目快捷访问的展示方式。"
          contentClassName="max-w-xl"
        >
          <SwitchField>
            <Label className="flex items-center gap-2 cursor-pointer">
              项目基本信息弹窗
              <LinkPreview
                isStatic
                type="video"
                // imageSrc="https://pro-ali-dws.cvtestatic.com/dws-model/uwiwjuvohjxyjhnuhoyjypwkymhhihhh.png"
                url={windowConfigPreviewVideo}
              >
                <CircleHelp size={20} />
              </LinkPreview>
            </Label>
            <Description>展示项目基本信息的弹窗</Description>
            <Switch name="isOpenWindowConfig" checked={isOpenWindowConfig} onChange={handleOpenWindowConfigChange} />
          </SwitchField>

          <Field>
            <Label htmlFor="gitlab-projects-display-mode">展示模式</Label>
            <Description>选择 Gitlab 项目快捷访问的展示形态</Description>
            <Select
              id="gitlab-projects-display-mode"
              name="gitlab-projects-display-mode"
              value={gitlabProjectsDisplayMode}
              onChange={(event) => handleGitlabProjectsDisplayModeChange(event.target.value)}
            >
              <option value="overlay">Overlay（右下角浮层）</option>
              <option value="inline">Inline（页面内嵌）</option>
              <option value="off">关闭</option>
            </Select>
          </Field>
          <SwitchField>
            <div data-slot="label" className="flex items-center gap-2">
              <Label>GitLab 绝对时间</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="GitLab 绝对时间说明"
                    className="cursor-help rounded text-zinc-500 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <CircleHelp size={20} aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs space-y-1.5 leading-relaxed">
                  <p>
                    开启后，把 GitLab 中的“2 周前”显示为具体时间，例如
                    <span className="whitespace-nowrap">“2026-10-13 18:18:53”</span>。
                  </p>
                  <p>使用你电脑的时区，精确到秒。关闭后恢复原来的显示，无需刷新页面。</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              name="gitlabAbsoluteTimeEnabled"
              checked={gitlabAbsoluteTimeEnabled}
              onChange={(checked) => void gitlabAbsoluteTimeSetter.setStoreValue(checked)}
            />
          </SwitchField>
        </SettingsSection>

        <SettingsSection
          title="版本检查"
          description="配置版本信息接口和缓存时长，减少重复请求并保持更新提示可控。"
          contentClassName="max-w-xl"
        >
          <Field>
            <Label htmlFor="version-check-url">版本检查 URL</Label>
            <Description>用于获取最新版本信息的接口地址</Description>
            <Input
              id="version-check-url"
              name="version-check-url"
              type="url"
              placeholder={defaultVersionCheckUrl}
              value={versionCheckUrl ?? ""}
              onChange={(event) => handleVersionCheckUrlChange(event.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="version-check-ttl">检查缓存时间（分钟）</Label>
            <Description>在该时间内不重复请求版本信息</Description>
            <Input
              id="version-check-ttl"
              name="version-check-ttl"
              type="number"
              min={1}
              step={1}
              value={versionCheckTtlMinutes ?? defaultVersionCheckTtlMinutes}
              onChange={(event) => handleVersionCheckTtlMinutesChange(event.target.value)}
            />
          </Field>
        </SettingsSection>

        <SettingsSection
          title="SWQA Prompt 模板"
          description="维护 SWQA 创建和更新场景的 Prompt 草稿，修改后点击保存才会写入本地配置。"
        >
          <Field>
            <div className="flex items-center gap-2">
              <Label>用途</Label>
            </div>
            <Description>
              {isSwqaPromptHydrated
                ? "切换后会显示并编辑对应用途的当前草稿，修改后点击保存才会生效。"
                : "正在加载已保存模板，加载完成前不可编辑。"}
            </Description>
            <RadioGroup
              aria-label="用途"
              value={promptPurpose}
              onChange={handlePromptPurposeChange}
              disabled={!isSwqaPromptHydrated || isSavingSwqaPromptDraft}
              className="flex items-center gap-4 space-y-0!"
            >
              {promptPurposeOptions.map((purpose) => (
                <RadioField className="gap-2" key={purpose}>
                  <Radio value={purpose} />
                  <Label>
                    <span className="inline-flex items-center gap-1.5">
                      {swqaPromptPurposeLabelMap[purpose]}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                            <CircleHelp size={14} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[360px] text-xs leading-5">
                          {getSwqaPromptTemplateTooltip(purpose)}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </Label>
                </RadioField>
              ))}
            </RadioGroup>
          </Field>

          <Field>
            <div className="flex items-center gap-2">
              <Label htmlFor="swqa-prompt-template">Prompt 模板（本地草稿，点击保存后生效）</Label>
            </div>
            <Description>
              支持的占位符：<Code>{"{{json}}"}</Code> / <Code>{"{{url}}"}</Code> / <Code>{"{{interfaceId}}"}</Code>
            </Description>
            <Textarea
              id="swqa-prompt-template"
              data-slot="control"
              rows={12}
              value={storedPromptTemplate ?? ""}
              onChange={(event) => handlePromptTemplateChange(event.target.value)}
              disabled={!isSwqaPromptHydrated || isSavingSwqaPromptDraft}
              className="relative block w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:data-hover:border-white/20"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                outline
                disabled={!isSwqaPromptHydrated || isSavingSwqaPromptDraft || !isSwqaPromptDraftDirty}
                onClick={handleResetSwqaPromptDraft}
              >
                重置
              </Button>
              <Button
                disabled={!isSwqaPromptHydrated || isSavingSwqaPromptDraft || !isSwqaPromptDraftDirty}
                onClick={() => void handleSaveSwqaPromptDraft()}
              >
                {isSavingSwqaPromptDraft ? "保存中..." : "保存 SWQA Prompt"}
              </Button>
            </div>
          </Field>
        </SettingsSection>
        <GenericApiDocSettings onUnsavedChangesChange={setHasGenericUnsavedChanges} />
      </div>
    </TooltipProvider>
  );
}
