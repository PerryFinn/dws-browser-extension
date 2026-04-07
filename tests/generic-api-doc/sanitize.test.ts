import { strict as assert } from "node:assert";
import test from "node:test";
import { parseHTML } from "linkedom";

import { sanitizePickedElement, sanitizeSelectionText } from "@/generic-api-doc/sanitize";

test("sanitizePickedElement 过滤按钮文案、隐藏文本和 data 属性噪声", () => {
  const { document } = parseHTML(`
    <section data-secret="abc">
      <h2>获取用户详情</h2>
      <button>复制代码</button>
      <div hidden>隐藏调试信息</div>
      <p>请求路径：/api/user/detail</p>
    </section>
  `);
  const element = document.querySelector("section") as HTMLElement;
  const result = sanitizePickedElement({
    element,
    url: "https://example.com/users",
    title: "Users"
  });

  assert.match(result.capture.visibleText, /请求路径：\/api\/user\/detail/);
  assert.doesNotMatch(result.capture.visibleText, /复制代码/);
  assert.doesNotMatch(result.capture.visibleText, /隐藏调试信息/);
  assert.doesNotMatch(result.capture.domSummary ?? "", /data-secret/);
  assert.equal(element.getAttribute("data-secret"), "abc");
});

test("sanitizePickedElement 生成最小 source、preview 与结构摘要，不暴露原始 HTML", () => {
  const { document } = parseHTML(`
    <section>
      <h2>获取用户详情</h2>
      <h3>请求参数</h3>
      <p>请求方法：GET</p>
      <p>请求路径：/api/user/detail</p>
    </section>
  `);
  const result = sanitizePickedElement({
    element: document.querySelector("section") as HTMLElement,
    url: "https://example.com/docs/user/detail",
    title: "用户详情接口"
  });

  assert.equal(result.source.url, "https://example.com/docs/user/detail");
  assert.equal(result.source.title, "用户详情接口");
  assert.equal(result.source.mode, "generic-dom");
  assert.match(result.capture.previewText, /获取用户详情/);
  assert.match(result.capture.visibleText, /请求路径：\/api\/user\/detail/);
  assert.match(result.capture.domSummary ?? "", /headingPath: 获取用户详情 > 请求参数/);
  assert.doesNotMatch(result.capture.domSummary ?? "", /<section>/);
  assert.equal(result.capture.charCount, result.capture.visibleText.length);
  assert.equal(result.capture.truncated, false);
  assert.deepEqual(result.capture.qualityHints, []);
});

test("sanitizeSelectionText 为选区模式生成无 DOM 摘要的最小 capture", () => {
  const result = sanitizeSelectionText({
    text: "  请求方法：GET\n请求路径：/api/user/detail  ",
    url: "https://example.com/users",
    title: "Users"
  });

  assert.equal(result.source.mode, "generic-selection");
  assert.equal(result.capture.visibleText, "请求方法：GET\n请求路径：/api/user/detail");
  assert.equal(result.capture.domSummary, null);
  assert.deepEqual(result.capture.qualityHints, ["missing-dom-summary"]);
});

test("sanitizeSelectionText 会压平超长预览文本", () => {
  const result = sanitizeSelectionText({
    text: "字段说明 ".repeat(100),
    url: "https://example.com/users",
    title: "Users"
  });

  assert.equal(result.source.mode, "generic-selection");
  assert.ok(result.capture.previewText.length <= 240);
  assert.equal(result.capture.truncated, false);
});

test("sanitizePickedElement 对超长文档应用 capture budget 并保留关键段落", () => {
  const filler = Array.from({ length: 90 }, (_, index) => `<p>背景说明 ${index} ${"补充信息 ".repeat(18)}</p>`).join(
    ""
  );
  const { document } = parseHTML(`
    <section>
      <h1>用户服务</h1>
      <h2>获取用户详情</h2>
      <p>请求方法：GET</p>
      <p>请求路径：/api/user/detail</p>
      <h3>返回参数</h3>
      ${filler}
      <pre><code>{ "code": 0, "data": { "id": "1" } }</code></pre>
    </section>
  `);

  const result = sanitizePickedElement({
    element: document.querySelector("section") as HTMLElement,
    url: "https://example.com/docs/user/detail",
    title: "用户详情接口"
  });

  assert.equal(result.capture.truncated, true);
  assert.ok(result.capture.charCount < 5000);
  assert.match(result.capture.visibleText, /请求方法：GET/);
  assert.match(result.capture.visibleText, /请求路径：\/api\/user\/detail/);
  assert.match(result.capture.visibleText, /返回参数/);
  assert.match(result.capture.qualityHints.join(","), /truncated-visible-text/);
});

test("sanitizePickedElement 在空文本时抛出明确错误", () => {
  const { document } = parseHTML(`<section><button>复制代码</button></section>`);

  assert.throws(
    () =>
      sanitizePickedElement({
        element: document.querySelector("section") as HTMLElement,
        url: "https://example.com/users",
        title: "Users"
      }),
    /未从目标区域读取到有效文本/
  );
});

test("sanitizeSelectionText 在空文本时抛出明确错误", () => {
  assert.throws(
    () =>
      sanitizeSelectionText({
        text: "   ",
        url: "https://example.com/users",
        title: "Users"
      }),
    /当前页面没有可用的选中文本/
  );
});
