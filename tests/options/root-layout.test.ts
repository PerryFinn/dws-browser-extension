import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readRootRouteSource = () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(currentDir, "..", "..");

  return fs.readFileSync(path.join(projectRoot, "src/options/routes/__root.tsx"), "utf8");
};

const getClasses = (source: string, pattern: RegExp) => {
  const match = source.match(pattern);

  assert.ok(match, `未找到匹配的 className：${pattern}`);

  return new Set(match[1].split(/\s+/).filter(Boolean));
};

const assertHasClasses = (classes: Set<string>, expectedClasses: string[]) => {
  for (const expectedClass of expectedClasses) {
    assert.ok(classes.has(expectedClass), `缺少布局 class：${expectedClass}`);
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
