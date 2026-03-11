import { initLocalStorage } from "@/storages";

const initializeLocalStorage = async (reason: "startup" | "install" | "update") => {
  try {
    await initLocalStorage();
  } catch (error) {
    console.error(`初始化本地存储失败（${reason}）`, error);
  }
};

chrome.runtime.onStartup.addListener(async () => {
  await initializeLocalStorage("startup");
  console.log("用户打开浏览器时，插件会被启动。插件可以在这个阶段初始化数据，设置默认状态等");
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await initializeLocalStorage("install");
    console.log("第一次安装!");
  } else if (details.reason === "update") {
    await initializeLocalStorage("update");
    console.log(`更新版本 ${details.previousVersion} 到 ${chrome.runtime.getManifest().version}!`);
  }
  await chrome.action.setBadgeText({ text: "ON" });
});

chrome.tabs.onUpdated.addListener(async (_, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    console.log("插件被启动后，就进入了运行阶段。在这个阶段，插件可以响应用户操作，监听和处理浏览器事件，提供各种功能");
  }
});

chrome.runtime.onSuspend.addListener(async () => {
  console.log("用户关闭浏览器时，插件会被停止。插件可以监听chrome.runtime.onSuspend事件，保存数据，清理资源等");
});

chrome.runtime.setUninstallURL("https://dws.seewo.com/");
