import { extractGenericApiDoc } from "@/background/generic-api-doc/provider";
import { doesGenericCaptureSessionMatchAttempt, type GenericCaptureSession } from "@/generic-api-doc/session";
import type { GenericCaptureSessionCommand } from "@/generic-api-doc/session-command";
import type {
  GenericExtractFromSessionInput,
  GenericExtractionResult,
  GenericModelConfig
} from "@/generic-api-doc/types";
import type { ExtensionMessaging } from "@/lib/extension-messaging";
import { storage } from "@/storages";
import { GENERIC_CAPTURE_SESSION_STORAGE_KEY, isGenericModelConfigComplete } from "@/storages/generic-api-doc";
import { updateGenericCaptureSession } from "@/storages/generic-capture-session";

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
  onSessionUpdate: (command: GenericCaptureSessionCommand) => void | Promise<void>;
  extract: (input: GenericExtractFromSessionInput) => Promise<GenericExtractionResult>;
}

const MISSING_CAPTURE_MESSAGE = "缺少可用的采集结果";

export const executeGenericExtractApiDoc = async ({
  session,
  onSessionUpdate,
  extract
}: ExecuteGenericExtractApiDocOptions): Promise<GenericExtractApiDocResBody> => {
  if (!session.source || !session.capture) {
    return { success: false, message: MISSING_CAPTURE_MESSAGE };
  }

  const target = { sessionId: session.sessionId, attemptId: session.attemptId };
  await onSessionUpdate({ type: "extracting", target });

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
    await onSessionUpdate({ type: "done", target, result: data });
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await onSessionUpdate({ type: "error", target, message });
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
      async onSessionUpdate(command) {
        await updateGenericCaptureSession(command);
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
