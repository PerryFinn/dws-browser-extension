import type { GenericPickerMessage } from "./types";

export const bindGenericPickerSession = (
  message: GenericPickerMessage,
  sessionId: string,
  tabId?: number
): GenericPickerMessage => {
  if (message.type === "generic-picker:reset") {
    return message;
  }

  return {
    ...message,
    sessionId,
    tabId
  };
};

export const resolveGenericPickerTabId = (message: GenericPickerMessage): number | undefined => {
  if (message.type === "generic-picker:reset") {
    return undefined;
  }

  return message.tabId;
};
