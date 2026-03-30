import { strict as assert } from "node:assert";
import test from "node:test";
import { parseHTML } from "linkedom";

import { buildGenericDomSummary } from "./dom-summary";

test("buildGenericDomSummary 保留标题、表格与代码块信息", () => {
  const { document } = parseHTML(`
    <section>
      <h2>获取用户详情</h2>
      <table>
        <thead><tr><th>参数</th><th>类型</th></tr></thead>
        <tbody><tr><td>id</td><td>string</td></tr></tbody>
      </table>
      <pre><code>{ "id": "1" }</code></pre>
    </section>
  `);
  const summary = buildGenericDomSummary(document.querySelector("section") as HTMLElement);
  assert.match(summary ?? "", /headings: 获取用户详情/);
  assert.match(summary ?? "", /tables: 参数, 类型/);
  assert.match(summary ?? "", /codeBlocks: 1/);
});
