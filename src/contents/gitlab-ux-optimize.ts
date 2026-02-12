/**
 * GitLab 用户体验优化
 */

import type { PlasmoCSConfig } from "plasmo";

export const config = {
  matches: ["https://gitlab.gz.cvte.cn/*"],
  run_at: "document_end",
  world: "MAIN"
} satisfies PlasmoCSConfig;

// 搜索框禁用自动填充
const searchInputNodeList = document.querySelectorAll("input[type='search']");
if (searchInputNodeList.length) {
  searchInputNodeList.forEach((searchInput) => {
    searchInput.setAttribute("autocomplete", "off");
  });
}
