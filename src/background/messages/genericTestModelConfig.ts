import type { PlasmoMessaging } from "@plasmohq/messaging";
import { testGenericModelConfig } from "@/background/generic-api-doc/provider";
import type { GenericModelConfig } from "@/generic-api-doc/types";
import { isGenericModelConfigComplete } from "@/storages/generic-api-doc";

export type GenericTestModelConfigReqBody = { config: GenericModelConfig };
export type GenericTestModelConfigResBody = { success: true } | { success: false; message: string };

const handler: PlasmoMessaging.MessageHandler<
  GenericTestModelConfigReqBody,
  GenericTestModelConfigResBody
> = async (req, res) => {
  const config = req.body?.config;

  if (!config) {
    res.send({ success: false, message: "缺少模型配置" });
    return;
  }

  if (!isGenericModelConfigComplete(config)) {
    res.send({ success: false, message: "模型配置不完整，请先填写 API 类型、Base URL、Model ID 和 API Key" });
    return;
  }

  try {
    const result = await testGenericModelConfig(config);

    if (!result.ok) {
      res.send({ success: false, message: result.message });
      return;
    }

    res.send({ success: true });
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export default handler;
