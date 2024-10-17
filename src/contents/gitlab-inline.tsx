import cssText from "data-text:@/style.css";
import { sortBy } from "lodash-es";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetOverlayAnchor } from "plasmo";
import React, { useEffect, useMemo, useState } from "react";

import { useStorage } from "@plasmohq/storage/hook";

import { FamilyButton } from "@/components/complex-ui/family-button";
// import { AnimatedTooltip } from "@/components/complex-ui/animated-tooltip";
import { CountButton } from "@/components/count-button";
import { MusicPlayerExample } from "@/components/test";
import { storage } from "@/storages";
import { getGitlabEmail, type GitlabFrequentProjectMeta } from "@/utils/gitlab";

// import { FamilyButtonDemo, MusicPlayerExample } from "./components/test";

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

const init = async () => {
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
  return projects;
};

// export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () => {
//   // return document.body;
//   return document.getElementById("pinned");
// };

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => ({
  element: document.getElementById("pinned"),
  insertPosition: "beforeend"
});

const GitlabInline = () => {
  const [enabled] = useStorage({ key: "enabled", instance: storage }, false);
  const [projectList, setProjectList] = useState<Array<GitlabFrequentProjectMeta>>([]);

  useEffect(() => {
    if (!enabled) return;
    init()
      .then((list) => {
        setProjectList(list);
      })
      .catch((error) => {
        console.error("GitlabInline error :>> ", error);
      });
  }, [enabled]);

  const renderList = useMemo(() => {
    return sortBy(projectList, "frequency").reverse();
  }, [projectList]);

  if (!enabled) return null;
  return (
    <div className="flex flex-col items-center justify-center mb-10 w-full">
      {renderList.map((project) => {
        return (
          <a key={project.id} href={project.webUrl}>
            {project.name}
          </a>
        );
      })}
    </div>
  );
};

export default GitlabInline;
