import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { BookmarkSearchReqBody, BookmarkSearchResBody } from "@/background/messages/bookmarkSearch";
import { Button } from "@/components/catalyst-ui-kit/button";
import { Field, Label } from "@/components/catalyst-ui-kit/fieldset";
import { Input } from "@/components/catalyst-ui-kit/input";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { BookmarkSearchSettings } from "@/options/components/bookmark-search-settings";
import {
  BOOKMARK_SEARCH_HISTORY_KEY,
  BOOKMARK_SEARCH_HISTORY_MAX,
  BOOKMARK_SEARCH_MODEL_CONFIG_KEY,
  bookmarkSearchModelConfigDefault
} from "@/services/bookmark-search/storage";
import { storage } from "@/storages";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarkSearchPage
});

interface SearchResultItem {
  index: number;
  reason: string;
  title: string;
  url: string;
  path: string;
}

function BookmarkSearchPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Set<number>>(new Set());
  const searchIdRef = useRef(0);

  const [modelConfig] = useStorage<GenericModelConfig>(
    { key: BOOKMARK_SEARCH_MODEL_CONFIG_KEY, instance: storage },
    bookmarkSearchModelConfigDefault
  );

  const [searchHistory, , searchHistorySetter] = useStorage<string[]>(
    { key: BOOKMARK_SEARCH_HISTORY_KEY, instance: storage },
    []
  );

  const isConfigComplete = isGenericModelConfigComplete(modelConfig);

  const addToHistory = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...(searchHistory || []).filter((h) => h !== trimmed)].slice(
        0,
        BOOKMARK_SEARCH_HISTORY_MAX
      );
      searchHistorySetter.setStoreValue(updated);
    },
    [searchHistory, searchHistorySetter]
  );

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) return;

      if (!isConfigComplete) {
        toast.error("请先配置模型");
        return;
      }

      const currentSearchId = ++searchIdRef.current;

      setIsSearching(true);
      setHasSearched(true);
      setResults([]);
      setExpandedReasons(new Set());

      try {
        const response = await sendToBackground<BookmarkSearchReqBody, BookmarkSearchResBody>({
          name: "bookmarkSearch" as never,
          body: { config: modelConfig, query: q }
        });

        if (currentSearchId !== searchIdRef.current) return;

        if (!response.success) {
          toast.error(response.message);
          return;
        }

        setResults(response.matches as SearchResultItem[]);
        setTruncated(response.truncated);
        addToHistory(q);
      } catch (error) {
        if (currentSearchId !== searchIdRef.current) return;
        toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        setIsSearching(false);
      }
    },
    [query, isConfigComplete, modelConfig, addToHistory]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSearch();
    }
  };

  const toggleReason = (index: number) => {
    setExpandedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleHistoryClick = (q: string) => {
    setQuery(q);
    void handleSearch(q);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">智能书签搜索</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          用自然语言描述你要找的书签，AI 帮你从浏览器书签中找到最相关的结果。
        </p>
      </div>

      <Field>
        <Label htmlFor="bookmark-search-input">搜索</Label>
        <div className="flex gap-2">
          <Input
            id="bookmark-search-input"
            placeholder="描述你要找的书签..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
          />
          <Button onClick={() => void handleSearch()} disabled={isSearching || !query.trim() || !isConfigComplete}>
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>
      </Field>

      {searchHistory && searchHistory.length > 0 && !isSearching && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 leading-6">最近搜索：</span>
          {searchHistory.map((h) => (
            <button
              key={h}
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
              onClick={() => handleHistoryClick(h)}
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="flex items-center gap-2 py-8 justify-center text-zinc-500 dark:text-zinc-400">
          <Loader2 className="size-5 animate-spin" />
          <span>正在理解你的意图...</span>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="py-8 text-center text-zinc-400 dark:text-zinc-500">
          <p>未找到相关书签</p>
          <p className="mt-1 text-sm">试试换个描述方式？</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          {truncated && <p className="text-xs text-amber-600 dark:text-amber-400">书签数量较多，结果可能不完整。</p>}
          {results.map((r, i) => (
            <div
              key={`${r.url}-${r.index}`}
              className="rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.title || r.url}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                  <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">{r.url}</p>
                  {r.path && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">📁 {r.path}</p>}
                </div>
                <Button
                  outline
                  className="shrink-0 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(r.url);
                    toast.success("链接已复制");
                  }}
                >
                  复制
                </Button>
              </div>
              {r.reason && (
                <button
                  type="button"
                  className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  onClick={() => toggleReason(i)}
                >
                  {expandedReasons.has(i) ? `💡 ${r.reason}` : "💡 查看匹配理由"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-200 pt-6 dark:border-white/10">
        <BookmarkSearchSettings defaultExpanded={!isConfigComplete} />
      </div>
    </div>
  );
}
