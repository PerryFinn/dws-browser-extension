import windowConfigPreviewVideo from "raw:assets/previews/dws-window-config.mp4";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Field, FieldGroup, Fieldset, Label, Legend } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Select } from "@/components/catalyst-ui-kit/select";
import { Switch, SwitchField } from "@/components/catalyst-ui-kit/switch";
import { LinkPreview } from "@/components/complex-ui/link-preview";
import { type GitlabProjectsDisplayMode, localStorageInitialValue, storage } from "@/storages";

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

function RouteComponent() {
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

  return (
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
  );
}
