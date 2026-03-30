const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { runBuildZip } = require("./build-zip");

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
      patchMathIntrinsicsImpl: () => {},
      runCommand: () => {
        const error = new Error("build failed");
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
      patchMathIntrinsicsImpl: () => {},
      runCommand: () => {
        fs.writeFileSync(tsconfigPath, JSON.stringify({ include: [".plasmo/index.d.ts"] }, null, 2));
        const error = new Error("build failed");
        error.status = 1;
        throw error;
      }
    });
  });

  assert.equal(fs.readFileSync(tsconfigPath, "utf8"), `${originalTsconfig}\n`);

  fs.rmSync(rootDir, { recursive: true, force: true });
});
