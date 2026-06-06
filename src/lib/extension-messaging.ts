export namespace ExtensionMessaging {
  export interface Request<ReqBody = unknown> {
    name?: string;
    body?: ReqBody;
    sender?: chrome.runtime.MessageSender;
  }

  export interface Response<ResBody = unknown> {
    send: (body: ResBody) => void;
  }

  export type MessageHandler<ReqBody = unknown, ResBody = unknown> = {
    bivarianceHack(req: Request<ReqBody>, res: Response<ResBody>): void | Promise<void>;
  }["bivarianceHack"];
}

type BackgroundMessageEnvelope = {
  __breezeBackgroundMessage: true;
  name: string;
  body?: unknown;
};

type BackgroundMessageResponse<ResBody = unknown> =
  | {
      __breezeBackgroundResponse: true;
      body: ResBody;
    }
  | {
      __breezeBackgroundResponse: true;
      error: string;
    };

const isBackgroundMessageEnvelope = (message: unknown): message is BackgroundMessageEnvelope => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const envelope = message as Partial<BackgroundMessageEnvelope>;
  return envelope.__breezeBackgroundMessage === true && typeof envelope.name === "string";
};

export const sendToBackground = <ReqBody = unknown, ResBody = unknown>(message: {
  name: string;
  body?: ReqBody;
}): Promise<ResBody> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        __breezeBackgroundMessage: true,
        name: message.name,
        body: message.body
      } satisfies BackgroundMessageEnvelope,
      (response?: BackgroundMessageResponse<ResBody>) => {
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        if (!response?.__breezeBackgroundResponse) {
          resolve(response as ResBody);
          return;
        }

        if ("error" in response) {
          reject(new Error(response.error));
          return;
        }

        resolve(response.body);
      }
    );
  });
};

export const registerBackgroundMessageHandlers = (handlers: Record<string, ExtensionMessaging.MessageHandler>) => {
  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundMessageResponse) => void
  ) => {
    if (!isBackgroundMessageEnvelope(message)) {
      return undefined;
    }

    const handler = handlers[message.name];

    if (!handler) {
      sendResponse({
        __breezeBackgroundResponse: true,
        error: `未知后台消息：${message.name}`
      });
      return undefined;
    }

    let hasSentResponse = false;

    const send = (body: unknown) => {
      if (hasSentResponse) {
        return;
      }

      hasSentResponse = true;
      sendResponse({
        __breezeBackgroundResponse: true,
        body
      });
    };

    void Promise.resolve(handler({ name: message.name, body: message.body, sender }, { send }))
      .then(() => {
        if (!hasSentResponse) {
          send(undefined);
        }
      })
      .catch((error: unknown) => {
        if (hasSentResponse) {
          return;
        }

        hasSentResponse = true;
        sendResponse({
          __breezeBackgroundResponse: true,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return true;
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
};
