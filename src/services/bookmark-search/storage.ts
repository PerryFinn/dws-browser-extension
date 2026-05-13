import type { BookmarkSearchModelConfig } from "./types";

export const BOOKMARK_SEARCH_MODEL_CONFIG_KEY = "bookmarkSearchModelConfig";
export const BOOKMARK_SEARCH_HISTORY_KEY = "bookmarkSearchHistory";

export const bookmarkSearchModelConfigDefault: BookmarkSearchModelConfig = {
  apiType: "openai-compatible",
  baseUrl: "",
  modelId: "",
  apiKey: ""
};

export const BOOKMARK_SEARCH_HISTORY_MAX = 5;
