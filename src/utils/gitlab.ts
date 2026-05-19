import packageJson from "../../package.json";

export type GitlabFrequentProjectMeta = {
  avatarUrl: string | null;
  frequency: number;
  id: number;
  lastAccessedOn: number;
  name: string;
  namespace: string;
  webUrl: string;
};

export type GitlabProjectCustomNames = Record<string, string>;

export type GitlabProjectNameView = {
  customName: string;
  displayName: string;
  hasCustomName: boolean;
  originalName: string;
};

export const GITLAB_PROJECT_CUSTOM_NAMES_STORAGE_KEY = "gitlabProjectCustomNames";
export const gitlabProjectCustomNamesDefaultValue: GitlabProjectCustomNames = {};

// Frecency 半衰期：距离上次访问每过 72 小时，频次权重衰减为原来的一半。
export const GITLAB_FRECENCY_HALF_LIFE_HOURS = 72;

export const getGitlabProjectFrecencyScore = (project: GitlabFrequentProjectMeta, now = Date.now()): number => {
  const hoursSinceLastAccess = Math.max(0, (now - project.lastAccessedOn) / (1000 * 60 * 60));

  // 使用指数衰减让“最近访问”自然上浮，同时保留历史频次的影响。
  return project.frequency * 2 ** (-hoursSinceLastAccess / GITLAB_FRECENCY_HALF_LIFE_HOURS);
};

export const sortGitlabProjectsByFrecency = (
  projects: Array<GitlabFrequentProjectMeta>,
  now = Date.now()
): Array<GitlabFrequentProjectMeta> => {
  // 返回新数组，避免排序时改动 React state 或调用方传入的原始列表。
  return [...projects].sort((a, b) => getGitlabProjectFrecencyScore(b, now) - getGitlabProjectFrecencyScore(a, now));
};

// 自定义名称只属于扩展，不回写 GitLab 自己的 frequent-projects 数据。
// 这里用 GitLab project id 做键，保证 overlay 和 inline 能共享同一套显示规则。
const getGitlabProjectCustomName = (
  projectId: GitlabFrequentProjectMeta["id"],
  customNames: GitlabProjectCustomNames
) => customNames[String(projectId)]?.trim() ?? "";

export const getGitlabProjectNameView = (
  project: GitlabFrequentProjectMeta,
  customNames: GitlabProjectCustomNames = {}
): GitlabProjectNameView => {
  const customName = getGitlabProjectCustomName(project.id, customNames);

  return {
    customName,
    displayName: customName || project.name,
    hasCustomName: Boolean(customName),
    originalName: project.name
  };
};

export const updateGitlabProjectCustomName = (
  customNames: GitlabProjectCustomNames,
  projectId: GitlabFrequentProjectMeta["id"],
  nextName: string,
  originalName?: string
): GitlabProjectCustomNames => {
  const nextCustomNames = { ...customNames };
  const normalizedName = nextName.trim();

  // 空值或与原始 GitLab 名称一致时，不保留冗余 override，避免列表中上下两行重复。
  if (normalizedName && normalizedName !== originalName?.trim()) {
    nextCustomNames[String(projectId)] = normalizedName;
  } else {
    delete nextCustomNames[String(projectId)];
  }

  return nextCustomNames;
};

export const getGitlabEmail = async (): Promise<string> => {
  try {
    const res = await fetch("https://gitlab.gz.cvte.cn/-/user_settings/profile").then((res) => res.text());
    const parser = new DOMParser();
    const docDom = parser.parseFromString(res, "text/html");
    const inputDom = docDom.getElementById("user_email") as HTMLInputElement;
    if (!inputDom) {
      throw new Error(`${packageJson.name}适配【gitlab】失效，请联系 ${packageJson.author} 进行修复`);
    }
    return inputDom.value;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getGitlabEmail error :>> ", message);
    return "";
  }
};
