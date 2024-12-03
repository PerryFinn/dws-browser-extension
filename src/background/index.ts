import { storage } from "@/storages";

chrome.runtime.onStartup.addListener(async () => {
  console.log("用户打开浏览器时，插件会被启动。插件可以在这个阶段初始化数据，设置默认状态等");
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("第一次安装!");
  } else if (details.reason === "update") {
    console.log(`更新版本 ${details.previousVersion} 到 ${chrome.runtime.getManifest().version}!`);
    const enabled = await storage.get<boolean | undefined>("enabled");
    chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    console.log("插件被启动后，就进入了运行阶段。在这个阶段，插件可以响应用户操作，监听和处理浏览器事件，提供各种功能");
  }
});

chrome.runtime.onSuspend.addListener(async () => {
  console.log("用户关闭浏览器时，插件会被停止。插件可以监听chrome.runtime.onSuspend事件，保存数据，清理资源等");
});

chrome.runtime.setUninstallURL("https://dws.seewo.com/");

const accounts = [
  { username: "admin", ip: "172.20.124.200", passwords: ["1qaz@WSX"] },
  { username: "user1", ip: "172.20.124.200", passwords: ["password1", "pwd4"] },
  { username: "admin", ip: "192.168.42.162", passwords: ["password2", "Kindlink"] }
];

const cloneAccounts = structuredClone(accounts);

// 使用 chrome.runtime.onMessage 来监听消息
// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   if (message.name === "toggleEnabled") {
//     const { enabled } = message.body;
//     await localStorage.set("enabled", enabled);
//     const tab = await sendToBackground<ActiveTabIdReqBody, ActiveTabIdResBody>({ name: "getActiveTab" });
//     console.log("tab :>> ", tab);
//     const activeHost = new URL(tab.url).host;
//     const groupList = groupBy(cloneAccounts, (item) => item.ip);
//     console.log("groupList :>> ", groupList);

//     if (enabled) {
//       console.log("================= 扩展已启用，执行自动验证账号操作 =================");
//       const l = new LoginManager(cloneAccounts);
//       const resp = await l.processLogins();
//       console.log("================= 已完成验证账号操作 ================= \n", resp);
//     } else {
//       console.log("扩展已禁用，不执行任何操作");
//     }
//   }
// });
