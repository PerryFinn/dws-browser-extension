import { type OpenOptionsTabParams, openBaseSettingsTab, SETTINGS_BASE_OPTIONS_PATH } from "@/popup/open-options";

export const GENERIC_API_SETTINGS_OPTIONS_PATH = SETTINGS_BASE_OPTIONS_PATH;

export const openGenericApiSettingsTab = (params: OpenOptionsTabParams) => {
  return openBaseSettingsTab(params);
};
