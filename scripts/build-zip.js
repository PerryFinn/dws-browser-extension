const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { patchMathIntrinsics } = require("./patch-math-intrinsics");

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const temporarySuffix = ".build-skip";

// Plasmo 会扫描 src 下的 TS/TSX 文件，测试文件里的 node:assert/polyfill 会污染浏览器构建。
// 打包前临时隐藏 *.test.ts(x)，结束后再恢复，避免为了构建去改测试目录结构。
const collectTestFiles = (dir) => {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(absolutePath));
      continue;
    }

    if (/\.test\.tsx?$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
};

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const renamedFiles = [];

try {
  // Parcel 解析这条依赖链时需要显式 .js 后缀，这里在构建前做一次幂等补丁。
  patchMathIntrinsics();

  for (const filePath of collectTestFiles(srcDir)) {
    const hiddenPath = `${filePath}${temporarySuffix}`;
    fs.renameSync(filePath, hiddenPath);
    renamedFiles.push([hiddenPath, filePath]);
  }

  runCommand(path.join(rootDir, "node_modules/.bin/tsr"), ["generate"]);
  runCommand(path.join(rootDir, "node_modules/.bin/plasmo"), ["build", "--", "--zip"]);
} finally {
  for (const [hiddenPath, originalPath] of renamedFiles.reverse()) {
    if (fs.existsSync(hiddenPath)) {
      fs.renameSync(hiddenPath, originalPath);
    }
  }
}
