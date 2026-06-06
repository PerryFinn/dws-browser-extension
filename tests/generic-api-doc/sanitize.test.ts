import { parseHTML } from "linkedom";
import { expect, test } from "vitest";
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
  expect(result.capture.visibleText).toMatch(/请求路径：\/api\/user\/detail/);
  expect(result.capture.visibleText).not.toMatch(/复制代码/);
  expect(result.capture.visibleText).not.toMatch(/隐藏调试信息/);
  expect(result.capture.domSummary ?? "").not.toMatch(/data-secret/);
  expect(element.getAttribute("data-secret")).toBe("abc");
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
  expect(result.source.url).toBe("https://example.com/docs/user/detail");
  expect(result.source.title).toBe("用户详情接口");
  expect(result.source.mode).toBe("generic-dom");
  expect(result.capture.previewText).toMatch(/获取用户详情/);
  expect(result.capture.visibleText).toMatch(/请求路径：\/api\/user\/detail/);
  expect(result.capture.domSummary ?? "").toMatch(/headingPath: 获取用户详情 > 请求参数/);
  expect(result.capture.domSummary ?? "").not.toMatch(/<section>/);
  expect(result.capture.charCount).toBe(result.capture.visibleText.length);
  expect(result.capture.truncated).toBe(false);
  expect(result.capture.qualityHints).toEqual([]);
});
test("sanitizeSelectionText 为选区模式生成无 DOM 摘要的最小 capture", () => {
  const result = sanitizeSelectionText({
    text: "  请求方法：GET\n请求路径：/api/user/detail  ",
    url: "https://example.com/users",
    title: "Users"
  });
  expect(result.source.mode).toBe("generic-selection");
  expect(result.capture.visibleText).toBe("请求方法：GET\n请求路径：/api/user/detail");
  expect(result.capture.domSummary).toBe(null);
  expect(result.capture.qualityHints).toEqual(["missing-dom-summary"]);
});
test("sanitizeSelectionText 会压平超长预览文本", () => {
  const result = sanitizeSelectionText({
    text: "字段说明 ".repeat(100),
    url: "https://example.com/users",
    title: "Users"
  });
  expect(result.source.mode).toBe("generic-selection");
  expect(result.capture.previewText.length).toBeLessThanOrEqual(240);
  expect(result.capture.truncated).toBe(false);
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
  expect(result.capture.truncated).toBe(true);
  expect(result.capture.charCount).toBeLessThan(5000);
  expect(result.capture.visibleText).toMatch(/请求方法：GET/);
  expect(result.capture.visibleText).toMatch(/请求路径：\/api\/user\/detail/);
  expect(result.capture.visibleText).toMatch(/返回参数/);
  expect(result.capture.qualityHints.join(",")).toMatch(/truncated-visible-text/);
});
test("sanitizePickedElement 在空文本时抛出明确错误", () => {
  const { document } = parseHTML(`<section><button>复制代码</button></section>`);
  expect(() =>
    sanitizePickedElement({
      element: document.querySelector("section") as HTMLElement,
      url: "https://example.com/users",
      title: "Users"
    })
  ).toThrow(/未从目标区域读取到有效文本/);
});
test("sanitizeSelectionText 在空文本时抛出明确错误", () => {
  expect(() =>
    sanitizeSelectionText({
      text: "   ",
      url: "https://example.com/users",
      title: "Users"
    })
  ).toThrow(/当前页面没有可用的选中文本/);
});
