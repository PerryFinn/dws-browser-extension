import { Description, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Switch, SwitchField } from "@/components/catalyst-ui-kit/switch";
import { LinkPreview } from "@/components/complex-ui/link-preview";
import { localStorageInitialValue, storage } from "@/storages";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import windowConfigPreviewGif from "assets/previews/dws-window-config.gif";
import { CircleHelp } from "lucide-react";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

const {
  config: {
    defaultValue: { isOpenWindowConfig: defaultOpenWindowConfig }
  }
} = localStorageInitialValue;

function RouteComponent() {
  const [isOpenWindowConfig, , isOpenWindowConfigSetter] = useStorage<boolean>(
    { key: "isOpenWindowConfig", instance: storage },
    defaultOpenWindowConfig
  );
  const handleOpenWindowConfigChange = (checked: boolean) => {
    isOpenWindowConfigSetter.setStoreValue(checked);
  };

  return (
    <div className="flex">
      <div>
        <div>功能开关</div>
        <SwitchField>
          <Label className="flex items-center gap-2 cursor-pointer">
            项目基本信息弹窗
            <LinkPreview
              isStatic
              // imageSrc="https://pro-ali-dws.cvtestatic.com/dws-model/uwiwjuvohjxyjhnuhoyjypwkymhhihhh.png"
              imageSrc={windowConfigPreviewGif}
            >
              <CircleHelp size={20} />
            </LinkPreview>
          </Label>
          <Description>展示项目基本信息的弹窗</Description>
          <Switch name="isOpenWindowConfig" checked={isOpenWindowConfig} onChange={handleOpenWindowConfigChange} />
        </SwitchField>
      </div>
    </div>
  );
}
