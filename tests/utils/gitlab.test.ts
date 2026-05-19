import { strict as assert } from "node:assert";
import test from "node:test";

import {
  type GitlabFrequentProjectMeta,
  type GitlabProjectCustomNames,
  getGitlabProjectFrecencyScore,
  getGitlabProjectNameView,
  sortGitlabProjectsByFrecency,
  updateGitlabProjectCustomName
} from "@/utils/gitlab";

const HOUR_IN_MS = 1000 * 60 * 60;
const NOW = 1_700_000_000_000;

const createProject = (overrides: Partial<GitlabFrequentProjectMeta> = {}): GitlabFrequentProjectMeta => ({
  avatarUrl: null,
  frequency: 12,
  id: 101,
  lastAccessedOn: 1_700_000_000_000,
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

  assert.deepEqual(getGitlabProjectNameView(project, customNames), {
    displayName: "提效助手扩展",
    originalName: "dws-browser-extension",
    customName: "提效助手扩展",
    hasCustomName: true
  });
});

test("GitLab 项目名称视图会忽略空白自定义名称并回退原名称", () => {
  const project = createProject();

  assert.deepEqual(getGitlabProjectNameView(project, { "101": "   " }), {
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

  assert.deepEqual(updateGitlabProjectCustomName(customNames, 101, "  新名称  "), {
    "101": "新名称",
    "202": "其他项目"
  });
  assert.deepEqual(updateGitlabProjectCustomName(customNames, 101, " "), {
    "202": "其他项目"
  });
  assert.deepEqual(customNames, {
    "101": "旧名称",
    "202": "其他项目"
  });
});

test("GitLab 项目自定义名称等于原名称时会删除对应项目配置", () => {
  const customNames: GitlabProjectCustomNames = {
    "101": "旧名称",
    "202": "其他项目"
  };

  assert.deepEqual(
    updateGitlabProjectCustomName(customNames, 101, " dws-browser-extension ", "dws-browser-extension"),
    {
      "202": "其他项目"
    }
  );
});

test("GitLab Frecency 分数会按 72 小时半衰期衰减", () => {
  const project = createProject({
    frequency: 20,
    lastAccessedOn: NOW - 72 * HOUR_IN_MS
  });

  assert.equal(getGitlabProjectFrecencyScore(project, NOW), 10);
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

  assert.deepEqual(
    sortGitlabProjectsByFrecency([oldHighFrequencyProject, decayedProject, recentProject], NOW).map(
      (project) => project.id
    ),
    [recentProject.id, decayedProject.id, oldHighFrequencyProject.id]
  );
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

  assert.deepEqual(
    sortGitlabProjectsByFrecency(projects, NOW).map((project) => project.id),
    [secondProject.id, firstProject.id]
  );
  assert.deepEqual(
    projects.map((project) => project.id),
    [firstProject.id, secondProject.id]
  );
});
