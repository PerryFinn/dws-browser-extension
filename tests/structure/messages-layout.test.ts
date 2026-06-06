import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "pathe";
import { expect, test } from "vitest";

test("background messages 目录不包含测试文件", () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(currentDir, "..", "..");
  const messagesDir = join(projectRoot, "src", "background", "messages");
  const files = fs.readdirSync(messagesDir);
  const testFiles = files.filter((file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"));
  expect(testFiles).toEqual([]);
});
