import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "pathe";
import { expect, test } from "vitest";

test("options sidebar 顶部品牌名来自 package.json displayName", () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(currentDir, "..", "..");
  const sidebarSource = fs.readFileSync(join(projectRoot, "src/options/components/sidebar.tsx"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(join(projectRoot, "package.json"), "utf8")) as {
    displayName?: unknown;
  };
  expect(typeof packageJson.displayName).toBe("string");
  expect(sidebarSource).toMatch(/<span[^>]*>\{packageJSON\.displayName\}<\/span>/);
  expect(sidebarSource).not.toMatch(/\{123123\}/);
});
