import { strict as assert } from "node:assert";
import test from "node:test";
import { openGenericApiSettingsTab } from "@/popup/generic/open-options";

test("openGenericApiSettingsTab 通过基本配置路由打开设置页", async () => {
  const runtimePaths: string[] = [];
  const createdTabs: Array<{ url?: string }> = [];

  await openGenericApiSettingsTab({
    runtimeGetURL: (path) => {
      runtimePaths.push(path);
      return `chrome-extension://test/${path}`;
    },
    createTab: async ({ url }) => {
      createdTabs.push({ url });
      return undefined;
    }
  });

  assert.deepEqual(runtimePaths, ["options.html#/settings/base"]);
  assert.deepEqual(createdTabs, [{ url: "chrome-extension://test/options.html#/settings/base" }]);
});
