import { strict as assert } from "node:assert";
import test from "node:test";

import { openBaseSettingsTab, SETTINGS_BASE_OPTIONS_PATH } from "@/popup/open-options";

test("openBaseSettingsTab 通过基本配置路由打开设置页", async () => {
  const runtimePaths: string[] = [];
  const createdTabs: Array<{ url?: string }> = [];

  await openBaseSettingsTab({
    runtimeGetURL: (path) => {
      runtimePaths.push(path);
      return `chrome-extension://test/${path}`;
    },
    createTab: async ({ url }) => {
      createdTabs.push({ url });
      return undefined;
    }
  });

  assert.equal(SETTINGS_BASE_OPTIONS_PATH, "options.html#/settings/base");
  assert.deepEqual(runtimePaths, [SETTINGS_BASE_OPTIONS_PATH]);
  assert.deepEqual(createdTabs, [{ url: `chrome-extension://test/${SETTINGS_BASE_OPTIONS_PATH}` }]);
});
