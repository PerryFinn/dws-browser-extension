export const SETTINGS_BASE_OPTIONS_PATH = "options.html#/settings/base";

export interface OpenOptionsTabParams {
  runtimeGetURL: (path: string) => string;
  createTab: (createProperties: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab | undefined>;
}

export const openBaseSettingsTab = ({ runtimeGetURL, createTab }: OpenOptionsTabParams) => {
  const url = runtimeGetURL(SETTINGS_BASE_OPTIONS_PATH);

  return createTab({ url });
};
