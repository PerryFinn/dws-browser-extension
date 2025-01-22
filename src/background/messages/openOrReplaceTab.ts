import type { PlasmoMessaging } from "@plasmohq/messaging";

import { getActiveTab } from "./getActiveTab";

export type OpenOrReplaceTabReqBody = { host: string };
export type OpenOrReplaceTabResBody = chrome.tabs.Tab;

export const waitWebNavigationCompleted = (tabId: number) => {
  return new Promise<void>((resolve) => {
    chrome.webNavigation.onCompleted.addListener(function listener(details) {
      if (details.tabId === tabId) {
        chrome.webNavigation.onCompleted.removeListener(listener);
        resolve();
      }
    });
  });
};

export const openOrReplaceTab = async (host: string) => {
  // 判断当前的 tab 是否是传入的 url，如果是则刷新，否则打开新的 tab
  const activeTab = await getActiveTab();
  if (!activeTab.url || !activeTab.id) {
    throw new Error("activeTab.url or activeTab.id is required");
  }
  const activeHost = new URL(activeTab.url).host;
  const targetHost = host;
  if (targetHost === activeHost) {
    await chrome.tabs.update(activeTab.id, { active: true });
  } else {
    await Promise.all([
      waitWebNavigationCompleted(activeTab.id),
      chrome.tabs.update({ url: `http://${targetHost}`, active: true })
    ]);
  }
  return activeTab;
};

const handler: PlasmoMessaging.MessageHandler<OpenOrReplaceTabReqBody, OpenOrReplaceTabResBody> = async (
  request,
  response
) => {
  try {
    console.log("openOrReplaceTab 收到消息：", request);
    const host = request.body?.host;
    if (!host) {
      throw new Error("host is required");
    }
    const tab = await openOrReplaceTab(host);
    response.send(tab);
  } catch (error) {
    console.error("openOrReplaceTab error :>> ", error);
    throw error;
  }
};

export default handler;
