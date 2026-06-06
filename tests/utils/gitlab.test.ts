import { expect, test } from "vitest";
import {
  type GitlabFrequentProjectMeta,
  type GitlabProjectCustomNames,
  getGitlabProjectFrecencyScore,
  getGitlabProjectNameView,
  sortGitlabProjectsByFrecency,
  updateGitlabProjectCustomName
} from "@/utils/gitlab";

const HOUR_IN_MS = 1000 * 60 * 60;
const NOW = 1700000000000;
const createProject = (overrides: Partial<GitlabFrequentProjectMeta> = {}): GitlabFrequentProjectMeta => ({
  avatarUrl: null,
  frequency: 12,
  id: 101,
  lastAccessedOn: 1700000000000,
  name: "dws-browser-extension",
  namespace: "tooling/extensions",
  webUrl: "https://gitlab.gz.cvte.cn/tooling/extensions/dws-browser-extension",
  ...overrides
});
test("GitLab 项目名称视图优先展示按项目 ID 保存的自定义名称", () => {
  const project = createProject();
  const customNames: GitlabProjectCustomNames = {
    "101": "提效助手扩展"
  };
  expect(getGitlabProjectNameView(project, customNames)).toEqual({
    displayName: "提效助手扩展",
    originalName: "dws-browser-extension",
    customName: "提效助手扩展",
    hasCustomName: true
  });
});
test("GitLab 项目名称视图会忽略空白自定义名称并回退原名称", () => {
  const project = createProject();
  expect(getGitlabProjectNameView(project, { "101": "   " })).toEqual({
    displayName: "dws-browser-extension",
    originalName: "dws-browser-extension",
    customName: "",
    hasCustomName: false
  });
});
test("GitLab 项目自定义名称更新会 trim 输入，清空时删除对应项目配置", () => {
  const customNames: GitlabProjectCustomNames = {
    "101": "旧名称",
    "202": "其他项目"
  };
  expect(updateGitlabProjectCustomName(customNames, 101, "  新名称  ")).toEqual({
    "101": "新名称",
    "202": "其他项目"
  });
  expect(updateGitlabProjectCustomName(customNames, 101, " ")).toEqual({
    "202": "其他项目"
  });
  expect(customNames).toEqual({
    "101": "旧名称",
    "202": "其他项目"
  });
});
test("GitLab 项目自定义名称等于原名称时会删除对应项目配置", () => {
  const customNames: GitlabProjectCustomNames = {
    "101": "旧名称",
    "202": "其他项目"
  };
  expect(updateGitlabProjectCustomName(customNames, 101, " dws-browser-extension ", "dws-browser-extension")).toEqual({
    "202": "其他项目"
  });
});
test("GitLab Frecency 分数会按 72 小时半衰期衰减", () => {
  const project = createProject({
    frequency: 20,
    lastAccessedOn: NOW - 72 * HOUR_IN_MS
  });
  expect(getGitlabProjectFrecencyScore(project, NOW)).toBe(10);
});
test("GitLab Frecency 排序会让近期访问项目排在久未访问的高频项目前", () => {
  const recentProject = createProject({
    frequency: 8,
    id: 1,
    lastAccessedOn: NOW,
    name: "recent-project"
  });
  const oldHighFrequencyProject = createProject({
    frequency: 40,
    id: 2,
    lastAccessedOn: NOW - 216 * HOUR_IN_MS,
    name: "old-high-frequency-project"
  });
  const decayedProject = createProject({
    frequency: 12,
    id: 3,
    lastAccessedOn: NOW - 72 * HOUR_IN_MS,
    name: "decayed-project"
  });
  expect(
    sortGitlabProjectsByFrecency([oldHighFrequencyProject, decayedProject, recentProject], NOW).map(
      (project) => project.id
    )
  ).toEqual([recentProject.id, decayedProject.id, oldHighFrequencyProject.id]);
});
test("GitLab Frecency 排序不会修改原始项目列表", () => {
  const firstProject = createProject({
    frequency: 1,
    id: 1,
    lastAccessedOn: NOW,
    name: "first-project"
  });
  const secondProject = createProject({
    frequency: 10,
    id: 2,
    lastAccessedOn: NOW,
    name: "second-project"
  });
  const projects = [firstProject, secondProject];
  expect(sortGitlabProjectsByFrecency(projects, NOW).map((project) => project.id)).toEqual([
    secondProject.id,
    firstProject.id
  ]);
  expect(projects.map((project) => project.id)).toEqual([firstProject.id, secondProject.id]);
});
