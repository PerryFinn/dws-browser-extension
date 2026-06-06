import { expect, test } from "vitest";
import { fetchWithTimeout, parseRemoteVersionInfo } from "@/background/version-check";

test("版本检查会拒绝非法语义化版本号", () => {
  expect(parseRemoteVersionInfo({ version: "latest" })).toBe(null);
  expect(parseRemoteVersionInfo({ version: "1.2" })).toBe(null);
});
test("版本检查会规范化合法版本号并保留可选字段", () => {
  expect(
    parseRemoteVersionInfo({
      version: " v1.2.3 ",
      downloadUrl: "https://example.com/download",
      message: "更新说明"
    })
  ).toEqual({
    version: "1.2.3",
    downloadUrl: "https://example.com/download",
    message: "更新说明"
  });
});
test("版本检查请求超时后会中止 fetch", async () => {
  await expect(
    fetchWithTimeout("https://example.com/extension/info", {
      timeoutMs: 1,
      fetchImpl: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted by signal")));
        })
    })
  ).rejects.toThrow(/超时/);
});
