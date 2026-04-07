import type { GenericPickerMessage } from "./types";

// popup 发起采集时要把 sessionId/tabId 一起带给页面脚本，
// 这样页面侧写回 storage 时才能确认自己属于哪一次采集会话。
export const bindGenericPickerSession = (
  message: GenericPickerMessage,
  sessionId: string,
  attemptId: string,
  tabId?: number
): GenericPickerMessage => {
  if (message.type === "generic-picker:reset") {
    return message;
  }

  return {
    ...message,
    sessionId,
    attemptId,
    tabId
  };
};

// reset 消息只是清理页面上的 picker，不需要绑定标签页上下文。
export const resolveGenericPickerTabId = (message: GenericPickerMessage): number | undefined => {
  if (message.type === "generic-picker:reset") {
    return undefined;
  }

  return message.tabId;
};
