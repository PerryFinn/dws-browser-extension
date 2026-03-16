import { strict as assert } from "node:assert";
import test from "node:test";

import { resolveUpdateUrl } from "./update-notice-utils";

test("当远端未返回 downloadUrl 时回退到 homepage", () => {
  const updateUrl = resolveUpdateUrl({
    cacheMatchesSettings: true,
    downloadUrl: undefined,
    homepage: "https://dws.seewo.com/"
  });

  assert.equal(updateUrl, "https://dws.seewo.com/");
});

test("当远端返回 downloadUrl 时优先使用 downloadUrl", () => {
  const updateUrl = resolveUpdateUrl({
    cacheMatchesSettings: true,
    downloadUrl: "https://example.com/download",
    homepage: "https://dws.seewo.com/"
  });

  assert.equal(updateUrl, "https://example.com/download");
});

test("当缓存和配置不匹配时直接回退到 homepage", () => {
  const updateUrl = resolveUpdateUrl({
    cacheMatchesSettings: false,
    downloadUrl: "https://example.com/download",
    homepage: "https://dws.seewo.com/"
  });

  assert.equal(updateUrl, "https://dws.seewo.com/");
});
