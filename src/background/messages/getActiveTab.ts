import type { PlasmoMessaging } from "@plasmohq/messaging";

export type ActiveTabIdReqBody = undefined;
export type ActiveTabIdResBody = chrome.tabs.Tab;

export const getActiveTab = () => {
  chrome.tabs.getCurrent();
  return new Promise<chrome.tabs.Tab>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
};

const handler: PlasmoMessaging.MessageHandler<ActiveTabIdReqBody, ActiveTabIdResBody> = async (request, response) => {
  console.log("getActiveTab 收到消息：", request);
  response.send(await getActiveTab());
};

export default handler;
