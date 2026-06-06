import { extractGenericApiDoc } from "@/background/generic-api-doc/provider";
import {
  doesGenericCaptureSessionMatchAttempt,
  type GenericCaptureSession,
  markGenericCaptureSessionDone,
  markGenericCaptureSessionError,
  markGenericCaptureSessionExtracting
} from "@/generic-api-doc/session";
import type {
  GenericExtractFromSessionInput,
  GenericExtractionResult,
  GenericModelConfig
} from "@/generic-api-doc/types";
import type { ExtensionMessaging } from "@/lib/extension-messaging";
import { storage } from "@/storages";
import { GENERIC_CAPTURE_SESSION_STORAGE_KEY, isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export interface GenericExtractApiDocReqBody {
  sessionId: string;
  attemptId: string;
  config: GenericModelConfig;
}
export type GenericExtractApiDocResBody =
  | { success: true; data: GenericExtractionResult }
  | { success: false; message: string };

interface ExecuteGenericExtractApiDocOptions {
  session: GenericCaptureSession;
  config: GenericModelConfig;
  onSessionUpdate: (next: GenericCaptureSession) => void | Promise<void>;
  extract: (input: GenericExtractFromSessionInput) => Promise<GenericExtractionResult>;
}

const MISSING_CAPTURE_MESSAGE = "缺少可用的采集结果";

export const executeGenericExtractApiDoc = async ({
  session,
  config,
  onSessionUpdate,
  extract
}: ExecuteGenericExtractApiDocOptions): Promise<GenericExtractApiDocResBody> => {
  void config;

  if (!session.source || !session.capture) {
    return { success: false, message: MISSING_CAPTURE_MESSAGE };
  }

  const extractingSession = markGenericCaptureSessionExtracting(session);
  // 状态回写统一经过调用方，保证 storage/session 与纯执行逻辑解耦。
  await onSessionUpdate(extractingSession);

  const input: GenericExtractFromSessionInput = {
    source: {
      url: session.source.url,
      title: session.source.title,
      mode: session.source.mode
    },
    capture: session.capture
  };

  try {
    const data = await extract(input);
    const doneSession = markGenericCaptureSessionDone(extractingSession, data);
    // 成功结果写回时保留原 capture，供后续重试或展示复用。
    await onSessionUpdate(doneSession);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorSession = markGenericCaptureSessionError(extractingSession, message);
    // 失败状态只写 error/result，不清空 capture。
    await onSessionUpdate(errorSession);
    return { success: false, message };
  }
};

const handler: ExtensionMessaging.MessageHandler<GenericExtractApiDocReqBody, GenericExtractApiDocResBody> = async (
  req,
  res
) => {
  const config = req.body?.config;
  const requestedSessionId = req.body?.sessionId;
  const requestedAttemptId = req.body?.attemptId;

  if (!config) {
    res.send({ success: false, message: "缺少模型配置" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整，请先填写 API 类型、Base URL、Model ID 和 API Key" });
    return;
  }

  if (!requestedSessionId) {
    res.send({ success: false, message: "缺少采集会话 ID" });
    return;
  }

  if (!requestedAttemptId) {
    res.send({ success: false, message: "缺少采集尝试 ID" });
    return;
  }

  const session = (await storage.get(GENERIC_CAPTURE_SESSION_STORAGE_KEY)) as GenericCaptureSession | undefined;

  if (
    !session ||
    !doesGenericCaptureSessionMatchAttempt(session, { sessionId: requestedSessionId, attemptId: requestedAttemptId })
  ) {
    res.send({ success: false, message: MISSING_CAPTURE_MESSAGE });
    return;
  }

  try {
    const result = await executeGenericExtractApiDoc({
      session,
      config,
      async onSessionUpdate(next) {
        await storage.set(GENERIC_CAPTURE_SESSION_STORAGE_KEY, next);
      },
      extract(input) {
        return extractGenericApiDoc(config, input);
      }
    });

    res.send(result);
  } catch (error) {
    res.send({ success: false, message: error instanceof Error ? error.message : String(error) });
  }
};

export default handler;
