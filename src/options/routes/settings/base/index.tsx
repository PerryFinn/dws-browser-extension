import windowConfigPreviewVideo from "raw:assets/previews/dws-window-config.mp4";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Field, FieldGroup, Fieldset, Label, Legend } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Radio, RadioField, RadioGroup } from "@/components/catalyst-ui-kit/radio";
import { Select } from "@/components/catalyst-ui-kit/select";
import { Switch, SwitchField } from "@/components/catalyst-ui-kit/switch";
import { Code } from "@/components/catalyst-ui-kit/text";
import { Textarea } from "@/components/catalyst-ui-kit/textarea";
import { LinkPreview } from "@/components/complex-ui/link-preview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSwqaPromptTemplateTooltip, type SwqaPromptPurpose, swqaPromptPurposeLabelMap } from "@/popup/swqa/prompt";
import { type GitlabProjectsDisplayMode, localStorageInitialValue, storage } from "@/storages";
import {
  SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY,
  SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY
} from "@/storages/swqa-prompt-template";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

const {
  config: {
    defaultValue: { isOpenWindowConfig: defaultOpenWindowConfig }
  },
  gitlabProjectsDisplayMode: { defaultValue: defaultGitlabProjectsDisplayMode },
  versionCheckUrl: { defaultValue: defaultVersionCheckUrl },
  versionCheckTtlMinutes: { defaultValue: defaultVersionCheckTtlMinutes }
} = localStorageInitialValue;

const promptPurposeOptions: SwqaPromptPurpose[] = ["create", "update"];

function RouteComponent() {
  const [promptPurpose, setPromptPurpose] = useState<SwqaPromptPurpose>("update");
  const [isOpenWindowConfig, , isOpenWindowConfigSetter] = useStorage<boolean>(
    { key: "isOpenWindowConfig", instance: storage },
    defaultOpenWindowConfig
  );
  const [gitlabProjectsDisplayMode, , gitlabProjectsDisplayModeSetter] = useStorage<GitlabProjectsDisplayMode>(
    { key: "gitlabProjectsDisplayMode", instance: storage },
    defaultGitlabProjectsDisplayMode
  );
  const [versionCheckUrl, , versionCheckUrlSetter] = useStorage<string>(
    { key: "versionCheckUrl", instance: storage },
    defaultVersionCheckUrl
  );
  const [versionCheckTtlMinutes, , versionCheckTtlMinutesSetter] = useStorage<number>(
    { key: "versionCheckTtlMinutes", instance: storage },
    defaultVersionCheckTtlMinutes
  );
  const [storedCreatePromptTemplate, , createPromptTemplateSetter] = useStorage<string>(
    { key: SWQA_CREATE_PROMPT_TEMPLATE_STORAGE_KEY, instance: storage },
    ""
  );
  const [storedUpdatePromptTemplate, , updatePromptTemplateSetter] = useStorage<string>(
    { key: SWQA_UPDATE_PROMPT_TEMPLATE_STORAGE_KEY, instance: storage },
    ""
  );
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

  const storedPromptTemplate = promptPurpose === "update" ? storedUpdatePromptTemplate : storedCreatePromptTemplate;

  const handlePromptTemplateChange = (value: string) => {
    if (promptPurpose === "update") {
      updatePromptTemplateSetter.setStoreValue(value);
      return;
    }

    createPromptTemplateSetter.setStoreValue(value);
  };

  const handlePromptPurposeChange = (value: string) => {
    setPromptPurpose(value as SwqaPromptPurpose);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        <div className="max-w-fit">
          <div>功能开关</div>
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

          <Field className="mt-3">
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
        </div>

        <Fieldset className="max-w-xl">
          <Legend>版本检查</Legend>
          <FieldGroup>
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
          </FieldGroup>
        </Fieldset>

        <Fieldset className="max-w-3xl">
          <Legend>SWQA Prompt 模板</Legend>
          <FieldGroup>
            <Field>
              <div className="flex items-center gap-2">
                <Label>用途</Label>
              </div>
              <Description>切换后会显示并编辑对应用途的持久化模板，默认展示更新模板。</Description>
              <RadioGroup
                aria-label="用途"
                value={promptPurpose}
                onChange={handlePromptPurposeChange}
                className="flex items-center gap-4 !space-y-0"
              >
                {promptPurposeOptions.map((purpose) => (
                  <RadioField className="gap-2" key={purpose}>
                    <Radio value={purpose} />
                    <Label >
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

              <div className="flex items-center gap-2">
                <Label htmlFor="swqa-prompt-template">Prompt 模板（持久化保存，可编辑占位符）</Label>
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
                className="relative block w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent px-[calc(theme(spacing[3.5])-1px)] py-[calc(theme(spacing[2.5])-1px)] text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:data-[hover]:border-white/20"
              />
            </Field>
          </FieldGroup>
        </Fieldset>

        <div>
          <Button
            onClick={() => {
              toast("Wow so easy!", { pauseOnHover: true });
            }}
          >
            toast it
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
