import { disableGitlabSearchAutocomplete } from "@/contents/gitlab-ux-optimize";

export default defineContentScript({
  matches: ["https://gitlab.gz.cvte.cn/*"],
  runAt: "document_end",
  world: "MAIN",
  main() {
    disableGitlabSearchAutocomplete();
  }
});
