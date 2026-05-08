import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("options sidebar 顶部品牌名来自 package.json displayName", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(currentDir, "..", "..");
  const sidebarSource = fs.readFileSync(path.join(projectRoot, "src/options/components/sidebar.tsx"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
    displayName?: unknown;
  };

  assert.equal(typeof packageJson.displayName, "string");
  assert.match(sidebarSource, /<span[^>]*>\{packageJSON\.displayName\}<\/span>/);
  assert.doesNotMatch(sidebarSource, /\{123123\}/);
});
