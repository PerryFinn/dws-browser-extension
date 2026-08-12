import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "pathe";
import { expect, test } from "vitest";

const readRootRouteSource = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(currentDir, "..", "..");
  return fs.readFileSync(join(projectRoot, "src/options/routes/__root.tsx"), "utf8");
};
const getClasses = (source: string, pattern: RegExp) => {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`未找到匹配的 className：${pattern}`);
  }
  const className = match[1];
  if (className === undefined) {
    throw new Error(`匹配结果中缺少 className：${pattern}`);
  }
  return new Set(className.split(/\s+/).filter(Boolean));
};
const assertHasClasses = (classes: Set<string>, expectedClasses: string[]) => {
  for (const expectedClass of expectedClasses) {
    expect(classes.has(expectedClass), `缺少布局 class：${expectedClass}`).toBe(true);
  }
};
test("options 根布局固定视口，只有内容区滚动", () => {
  const source = readRootRouteSource();
  assertHasClasses(getClasses(source, /<div id="options-page" className="([^"]+)">/), ["h-svh", "overflow-hidden"]);
  assertHasClasses(getClasses(source, /<SidebarProvider className="([^"]+)">/), [
    "h-full",
    "min-h-0",
    "overflow-hidden"
  ]);
  assertHasClasses(getClasses(source, /<SidebarInset className="([^"]+)">/), ["h-full", "min-h-0", "overflow-hidden"]);
  assertHasClasses(getClasses(source, /<div className="([^"]*overflow-y-auto[^"]*)">/), [
    "min-h-0",
    "flex-1",
    "overflow-y-auto"
  ]);
});
