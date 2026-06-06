import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { basename, join } from "pathe";

const rootDir = process.cwd();
const temporarySuffix = ".build-skip";
const tsconfigPath = "tsconfig.json";
const wxtOutputDir = "dist";

type ErrorWithStatus = Error & { status?: number };
type RunCommand = (command: string, args: string[], workingDirectory: string) => void;

interface RunBuildZipOptions {
  rootDir?: string;
  runCommand?: RunCommand;
}

// 浏览器扩展构建不需要测试文件，测试依赖可能污染浏览器构建。
// 打包前临时隐藏 *.test.ts(x)，结束后再恢复，避免为了构建去改测试目录结构。
export const collectTestFiles = (dir: string): string[] => {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = join(dir, entry.name);

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

export const collectZipFiles = (dir: string): string[] => {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectZipFiles(absolutePath));
      continue;
    }

    if (entry.name.endsWith(".zip")) {
      files.push(absolutePath);
    }
  }

  return files;
};

const copyOutputZipFiles = (workingDirectory: string) => {
  const outputDir = join(workingDirectory, wxtOutputDir);
  const buildDir = join(workingDirectory, "build");
  const zipFiles = collectZipFiles(outputDir);

  if (!zipFiles.length) {
    throw new Error("WXT zip 构建完成后未找到 zip 文件");
  }

  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });

  for (const zipFile of zipFiles) {
    fs.copyFileSync(zipFile, join(buildDir, basename(zipFile)));
  }
};

const runCommand: RunCommand = (command, args, workingDirectory) => {
  const result = spawnSync(command, args, {
    cwd: workingDirectory,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    const error: ErrorWithStatus = new Error(`Command failed: ${command} ${args.join(" ")}`);
    error.status = result.status ?? 1;
    throw error;
  }
};

export const runBuildZip = ({
  rootDir: workingDirectory = rootDir,
  runCommand: runCommandImpl = runCommand
}: RunBuildZipOptions = {}) => {
  const srcDir = join(workingDirectory, "src");
  const renamedFiles: Array<[string, string]> = [];
  const absoluteTsconfigPath = join(workingDirectory, tsconfigPath);
  const originalTsconfig = fs.existsSync(absoluteTsconfigPath) ? fs.readFileSync(absoluteTsconfigPath, "utf8") : null;

  try {
    for (const filePath of collectTestFiles(srcDir)) {
      const hiddenPath = `${filePath}${temporarySuffix}`;
      fs.renameSync(filePath, hiddenPath);
      renamedFiles.push([hiddenPath, filePath]);
    }

    runCommandImpl(join(workingDirectory, "node_modules/.bin/tsr"), ["generate"], workingDirectory);
    runCommandImpl(join(workingDirectory, "node_modules/.bin/wxt"), ["zip"], workingDirectory);
    copyOutputZipFiles(workingDirectory);
  } finally {
    for (const [hiddenPath, originalPath] of renamedFiles.reverse()) {
      if (fs.existsSync(hiddenPath)) {
        fs.renameSync(hiddenPath, originalPath);
      }
    }

    if (originalTsconfig !== null) {
      fs.writeFileSync(absoluteTsconfigPath, originalTsconfig);
    }
  }
};

const getErrorStatus = (error: unknown) => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = error.status;

    if (typeof status === "number") {
      return status;
    }
  }

  return 1;
};

const isMainModule = () => {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
};

if (isMainModule()) {
  try {
    runBuildZip();
  } catch (error) {
    process.exit(getErrorStatus(error));
  }
}
