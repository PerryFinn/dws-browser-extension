import cssText from "data-text:@/style.css";
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
  return <div className="fixed top-1 left-1 bg-white bg-opacity-70 z-[9999]">D</div>;
}

export default DwsConfigInline;
