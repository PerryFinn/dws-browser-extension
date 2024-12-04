import cssText from "data-text:@/style.css";
import { Expandable, ExpandableCard, ExpandableContent, ExpandableTrigger } from "@/components/complex-ui/expandable";
import { cn } from "@/utils";
import { Info, MapPin } from "lucide-react";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";
import React, { useCallback } from "react";

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

function DwsConfigInline() {
  const handleExpandStart = useCallback(async () => {
    console.log("window.parent.config :>> ", window.config);
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
            className="w-full bg-white bg-opacity-70 rounded-sm"
            collapsedSize={{ width: 24, height: 24 }}
            expandedSize={{ width: 300, height: 150 }}
            expandDelay={200}
            collapseDelay={500}
          >
            <div className={cn("flex", { "justify-center": isExpanded })}>
              <Info />
              <ExpandableContent preset="blur-md">
                <span className="m-2 font-bold">window.config</span>
              </ExpandableContent>
            </div>

            <ExpandableContent preset="blur-md">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Conference Room A</span>
              </div>
            </ExpandableContent>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
  );
}

export default DwsConfigInline;
