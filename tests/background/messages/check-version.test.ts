import { strict as assert } from "node:assert";
import test from "node:test";

import { fetchWithTimeout, parseRemoteVersionInfo } from "@/background/version-check";

test("版本检查会拒绝非法语义化版本号", () => {
  assert.equal(parseRemoteVersionInfo({ version: "latest" }), null);
  assert.equal(parseRemoteVersionInfo({ version: "1.2" }), null);
});

test("版本检查会规范化合法版本号并保留可选字段", () => {
  assert.deepEqual(
    parseRemoteVersionInfo({
      version: " v1.2.3 ",
      downloadUrl: "https://example.com/download",
      message: "更新说明"
    }),
    {
      version: "1.2.3",
      downloadUrl: "https://example.com/download",
      message: "更新说明"
    }
  );
});

test("版本检查请求超时后会中止 fetch", async () => {
  await assert.rejects(
    fetchWithTimeout("https://example.com/extension/info", {
      timeoutMs: 1,
      fetchImpl: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted by signal")));
        })
    }),
    /超时/
  );
});
