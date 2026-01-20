import type { PlasmoMessaging } from "@plasmohq/messaging";

type respType = "json" | "text" | "blob" | "arrayBuffer";

export type fetchReqBody = { url: string | URL | Request; respType: respType } & RequestInit;
export type fetchResBody = { isSuccess: boolean; data: unknown; error?: string };

const handler: PlasmoMessaging.MessageHandler<fetchReqBody, fetchResBody> = async (req, res) => {
  const { url, respType = "json", ...resetConfig } = req.body ?? {};
  try {
    if (!url) {
      throw new Error("url is required");
    }
    const response = await fetch(url, resetConfig);
    let data: unknown = null;
    switch (respType) {
      case "json":
        data = await response.json();
        break;
      case "text":
        data = await response.text();
        break;
      case "blob":
        data = await response.blob();
        break;
      case "arrayBuffer":
        data = await response.arrayBuffer();
        break;
      default:
        data = await response.json();
        break;
    }
    res.send({ isSuccess: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`fetch [url: ${url}] error :>> `, message);
    res.send({ isSuccess: false, error: message, data: null });
  }
};

export default handler;
