import type { BookmarkSearchMatch, FlatBookmark } from "./types";

export function buildBookmarkSearchPrompt(bookmarks: FlatBookmark[], query: string): string {
  const bookmarkLines = bookmarks
    .map((b) => `${b.index + 1}. ${b.title} | ${b.url} | 目录: ${b.path || "(根目录)"}`)
    .join("\n");

  return [
    "你是一个书签搜索助手。用户有以下书签列表，请根据用户查询找出最相关的书签。",
    "",
    "## 书签列表",
    bookmarkLines,
    "",
    "## 用户查询",
    query,
    "",
    "## 要求",
    "- 返回最多 10 条最相关的结果",
    "- 按相关度从高到低排序",
    '- 以 JSON 数组格式返回: [{"index": 1, "reason": "匹配理由"}]',
    "- index 对应书签列表中的序号",
    "- 如果没有相关结果，返回空数组 []"
  ].join("\n");
}

export function parseBookmarkSearchResponse(raw: string): BookmarkSearchMatch[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (item): item is { index: number; reason: string } =>
        typeof item === "object" &&
        item !== null &&
        "index" in item &&
        typeof (item as Record<string, unknown>).index === "number"
    )
    .map((item) => ({
      index: item.index,
      reason: typeof item.reason === "string" ? item.reason : ""
    }));
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3);
}
