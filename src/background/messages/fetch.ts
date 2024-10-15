import type { PlasmoMessaging } from "@plasmohq/messaging";

type respType = "json" | "text" | "blob" | "arrayBuffer";

export type fetchReqBody = { url: string | URL | Request; respType: respType } & RequestInit;
export type fetchResBody = { isSuccess: boolean; data: any; error?: string };

const handler: PlasmoMessaging.MessageHandler<fetchReqBody, fetchResBody> = async (req, res) => {
  try {
    const { url, respType = "json", ...resetConfig } = req.body;
    const response = await fetch(url, resetConfig);
    let data = null;
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
  } catch (error) {
    console.error("fetch error :>> ", error);
    res.send({ isSuccess: false, error: error.message, data: null });
  }
};

export default handler;
