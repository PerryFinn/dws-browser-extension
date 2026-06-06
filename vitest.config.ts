import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement: resolvePath("./src")
      },
      {
        find: "assets",
        replacement: resolvePath("./assets")
      }
    ]
  },
  test: {
    clearMocks: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // agent reporter 只展开失败详情，避免 AI 阅读测试输出时被成功用例列表干扰。
    reporters: ["agent"],
    restoreMocks: true
  }
});
