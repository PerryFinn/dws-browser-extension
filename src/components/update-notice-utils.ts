type ResolveUpdateUrlOptions = {
  cacheMatchesSettings: boolean;
  downloadUrl?: string;
  homepage?: string;
};

export const resolveUpdateUrl = ({ cacheMatchesSettings, downloadUrl, homepage }: ResolveUpdateUrlOptions) => {
  if (!cacheMatchesSettings) {
    return homepage;
  }

  return downloadUrl || homepage;
};
