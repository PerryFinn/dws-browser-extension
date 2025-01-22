import { execSync } from "node:child_process";
import fs from "node:fs";
import { resolve } from "pathe";

async function findZipFile(): Promise<string | null> {
  const buildDir = resolve(process.cwd(), "build");
  const files = fs.readdirSync(buildDir);
  const zipFile = files.find((file) => file.endsWith(".zip"));
  return zipFile ? resolve(buildDir, zipFile) : null;
}

async function mockUploadFile(filePath: string): Promise<string> {
  // 模拟上传过程
  console.log("正在上传文件:", filePath);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const fileName = filePath.split("/").pop();
  return `https://mock-cdn.example.com/extensions/${fileName}`;
}

async function main() {
  try {
    // 执行构建和打包命令
    console.log("开始构建...");
    execSync("pnpm build", { stdio: "inherit" });

    console.log("开始打包...");
    execSync("pnpm package", { stdio: "inherit" });

    // 查找 zip 文件
    const zipPath = await findZipFile();
    if (!zipPath) {
      throw new Error("未找到打包后的 zip 文件");
    }

    // 上传文件
    const uploadUrl = await mockUploadFile(zipPath);
    console.log("上传成功！");
    console.log("下载链接:", uploadUrl);
  } catch (error) {
    console.error("发布过程出错:", error);
    process.exit(1);
  }
}

main();
