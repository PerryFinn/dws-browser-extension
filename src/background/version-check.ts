import { validate } from "compare-versions";

export const VERSION_CHECK_REQUEST_TIMEOUT_MS = 10 * 1000;

export type RemoteVersionInfo = {
  version: string;
  downloadUrl?: string;
  message?: string;
};

export type FetchWithTimeoutOptions = {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const normalizeVersion = (value: string) => value.trim().replace(/^v/i, "");

export const parseRemoteVersionInfo = (data: unknown): RemoteVersionInfo | null => {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.version !== "string" || record.version.trim().length === 0) return null;

  const version = normalizeVersion(record.version);
  if (!SEMVER_PATTERN.test(version) || !validate(version)) return null;

  return {
    version,
    downloadUrl: typeof record.downloadUrl === "string" ? record.downloadUrl : undefined,
    message: typeof record.message === "string" ? record.message : undefined
  };
};

export const fetchWithTimeout = async (
  url: string,
  { timeoutMs = VERSION_CHECK_REQUEST_TIMEOUT_MS, fetchImpl = fetch }: FetchWithTimeoutOptions = {}
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetchImpl(url, {
      method: "GET",
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`版本检查请求超时（${Math.round(timeoutMs / 1000)} 秒）`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
