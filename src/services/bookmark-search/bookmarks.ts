import type { FlatBookmark } from "./types";

export function flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[], parentPath = ""): FlatBookmark[] {
  const result: FlatBookmark[] = [];
  let index = 0;

  function walk(nodes: chrome.bookmarks.BookmarkTreeNode[], currentPath: string) {
    for (const node of nodes) {
      if (node.url) {
        result.push({
          index: index++,
          title: node.title || "",
          url: node.url,
          path: currentPath
        });
      }
      if (node.children) {
        const nextPath = currentPath ? `${currentPath}/${node.title}` : node.title;
        walk(node.children, nextPath);
      }
    }
  }

  walk(nodes, parentPath);
  return result;
}

export function preFilterBookmarks(
  bookmarks: FlatBookmark[],
  query: string,
  maxCount = 500
): { filtered: FlatBookmark[]; totalCount: number } {
  const totalCount = bookmarks.length;

  if (totalCount <= maxCount) {
    return { filtered: bookmarks, totalCount };
  }

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 0);

  if (keywords.length === 0) {
    return { filtered: bookmarks.slice(0, maxCount), totalCount };
  }

  const scored = bookmarks.map((b) => {
    const text = `${b.title} ${b.url} ${b.path}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    return { bookmark: b, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const filtered = scored.slice(0, maxCount).map((s) => ({
    ...s.bookmark,
    index: 0
  }));

  filtered.forEach((b, i) => {
    b.index = i;
  });

  return { filtered, totalCount };
}

export async function getAllBookmarks(): Promise<FlatBookmark[]> {
  const tree = await chrome.bookmarks.getTree();
  return flattenBookmarks(tree);
}
