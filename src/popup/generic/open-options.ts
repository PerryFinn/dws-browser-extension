export const GENERIC_API_SETTINGS_OPTIONS_PATH = "options.html#/settings/base";

export const openGenericApiSettingsTab = ({
  runtimeGetURL,
  createTab
}: {
  runtimeGetURL: (path: string) => string;
  createTab: (createProperties: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab | undefined>;
}) => {
  const url = runtimeGetURL(GENERIC_API_SETTINGS_OPTIONS_PATH);

  return createTab({ url });
};
