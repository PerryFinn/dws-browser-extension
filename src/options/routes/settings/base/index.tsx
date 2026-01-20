import windowConfigPreviewVideo from "raw:assets/previews/dws-window-config.mp4";
import gitlabProjectsVideo from "raw:assets/previews/gitlab-projects.mp4";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Field, FieldGroup, Fieldset, Label, Legend } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import { Switch, SwitchField } from "@/components/catalyst-ui-kit/switch";
import { LinkPreview } from "@/components/complex-ui/link-preview";
import { localStorageInitialValue, storage } from "@/storages";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

const {
  config: {
    defaultValue: { isOpenWindowConfig: defaultOpenWindowConfig, isOpenGitlabProjects: defaultOpenGitlabProjects }
  },
  versionCheckUrl: { defaultValue: defaultVersionCheckUrl },
  versionCheckTtlMinutes: { defaultValue: defaultVersionCheckTtlMinutes }
} = localStorageInitialValue;

function RouteComponent() {
  const [isOpenWindowConfig, , isOpenWindowConfigSetter] = useStorage<boolean>(
    { key: "isOpenWindowConfig", instance: storage },
    defaultOpenWindowConfig
  );
  const [isOpenGitlabProjects, , isOpenGitlabProjectsSetter] = useStorage<boolean>(
    { key: "isOpenGitlabProjects", instance: storage },
    defaultOpenGitlabProjects
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
  const handleOpenGitlabProjectsChange = (checked: boolean) => {
    isOpenGitlabProjectsSetter.setStoreValue(checked);
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

        <SwitchField>
          <Label className="flex items-center gap-2 cursor-pointer">
            Gitlab 项目快捷访问
            <LinkPreview
              type="video"
              isStatic
              // imageSrc="https://pro-ali-dws.cvtestatic.com/dws-model/uwiwjuvohjxyjhnuhoyjypwkymhhihhh.png"
              url={gitlabProjectsVideo}
            >
              <CircleHelp size={20} />
            </LinkPreview>
          </Label>
          <Description>快速访问已访问过的项目列表，按照访问次数降序排序</Description>
          <Switch
            name="isOpenGitlabProjects"
            checked={isOpenGitlabProjects}
            onChange={handleOpenGitlabProjectsChange}
          />
        </SwitchField>
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
