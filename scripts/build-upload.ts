import { execSync } from "node:child_process";
import { readdir } from "fs-extra";
import { resolve } from "pathe";
import { name as pkgName, version as pkgVersion } from "../package.json";
import { CdnUploader } from "./upload-dist";

const CDN_PATH = "https://s0.seewo.com/cloud-static";
const CDN_SUBPATH_BASE = "/kdl-gis3d";

async function findZipFile(): Promise<string | null> {
  const buildDir = resolve(process.cwd(), "build");
  const files = await readdir(buildDir);
  const zipFile = files.find((file) => file.endsWith(".zip"));
  return zipFile ? resolve(buildDir, zipFile) : null;
}

async function uploadBuildZip(zipPath: string): Promise<string> {
  const fileName = `${pkgName}.zip`;
  const cdnSubPath = `${CDN_SUBPATH_BASE}/v${pkgVersion}/build`;
  const cdnFilePath = `${CDN_PATH}${cdnSubPath}/${fileName}`;

  console.log("正在部署到cdn...", cdnSubPath);

  const cdnUploader = new CdnUploader({
    cdnSubPath, // cdn 上传目录，若未创建，后台会自动创建。建议路径格式是  /{产品名称}/{应用名称}/[版本号],
    ignoreUploadFail: false, // 可选参数， 默认值为false, 即如果出现上传异常，会中断webpack打包进程
    removeFiles: false // 可选参数， 默认值为false, 是否在上传了cdn后，删除已上传的资源，这样可以有效减小镜像大小和推包时间，而且也能有效减小流量费用
  });

  await cdnUploader.uploadSingleFile(zipPath, fileName);

  console.log("请通过浏览器访问验证是否上传成功：\n", cdnFilePath);
  return cdnFilePath;
}

async function main() {
  try {
    // 执行构建和打包命令
    console.log("开始构建打包...");
    const command = "pnpm build-zip";
    console.log("执行命令: ", command);
    execSync(command, { stdio: "inherit" });

    // 查找 zip 文件
    const zipPath = await findZipFile();
    if (!zipPath) {
      throw new Error("未找到打包后的 zip 文件，请检查 build 目录");
    }

    // 上传构建 zip 到 CDN
    await uploadBuildZip(zipPath);
  } catch (error) {
    console.error("发布过程出错:", error);
    process.exit(1);
  }
}

main();
