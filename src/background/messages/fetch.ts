import type { ExtensionMessaging } from "@/lib/extension-messaging";

type respType = "json" | "text" | "blob" | "arrayBuffer";

export type fetchReqBody = { url: string | URL | Request; respType: respType } & RequestInit;
export type fetchResBody = { isSuccess: boolean; data: unknown; error?: string };

const handler: ExtensionMessaging.MessageHandler<fetchReqBody, fetchResBody> = async (req, res) => {
  const { url, respType = "json", ...resetConfig } = req.body ?? {};
  try {
    if (!url) {
      throw new Error("url is required");
    }
    const response = await fetch(url, resetConfig);
    // fetch 不会把 HTTP 错误状态码（4xx/5xx）当作异常，需要主动校验 response.ok
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
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
