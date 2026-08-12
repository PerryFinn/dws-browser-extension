import fs from "node:fs";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { basename, join } from "pathe";
import { expect, test } from "vitest";
import { isMainModule, runBuildZip } from "../../scripts/build-zip.js";

type ErrorWithStatus = Error & {
  status?: number;
};

test("build-zip 只在 import.meta.url 对应入口脚本时判定为主模块", () => {
  const entryPath = join(process.cwd(), "scripts", "build-zip.ts");

  expect(isMainModule(pathToFileURL(entryPath).href, entryPath)).toBe(true);
  expect(isMainModule(pathToFileURL(join(process.cwd(), "scripts", "parse-md.ts")).href, entryPath)).toBe(false);
  expect(isMainModule(pathToFileURL(entryPath).href, undefined)).toBe(false);
});

test("runBuildZip 在子命令失败时也会恢复临时隐藏的测试文件", () => {
  const rootDir = fs.mkdtempSync(join(os.tmpdir(), "generic-build-zip-"));
  const srcDir = join(rootDir, "src");
  const testFile = join(srcDir, "sample.test.ts");
  const hiddenFile = `${testFile}.build-skip`;
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(testFile, "export {};\n");
  expect(() => {
    runBuildZip({
      rootDir,
      runCommand: () => {
        const error: ErrorWithStatus = new Error("build failed");
        error.status = 1;
        throw error;
      }
    });
  }).toThrow();
  expect(fs.existsSync(testFile)).toBe(true);
  expect(fs.existsSync(hiddenFile)).toBe(false);
  fs.rmSync(rootDir, { recursive: true, force: true });
});
test("runBuildZip 会恢复构建过程中被改写的 tsconfig.json", () => {
  const rootDir = fs.mkdtempSync(join(os.tmpdir(), "generic-build-zip-tsconfig-"));
  const srcDir = join(rootDir, "src");
  const tsconfigPath = join(rootDir, "tsconfig.json");
  const originalTsconfig = JSON.stringify({ include: ["./src/**/*.ts"] }, null, 2);
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(join(srcDir, "sample.test.ts"), "export {};\n");
  fs.writeFileSync(tsconfigPath, `${originalTsconfig}\n`);
  expect(() => {
    runBuildZip({
      rootDir,
      runCommand: () => {
        fs.writeFileSync(tsconfigPath, JSON.stringify({ include: [".wxt/**/*.d.ts"] }, null, 2));
        const error: ErrorWithStatus = new Error("build failed");
        error.status = 1;
        throw error;
      }
    });
  }).toThrow();
  expect(fs.readFileSync(tsconfigPath, "utf8")).toBe(`${originalTsconfig}\n`);
  fs.rmSync(rootDir, { recursive: true, force: true });
});
test("runBuildZip 会从 dist 目录复制 WXT zip 产物到 build 目录", () => {
  const rootDir = fs.mkdtempSync(join(os.tmpdir(), "generic-build-zip-output-"));
  const srcDir = join(rootDir, "src");
  const distDir = join(rootDir, "dist");
  const zipFile = join(distDir, "breeze-0.4.1-chrome.zip");
  const copiedZipFile = join(rootDir, "build", "breeze-0.4.1-chrome.zip");
  fs.mkdirSync(srcDir, { recursive: true });
  runBuildZip({
    rootDir,
    runCommand: (command) => {
      if (basename(command) === "wxt") {
        fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(zipFile, "zip content");
      }
    }
  });
  expect(fs.readFileSync(copiedZipFile, "utf8")).toBe("zip content");
  fs.rmSync(rootDir, { recursive: true, force: true });
});
