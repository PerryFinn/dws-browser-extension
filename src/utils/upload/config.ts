import { resolve } from "pathe";

// 获取包的根目录路径
const PACKAGE_ROOT = resolve(__dirname, "../..");

// TODO: 已失效，需要维护

export const DEFAULT_CONFIG = {
  // 10394 测试环境
  // 10334 生产环境
  appId: "10334", // dws-editor appId
  isTest: false,
  clientIp: "101.1.1.1",
  clientId: "",
  keyPrefix: "", // 默认为空字符串，表示上传到根路径
  host: {
    test: "cstore.test.seewo.com",
    prod: "cstore.seewo.com"
  }
} as const;

export const UPLOAD_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  concurrency: 3,
  chunkSize: 1024 * 1024 * 5 // 5MB
} as const;

export const ASSETS_CONFIG = {
  defaultDir: resolve(PACKAGE_ROOT, "assets"),
  tempDir: resolve(PACKAGE_ROOT, "build", "temp")
} as const;
