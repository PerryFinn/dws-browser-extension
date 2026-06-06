/**
 * GitLab 用户体验优化
 */

export const disableGitlabSearchAutocomplete = () => {
  // 搜索框禁用自动填充
  const searchInputNodeList = document.querySelectorAll("input[type='search']");

  if (searchInputNodeList.length) {
    searchInputNodeList.forEach((searchInput) => {
      searchInput.setAttribute("autocomplete", "off");
    });
  }
};
