import * as React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

const { createElement } = React;
test("SettingsSection 的说明文案可以独立渲染，不触发 Headless UI Description 上下文错误", async () => {
  Object.assign(globalThis, { React });
  const { SettingsSection } = await import("@/options/components/settings-section");
  let html = "";
  expect(() => {
    html = renderToString(
      createElement(SettingsSection, {
        title: "页面功能",
        description: "控制扩展注入页面后的基础交互入口。",
        children: createElement("div", null, "设置项")
      })
    );
  }).not.toThrow();
  expect(html).toMatch(/页面功能/);
  expect(html).toMatch(/控制扩展注入页面后的基础交互入口。/);
  expect(html).toMatch(/设置项/);
});
test("SettingsSection 使用更明显的分隔线和左侧强调条区分设置分组", async () => {
  Object.assign(globalThis, { React });
  const { SettingsSection } = await import("@/options/components/settings-section");
  const html = renderToString(
    createElement(SettingsSection, {
      title: "版本检查",
      description: "配置版本信息接口和缓存时长。",
      children: createElement("div", null, "设置项")
    })
  );
  expect(html).toMatch(/border-zinc-200\/80/);
  expect(html).toMatch(/pl-5/);
  expect(html).toMatch(/aria-hidden="true"/);
  expect(html).toMatch(/bg-blue-500\/70/);
});
