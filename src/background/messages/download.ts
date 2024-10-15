import type { PlasmoMessaging } from "@plasmohq/messaging";

export type downloadReqBody = chrome.downloads.DownloadOptions;
export type downloadResBody = { success: boolean; error?: string };

const handler: PlasmoMessaging.MessageHandler<downloadReqBody, downloadResBody> = async (req, res) => {
  try {
    const downloadOpt = req.body;
    await chrome.downloads.download(downloadOpt);
    res.send({ success: true });
  } catch (error) {
    console.error("download error :>> ", error);
    res.send({ success: false, error: error.message });
  }
};

export default handler;
