import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("background messages 目录不包含测试文件", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(currentDir, "..", "..");
  const messagesDir = path.join(projectRoot, "src", "background", "messages");
  const files = fs.readdirSync(messagesDir);
  const testFiles = files.filter((file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"));

  assert.deepEqual(testFiles, []);
});
