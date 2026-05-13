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

export type BookmarkSearchModelConfig = GenericModelConfig;
