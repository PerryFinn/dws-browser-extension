import type { GenericCaptureSession } from "@/generic-api-doc/session";
import type { GenericCaptureSessionCommand } from "@/generic-api-doc/session-command";
import type { ExtensionMessaging } from "@/lib/extension-messaging";
import { updateGenericCaptureSession } from "@/storages/generic-capture-session";

const handler: ExtensionMessaging.MessageHandler<GenericCaptureSessionCommand, GenericCaptureSession> = async (
  req,
  res
) => {
  if (!req.body) throw new Error("缺少采集会话操作");
  res.send(await updateGenericCaptureSession(req.body));
};

export default handler;
