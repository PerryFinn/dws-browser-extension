import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runBuildZip } from "../../scripts/build-zip";

type ErrorWithStatus = Error & { status?: number };

test("runBuildZip 在子命令失败时也会恢复临时隐藏的测试文件", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "generic-build-zip-"));
  const srcDir = path.join(rootDir, "src");
  const testFile = path.join(srcDir, "sample.test.ts");
  const hiddenFile = `${testFile}.build-skip`;

  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(testFile, "export {};\n");

  assert.throws(() => {
    runBuildZip({
      rootDir,
      runCommand: () => {
        const error: ErrorWithStatus = new Error("build failed");
        error.status = 1;
        throw error;
      }
    });
  });

  assert.equal(fs.existsSync(testFile), true);
  assert.equal(fs.existsSync(hiddenFile), false);

  fs.rmSync(rootDir, { recursive: true, force: true });
});

test("runBuildZip 会恢复构建过程中被改写的 tsconfig.json", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "generic-build-zip-tsconfig-"));
  const srcDir = path.join(rootDir, "src");
  const tsconfigPath = path.join(rootDir, "tsconfig.json");
  const originalTsconfig = JSON.stringify({ include: ["./src/**/*.ts"] }, null, 2);

  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(srcDir, "sample.test.ts"), "export {};\n");
  fs.writeFileSync(tsconfigPath, `${originalTsconfig}\n`);

  assert.throws(() => {
    runBuildZip({
      rootDir,
      runCommand: () => {
        fs.writeFileSync(tsconfigPath, JSON.stringify({ include: [".wxt/**/*.d.ts"] }, null, 2));
        const error: ErrorWithStatus = new Error("build failed");
        error.status = 1;
        throw error;
      }
    });
  });

  assert.equal(fs.readFileSync(tsconfigPath, "utf8"), `${originalTsconfig}\n`);

  fs.rmSync(rootDir, { recursive: true, force: true });
});

test("runBuildZip 会从 dist 目录复制 WXT zip 产物到 build 目录", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "generic-build-zip-output-"));
  const srcDir = path.join(rootDir, "src");
  const distDir = path.join(rootDir, "dist");
  const zipFile = path.join(distDir, "breeze-0.4.1-chrome.zip");
  const copiedZipFile = path.join(rootDir, "build", "breeze-0.4.1-chrome.zip");

  fs.mkdirSync(srcDir, { recursive: true });

  runBuildZip({
    rootDir,
    runCommand: (command) => {
      if (path.basename(command) === "wxt") {
        fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(zipFile, "zip content");
      }
    }
  });

  assert.equal(fs.readFileSync(copiedZipFile, "utf8"), "zip content");

  fs.rmSync(rootDir, { recursive: true, force: true });
});
