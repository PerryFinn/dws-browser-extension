import { expect, test } from "vitest";
import { openBaseSettingsTab, SETTINGS_BASE_OPTIONS_PATH } from "@/popup/open-options";

test("openBaseSettingsTab 通过基本配置路由打开设置页", async () => {
  const runtimePaths: string[] = [];
  const createdTabs: Array<{
    url?: string;
  }> = [];
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
  expect(SETTINGS_BASE_OPTIONS_PATH).toBe("options.html#/settings/base");
  expect(runtimePaths).toEqual([SETTINGS_BASE_OPTIONS_PATH]);
  expect(createdTabs).toEqual([{ url: `chrome-extension://test/${SETTINGS_BASE_OPTIONS_PATH}` }]);
});
