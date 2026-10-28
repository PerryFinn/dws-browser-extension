import dayjs from "dayjs";

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

const TIME_SELECTOR = "time[datetime]";

const getTimeTextNodes = (element: Element) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text;
    if (textNode.data.trim()) {
      textNodes.push(textNode);
    }
  }
  return textNodes;
};

export const observeGitlabAbsoluteTimes = () => {
  const originalTimes = new WeakMap<Text, { originalText: string; formattedText: string }>();
  const displayAbsoluteTime = (element: Element | null) => {
    const timestamp = element?.getAttribute("datetime");
    // GitLab 的日期分组也使用 time 元素，只转换包含时分的完整时间戳。
    if (!element || !timestamp || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp)) {
      return;
    }

    const date = dayjs(timestamp);
    if (!date.isValid()) {
      return;
    }

    const textNodes = getTimeTextNodes(element);
    const [textNode] = textNodes;
    if (!textNode || textNodes.length !== 1) {
      return;
    }

    const text = date.format("YYYY-MM-DD HH:mm:ss");
    if (textNode.data !== text) {
      const previous = originalTimes.get(textNode);
      originalTimes.set(textNode, {
        originalText: previous && textNode.data === previous.formattedText ? previous.originalText : textNode.data,
        formattedText: text
      });
      // Vue 持有原文本节点的引用；转换和恢复都必须就地修改。
      textNode.data = text;
    }
  };

  const updateTimeSubtree = (root: Element) => {
    if (root.matches(TIME_SELECTOR)) {
      displayAbsoluteTime(root);
    }
    root.querySelectorAll(TIME_SELECTOR).forEach(displayAbsoluteTime);
  };

  updateTimeSubtree(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      displayAbsoluteTime(target?.closest(TIME_SELECTOR) ?? null);

      // 翻页和筛选只扫描新增子树；文本被 GitLab 刷新时只更新对应的 time。
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          updateTimeSubtree(node);
        }
      }
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["datetime"]
  });

  return () => {
    observer.disconnect();
    document.querySelectorAll(TIME_SELECTOR).forEach((element) => {
      for (const textNode of getTimeTextNodes(element)) {
        const previous = originalTimes.get(textNode);
        if (previous && textNode.data === previous.formattedText) {
          textNode.data = previous.originalText;
        }
      }
    });
  };
};
