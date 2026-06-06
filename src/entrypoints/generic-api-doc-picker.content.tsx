import { createRoot } from "react-dom/client";
import GenericApiDocPicker from "@/contents/generic-api-doc-picker";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    const rootId = "breeze-generic-api-doc-picker";

    if (document.getElementById(rootId)) {
      return;
    }

    const rootElement = document.createElement("div");
    rootElement.id = rootId;
    rootElement.hidden = true;
    document.documentElement.append(rootElement);

    createRoot(rootElement).render(<GenericApiDocPicker />);
  }
});
