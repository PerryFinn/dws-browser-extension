import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://gitlab.gz.cvte.cn/*"],
  run_at: "document_end"
};

console.log("gitlab :>> setup!");
