import cssText from "data-text:~/style.css";
import { useStorage } from "@plasmohq/storage/hook";
import { sortBy } from "lodash-es";
import { Check, Pencil, X } from "lucide-react";
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor, PlasmoGetStyle } from "plasmo";
import { type KeyboardEventHandler, useCallback, useEffect, useMemo, useState } from "react";
import { FamilyButton } from "@/components/complex-ui/family-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { type GitlabProjectsDisplayMode, localStorageInitialValue, storage } from "@/storages";
import { cn } from "@/utils";
import {
  GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY,
  type GitlabFrequentProjectMeta,
  type GitlabProjectCustomNames,
  getGitlabEmail,
  getGitlabProjectNameView,
  gitlabProjectCustomNamesDefaultValue,
  updateGitlabProjectCustomName
} from "@/utils/gitlab";
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

const getStableWarmColor = (projectId: number): string => {
  const colorIndex = Math.abs(projectId) % warmColors.length;
  return warmColors[colorIndex];
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

const GitlabOverlay = () => {
  const [gitlabProjectsDisplayMode] = useStorage<GitlabProjectsDisplayMode>(
    { key: "gitlabProjectsDisplayMode", instance: storage },
    defaultGitlabProjectsDisplayMode
  );
  const [gitlabProjectCustomNames, , gitlabProjectCustomNamesState] = useStorage<GitlabProjectCustomNames>(
    { key: GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY, instance: storage },
    gitlabProjectCustomNamesDefaultValue
  );
  const [projectList, setProjectList] = useState<Array<GitlabFrequentProjectMeta>>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const resolvedCustomNames = gitlabProjectCustomNames ?? gitlabProjectCustomNamesDefaultValue;

  useEffect(() => {
    if (gitlabProjectsDisplayMode !== "overlay") return;
    init()
      .then((projectList) => {
        setProjectList(projectList ?? []);
      })
      .catch((error) => {
        console.error("GitlabOverlay error :>> ", error);
        throw error;
      });
  }, [gitlabProjectsDisplayMode]);

  const sortedList = useMemo(() => {
    return sortBy(projectList, "frequency").reverse();
  }, [projectList]);

  const normalizedKeyword = useMemo(() => {
    return searchKeyword.trim().toLocaleLowerCase();
  }, [searchKeyword]);

  const searchableList = useMemo(() => {
    return sortedList.map((project) => {
      const nameView = getGitlabProjectNameView(project, resolvedCustomNames);

      return {
        project,
        // 搜索同时保留自定义名和 GitLab 原名，避免重命名后用户找不到旧项目。
        searchText: `${nameView.displayName} ${nameView.originalName} ${project.namespace}`.toLocaleLowerCase()
      };
    });
  }, [resolvedCustomNames, sortedList]);

  const renderList = useMemo(() => {
    if (!normalizedKeyword) return sortedList;
    return searchableList
      .filter(({ searchText }) => {
        return searchText.includes(normalizedKeyword);
      })
      .map(({ project }) => project);
  }, [normalizedKeyword, searchableList, sortedList]);

  const searchInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) requestAnimationFrame(() => node.focus());
  }, []);

  const navigateToProject = useCallback((url: string) => {
    window.open(url, "_self");
  }, []);

  const startEditingProject = useCallback(
    (project: GitlabFrequentProjectMeta) => {
      const nameView = getGitlabProjectNameView(project, resolvedCustomNames);

      setEditingProjectId(project.id);
      setEditingName(nameView.displayName);
    },
    [resolvedCustomNames]
  );

  const cancelEditingProject = useCallback(() => {
    setEditingProjectId(null);
    setEditingName("");
  }, []);

  const saveEditingProject = useCallback(
    async (project: GitlabFrequentProjectMeta) => {
      try {
        const latestCustomNames =
          (await storage.get<GitlabProjectCustomNames>(GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY)) ??
          gitlabProjectCustomNamesDefaultValue;

        // GitLab 页面可能开多个标签页；保存前读最新 storage，避免旧 React 快照覆盖其他标签页的编辑。
        await gitlabProjectCustomNamesState.setStoreValue(
          updateGitlabProjectCustomName(latestCustomNames, project.id, editingName, project.name)
        );
        cancelEditingProject();
      } catch (error) {
        // 保存失败时保留编辑态，避免用户输入丢失；扩展 storage 异常通常只能先落日志排查。
        console.error("saveGitlabProjectCustomName error :>> ", error);
      }
    },
    [cancelEditingProject, editingName, gitlabProjectCustomNamesState]
  );

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

  const handleEditNameKeyDown = useCallback(
    (project: GitlabFrequentProjectMeta): KeyboardEventHandler<HTMLInputElement> =>
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void saveEditingProject(project);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditingProject();
        }
      },
    [cancelEditingProject, saveEditingProject]
  );

  if (gitlabProjectsDisplayMode !== "overlay") return null;
  return (
    <FamilyButton containerWidth={300} containerHeight={300} className="fixed bottom-20 right-20 bg-white">
      <div className="w-full h-full flex flex-col items-center text-gray-700 pt-2">
        <div className="pb-2 text-xs text-gray-500 opacity-60 tracking-wide cursor-default select-none">
          Frequent Visited Projects
        </div>
        <div className="w-full px-4 pb-2">
          <Input
            ref={searchInputRef}
            type="search"
            value={searchKeyword}
            onChange={(event) => {
              setSearchKeyword(event.target.value);
            }}
            placeholder="Search by project or namespace"
            aria-label="Search projects by name or namespace"
            className="h-8 border-slate-200 text-xs placeholder:text-gray-400 focus-visible:ring-1"
          />
        </div>
        <div className="w-full overflow-y-auto px-4 flex flex-col items-center">
          <ul className="w-full">
            {renderList.length === 0 && projectList.length > 0 ? (
              <li className="py-6 text-center text-xs text-gray-400 cursor-default select-none">未找到匹配项目</li>
            ) : (
              renderList.map((project) => {
                const nameView = getGitlabProjectNameView(project, resolvedCustomNames);
                const isEditing = editingProjectId === project.id;

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
                      aria-label={`Open ${nameView.displayName}`}
                    >
                      <Avatar className="h-7 w-7" style={{ background: getStableWarmColor(project.id) }}>
                        <AvatarImage draggable={false} src={project?.avatarUrl ?? ""} />
                        <AvatarFallback>
                          <div className="flex items-center justify-center rounded-full h-full w-full text-sm text-black">
                            {nameView.displayName.substring(0, 1).toLocaleUpperCase()}
                          </div>
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      {isEditing ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <Input
                            autoFocus
                            type="text"
                            value={editingName}
                            onChange={(event) => {
                              setEditingName(event.target.value);
                            }}
                            onKeyDown={handleEditNameKeyDown(project)}
                            placeholder={nameView.originalName}
                            aria-label={`编辑 ${nameView.originalName} 的自定义名称`}
                            className="h-7 min-w-0 px-2 py-1 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
                          />
                          <button
                            type="button"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
                            onClick={() => void saveEditingProject(project)}
                            aria-label="保存自定义名称"
                            title="保存"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            onClick={cancelEditingProject}
                            aria-label="取消编辑自定义名称"
                            title="取消"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <a
                              href={project.webUrl}
                              title={
                                nameView.hasCustomName
                                  ? `${nameView.displayName}（${nameView.originalName}）`
                                  : nameView.originalName
                              }
                              className="block truncate text-sm font-medium text-gray-500 hover:underline"
                            >
                              {nameView.displayName}
                            </a>
                            {nameView.hasCustomName ? (
                              <div
                                title={nameView.originalName}
                                className="mt-0.5 truncate text-[10px] leading-3 text-gray-400 opacity-70"
                              >
                                {nameView.originalName}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-right text-sm text-gray-500">
                            <span className="min-w-5">{project.frequency}</span>
                            <button
                              type="button"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              onClick={() => startEditingProject(project)}
                              aria-label={`编辑 ${nameView.displayName} 的自定义名称`}
                              title="编辑名称"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <div className="mt-2 bg-black bg-opacity-20 rounded-sm text-xs w-fit h-fit px-1 cursor-default select-none">
            Powered by {packageJson.displayName}
          </div>
        </div>
      </div>
    </FamilyButton>
  );
};

export default GitlabOverlay;
