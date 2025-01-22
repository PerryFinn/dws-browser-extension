import type { PlasmoMessaging } from "@plasmohq/messaging";

export type GetWindowConfigReqBody = {
  tabId: number;
};

export type GetWindowConfigResBody = {
  config: WindowConfig | null;
};

const handler: PlasmoMessaging.MessageHandler<GetWindowConfigReqBody, GetWindowConfigResBody> = async (req, res) => {
  const tabId = req.body?.tabId;
  if (!tabId) {
    throw new Error("tabId 不能为空");
  }
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => window.config
  });

  res.send({
    config: result || null
  });
};

export default handler;
