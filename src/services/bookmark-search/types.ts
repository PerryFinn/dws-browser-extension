import type { GenericModelConfig } from "@/generic-api-doc/types";

export interface FlatBookmark {
  index: number;
  title: string;
  url: string;
  path: string;
}

export interface BookmarkSearchMatch {
  index: number;
  reason: string;
}

export interface BookmarkSearchResult {
  ok: true;
  matches: BookmarkSearchMatch[];
  truncated: boolean;
}

export interface BookmarkSearchFailure {
  ok: false;
  message: string;
  code: "invalid-config" | "no-bookmarks" | "network-error" | "parse-error" | "unknown-error";
}

export type BookmarkSearchResponse = BookmarkSearchResult | BookmarkSearchFailure;

export type BookmarkSearchModelConfig = GenericModelConfig;
