import type { PlasmoMessaging } from "@plasmohq/messaging";

export type downloadReqBody = chrome.downloads.DownloadOptions;
export type downloadResBody = { success: boolean; error?: string };

const handler: PlasmoMessaging.MessageHandler<downloadReqBody, downloadResBody> = async (req, res) => {
  try {
    const downloadOpt = req.body;
    if (!downloadOpt) {
      throw new Error("downloadOpt is required");
    }
    await chrome.downloads.download(downloadOpt);
    res.send({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("download error :>> ", message);
    res.send({ success: false, error: message });
  }
};

export default handler;
