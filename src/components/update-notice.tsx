import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { fetchReqBody, fetchResBody } from "@/background/messages/fetch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { localStorageInitialValue, storage } from "@/storages";
import { homepage as pkgHomepage, version as pkgVersion } from "../../package.json";
import { resolveUpdateUrl } from "./update-notice-utils";

const DEFAULT_VERSION_CHECK_URL = localStorageInitialValue.versionCheckUrl.defaultValue;
const DEFAULT_CHECK_TTL_MINUTES = localStorageInitialValue.versionCheckTtlMinutes.defaultValue;

type RemoteVersionInfo = {
  version: string;
  downloadUrl?: string;
  message?: string;
};

type VersionCheckCache = {
  checkedAt: number;
  localVersion: string;
  checkUrl?: string;
  ttlMinutes?: number;
  remoteVersion?: string;
  downloadUrl?: string;
  message?: string;
  error?: string;
};

const normalizeVersion = (value: string) => value.trim().replace(/^v/i, "");

const parseRemoteInfo = (data: unknown): RemoteVersionInfo | null => {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.version !== "string" || record.version.trim().length === 0) {
    return null;
  }
  return {
    version: record.version.trim(),
    downloadUrl: typeof record.downloadUrl === "string" ? record.downloadUrl : undefined,
    message: typeof record.message === "string" ? record.message : undefined
  };
};

export function UpdateNotice() {
  const localVersion = useMemo(() => normalizeVersion(pkgVersion || ""), []);
  const [cache, setCache] = useStorage<VersionCheckCache | null>({ key: "versionCheckCache", instance: storage }, null);
  const [configCheckUrl] = useStorage<string>({ key: "versionCheckUrl", instance: storage }, DEFAULT_VERSION_CHECK_URL);
  const [configTtlMinutes] = useStorage<number>(
    { key: "versionCheckTtlMinutes", instance: storage },
    DEFAULT_CHECK_TTL_MINUTES
  );
  const [loading, setLoading] = useState(false);

  // 配置为空时回退默认 URL，避免空请求
  const checkUrl = useMemo(() => {
    const trimmed = (configCheckUrl || "").trim();
    return trimmed.length > 0 ? trimmed : DEFAULT_VERSION_CHECK_URL;
  }, [configCheckUrl]);
  // TTL 只接受正整数分钟，非法值回退默认
  const ttlMinutes = useMemo(() => {
    const parsed = Number(configTtlMinutes);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CHECK_TTL_MINUTES;
    return Math.floor(parsed);
  }, [configTtlMinutes]);
  // 统一转为毫秒做缓存判断
  const ttlMs = useMemo(() => ttlMinutes * 60 * 1000, [ttlMinutes]);

  // 缓存必须同时匹配版本与配置，配置变更则视为失效
  const cacheMatchesSettings =
    cache?.localVersion === localVersion && cache?.checkUrl === checkUrl && cache?.ttlMinutes === ttlMinutes;
  const remoteVersion = cacheMatchesSettings ? cache?.remoteVersion : undefined;
  const normalizedRemoteVersion = remoteVersion ? normalizeVersion(remoteVersion) : null;
  const hasUpdate = Boolean(normalizedRemoteVersion && normalizedRemoteVersion !== localVersion);
  // const hasUpdate = true; // 测试用
  const displayRemoteVersion = remoteVersion ?? normalizedRemoteVersion ?? "";

  const updateUrl = useMemo(() => {
    return resolveUpdateUrl({
      cacheMatchesSettings,
      downloadUrl: cache?.downloadUrl,
      homepage: typeof pkgHomepage === "string" ? pkgHomepage : undefined
    });
  }, [cache?.downloadUrl, cacheMatchesSettings]);

  const checkVersion = useCallback(
    async (force = false) => {
      if (loading) return;
      const now = Date.now();
      const cacheValid = !force && cache?.checkedAt && cacheMatchesSettings && now - cache.checkedAt < ttlMs;

      if (cacheValid) return;

      setLoading(true);
      try {
        const resp = await sendToBackground<fetchReqBody, fetchResBody>({
          name: "fetch",
          body: {
            url: checkUrl,
            respType: "json",
            method: "GET"
          }
        });
        if (!resp?.isSuccess) {
          throw new Error(resp?.error || "请求版本信息失败");
        }
        const info = parseRemoteInfo(resp.data);
        if (!info) {
          throw new Error("版本信息格式不正确");
        }
        await setCache({
          checkedAt: now,
          localVersion,
          checkUrl,
          ttlMinutes,
          remoteVersion: info.version,
          downloadUrl: info.downloadUrl,
          message: info.message
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("版本检查失败:", message);
        await setCache({
          checkedAt: now,
          localVersion,
          checkUrl,
          ttlMinutes,
          remoteVersion: cache?.remoteVersion,
          downloadUrl: cache?.downloadUrl,
          message: cache?.message,
          error: message
        });
      } finally {
        setLoading(false);
      }
    },
    [cache, checkUrl, cacheMatchesSettings, loading, localVersion, setCache, ttlMinutes, ttlMs]
  );

  useEffect(() => {
    void checkVersion(false);
  }, [checkVersion]);

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
        <Button variant="outline" size="sm" loading={loading} onClick={() => void checkVersion(true)}>
          重新检查
        </Button>
      </div>
    </Alert>
  );
}
