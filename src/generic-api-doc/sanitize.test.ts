import { strict as assert } from "node:assert";
import test from "node:test";
import { parseHTML } from "linkedom";

import { sanitizePickedElement, sanitizeSelectionText } from "./sanitize";

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

test("sanitizeSelectionText 为选区模式生成无 DOM 摘要的最小 capture", () => {
  const result = sanitizeSelectionText({
    text: "  请求方法：GET\n请求路径：/api/user/detail  ",
    url: "https://example.com/users",
    title: "Users"
  });

  assert.equal(result.source.mode, "generic-selection");
  assert.equal(result.capture.visibleText, "请求方法：GET\n请求路径：/api/user/detail");
  assert.equal(result.capture.domSummary, null);
});
