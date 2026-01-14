import dayjs from "dayjs";
import fs from "fs-extra";
import { join, parse } from "pathe";
import { CdnUploader } from "../upload-dist/index";
import { ASSETS_CONFIG } from "./config";
import type { UploadOptions } from "./types";
import { calculateMD5, copyDir, ensureDir, removeDir, writeJsonFile, zipDirectory } from "./utils";

interface ZipAssetsOptions extends UploadOptions {
  sourceDir?: string;
  tempDir?: string;
  zipPath?: string;
  infoFileName?: string;
}

export async function zipAssetsAndUpload(): Promise<void> {
  const sourceDir = ASSETS_CONFIG.defaultDir;
  const tempDir = ASSETS_CONFIG.tempDir;
  const zipPath = ASSETS_CONFIG.zipFileName;
  const infoFileName = ASSETS_CONFIG.infoFileName;

  const tempAssetsDir = join(tempDir, "assets");
  const infoPath = join(sourceDir, infoFileName);
  let originalInfoContent: string | undefined;

  // 确保开始前清理可能存在的旧临时目录和 zip 文件
  const zipDir = parse(zipPath).dir;
  removeDir(tempDir);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    // 创建临时目录结构
    ensureDir(tempDir);
    ensureDir(tempAssetsDir);
    ensureDir(zipDir);

    // 复制资源文件到临时目录
    copyDir(sourceDir, tempAssetsDir);

    // 备份现有的 info 文件内容（如果存在）
    if (fs.existsSync(infoPath)) {
      originalInfoContent = fs.readFileSync(infoPath, "utf-8");
    }
    // 打包并计算 MD5
    zipDirectory(sourceDir, zipPath, (filename) => !filename.includes(infoFileName));

    const hash = calculateMD5(zipPath);
    console.log("zip file hash :>> ", hash);
    if (originalInfoContent && JSON.parse(originalInfoContent).hash === hash) {
      console.log("🥳静态资源无内容变动，跳过上传");
      return;
    }

    // 准备新的 info 内容
    const infoContent = { hash, date: dayjs().format("YYYY-MM-DD HH:mm:ss") };

    // 写入临时目录中的 info 文件
    writeJsonFile(join(tempAssetsDir, infoFileName), infoContent);

    // cdn配置项
    const cdnPath = "https://s0.seewo.com/cloud-static";
    const subpath = "/kdl-gis3d";
    const cdnSubPath = `${subpath}/assetsZip/${hash}`;
    const cdnFilePath = `${cdnPath}${cdnSubPath}`;
    console.log("正在部署到cdn...", cdnSubPath);
    const cdnUploader = new CdnUploader({
      cdnSubPath, // cdn 上传目录，若未创建，后台会自动创建。建议路径格式是  /{产品名称}/{应用名称}/[版本号],
      resourcePath: zipDir, // 可选参数，支持上传指定文件夹 & 单个文件。默认设置为webapack output.path 选项指定的目录。
      ignoreUploadFail: false, // 可选参数， 默认值为false, 即如果出现上传异常，会中断webpack打包进程
      removeFiles: false // 可选参数， 默认值为false, 是否在上传了cdn后，删除已上传的资源，这样可以有效减小镜像大小和推包时间，而且也能有效减小流量费用
    });
    await cdnUploader
      .zipAndUpload()
      .then(() => {
        console.log("请通过浏览器访问验证是否上传成功：\n", cdnFilePath);
      })
      .catch((e) => {
        throw e;
      });
  } catch (error) {
    console.error("处理资源文件时出错:\n", error);
    // 如果处理过程中出错且原来有 info 文件，恢复原有内容
    if (originalInfoContent) {
      fs.writeFileSync(infoPath, originalInfoContent);
    }
    throw error;
  } finally {
    // 清理临时目录和 zip 文件
    removeDir(tempDir);
    removeDir(zipDir);
  }
}
