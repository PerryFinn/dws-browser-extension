import AdmZip from "adm-zip";
import fs from "fs-extra";
import md5File from "md5-file";
import { join } from "pathe";

/**
 * 递归遍历目录，返回所有文件路径
 */
export function getAllFiles(dirPath: string): string[] {
  const filesList: string[] = [];

  function readDir(path: string) {
    const files = fs.readdirSync(path);
    for (const file of files) {
      const filePath = join(path, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        readDir(filePath);
      } else if (file !== ".DS_Store" && !file.endsWith(".map")) {
        filesList.push(filePath);
      }
    }
  }

  readDir(dirPath);
  return filesList;
}

/**
 * 创建目录（如果不存在）
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 删除目录及其内容
 */
export function removeDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * 压缩目录到 zip 文件
 */
export function zipDirectory(
  sourcePath: string,
  outPath: string,
  filter?: RegExp | ((filename: string) => boolean)
): void {
  const zip = new AdmZip();
  zip.addLocalFolder(sourcePath, void 0, filter);
  zip.writeZip(outPath);
}

/**
 * 计算文件的 MD5 值
 */
export function calculateMD5(filePath: string): string {
  return md5File.sync(filePath);
}

/**
 * 写入 JSON 文件
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * 复制目录
 */
export function copyDir(src: string, dest: string): void {
  fs.copySync(src, dest);
}

/**
 * 生成请求 ID
 */
export function generateRequestId(): string {
  return new Date().toISOString().replace(/[^0-9]/g, "");
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 批量任务并发控制
 */
export async function concurrentExecute<T, R>(
  tasks: T[],
  executor: (task: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(async () => {
      const result = await executor(task);
      results.push(result);
    });

    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        0,
        executing.length,
        ...executing.filter((p) =>
          p.then(
            () => false,
            () => true
          )
        )
      );
    }
  }

  await Promise.all(executing);
  return results;
}
