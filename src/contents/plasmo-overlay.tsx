import cssText from "data-text:@/style.css";
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor } from "plasmo";

import { useStorage } from "@plasmohq/storage/hook";

import { storage } from "@/storages";

export const config: PlasmoCSConfig = {
  // matches: ["http://*/*"],
  run_at: "document_end"
};

export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

// export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () =>
//   document.querySelector("#super-sidebar-context-header");

const PlasmoOverlay = () => {
  const [enabled] = useStorage({ key: "enabled", instance: storage }, false);

  if (!enabled) return null;
  return null;
  // return (
  //   <div className="z-50 flex fixed top-32 right-8">
  //     <CountButton />
  //   </div>
  // );
};

export default PlasmoOverlay;
