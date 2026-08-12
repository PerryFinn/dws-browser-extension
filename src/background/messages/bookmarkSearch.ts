import { createGenericModel } from "@/background/generic-api-doc/provider";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import type { ExtensionMessaging } from "@/lib/extension-messaging";
import { getAllBookmarks, preFilterBookmarks } from "@/services/bookmark-search/bookmarks";
import {
  buildBookmarkSearchPrompt,
  estimateTokenCount,
  parseBookmarkSearchResponse
} from "@/services/bookmark-search/prompt";
import type { BookmarkSearchMatch } from "@/services/bookmark-search/types";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export type BookmarkSearchReqBody = {
  config: GenericModelConfig;
  query: string;
};

export type BookmarkSearchResBody =
  | { success: true; matches: BookmarkSearchMatch[]; truncated: boolean }
  | { success: false; message: string };

const MAX_PROMPT_TOKENS = 30000;

const handler: ExtensionMessaging.MessageHandler<BookmarkSearchReqBody, BookmarkSearchResBody> = async (req, res) => {
  const { config, query } = req.body ?? {};

  if (!config || !query) {
    res.send({ success: false, message: "缺少模型配置或查询内容" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整" });
    return;
  }

  try {
    const allBookmarks = await getAllBookmarks();

    if (allBookmarks.length === 0) {
      res.send({ success: false, message: "未找到浏览器书签" });
      return;
    }

    const { filtered, totalCount } = preFilterBookmarks(allBookmarks, query);

    let candidates = filtered;
    let truncated = totalCount > filtered.length;

    let finalPrompt = buildBookmarkSearchPrompt(candidates, query);
    const estimatedTokens = estimateTokenCount(finalPrompt);

    if (estimatedTokens > MAX_PROMPT_TOKENS) {
      const ratio = MAX_PROMPT_TOKENS / estimatedTokens;
      const targetCount = Math.floor(candidates.length * ratio);
      candidates = candidates.slice(0, Math.max(targetCount, 10));
      candidates.forEach((b, i) => {
        b.index = i;
      });
      truncated = true;
      finalPrompt = buildBookmarkSearchPrompt(candidates, query);
    }

    const model = createGenericModel(config);
    const { generateText } = await import("ai");
    const result = await generateText({
      model: model as Parameters<typeof generateText>[0]["model"],
      prompt: finalPrompt
    });

    const matches = parseBookmarkSearchResponse(result.text);

    const resolvedMatches = matches.flatMap((m) => {
      if (m.index < 1 || m.index > candidates.length) {
        return [];
      }

      const bookmark = candidates[m.index - 1];
      if (!bookmark) {
        return [];
      }

      return [
        {
          index: m.index,
          reason: m.reason,
          title: bookmark.title,
          url: bookmark.url,
          path: bookmark.path
        }
      ];
    });

    res.send({ success: true, matches: resolvedMatches, truncated });
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export default handler;
