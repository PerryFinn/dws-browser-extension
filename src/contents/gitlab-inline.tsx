import cssText from "data-text:@/style.css";
import { sortBy } from "lodash-es";
import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetOverlayAnchor, PlasmoGetStyle } from "plasmo";
import React, { useEffect, useMemo, useState } from "react";

import { useStorage } from "@plasmohq/storage/hook";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { AnimatedTooltip } from "@/components/complex-ui/animated-tooltip";
import { storage } from "@/storages";
import { cn } from "@/utils";
import { getGitlabEmail, type GitlabFrequentProjectMeta } from "@/utils/gitlab";

// import { FamilyButtonDemo, MusicPlayerExample } from "./components/test";

import packageJSON from "../../package.json";

export const config: PlasmoCSConfig = {
  matches: ["https://gitlab.gz.cvte.cn/*"],
  run_at: "document_end"
};

export const getStyle: PlasmoGetStyle = () => {
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

const getRandomWarmColor = (): string => {
  const warmColors = [
    "#FFB3A7", // Light Red-Orange
    "#FFD1A1", // Light Orange
    "#FFE599", // Light Yellow
    "#FFB3A7", // Light Red-Orange
    "#FFCCCB", // Light Coral
    "#FFE0B2", // Light Light Orange
    "#FFF2CC", // Light Gold
    "#FFCCCB", // Light Tomato
    "#FFB6C1", // Light Orange-Red
    "#FFDAB9" // Light Light Salmon
  ];
  const randomIndex = Math.floor(Math.random() * warmColors.length);
  return warmColors[randomIndex];
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
    <div className="relative w-full h-full max-h-[220px] border-dashed border border-indigo-600">
      <div className="relative w-full h-full max-h-[220px] overflow-y-scroll ">
        <div className="flex flex-col items-center justify-center h-full mt-2">
          <ul>
            {renderList.map((project, index) => {
              const isLast = index === renderList.length - 1;
              return (
                <li key={project.id}>
                  <div className={cn("relative", { "pb-4": !isLast })}>
                    {!isLast ? (
                      <span aria-hidden="true" className="absolute left-4 top-7 -ml-px h-5 w-0.5 bg-gray-200" />
                    ) : null}
                    <div className="relative flex space-x-3 items-center">
                      <div>
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300"
                          )}>
                          <Avatar className="h-7 w-7" style={{ background: getRandomWarmColor() }}>
                            <AvatarImage draggable={false} src={project.avatarUrl} />
                            <AvatarFallback>
                              <div className="flex items-center justify-center rounded-full h-full w-full text-sm text-black">
                                {project.name.substring(0, 1).toLocaleUpperCase()}
                              </div>
                            </AvatarFallback>
                          </Avatar>
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 items-center">
                        <div>
                          <p className="text-sm text-gray-500">
                            <a href={project.webUrl} className="font-medium  hover:underline">
                              {project.name}
                            </a>
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <span>{project.frequency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 bg-black bg-opacity-20 rounded-sm text-xs w-fit h-fit px-1 pointer-events-none">
            Powered by {packageJSON.displayName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitlabInline;
