import GitlabInline from "@/contents/gitlab-inline";
import styleText from "@/style.css?inline";
import { mountReactShadowUi } from "@/wxt/content-shadow-ui";

export default defineContentScript({
  matches: ["https://gitlab.gz.cvte.cn/*"],
  runAt: "document_end",
  main() {
    void mountReactShadowUi({
      name: "gitlab-inline",
      anchor: () => document.getElementById("pinned"),
      cssText: styleText,
      render: () => <GitlabInline />
    });
  }
});
