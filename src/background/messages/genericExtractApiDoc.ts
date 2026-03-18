import type { PlasmoMessaging } from "@plasmohq/messaging";
import { extractGenericApiDoc } from "@/background/generic-api-doc/provider";
import type { GenericCaptureContext, GenericExtractionResult, GenericModelConfig } from "@/generic-api-doc/types";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export type GenericExtractApiDocReqBody = { config: GenericModelConfig; context: GenericCaptureContext };
export type GenericExtractApiDocResBody =
  | { success: true; data: GenericExtractionResult }
  | { success: false; message: string };

const handler: PlasmoMessaging.MessageHandler<GenericExtractApiDocReqBody, GenericExtractApiDocResBody> = async (
  req,
  res
) => {
  const config = req.body?.config;
  const context = req.body?.context;

  if (!config) {
    res.send({ success: false, message: "缺少模型配置" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整，请先填写 API 类型、Base URL、Model ID 和 API Key" });
    return;
  }

  if (!context) {
    res.send({ success: false, message: "缺少采集上下文" });
    return;
  }

  try {
    const data = await extractGenericApiDoc(config, context);
    res.send({ success: true, data });
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export default handler;
