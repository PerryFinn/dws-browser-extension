import templateUrl from "data-base64:@/templates/template.xlsx";
import { RotateCcw } from "lucide-react";
import React, { memo, useCallback, useId } from "react";

import { sendToBackground } from "@plasmohq/messaging";
import type { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";

import type { downloadReqBody, downloadResBody } from "@/background/messages/download";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IProps {
  onReset?: () => void;
  storage: Storage;
}

function ControlArea(props: IProps) {
  const { storage, onReset } = props;
  const switchId = useId();
  const [enabled, setEnabled, enabledSetter] = useStorage({ key: "enabled", instance: storage }, false);

  const handleToggle = useCallback(async () => {
    const finalEnabled = !enabled;
    return Promise.all([
      setEnabled(finalEnabled),
      enabledSetter.setStoreValue(finalEnabled),
      chrome.action.setBadgeText({ text: finalEnabled ? "ON" : "OFF" })
      // sendToContentScript({ name: "toggleEnabled", body: { enabled: finalEnabled } })
    ]);
  }, [enabled, setEnabled, enabledSetter]);

  const handleResetStorage = useCallback(async () => {
    await Promise.all([
      storage.set("verifiedIpList", []),
      storage.set("processInfo", []),
      storage.set("isRunningTask", false),
      storage.set("taskResult", { success: [], failed: [], error: [] })
    ]);
    onReset?.();
  }, [storage, onReset]);

  const handleDownloadTemplate = useCallback(async () => {
    await sendToBackground<downloadReqBody, downloadResBody>({
      name: "download",
      body: {
        url: templateUrl,
        // url: `https://docs.sheetjs.com/pres.xlsx`,
        filename: "摄像头分析列表模板.xlsx",
        saveAs: true,
        conflictAction: "uniquify"
      }
    });
  }, []);

  const isDisableReset = false;

  return (
    <div className="flex gap-4 items-center">
      <div className="flex items-center justify-start gap-1">
        <Switch id={CSS.escape(switchId)} checked={enabled} onCheckedChange={handleToggle} />
        <Label htmlFor={CSS.escape(switchId)} className="cursor-pointer">
          启用
        </Label>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={handleResetStorage} disabled={isDisableReset}>
              <RotateCcw size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>重置 storage</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="link" size="sm" className="p-0 underline" onClick={handleDownloadTemplate}>
              下载模板
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex justify-center items-center">
              下载<code className="code">.xlsx</code>的模板
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default memo(ControlArea);
