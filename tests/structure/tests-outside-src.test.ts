import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const walk = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return fullPath;
  });
};

test("src 目录下不保留测试文件", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(currentDir, "..", "..");
  const srcDir = path.join(projectRoot, "src");
  const testFiles = walk(srcDir)
    .filter((file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"))
    .map((file) => path.relative(projectRoot, file))
    .sort();

  assert.deepEqual(testFiles, []);
});
