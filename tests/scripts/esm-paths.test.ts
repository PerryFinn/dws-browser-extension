import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "pathe";
import { expect, test } from "vitest";
import { ASSETS_CONFIG, PACKAGE_ROOT } from "../../scripts/upload-assets/config.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("ESM 路径计算仍指向仓库根目录和 assets 目录", () => {
  expect(PACKAGE_ROOT).toBe(projectRoot);
  expect(ASSETS_CONFIG.defaultDir).toBe(join(projectRoot, "assets"));
});
