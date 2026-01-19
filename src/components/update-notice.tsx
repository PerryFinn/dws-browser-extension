import { sendToBackground } from "@plasmohq/messaging";
import { useStorage } from "@plasmohq/storage/hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { fetchReqBody, fetchResBody } from "@/background/messages/fetch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { storage } from "@/storages";
import packageJSON from "../../package.json";

const VERSION_CHECK_URL = "http://127.0.0.1:3000/version"; // TODO: 改成你的版本检查 IP/URL
const CHECK_TTL_MS = 6 * 60 * 60 * 1000;

type RemoteVersionInfo = {
  version: string;
  downloadUrl?: string;
  message?: string;
};

type VersionCheckCache = {
  checkedAt: number;
  localVersion: string;
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
  const localVersion = useMemo(() => normalizeVersion(packageJSON.version || ""), []);
  const [cache, setCache] = useStorage<VersionCheckCache | null>(
    { key: "versionCheckCache", instance: storage },
    null
  );
  const [loading, setLoading] = useState(false);

  const cacheMatchesLocal = cache?.localVersion === localVersion;
  const remoteVersion = cacheMatchesLocal ? cache?.remoteVersion : undefined;
  const normalizedRemoteVersion = remoteVersion ? normalizeVersion(remoteVersion) : null;
  const hasUpdate = Boolean(normalizedRemoteVersion && normalizedRemoteVersion !== localVersion);

  const updateUrl = useMemo(() => {
    const homepage = typeof packageJSON.homepage === "string" ? packageJSON.homepage : undefined;
    if (!cacheMatchesLocal) return homepage;
    return cache?.downloadUrl || homepage;
  }, [cache?.downloadUrl, cacheMatchesLocal]);

  const checkVersion = useCallback(
    async (force = false) => {
      if (loading) return;
      const now = Date.now();
      const cacheValid =
        !force &&
        cache?.checkedAt &&
        cache?.localVersion === localVersion &&
        now - cache.checkedAt < CHECK_TTL_MS;

      if (cacheValid) return;

      setLoading(true);
      try {
        const resp = await sendToBackground<fetchReqBody, fetchResBody>({
          name: "fetch",
          body: {
            url: VERSION_CHECK_URL,
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
          remoteVersion: cache?.remoteVersion,
          downloadUrl: cache?.downloadUrl,
          message: cache?.message,
          error: message
        });
      } finally {
        setLoading(false);
      }
    },
    [cache, loading, localVersion, setCache]
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
    <Alert className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <AlertTitle>发现新版本 {remoteVersion}</AlertTitle>
        <AlertDescription>
          <div>当前版本：{packageJSON.version}</div>
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
