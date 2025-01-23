import type { Buffer } from "node:buffer";
import querystring from "node:querystring";
import axios, { type AxiosInstance } from "axios";
import toStream from "buffer-to-stream";
import FormData from "form-data";
import fs from "fs-extra";
import { DEFAULT_CONFIG, UPLOAD_CONFIG } from "./config";
import type { UploadOptions, UploadPolicy, UploadProgressCallback, UploadResult } from "./types";
import { delay } from "./utils";

export class Uploader {
  private readonly options: Required<UploadOptions>;
  private policy?: UploadPolicy;
  private axiosInstance: AxiosInstance;

  constructor(options: UploadOptions) {
    this.options = {
      ...DEFAULT_CONFIG,
      ...options
    };

    this.axiosInstance = axios.create({
      timeout: 30000
    });
  }

  /**
   * 获取上传策略
   */
  private async getUploadPolicy(): Promise<UploadPolicy> {
    if (this.policy) {
      return this.policy;
    }

    const host = this.options.isTest ? DEFAULT_CONFIG.host.test : DEFAULT_CONFIG.host.prod;
    const query = querystring.stringify({
      clientIp: this.options.clientIp,
      clientId: this.options.clientId,
      requestId: new Date().toISOString().replace(/[^0-9]/g, ""),
      isTest: this.options.isTest,
      appId: this.options.appId
    });

    const response = await this.axiosInstance.get<{ data: UploadPolicy }>(
      `http://${host}/cstore/api/v2/uploadPolicy?${query}`,
      { responseType: "json" }
    );

    this.policy = response.data.data;
    return this.policy;
  }

  /** 上传单个文件 */
  private async uploadSingle(
    filePath: string,
    fileName: string,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> {
    let retries = 0;

    while (retries < UPLOAD_CONFIG.maxRetries) {
      try {
        const policy = await this.getUploadPolicy();
        const { formFields, uploadUrl } = policy.policyList[0];

        const form = new FormData();
        const fileStream = fs.createReadStream(filePath);
        form.append("file", fileStream);

        // 添加表单字段
        for (const field of formFields) {
          form.append(field.key, field.value);
        }

        // 设置文件路径
        form.append("key", `${this.options.keyPrefix || ""}${fileName}`);

        const response = await this.axiosInstance.post(uploadUrl, form, {
          headers: form.getHeaders(),
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              onProgress(progress, fileName);
            }
          }
        });

        return {
          success: true,
          url: response.data.data.downloadUrl,
          fileName
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 614) {
          return {
            success: true,
            fileName,
            isExist: true
          };
        }

        retries++;
        if (retries < UPLOAD_CONFIG.maxRetries) {
          await delay(UPLOAD_CONFIG.retryDelay);
          continue;
        }

        return {
          success: false,
          error: error as Error,
          fileName
        };
      }
    }

    return {
      success: false,
      error: new Error("Max retries exceeded"),
      fileName
    };
  }

  /** 批量上传文件 */
  public async uploadFiles(
    files: Array<{ absolutePath: string; relativePath: string }>,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const totalFiles = files.length;
    let completedFiles = 0;

    for (const file of files) {
      const result = await this.uploadSingle(file.absolutePath, file.relativePath);

      results.push(result);
      completedFiles++;

      // 计算总体进度
      if (onProgress) {
        const totalProgress = `${completedFiles}/${totalFiles}`;
        onProgress(totalProgress, file.relativePath, { isExist: result.isExist });
      }

      if (!result.success) {
        console.error(`Failed to upload ${file.relativePath}:`, result.error);
      }
    }

    return results;
  }

  /** 上传单个 Buffer */
  public async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> {
    let retries = 0;

    while (retries < UPLOAD_CONFIG.maxRetries) {
      try {
        const policy = await this.getUploadPolicy();
        const { formFields, uploadUrl } = policy.policyList[0];

        const form = new FormData();
        form.append("file", toStream(buffer));
        const totalSize = buffer.byteLength;

        for (const field of formFields) {
          if (field.key === "key") {
            form.append("key", `${this.options.keyPrefix || this.policy?.keyPrefix || ""}assets/${fileName}`);
          } else {
            form.append(field.key, field.value);
          }
        }

        const headers = form.getHeaders();
        const response = await this.axiosInstance.post(uploadUrl, form, {
          headers,
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total ?? totalSize;
            if (onProgress && total) {
              const progress = (progressEvent.loaded / total) * 100;
              onProgress(progress >= 100 ? 100 : progress, fileName);
            }
          }
        });

        return {
          success: true,
          url: response.data.data.downloadUrl,
          fileName
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 614) {
          return {
            success: true,
            fileName,
            isExist: true
          };
        }

        retries++;
        if (retries < UPLOAD_CONFIG.maxRetries) {
          await delay(UPLOAD_CONFIG.retryDelay);
          continue;
        }

        return {
          success: false,
          error: error as Error,
          fileName
        };
      }
    }

    return {
      success: false,
      error: new Error("Max retries exceeded"),
      fileName
    };
  }
}
