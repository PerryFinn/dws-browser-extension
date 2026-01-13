import cssText from "data-text:@/style.css";
import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { Info } from "lucide-react";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";
import { useCallback, useEffect, useState } from "react";

import type { ActiveTabIdReqBody, ActiveTabIdResBody } from "@/background/messages/getActiveTab";
import type { GetWindowConfigReqBody, GetWindowConfigResBody } from "@/background/messages/getWindowConfig";
import { Expandable, ExpandableCard, ExpandableContent, ExpandableTrigger } from "@/components/complex-ui/expandable";
import CopyButton from "@/components/copy-btn";
import { localStorageInitialValue, storage } from "@/storages";
import { cn } from "@/utils";

const {
  enabled: { defaultValue: defaultEnabled },
  config: {
    defaultValue: { isOpenWindowConfig: defaultOpenWindowConfig }
  }
} = localStorageInitialValue;

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_end"
};

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => ({
  element: document.body,
  insertPosition: "beforeend"
});

export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText.replaceAll(":root", ":host(plasmo-csui)");
  // style.textContent = cssText;
  return style;
};

function DwsConfigInline() {
  const [enabled] = useStorage({ key: "enabled", instance: storage }, defaultEnabled);
  const [isOpenWindowConfig] = useStorage<boolean>(
    { key: "isOpenWindowConfig", instance: storage },
    defaultOpenWindowConfig
  );
  const [commitInfo, setCommitInfo] = useState<Partial<CommitInfo> | undefined>();

  useEffect(() => {
    sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({
      name: "getActiveTab"
    }).then(({ id }) => {
      if (!id) {
        throw new Error("getActiveTab 获取当前 tab 失败");
      }
      sendToBackground<GetWindowConfigReqBody, GetWindowConfigResBody>({
        name: "getWindowConfig",
        body: { tabId: id }
      })
        .then(({ config }) => {
          setCommitInfo(config?.commitInfo);
        })
        .catch((error) => {
          console.error("DwsConfigInline 发生了错误: ", error);
        });
    });
  }, []);

  const handleExpandStart = useCallback(async () => {
    // const { id } = await sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({
    //   name: "getActiveTab"
    // });
    // if (!id) {
    //   throw new Error("getActiveTab 获取当前 tab 失败");
    // }
    // const { config } = await sendToBackground<GetWindowConfigReqBody, GetWindowConfigResBody>({
    //   name: "getWindowConfig",
    //   body: { tabId: id }
    // });
    // setCommitInfo(config?.commitInfo);
  }, []);

  if (!enabled || !isOpenWindowConfig || !commitInfo) return null;

  return (
    <Expandable
      expandDirection="both"
      expandBehavior="replace"
      initialDelay={0.2}
      onExpandStart={handleExpandStart}
      className="fixed top-1 right-1 z-[9999]"
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            className={cn("w-full bg-white bg-opacity-90 rounded-sm", { "overflow-y-auto": isExpanded })}
            collapsedSize={{ width: 24, height: 24 }}
            expandedSize={{ width: 300, height: 320 }}
            expandDelay={200}
            collapseDelay={500}
          >
            <div className={cn("flex", { "justify-center": isExpanded })}>
              <Info />
              <ExpandableContent preset="blur-md">
                <span className="m-2 font-bold">Info</span>
              </ExpandableContent>
            </div>
            <ExpandableContent>
              <ul className="divide-y divide-gray-300 px-5">
                <li key="projectName" className="flex gap-x-4">
                  <div className="min-w-0">
                    <p className="text-sm/6 font-semibold text-gray-900">项目名称</p>
                    <p className="truncate text-xs/5 flex items-center gap-1">
                      {commitInfo?.name}
                      <CopyButton text={commitInfo?.name} />
                    </p>
                  </div>
                </li>
                <li key="gisVersion" className="flex gap-x-4">
                  <div className="min-w-0">
                    <p className="text-sm/6 font-semibold text-gray-900">GIS</p>
                    <p className="truncate text-xs/5 flex items-center gap-1">
                      GIS 版本：{commitInfo?.gis3dVersion || "--"} <CopyButton text={commitInfo?.gis3dVersion} />
                    </p>
                    <p className="truncate text-xs/5 flex items-center">
                      来源：{commitInfo?.gis3dVersionOrigin || "--"}
                    </p>
                  </div>
                </li>
                <li key="commitInfo" className="flex gap-x-4">
                  <div className="min-w-0">
                    <p className="text-sm/6 font-semibold text-gray-900">最后一次 commit</p>
                    <p className="truncate text-xs/5 flex items-center gap-1">
                      hash：{commitInfo?.shortHash || "--"} <CopyButton text={commitInfo?.shortHash} />
                    </p>
                    <p className="truncate text-xs/5 flex items-center">time：{commitInfo?.date || "--"}</p>
                    <p className="text-xs/5">
                      desc：<span className="bg-gray-300">{commitInfo?.subject || "--"}</span>
                    </p>
                  </div>
                </li>
                <li key="playerVersion" className="flex gap-x-4">
                  <div className="min-w-0">
                    <p className="text-sm/6 font-semibold text-gray-900">播放器版本</p>
                    <p className="truncate text-xs/5 flex items-center gap-1">
                      {commitInfo?.playerVersion || "--"} <CopyButton text={commitInfo?.playerVersion} />
                    </p>
                  </div>
                </li>
              </ul>
            </ExpandableContent>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
  );
}

export default DwsConfigInline;
