import DwsConfigInline from "@/contents/dws-config-inline";
import styleText from "@/style.css?inline";
import { mountReactShadowUi } from "@/wxt/content-shadow-ui";

export default defineContentScript({
  matches: ["http://test.demo.com/*"],
  runAt: "document_end",
  main() {
    void mountReactShadowUi({
      name: "dws-config-inline",
      anchor: () => document.body,
      cssText: styleText,
      render: () => <DwsConfigInline />
    });
  }
});
