import { sortBy } from "lodash-es";
import { type KeyboardEventHandler, useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useStorage } from "@/lib/extension-storage-hook";
import { type GitlabProjectsDisplayMode, localStorageInitialValue, storage } from "@/storages";
import { cn } from "@/utils";
import {
  GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY,
  type GitlabFrequentProjectMeta,
  type GitlabProjectCustomNames,
  getGitlabEmail,
  getGitlabProjectNameView,
  gitlabProjectCustomNamesDefaultValue
} from "@/utils/gitlab";

import packageJson from "../../package.json";

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

const {
  gitlabProjectsDisplayMode: { defaultValue: defaultGitlabProjectsDisplayMode }
} = localStorageInitialValue;

const GitlabInline = () => {
  const [gitlabProjectsDisplayMode] = useStorage<GitlabProjectsDisplayMode>(
    { key: "gitlabProjectsDisplayMode", instance: storage },
    defaultGitlabProjectsDisplayMode
  );
  const [gitlabProjectCustomNames] = useStorage<GitlabProjectCustomNames>(
    { key: GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY, instance: storage },
    gitlabProjectCustomNamesDefaultValue
  );
  const [projectList, setProjectList] = useState<Array<GitlabFrequentProjectMeta>>([]);
  const resolvedCustomNames = gitlabProjectCustomNames ?? gitlabProjectCustomNamesDefaultValue;

  useEffect(() => {
    if (gitlabProjectsDisplayMode !== "inline") return;
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

  if (gitlabProjectsDisplayMode !== "inline") return null;
  return (
    <div className="relative w-full h-full max-h-[220px] border-dashed border border-indigo-600">
      <div className="relative w-full h-full max-h-[220px] overflow-y-scroll ">
        <div className="flex flex-col items-center justify-center h-full mt-2">
          <ul>
            {renderList.map((project, index) => {
              const isLast = index === renderList.length - 1;
              const nameView = getGitlabProjectNameView(project, resolvedCustomNames);

              return (
                <li key={project.id}>
                  <div className={cn("relative", { "pb-4": !isLast })}>
                    {!isLast ? (
                      <span aria-hidden="true" className="absolute left-4 top-7 -ml-px h-5 w-0.5 bg-gray-200" />
                    ) : null}
                    <div className="relative flex space-x-3 items-center">
                      <div>
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
                          aria-label={`Open ${nameView.displayName}`}
                        >
                          <Avatar className="h-7 w-7" style={{ background: getRandomWarmColor() }}>
                            <AvatarImage draggable={false} src={project?.avatarUrl ?? ""} />
                            <AvatarFallback>
                              <div className="flex items-center justify-center rounded-full h-full w-full text-sm text-black">
                                {nameView.displayName.substring(0, 1).toLocaleUpperCase()}
                              </div>
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 items-center">
                        <div>
                          <p className="text-sm text-gray-500">
                            <a
                              href={project.webUrl}
                              title={
                                nameView.hasCustomName
                                  ? `${nameView.displayName}（${nameView.originalName}）`
                                  : nameView.originalName
                              }
                              className="font-medium hover:underline"
                            >
                              {nameView.displayName}
                            </a>
                            {/* inline 模式只消费 overlay 保存的自定义名，不提供编辑入口。 */}
                            {nameView.hasCustomName ? (
                              <span
                                title={nameView.originalName}
                                className="block max-w-[150px] truncate text-[10px] leading-3 text-gray-400 opacity-70"
                              >
                                {nameView.originalName}
                              </span>
                            ) : null}
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
            Powered by {packageJson.displayName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitlabInline;
