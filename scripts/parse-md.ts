import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "pathe";

function parseMdFile() {
  try {
    // 读取 demo.md 文件
    const filePath = resolve(process.cwd(), "demo.md");
    const content = readFileSync(filePath, "utf-8");

    // 处理内容：在每个 '- ' 前添加换行符（除非已经有换行符）
    const processedContent = content.replace(/([^\n])(- )/g, "$1\n$2");

    // 将处理后的内容写入 out.md
    const outputPath = resolve(process.cwd(), "out.md");
    writeFileSync(outputPath, processedContent, "utf-8");

    console.log("文件处理完成，已输出到 out.md");
  } catch (error) {
    console.error("处理文件时发生错误:", error);
  }
}

// 执行函数
parseMdFile();
