import { existsSync, readFile, statSync, unlink } from "node:fs";
import { promisify } from "node:util";
import { basename, resolve } from "pathe";
import { TarFactory } from "./tar";
import type { CdnUploaderOptions, TaskResponse, UploadResponse } from "./types";
import { formatBytes, sleep } from "./utils";

const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

const POLLING_INTERVAL = 1000;
const MAX_RETRY_TIMES = 10;
const HOST = "http://ccloud.cvte.com/cloud/api/v1/cdn-webpack";

export class CdnUploader {
  private archiveFiles: string[] = [];
  private archiveFilePath?: string;
  private workingDirPath: string;
  private retryTimes = 1;

  constructor(private options: CdnUploaderOptions) {
    this.workingDirPath = options.workingDirPath || process.cwd();
  }

  private validateOptions() {
    const { cdnSubPath } = this.options;
    const cdnSubPathValidateRegex = /^\/\S+/;

    if (!cdnSubPath || !cdnSubPathValidateRegex.test(cdnSubPath.trim())) {
      throw new Error("cdn上传目录不能为空或者是根目录，请输入: /targetCdnPath");
    }
  }

  private validateResourcePath(resourcePath: string) {
    if (!this.options.resourcePath) {
      throw new Error("没有输入资源目录");
    }
    if (!existsSync(resourcePath)) {
      throw new Error(`输入的文件目录不存在: ${resourcePath}`);
    }
  }

  private validateFilePath(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Error(`输入的文件不存在: ${filePath}`);
    }
    if (!statSync(filePath).isFile()) {
      throw new Error(`输入的路径不是文件: ${filePath}`);
    }
  }

  private async deleteUploadedFiles() {
    if (this.options.removeFiles) {
      await Promise.all(this.archiveFiles.map((filePath) => unlinkAsync(filePath)));
      this.archiveFiles = [];
      console.log("--------已删除被上传的资源文件--------");
      return;
    }

    if (this.archiveFilePath && existsSync(this.archiveFilePath)) {
      console.warn(
        `[warning]*****请考虑删除已上传CDN的资源文件，这些资源大小共占用流量：${formatBytes(
          statSync(this.archiveFilePath).size
        )}*****`
      );
    }
  }

  private async uploadFile(filePath: string, fileName?: string, cleanupFilePath?: string) {
    try {
      const formData = new FormData();
      const fileContent = await readFileAsync(filePath);
      const uploadFileName = fileName?.trim() ? fileName : basename(filePath);
      formData.append("file", new Blob([fileContent]), uploadFileName);
      formData.append("cdnSubPath", this.options.cdnSubPath);

      console.log("开始上传...");
      const response = await fetch(`${HOST}/task/start`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as UploadResponse;
      console.log("上传文件id: ", data.data);

      if (data.code === 0 && data.data) {
        console.log("上传成功!");
        console.log("响应 data 如下：\n", data);
        await this.polling(data.data, cleanupFilePath);
      } else {
        console.warn("上传失败", data.message);
      }
    } catch (error) {
      console.error("upload file error:", error);
      throw error;
    } finally {
      await this.deleteUploadedFiles();
    }
  }

  private async checkUploadStats(id: string) {
    const response = await fetch(`${HOST}/task/state?taskId=${encodeURIComponent(id)}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<TaskResponse>;
  }

  private async polling(id: string, cleanupFilePath?: string) {
    console.log("正在比对上传文件...\n请留意是否有异常信息");

    while (true) {
      try {
        const response = await this.checkUploadStats(id);
        const {
          code,
          data: { state, message = "" }
        } = response;

        if (code !== 0) {
          throw new Error(`轮询失败: ${code} ${message}`);
        }

        console.log("当前状态:", message);

        if (state === "SUBMITTED" || state === "PROCESSING") {
          await sleep(POLLING_INTERVAL);
          continue;
        }

        if (state === "SUCCESS") {
          console.log("cdn文件资源已上传成功!");
          if (cleanupFilePath && existsSync(cleanupFilePath)) {
            await unlinkAsync(cleanupFilePath);
            if (cleanupFilePath === this.archiveFilePath) {
              this.archiveFilePath = undefined;
            }
          }
          break;
        }

        console.log("cdn文件资源已上传失败\n", code, message);
        if (this.options.ignoreUploadFail) {
          process.exit(0);
        }
        process.exit(1);
      } catch (error) {
        console.log("times:", this.retryTimes);
        console.error("轮询上传状态异常\n", error);

        if (this.retryTimes <= MAX_RETRY_TIMES) {
          console.log(`正在进行第 ${this.retryTimes} 次重试...`);
          await sleep(POLLING_INTERVAL * this.retryTimes);
          this.retryTimes += 1;
          continue;
        }

        console.error(`超过最大重试次数：${MAX_RETRY_TIMES}，结束轮询...`);
        throw error;
      }
    }
  }

  async zipAndUpload() {
    console.log("cdn插件配置: ", this.options);
    console.log("CDN插件工作目录：", this.workingDirPath);

    try {
      this.validateOptions();
      const resourceDirPath = resolve(this.workingDirPath, this.options.resourcePath || "");
      this.validateResourcePath(resourceDirPath);
      console.log("上传资源目录：", resourceDirPath);

      const tarArchive = TarFactory.createTar(resourceDirPath, this.options.cdnIgnorePath);
      this.archiveFiles = await tarArchive.createArchive();
      this.archiveFilePath = resolve(process.cwd(), "dist.tgz");
      await this.uploadFile(this.archiveFilePath, "dist.tgz", this.archiveFilePath);
    } catch (error) {
      console.error("error catch: ", error);
      throw error;
    }
  }

  async uploadSingleFile(filePath: string, fileName?: string) {
    console.log("cdn插件配置: ", this.options);
    console.log("CDN插件工作目录：", this.workingDirPath);

    try {
      this.validateOptions();
      const resolvedFilePath = resolve(this.workingDirPath, filePath);
      this.validateFilePath(resolvedFilePath);
      console.log("上传单个文件：", resolvedFilePath);

      const tarArchive = TarFactory.createTarFromFile(resolvedFilePath, fileName);
      this.archiveFiles = await tarArchive.createArchive();
      this.archiveFilePath = resolve(process.cwd(), "dist.tgz");
      await this.uploadFile(this.archiveFilePath, "dist.tgz", this.archiveFilePath);
    } catch (error) {
      console.error("error catch: ", error);
      throw error;
    }
  }
}
