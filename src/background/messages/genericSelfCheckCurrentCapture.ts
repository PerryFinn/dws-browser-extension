import type { PlasmoMessaging } from "@plasmohq/messaging";
import { extractGenericApiDoc } from "@/background/generic-api-doc/provider";
import { doesGenericCaptureSessionMatchAttempt, type GenericCaptureSession } from "@/generic-api-doc/session";
import type {
  GenericExtractFromSessionInput,
  GenericExtractionResult,
  GenericModelConfig
} from "@/generic-api-doc/types";
import { storage } from "@/storages";
import { GENERIC_CAPTURE_SESSION_STORAGE_KEY, isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export type GenericSelfCheckCurrentCaptureReqBody = {
  sessionId: string;
  attemptId: string;
  config: GenericModelConfig;
};

export type GenericSelfCheckCurrentCaptureResBody =
  | { success: true; message: string }
  | { success: false; message: string };

interface ExecuteGenericCurrentCaptureSelfCheckOptions {
  session: GenericCaptureSession;
  selfCheck: (input: GenericExtractFromSessionInput) => Promise<GenericExtractionResult>;
}

const MISSING_CAPTURE_MESSAGE = "当前没有可用的采集样例，请先在 popup 完成一次采集";

export const executeGenericCurrentCaptureSelfCheck = async ({
  session,
  selfCheck
}: ExecuteGenericCurrentCaptureSelfCheckOptions): Promise<GenericSelfCheckCurrentCaptureResBody> => {
  if (!session.source || !session.capture) {
    return {
      success: false,
      message: MISSING_CAPTURE_MESSAGE
    };
  }

  const result = await selfCheck({
    source: {
      url: session.source.url,
      title: session.source.title,
      mode: session.source.mode
    },
    capture: session.capture
  });

  return {
    success: true,
    message: `样例自检通过：${result.endpoint.method} ${result.endpoint.path}（${result.uncertainties.length} 个不确定项）`
  };
};

const handler: PlasmoMessaging.MessageHandler<
  GenericSelfCheckCurrentCaptureReqBody,
  GenericSelfCheckCurrentCaptureResBody
> = async (req, res) => {
  const config = req.body?.config;
  const sessionId = req.body?.sessionId;
  const attemptId = req.body?.attemptId;

  if (!config) {
    res.send({ success: false, message: "缺少模型配置" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整，请先填写 API 类型、Base URL、Model ID 和 API Key" });
    return;
  }

  if (!sessionId || !attemptId) {
    res.send({ success: false, message: MISSING_CAPTURE_MESSAGE });
    return;
  }

  const session = (await storage.get(GENERIC_CAPTURE_SESSION_STORAGE_KEY)) as GenericCaptureSession | undefined;

  if (!session || !doesGenericCaptureSessionMatchAttempt(session, { sessionId, attemptId })) {
    res.send({ success: false, message: MISSING_CAPTURE_MESSAGE });
    return;
  }

  try {
    const result = await executeGenericCurrentCaptureSelfCheck({
      session,
      selfCheck(input) {
        return extractGenericApiDoc(config, input);
      }
    });
    res.send(result);
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export default handler;
