import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import packageJson from "./package.json";

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const manifestSource = packageJson.manifest as {
  host_permissions: string[];
  permissions: string[];
};

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: "dist",
  webExt: {
    // true 时跳过 WXT 浏览器 runner；false 会打开一个已加载扩展的临时浏览器，便于本地自测。
    disabled: false
  },
  manifest: {
    name: packageJson.displayName,
    description: packageJson.description,
    version: packageJson.version,
    homepage_url: packageJson.homepage,
    icons: {
      128: "/icon.png"
    },
    host_permissions: manifestSource.host_permissions,
    permissions: manifestSource.permissions
  },
  vite: () => ({
    plugins: [tailwindcss()],
    optimizeDeps: {
      // 仅影响 Vite dev 依赖预构建；避免 Router Devtools 在 WXT 扩展页中出现 optimized-dep 失效。
      exclude: ["@tanstack/react-router-devtools", "@tanstack/router-devtools-core"]
    },
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
    }
  })
});
