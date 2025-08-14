import type { PlasmoMessaging } from "@plasmohq/messaging";

import { LoginManager, type TaskResult, type UserPasswordPair } from "@/utils/hikCrypto";

export type ValidateHikReqBody = { accounts: Array<UserPasswordPair> };
export type ValidateHikResBody = { success: boolean; processInfo: TaskResult; error?: string };

const handler: PlasmoMessaging.MessageHandler<ValidateHikReqBody, ValidateHikResBody> = async (request, response) => {
  try {
    const accounts = request.body?.accounts;
    if (!accounts || !Array.isArray(accounts)) {
      throw new Error("accounts is required");
    }
    console.log("================= 扩展已启用，执行自动验证账号操作 =================\n", accounts);

    const l = new LoginManager(accounts);
    const resp = await l.processLogins();
    console.log("================= 扩展已启用，执行自动验证账号操作 ================= \n", resp);
    response.send({ success: true, processInfo: resp });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("validateHikAccounts error :>> ", message);
    response.send({ success: false, error: message, processInfo: { success: [], failed: [], error: [] } });
  }
};

export default handler;
