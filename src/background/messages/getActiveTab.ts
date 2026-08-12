import type { ExtensionMessaging } from "@/lib/extension-messaging";

export type ActiveTabIdReqBody = undefined;
export type ActiveTabIdResBody = chrome.tabs.Tab;

export const getActiveTab = () => {
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) {
        reject(new Error("未找到当前活动标签页"));
        return;
      }
      resolve(activeTab);
    });
  });
};

const handler: ExtensionMessaging.MessageHandler<ActiveTabIdReqBody, ActiveTabIdResBody> = async (
  request,
  response
) => {
  console.log("getActiveTab 收到消息：", request);
  response.send(await getActiveTab());
};

export default handler;
