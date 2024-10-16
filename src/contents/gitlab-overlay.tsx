import cssText from "data-text:@/style.css";
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor } from "plasmo";
import React, { useEffect } from "react";

import { useStorage } from "@plasmohq/storage/hook";

import { CountButton } from "@/components/count-button";
import { storage } from "@/storages";
import { getGitlabEmail, type GitlabFrequentProjectMeta } from "@/utils/gitlab";

export const config: PlasmoCSConfig = {
  matches: ["https://gitlab.gz.cvte.cn/*"],
  run_at: "document_end"
};

export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

const getFrequentProjects = (localStorageKey: string): Array<GitlabFrequentProjectMeta> => {
  try {
    const stringifyData = window.localStorage.getItem(localStorageKey);
    const projects = JSON.parse(stringifyData);
    if (!Array.isArray(projects)) {
      throw new Error(`${localStorageKey}'data is not an array`);
    }
    return projects;
  } catch (error) {
    console.error("getFrequentProjects error :>> ", error);
    return [];
  }
};

const init: VoidFunction = async () => {
  const enabled = await storage.get("enabled");
  if (!enabled) return;

  // ==============start: 初始化 gitlabUsername ==============
  const initialUsername = await storage.get("gitlabUserName");
  if (!initialUsername) {
    const gitlabEmail = await getGitlabEmail();
    const result = gitlabEmail.split("@")[0];
    await storage.set("gitlabUserName", result);
  }
  // ==============end: 初始化 gitlabUsername ==============
  const gitlabUsername = await storage.get("gitlabUserName");
  const projects = getFrequentProjects(`${gitlabUsername}/frequent-projects`);
  console.log("projects :>> ", projects);
};

export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () =>
  document.getElementById("super-sidebar-context-header");

const PlasmoOverlay = () => {
  const [enabled] = useStorage({ key: "enabled", instance: storage }, false);

  useEffect(() => {
    if (!enabled) return;
    init();
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="">
      <CountButton />
    </div>
  );
};

export default PlasmoOverlay;
