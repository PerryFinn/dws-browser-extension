import type { PlasmoMessaging } from "@plasmohq/messaging";

import { buildInterfaceDetailApiUrl } from "@/popup/swqa/const";
import type { RawSwqaDetailResponse } from "@/popup/swqa/clean";

export type SwqaGetInterfaceDetailReqBody = {
  tabId: number;
  interfaceId: string;
};

export type SwqaGetInterfaceDetailResBody =
  | { success: true; data: RawSwqaDetailResponse }
  | { success: false; message: string; status?: number };

type InjectedResult =
  | { ok: true; status: number; data: RawSwqaDetailResponse }
  | { ok: false; status: number; error: string | null };

/**
 * 在页面 MAIN world 发起同源请求，确保带上站点的 cookie / token。
 */
const handler: PlasmoMessaging.MessageHandler<SwqaGetInterfaceDetailReqBody, SwqaGetInterfaceDetailResBody> =
  async (req, res) => {
    const tabId = req.body?.tabId;
    const interfaceId = req.body?.interfaceId;

    if (!tabId || !interfaceId) {
      res.send({ success: false, message: "tabId and interfaceId are required" });
      return;
    }

    const apiUrl = buildInterfaceDetailApiUrl();

    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        args: [apiUrl, interfaceId],
        func: async (url, id): Promise<InjectedResult> => {
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json;charset=UTF-8"
              },
              body: JSON.stringify({ interfaceId: id })
            });
            const data = (await response.json()) as RawSwqaDetailResponse;
            if (!response.ok) {
              return { ok: false, status: response.status, error: "HTTP error" };
            }
            return { ok: true, status: response.status, data };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, status: 0, error: message };
          }
        }
      });

      if (!result) {
        res.send({ success: false, message: "ExecuteScript returned empty result" });
        return;
      }

      if (!result.ok) {
        res.send({ success: false, status: result.status, message: result.error ?? "Fetch failed" });
        return;
      }

      res.send({ success: true, data: result.data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.send({ success: false, message });
    }
  };

export default handler;
