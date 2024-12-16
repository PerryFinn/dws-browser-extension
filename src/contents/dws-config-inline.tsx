import cssText from "data-text:@/style.css";
import { Expandable, ExpandableCard, ExpandableContent, ExpandableTrigger } from "@/components/complex-ui/expandable";
import { Button } from "@/components/ui/button";
import { cn, copyToClipboard } from "@/utils";
import { Check, Copy, Info } from "lucide-react";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";
import type React from "react";
import { type MouseEventHandler, useCallback, useEffect, useMemo, useState } from "react";

export const config: PlasmoCSConfig = {
  matches: [
    "https://dws.test.seewo.com/*",
    "https://dws.seewo.com/*",
    "http://dws-local.test.seewo.com/*",
    "https://dws-ops.test.seewo.com/*",
    "https://dws-dev.test.seewo.com/*"
  ],
  run_at: "document_end",
  world: "MAIN"
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

const CopyButton: React.FC<{ text?: string }> = ({ text }) => {
  const [copied, setCopiedState] = useState(false);
  const handleCopy: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (copied || typeof text !== "string") return;
      await copyToClipboard(text);
      setCopiedState(true);
      setTimeout(() => {
        setCopiedState(false);
      }, 1000);
    },
    [text, copied]
  );

  return (
    <Button
      size="icon"
      className="text-xs/5 text-gray-500 hover:text-gray-700 size-fit bg-transparent hover:bg-transparent"
      onClick={handleCopy}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </Button>
  );
};

function DwsConfigInline() {
  const [commitInfo, setCommitInfo] = useState<typeof window.config.commitInfo | null>(null);

  const handleExpandStart = useCallback(async () => {
    setCommitInfo(window.config?.commitInfo);
  }, []);

  return (
    <Expandable
      expandDirection="both"
      expandBehavior="replace"
      initialDelay={0.2}
      onExpandStart={handleExpandStart}
      onExpandEnd={() => console.log("flow Meeting card expanded!")}
      className="fixed top-1 right-1 z-[9999]"
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            className={cn("w-full bg-white bg-opacity-90 rounded-sm", { "overflow-y-auto": isExpanded })}
            collapsedSize={{ width: 24, height: 24 }}
            expandedSize={{ width: 300, height: 290 }}
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
