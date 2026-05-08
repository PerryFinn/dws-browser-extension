import { strict as assert } from "node:assert";
import test from "node:test";
import * as React from "react";
import { renderToString } from "react-dom/server";

const { createElement } = React;

test("SettingsSection 的说明文案可以独立渲染，不触发 Headless UI Description 上下文错误", async () => {
  Object.assign(globalThis, { React });
  const { SettingsSection } = await import("@/options/components/settings-section");
  let html = "";

  assert.doesNotThrow(() => {
    html = renderToString(
      createElement(SettingsSection, {
        title: "页面功能",
        description: "控制扩展注入页面后的基础交互入口。",
        children: createElement("div", null, "设置项")
      })
    );
  });

  assert.match(html, /页面功能/);
  assert.match(html, /控制扩展注入页面后的基础交互入口。/);
  assert.match(html, /设置项/);
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

  assert.match(html, /border-zinc-200\/80/);
  assert.match(html, /pl-5/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /bg-blue-500\/70/);
});
