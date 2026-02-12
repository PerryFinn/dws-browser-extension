import cssText from "data-text:~/style.css";
import { useStorage } from "@plasmohq/storage/hook";
import { sortBy } from "lodash-es";
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor, PlasmoGetStyle } from "plasmo";
import { type KeyboardEventHandler, useCallback, useEffect, useMemo, useState } from "react";
import { FamilyButton } from "@/components/complex-ui/family-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type GitlabProjectsDisplayMode, localStorageInitialValue, storage } from "@/storages";
import { cn } from "@/utils";
import { type GitlabFrequentProjectMeta, getGitlabEmail } from "@/utils/gitlab";
import packageJson from "../../package.json";

export const config: PlasmoCSConfig = {
  matches: ["https://gitlab.gz.cvte.cn/*"],
  run_at: "document_end"
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText.replaceAll(":root", ":host(plasmo-csui)");
  // style.textContent = cssText;
  return style;
};

// export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () =>
//   document.querySelector("#super-sidebar-context-header");

const getFrequentProjects = (localStorageKey: string): Array<GitlabFrequentProjectMeta> => {
  try {
    const stringifyData = window.localStorage.getItem(localStorageKey);
    if (!stringifyData) return [];
    const projects = JSON.parse(stringifyData);
    if (!Array.isArray(projects)) {
      throw new Error(`${localStorageKey}'data is not an array`);
    }
    return projects;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getFrequentProjects error :>> ", message);
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

const {
  gitlabProjectsDisplayMode: { defaultValue: defaultGitlabProjectsDisplayMode }
} = localStorageInitialValue;

// export const getInlineAnchor: PlasmoGetInlineAnchor = () => ({
//   element: document.querySelector("body") as Element, // 如果没有则不挂载
//   insertPosition: "beforeend"
// });

export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () => document.querySelector("body") as Element;

const GitlabInline = () => {
  const [gitlabProjectsDisplayMode] = useStorage<GitlabProjectsDisplayMode>(
    { key: "gitlabProjectsDisplayMode", instance: storage },
    defaultGitlabProjectsDisplayMode
  );
  const [projectList, setProjectList] = useState<Array<GitlabFrequentProjectMeta>>([]);

  useEffect(() => {
    if (gitlabProjectsDisplayMode !== "overlay") return;
    init()
      .then((projectList) => {
        setProjectList(projectList ?? []);
      })
      .catch((error) => {
        console.error("GitlabInline error :>> ", error);
        throw error;
      });
  }, [gitlabProjectsDisplayMode]);

  const renderList = useMemo(() => {
    return sortBy(projectList, "frequency").reverse();
  }, [projectList]);

  const navigateToProject = useCallback((url: string) => {
    window.open(url, "_self");
  }, []);

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        const ele = event.currentTarget as HTMLElement;
        const url = ele.dataset.url;
        if (url) {
          navigateToProject(url);
        }
      }
    },
    [navigateToProject]
  );

  if (gitlabProjectsDisplayMode !== "overlay") return null;
  return (
    <FamilyButton containerWidth={300} containerHeight={300} className="fixed bottom-20 right-20 bg-white">
      <div className="w-full h-full flex flex-col items-center text-gray-700 pt-2">
        <div className="pb-2 text-xs text-gray-500 opacity-60 tracking-wide cursor-default select-none">
          Frequent Visited Projects
        </div>
        <div className="w-full overflow-y-auto px-4 flex flex-col items-center">
          <ul className="w-full">
            {renderList.map((project) => {
              return (
                <li key={project.id} className="flex space-x-3 items-center pb-2 last:pb-0">
                  <button
                    type="button"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 cursor-pointer"
                    )}
                    onClick={() => {
                      navigateToProject(project.webUrl);
                    }}
                    data-url={project.webUrl}
                    onKeyDown={handleKeyDown}
                    aria-label={`Open ${project.name}`}
                  >
                    <Avatar className="h-7 w-7" style={{ background: getRandomWarmColor() }}>
                      <AvatarImage draggable={false} src={project?.avatarUrl ?? ""} />
                      <AvatarFallback>
                        <div className="flex items-center justify-center rounded-full h-full w-full text-sm text-black">
                          {project.name.substring(0, 1).toLocaleUpperCase()}
                        </div>
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 items-center">
                    <div className="max-w-[150px] truncate">
                      <a
                        href={project.webUrl}
                        title={project.name}
                        className="text-sm text-gray-500 font-medium hover:underline"
                      >
                        {project.name}
                      </a>
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      <span>{project.frequency}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 bg-black bg-opacity-20 rounded-sm text-xs w-fit h-fit px-1 cursor-default select-none">
            Powered by {packageJson.displayName}
          </div>
        </div>
      </div>
    </FamilyButton>
  );
};

export default GitlabInline;
