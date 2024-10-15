import type { PlasmoMessaging } from "@plasmohq/messaging";

export type PingReqBody = { url: string };
export type PingResBody = boolean;

const httpsRegex = /^https?:\/\//i;

// 如果 URL 不包含协议，默认添加 http://
const preprocessUrl = (url: string) => {
  let result = url.trim();
  if (!httpsRegex.test(url)) {
    result = `http://${url}`;
  }
  return result;
};

export const ping = async (url: string, timeout = 1000): Promise<boolean> => {
  // 创建一个 AbortController 实例
  const controller = new AbortController();
  const { signal } = controller;

  // 设置一个超时的 Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort(); // 超时后中止请求
      reject(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    // fetch 请求使用 signal 来支持 abort 功能
    const fetchPromise = fetch(preprocessUrl(url), { signal });
    // 使用 Promise.race 来在超时和 fetch 请求之间取决谁先完成
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    await res.text(); // 假设你需要处理响应的文本
    return true;
  } catch (error) {
    console.error(`ping 【${url}】 error :>> `, error);
    return false;
  }
};

const handler: PlasmoMessaging.MessageHandler<PingReqBody, PingResBody> = async (request, response) => {
  console.log("ping 收到消息：", request);
  const url = request.body.url;

  const success = await ping(url);
  response.send(success);
};

export default handler;
