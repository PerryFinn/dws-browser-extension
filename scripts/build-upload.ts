import { execSync } from "node:child_process";
import { DEFAULT_CONFIG, Uploader } from "@/utils/upload";
import { readFile, readdir } from "fs-extra";
import { resolve } from "pathe";
import packageJson from "../package.json";

async function findZipFile(): Promise<string | null> {
  const buildDir = resolve(process.cwd(), "build");
  const files = await readdir(buildDir);
  const zipFile = files.find((file) => file.endsWith(".zip"));
  const zipPath = zipFile ? resolve(buildDir, zipFile) : null;
  return zipPath;
}

async function uploadFile(filePath: string): Promise<string> {
  const uploader = new Uploader({
    appId: DEFAULT_CONFIG.appId,
    isTest: DEFAULT_CONFIG.isTest
  });
  const fileContent = await readFile(filePath);
  const fileName = `${packageJson.name}_${packageJson.version}.zip`;
  const result = await uploader.uploadBuffer(fileContent, fileName, (progress, fileName) => {
    if (typeof progress === "number") {
      console.log(`上传进度 ${fileName}: ${progress.toFixed(2)}%`);
    }
  });

  const urlTemplate = `https://qn-store-pub-tx.seewo.com/enow-cloud_assets/${fileName}`;

  if (result.isExist) {
    console.log("文件已存在");
    return urlTemplate;
  }

  if (result.success && result.url) {
    console.log("上传成功:\n", result.url);
    return result.url;
  }
  console.error("上传失败:\n", result);
  throw result.error;
}

async function main() {
  try {
    // 执行构建和打包命令
    console.log("开始构建打包...");
    const command = "pnpm build";
    console.log("执行命令: ", command);
    execSync(command, { stdio: "inherit" });

    // 查找 zip 文件
    const zipPath = await findZipFile();
    if (!zipPath) {
      throw new Error("未找到打包后的 zip 文件，请检查 build 目录");
    }

    // 上传文件
    const uploadUrl = await uploadFile(zipPath);
    console.log("下载链接:", uploadUrl);
  } catch (error) {
    console.error("发布过程出错:", error);
    process.exit(1);
  }
}

main();
