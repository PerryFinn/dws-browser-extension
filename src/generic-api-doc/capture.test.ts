import { strict as assert } from "node:assert";
import test from "node:test";

import { createDomCaptureContext, createSelectionCaptureContext } from "./capture";

test("DOM 点选结果保留 url、title、mode、rawText 和 preview", () => {
  const context = createDomCaptureContext({
    url: "https://example.com/docs/user/detail",
    title: "用户详情接口",
    text: "接口名称：获取用户详情\n请求方法：GET\n请求路径：/api/user/detail",
    htmlSnippet: "<section><h2>获取用户详情</h2></section>"
  });

  assert.equal(context.source.url, "https://example.com/docs/user/detail");
  assert.equal(context.source.title, "用户详情接口");
  assert.equal(context.source.mode, "generic-dom");
  assert.match(context.rawText, /请求路径：\/api\/user\/detail/);
  assert.match(context.previewText, /获取用户详情/);
  assert.equal(context.domSummary, "<section><h2>获取用户详情</h2></section>");
});

test("文本选区为空时抛出明确错误", () => {
  assert.throws(
    () =>
      createSelectionCaptureContext({
        url: "https://example.com/docs/user/detail",
        title: "用户详情接口",
        text: "   "
      }),
    /当前页面没有可用的选中文本/
  );
});

test("过长文本会被截断，但保留页面信息", () => {
  const longText = "字段说明 ".repeat(5000);
  const context = createSelectionCaptureContext({
    url: "https://example.com/docs/user/detail",
    title: "用户详情接口",
    text: longText
  });

  assert.equal(context.source.url, "https://example.com/docs/user/detail");
  assert.equal(context.source.title, "用户详情接口");
  assert.ok(context.rawText.length < longText.length);
  assert.ok(context.rawText.endsWith("..."));
  assert.ok(context.previewText.length <= 240);
});

test("点选模式优先保留目标节点文本，而不是整页噪声", () => {
  const context = createDomCaptureContext({
    url: "https://example.com/docs/user/detail",
    title: "用户详情接口",
    text: "接口名称：获取用户详情\n请求路径：/api/user/detail",
    htmlSnippet: "<main>整页其它内容</main>"
  });

  assert.match(context.rawText, /获取用户详情/);
  assert.doesNotMatch(context.rawText, /整页其它内容/);
});
