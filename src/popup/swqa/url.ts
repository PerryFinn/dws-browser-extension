import { INTERFACE_PATH_REGEX, SWQA_HOST } from "./const";

export type ParsedSwqaUrl =
  | {
      ok: true;
      interfaceId: string;
      url: string;
      hostname: string;
    }
  | {
      ok: false;
      url?: string;
      hostname?: string;
      reason: string;
    };

/**
 * 校验当前 tab 是否为 SWQA 接口详情页，并解析出 interfaceId。
 * 仅在 swqa.gz.cvte.cn 的 /interface/:id 下才允许执行提取。
 */
export const parseSwqaInterfaceUrl = (rawUrl: string | null | undefined): ParsedSwqaUrl => {
  if (!rawUrl) {
    return { ok: false, reason: "Missing tab url" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL format" };
  }

  const { hostname, href } = url;
  if (hostname !== SWQA_HOST) {
    return { ok: false, url: href, hostname, reason: "Not swqa.gz.cvte.cn" };
  }

  // 注意：SWQA 使用 hash 路由，interfaceId 可能出现在 hash 段，故直接在完整 href 里匹配。
  const match = href.match(INTERFACE_PATH_REGEX);
  if (!match || !match[1]) {
    return { ok: false, url: href, hostname, reason: "Not an interface detail page" };
  }

  return {
    ok: true,
    interfaceId: match[1],
    url: href,
    hostname
  };
};
