import cssText from "data-text:@/style.css";
import { Expandable, ExpandableTrigger } from "@/components/complex-ui/expandable";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";
import React from "react";

export const config: PlasmoCSConfig = {
  matches: [
    "https://dws.test.seewo.com/*",
    "https://dws.seewo.com/*",
    "http://dws-local.test.seewo.com/*",
    "https://dws-ops.test.seewo.com/*",
    "https://dws-dev.test.seewo.com/*"
  ],
  run_at: "document_end"
};

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => ({
  element: document.body,
  insertPosition: "beforeend"
});

export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

function DwsConfigInline() {
  return (
    <Expandable
      expandDirection="both"
      expandBehavior="replace"
      initialDelay={0.2}
      onExpandStart={() => console.log("flow Expanding meeting card...")}
      onExpandEnd={() => console.log("flow Meeting card expanded!")}
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <div className="fixed top-1 left-1 bg-white bg-opacity-70 z-[9999]">D</div>
        </ExpandableTrigger>
      )}
    </Expandable>
  );
}

export default DwsConfigInline;
