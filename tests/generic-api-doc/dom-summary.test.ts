import { parseHTML } from "linkedom";
import { expect, test } from "vitest";
import { buildGenericDomSummary } from "@/generic-api-doc/dom-summary";

test("buildGenericDomSummary 输出标题路径、章节命中和结构概况", () => {
  const { document } = parseHTML(`
    <section>
      <h1>用户服务</h1>
      <h2>获取用户详情</h2>
      <h3>请求参数</h3>
      <table>
        <thead><tr><th>参数</th><th>类型</th></tr></thead>
        <tbody><tr><td>id</td><td>string</td></tr></tbody>
      </table>
      <h3>返回参数</h3>
      <ul><li>code</li><li>data</li></ul>
      <h3>示例</h3>
      <pre><code>{ "id": "1" }</code></pre>
    </section>
  `);
  const summary = buildGenericDomSummary(document.querySelector("section") as HTMLElement);
  expect(summary ?? "").toMatch(/headingPath: 用户服务 > 获取用户详情 > 请求参数 > 返回参数 > 示例/);
  expect(summary ?? "").toMatch(/sections: request, response, example/);
  expect(summary ?? "").toMatch(/tables: 1 \(参数, 类型\)/);
  expect(summary ?? "").toMatch(/lists: 1/);
  expect(summary ?? "").toMatch(/codeExamples: 1/);
});
test("buildGenericDomSummary 在只有代码示例时仍保留代码概况", () => {
  const { document } = parseHTML(`
    <section>
      <pre><code>curl https://example.com/api/user/detail</code></pre>
    </section>
  `);
  const summary = buildGenericDomSummary(document.querySelector("section") as HTMLElement);
  expect(summary).toBe("codeExamples: 1");
});
