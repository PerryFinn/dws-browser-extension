import type { PlasmoMessaging } from "@plasmohq/messaging";

import { LoginManager, type AccountInfo, type TaskResult, type UserPasswordPair } from "@/utils/hikCrypto";

export type ValidateHikReqBody = { accounts: Array<UserPasswordPair> };
export type ValidateHikResBody = { success: boolean; processInfo: TaskResult; error?: any };

const accounts = [
  { username: "admin", ip: "172.20.124.200", passwords: ["1qaz@WSX"] },
  { username: "user1", ip: "172.20.124.200", passwords: ["password1", "pwd4"] },
  { username: "admin", ip: "192.168.42.162", passwords: ["password2", "Kindlink"] },
  {
    username: "admin",
    ip: "172.20.124.123",
    passwords: ["password3", "Kindlink"]
  },
  {
    username: "admin",
    ip: "192.168.41.132",
    passwords: ["password3", "Kindlink"]
  }
];

const cloneAccounts = structuredClone(accounts);

const handler: PlasmoMessaging.MessageHandler<ValidateHikReqBody, ValidateHikResBody> = async (request, response) => {
  try {
    const accounts = request.body.accounts;
    console.log("================= 扩展已启用，执行自动验证账号操作 =================\n", accounts);

    const l = new LoginManager(accounts);
    const resp = await l.processLogins();
    console.log("================= 扩展已启用，执行自动验证账号操作 ================= \n", resp);
    response.send({ success: true, processInfo: resp });
  } catch (error) {
    console.error("validateHikAccounts error :>> ", error);
    response.send({ success: false, error, processInfo: { success: [], failed: [], error: [] } });
  }
};

export default handler;
