import type { PlasmoMessaging } from "@plasmohq/messaging";
import { fetchWithTimeout, parseRemoteVersionInfo } from "@/background/version-check";
import type { VersionCheckCache } from "@/components/update-notice-types";
import { storage } from "@/storages";

/**
 * 版本检查消息处理器
 *
 * 集中管理版本检查逻辑：
 * - 单例模式避免多个 UI 实例并发请求
 * - 统一缓存与重试策略
 * - 失败时使用短 TTL（5 分钟）而非默认 6 小时
 */

export type CheckVersionReqBody = {
  localVersion: string;
  checkUrl: string;
  ttlMinutes: number;
  force?: boolean;
};

export type CheckVersionResBody = {
  isSuccess: boolean;
  error?: string;
  cached?: boolean;
};

const CACHE_KEY = "versionCheckCache";
// 失败后 5 分钟内不重复请求，避免频繁重试
const ERROR_RETRY_TTL_MS = 5 * 60 * 1000;

const isCacheValid = (cache: VersionCheckCache | null | undefined, ctx: CheckVersionReqBody, now: number) => {
  if (!cache?.checkedAt) return false;
  if (cache.localVersion !== ctx.localVersion) return false;
  if (cache.checkUrl !== ctx.checkUrl) return false;
  if (cache.ttlMinutes !== ctx.ttlMinutes) return false;
  // 失败时使用短 TTL，成功时使用配置 TTL
  const ttl = cache.error ? ERROR_RETRY_TTL_MS : ctx.ttlMinutes * 60 * 1000;
  return now - cache.checkedAt < ttl;
};

const writeCache = (ctx: CheckVersionReqBody, now: number, patch: Partial<VersionCheckCache>) => {
  // 统一缓存写入，确保配置字段完整
  const next: VersionCheckCache = {
    checkedAt: now,
    localVersion: ctx.localVersion,
    checkUrl: ctx.checkUrl,
    ttlMinutes: ctx.ttlMinutes,
    ...patch
  };
  return storage.set(CACHE_KEY, next);
};

// 单例 Promise，防止多个 UI 实例并发请求
let pendingCheck: Promise<CheckVersionResBody> | null = null;

const doCheck = async (req: CheckVersionReqBody): Promise<CheckVersionResBody> => {
  const now = Date.now();
  const cache = (await storage.get(CACHE_KEY)) as VersionCheckCache | null | undefined;

  if (!req.force && isCacheValid(cache, req, now)) {
    return { isSuccess: true, cached: true };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(req.checkUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeCache(req, now, { error: message });
    return { isSuccess: false, error: message };
  }

  if (!response.ok) {
    const message = `HTTP ${response.status} ${response.statusText}`;
    await writeCache(req, now, { error: message });
    return { isSuccess: false, error: message };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "响应不是合法 JSON";
    await writeCache(req, now, { error: message });
    return { isSuccess: false, error: message };
  }

  const info = parseRemoteVersionInfo(data);
  if (!info) {
    const message = "版本信息格式不正确";
    await writeCache(req, now, { error: message });
    return { isSuccess: false, error: message };
  }

  await writeCache(req, now, {
    remoteVersion: info.version,
    downloadUrl: info.downloadUrl,
    message: info.message
  });
  return { isSuccess: true };
};

const handler: PlasmoMessaging.MessageHandler<CheckVersionReqBody, CheckVersionResBody> = async (req, res) => {
  const body = req.body;
  if (!body?.localVersion || !body?.checkUrl) {
    res.send({ isSuccess: false, error: "缺少必要参数" });
    return;
  }

  // 复用进行中的检查，避免并发请求
  if (pendingCheck) {
    res.send(await pendingCheck);
    return;
  }

  // 启动新的检查并记录 Promise
  pendingCheck = doCheck(body).finally(() => {
    pendingCheck = null;
  });
  res.send(await pendingCheck);
};

export default handler;
