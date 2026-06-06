import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "pathe";
import { expect, test } from "vitest";

const walk = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  });
};
test("src 目录下不保留测试文件", () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(currentDir, "..", "..");
  const srcDir = join(projectRoot, "src");
  const testFiles = walk(srcDir)
    .filter((file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"))
    .map((file) => relative(projectRoot, file))
    .sort();
  expect(testFiles).toEqual([]);
});
