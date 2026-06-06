import { compareVersions, validate } from "compare-versions";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CheckVersionReqBody, CheckVersionResBody } from "@/background/messages/checkVersion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendToBackground } from "@/lib/extension-messaging";
import { useStorage } from "@/lib/extension-storage-hook";
import { localStorageInitialValue, storage } from "@/storages";
import { homepage as pkgHomepage, version as pkgVersion } from "../../package.json";
import type { VersionCheckCache } from "./update-notice-types";
import { resolveUpdateUrl } from "./update-notice-utils";

/**
 * 版本更新提示组件
 *
 * 职责：读取缓存、判断是否需要更新、渲染提示 UI。
 * 实际的版本检查逻辑已下沉到 background（checkVersion.ts），
 * 避免多个组件实例并发请求，并统一管理缓存与重试策略。
 */

const DEFAULT_VERSION_CHECK_URL = localStorageInitialValue.versionCheckUrl.defaultValue;
const DEFAULT_CHECK_TTL_MINUTES = localStorageInitialValue.versionCheckTtlMinutes.defaultValue;

const normalizeVersion = (value: string) => value.trim().replace(/^v/i, "");

export function UpdateNotice() {
  const localVersion = useMemo(() => normalizeVersion(pkgVersion || ""), []);
  const [cache] = useStorage<VersionCheckCache | null>({ key: "versionCheckCache", instance: storage }, null);
  const [configCheckUrl] = useStorage<string>({ key: "versionCheckUrl", instance: storage }, DEFAULT_VERSION_CHECK_URL);
  const [configTtlMinutes] = useStorage<number>(
    { key: "versionCheckTtlMinutes", instance: storage },
    DEFAULT_CHECK_TTL_MINUTES
  );
  const [loading, setLoading] = useState(false);
  // 用 ref 做同步防重，避免 state 异步更新导致连续触发
  const loadingRef = useRef(false);

  const checkUrl = useMemo(() => {
    const trimmed = (configCheckUrl || "").trim();
    return trimmed.length > 0 ? trimmed : DEFAULT_VERSION_CHECK_URL;
  }, [configCheckUrl]);

  const ttlMinutes = useMemo(() => {
    const parsed = Number(configTtlMinutes);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CHECK_TTL_MINUTES;
    return Math.floor(parsed);
  }, [configTtlMinutes]);

  // 缓存必须同时匹配版本与配置，配置变更则视为失效
  const cacheMatchesSettings =
    cache?.localVersion === localVersion && cache?.checkUrl === checkUrl && cache?.ttlMinutes === ttlMinutes;
  const remoteVersion = cacheMatchesSettings ? cache?.remoteVersion : undefined;
  const normalizedRemoteVersion = remoteVersion ? normalizeVersion(remoteVersion) : null;
  const hasUpdate = Boolean(
    normalizedRemoteVersion &&
      validate(normalizedRemoteVersion) &&
      validate(localVersion) &&
      compareVersions(normalizedRemoteVersion, localVersion) > 0
  );
  const displayRemoteVersion = remoteVersion ?? "";

  const updateUrl = useMemo(() => {
    return resolveUpdateUrl({
      cacheMatchesSettings,
      downloadUrl: cache?.downloadUrl,
      homepage: typeof pkgHomepage === "string" ? pkgHomepage : undefined
    });
  }, [cache?.downloadUrl, cacheMatchesSettings]);

  const requestCheck = async (force: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    // 将版本检查逻辑委托给 background，实现单例模式避免并发请求
    try {
      await sendToBackground<CheckVersionReqBody, CheckVersionResBody>({
        name: "checkVersion",
        body: {
          localVersion,
          checkUrl,
          ttlMinutes,
          force
        }
      });
    } catch (error) {
      console.error("版本检查消息调用失败:", error instanceof Error ? error.message : String(error));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  // 用 ref 持有最新的 requestCheck，避免 useEffect 依赖过多导致无限循环
  const checkVersionRef = useRef(requestCheck);
  checkVersionRef.current = requestCheck;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 需要在配置变化时重新触发检查
  useEffect(() => {
    void checkVersionRef.current(false);
  }, [checkUrl, ttlMinutes, localVersion]);

  const handleOpenUpdate = () => {
    if (!updateUrl) return;
    chrome.tabs.create({ url: updateUrl });
  };

  if (!hasUpdate) return null;

  return (
    <Alert className="flex items-center justify-between gap-3">
      <div className="space-y-1">
        <AlertTitle>发现新版本 {displayRemoteVersion}</AlertTitle>
        <AlertDescription>
          <div>当前版本：{pkgVersion}</div>
          {cache?.remoteVersion && <div>最新版本：{cache.remoteVersion}</div>}
          {cache?.message && <div className="mt-1">{cache.message}</div>}
        </AlertDescription>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {updateUrl && (
          <Button size="sm" onClick={handleOpenUpdate}>
            去更新
          </Button>
        )}
        <Button variant="outline" size="sm" loading={loading} onClick={() => void checkVersionRef.current(true)}>
          重新检查
        </Button>
      </div>
    </Alert>
  );
}
