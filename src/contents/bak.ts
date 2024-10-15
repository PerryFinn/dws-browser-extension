import { groupBy, merge, mergeWith } from "lodash-es";
import type { PlasmoCSConfig } from "plasmo";

import { sendToBackground } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";

import type { OpenOrReplaceTabReqBody, OpenOrReplaceTabResBody } from "@/background/messages/openOrReplaceTab";
import { LoginManager, type UserPasswordPair } from "@/utils/hikCrypto";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_end"
};

const storage = new Storage();

const initStorage = async () => {
  console.log("storage.getAll() :>> ", await storage.getAll());
  if (!(await storage.get("verifiedIpList"))) {
    await storage.set("verifiedIpList", []);
  }
  if (!(await storage.get("processInfo"))) {
    await storage.set("processInfo", []);
  }

  if (!(await storage.get("isRunningTask"))) {
    await storage.set("isRunningTask", false);
  }

  if (!(await storage.get("taskResult"))) {
    await storage.set("taskResult", { success: [], failed: [], error: [] });
  }
};

const resetStorage = async () => {
  // await storage.set("enabled", false);
  storage.clear();
  await Promise.all([
    storage.set("verifiedIpList", []),
    storage.set("processInfo", []),
    storage.set("isRunningTask", false),
    storage.set("taskResult", { success: [], failed: [], error: [] })
  ]);
};

const accounts: Array<UserPasswordPair> = [
  { username: "admin", host: "172.20.124.200", passwords: ["1qaz@WSX"] },
  { username: "user1", host: "172.20.124.200", passwords: ["password1", "pwd4"] },
  {
    username: "admin",
    host: "192.168.42.162",
    passwords: ["password2", "Kindlink"]
  },
  {
    username: "admin",
    host: "172.20.124.123",
    passwords: ["password3", "Kindlink"]
  },
  {
    username: "admin",
    host: "192.168.41.132",
    passwords: ["password3", "Kindlink"]
  }
];

const cloneAccounts = structuredClone(accounts);

// 使用 chrome.runtime.onMessage 来监听消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.name === "toggleEnabled") {
    const { enabled } = message.body;
    await storage.set("enabled", enabled);
    // const tab = await sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({ name: "getActiveTab" });
    // console.log("tab :>> ", tab);
    // const activeHost = new URL(tab.url).host;
    // const groupList = groupBy(cloneAccounts, (item) => item.ip);
    // console.log("groupList :>> ", groupList);

    if (enabled) {
      await resetStorage();
      // await runTask();
    } else {
      console.log("扩展已禁用，不执行任何操作");
    }
  }
});

const verifyAccounts = async (userPasswordPairList: UserPasswordPair[]) => {
  const l = new LoginManager(userPasswordPairList);
  const processInfo = await l.processLogins();
  return processInfo;
};

const runTask = async () => {
  console.log("================= 扩展已启用，执行自动验证账号操作 ================= :>>");
  const groupList = groupBy(cloneAccounts, (item) => item.host);
  const verifiedIpList = await storage.get<Array<string>>("verifiedIpList");
  await storage.set("isRunningTask", true);
  for (const [host, accounts] of Object.entries(groupList)) {
    console.log("verifiedIpList,host :>> ", verifiedIpList, host);
    if (verifiedIpList.some((item) => item === host)) continue;
    const activeTab = await sendToBackground({ name: "getActiveTab" });
    const activeTabHost = new URL((await activeTab).url).host;
    console.log("host,activeTabHost :>> ", host, activeTabHost);
    if (host !== activeTabHost) {
      await sendToBackground<OpenOrReplaceTabReqBody, OpenOrReplaceTabResBody>({
        name: "openOrReplaceTab",
        body: { host }
      });
    }
    const originProcessInfo = structuredClone(await storage.get("processInfo"));
    const processInfo = await verifyAccounts(accounts);
    await storage.set("verifiedIpList", [...verifiedIpList, host]);
    await storage.set(
      "processInfo",
      mergeWith(originProcessInfo, processInfo, (objValue, srcValue) => {
        if (Array.isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      })
    );
  }
  const finalResult = await storage.get("processInfo");
  const finalStorage = await storage.getAll();
  console.log("================= 任务执行完毕 ================= :>> \n", finalResult, finalStorage);
  resetStorage();
};

const main = async () => {
  const value = await storage.get("enabled");
  if (!value) return;
  console.warn("=============== content script called ===============");
  // await resetStorage();
  await initStorage();
  // if (await storage.get("isRunningTask")) {
  //   runTask();
  // }
};

main();
