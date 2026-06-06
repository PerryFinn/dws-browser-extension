import GitlabOverlay from "@/contents/gitlab-overlay";
import styleText from "@/style.css?inline";
import { mountReactShadowUi } from "@/wxt/content-shadow-ui";

export default defineContentScript({
  matches: ["https://gitlab.gz.cvte.cn/*"],
  runAt: "document_end",
  main() {
    void mountReactShadowUi({
      name: "gitlab-overlay",
      anchor: () => document.body,
      cssText: styleText,
      render: () => <GitlabOverlay />
    });
  }
});
