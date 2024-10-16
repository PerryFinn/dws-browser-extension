import type { PlasmoCSConfig } from "plasmo";

import { storage } from "@/storages";

import packageJSON from "../../package.json";

export const config: PlasmoCSConfig = {
  matches: ["https://gitlab.gz.cvte.cn/*"],
  run_at: "document_end"
};

const getGitlabEmail = async (): Promise<string> => {
  try {
    const res = await fetch("https://gitlab.gz.cvte.cn/-/user_settings/profile").then((res) => res.text());
    const parser = new DOMParser();
    const docDom = parser.parseFromString(res, "text/html");
    const inputDom = docDom.getElementById("user_email") as HTMLInputElement;
    if (!inputDom) {
      throw new Error(`${packageJSON.name}适配【gitlab】失效，请联系${packageJSON.author}进行修复`);
    }
    return inputDom.value;
  } catch (error) {
    console.error("getGitlabEmail error :>> ", error);
    return "";
  }
};

const main: VoidFunction = async () => {
  const enabled = await storage.get("enabled");
  if (!enabled) return;

  // ==============start: 初始化 gitlabUsername ==============
  const gitlabUsername = await storage.get("gitlabUserName");
  if (!gitlabUsername) {
    const gitlabEmail = await getGitlabEmail();
    const result = gitlabEmail.split("@")[0];
    await storage.set("gitlabUserName", result);
  }
  // ==============end: 初始化 gitlabUsername ==============
};

main();
