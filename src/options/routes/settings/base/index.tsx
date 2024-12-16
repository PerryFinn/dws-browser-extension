import windowConfigPreviewVideo from "raw:assets/previews/dws-window-config.mp4";
import gitlabProjectsVideo from "raw:assets/previews/gitlab-projects.mp4";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Description, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Switch, SwitchField } from "@/components/catalyst-ui-kit/switch";
import { LinkPreview } from "@/components/complex-ui/link-preview";
import { localStorageInitialValue, storage } from "@/storages";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { toast } from "react-toastify";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

const {
  config: {
    defaultValue: { isOpenWindowConfig: defaultOpenWindowConfig, isOpenGitlabProjects: defaultOpenGitlabProjects }
  }
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
  const handleOpenWindowConfigChange = (checked: boolean) => {
    isOpenWindowConfigSetter.setStoreValue(checked);
  };
  const handleOpenGitlabProjectsChange = (checked: boolean) => {
    isOpenGitlabProjectsSetter.setStoreValue(checked);
  };

  return (
    <div className="flex">
      <div>
        <div>功能开关</div>
        <SwitchField>
          <Label className="flex items-center gap-2 cursor-pointer">
            <del>项目基本信息弹窗</del>
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
          <Switch
            disabled
            name="isOpenWindowConfig"
            checked={isOpenWindowConfig}
            onChange={handleOpenWindowConfigChange}
          />
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

      <div>
        <Button
          onClick={() => {
            toast("Wow so easy!", { pauseOnHover: true });
          }}
        >
          123
        </Button>
      </div>
    </div>
  );
}
