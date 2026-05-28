export type VersionCheckCache = {
  checkedAt: number;
  localVersion: string;
  checkUrl?: string;
  ttlMinutes?: number;
  remoteVersion?: string;
  downloadUrl?: string;
  message?: string;
  error?: string;
};
