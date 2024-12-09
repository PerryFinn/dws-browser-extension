import { LinkPreview } from "@/components/complex-ui/link-preview";
import { createFileRoute } from "@tanstack/react-router";
import windowConfigPreviewPng from "assets/previews/dws-window-config.png";
import { CircleHelp } from "lucide-react";

export const Route = createFileRoute("/settings/base/")({
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="flex">
      <LinkPreview
        isStatic
        // imageSrc="https://pro-ali-dws.cvtestatic.com/dws-model/uwiwjuvohjxyjhnuhoyjypwkymhhihhh.png"
        imageSrc={windowConfigPreviewPng}
      >
        <CircleHelp />
      </LinkPreview>
    </div>
  );
}
