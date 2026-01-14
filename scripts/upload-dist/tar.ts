import { createWriteStream, readFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createGzip } from "node:zlib";
import ignore from "ignore";
import { join, relative } from "pathe";
import { pack } from "tar-stream";

export class TarArchive {
  private archiveFiles: string[] = [];
  private ignoreFilter: ReturnType<typeof ignore>;

  constructor(
    private resourceDirPath: string,
    private cdnIgnorePath?: string
  ) {
    this.ignoreFilter = this.retrieveIgnoreFilter();
  }

  private retrieveIgnoreFilter() {
    const defaultIgnore = ignore().add(["*.map"]);
    if (!this.cdnIgnorePath) return defaultIgnore;

    try {
      const ignoreContent = readFileSync(this.cdnIgnorePath, "utf-8");
      return defaultIgnore.add(ignoreContent);
    } catch (error) {
      console.info(`没有找到忽略文件，输入的忽略文件路径是：${this.cdnIgnorePath} \n ${error}`);
      return defaultIgnore;
    }
  }

  private async addFileToTar(packer: ReturnType<typeof pack>, filePath: string, relativePath: string) {
    const content = await readFile(filePath);
    const stats = await stat(filePath);

    return new Promise<void>((resolve, reject) => {
      packer.entry(
        {
          name: relativePath,
          size: stats.size,
          mode: stats.mode,
          mtime: stats.mtime
        },
        content,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async processDirectory(packer: ReturnType<typeof pack>, dirPath: string) {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(this.resourceDirPath, fullPath);

      if (!this.ignoreFilter.ignores(relativePath)) {
        if (entry.isDirectory()) {
          await this.processDirectory(packer, fullPath);
        } else {
          console.log("压缩文件：", relativePath);
          this.archiveFiles.push(fullPath);
          await this.addFileToTar(packer, fullPath, relativePath);
        }
      } else {
        console.warn("ignore file path:", relativePath);
      }
    }
  }

  async createArchive(): Promise<string[]> {
    console.log("【开始】使用 tar-stream 进行压缩");

    const packer = pack();
    const gzip = createGzip();
    const writeStream = createWriteStream("dist.tgz");

    packer.pipe(gzip).pipe(writeStream);

    try {
      await this.processDirectory(packer, this.resourceDirPath);
      packer.finalize();

      await new Promise((resolve, reject) => {
        writeStream.on("finish", () => resolve(void 0));
        writeStream.on("error", reject);
      });

      console.log("【完成】tar-stream 压缩完成");
      return this.archiveFiles;
    } catch (error) {
      console.error("压缩过程中出错：", error);
      throw error;
    }
  }
}

export class TarFactory {
  static createTar(resourceDirPath: string, cdnIgnorePath?: string) {
    console.log("使用 tar-stream 进行压缩");
    return new TarArchive(resourceDirPath, cdnIgnorePath);
  }
}
