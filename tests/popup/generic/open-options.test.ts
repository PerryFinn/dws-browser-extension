import { expect, test } from "vitest";
import { openGenericApiSettingsTab } from "@/popup/generic/open-options";

test("openGenericApiSettingsTab 通过基本配置路由打开设置页", async () => {
  const runtimePaths: string[] = [];
  const createdTabs: Array<{
    url?: string;
  }> = [];
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
  expect(runtimePaths).toEqual(["options.html#/settings/base"]);
  expect(createdTabs).toEqual([{ url: "chrome-extension://test/options.html#/settings/base" }]);
});
