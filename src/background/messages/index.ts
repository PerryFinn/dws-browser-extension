import type { ExtensionMessaging } from "@/lib/extension-messaging";
import bookmarkSearch from "./bookmarkSearch";
import bookmarkSearchTestModel from "./bookmarkSearchTestModel";
import checkVersion from "./checkVersion";
import download from "./download";
import exportXLSX from "./exportXLSX";
import fetch from "./fetch";
import genericExtractApiDoc from "./genericExtractApiDoc";
import genericSelfCheckCurrentCapture from "./genericSelfCheckCurrentCapture";
import genericTestModelConfig from "./genericTestModelConfig";
import getActiveTab from "./getActiveTab";
import getWindowConfig from "./getWindowConfig";
import openOrReplaceTab from "./openOrReplaceTab";
import parsingXLSX from "./parsingXLSX";
import ping from "./ping";
import swqaGetInterfaceDetail from "./swqaGetInterfaceDetail";

export const backgroundMessageHandlers = {
  bookmarkSearch,
  bookmarkSearchTestModel,
  checkVersion,
  download,
  exportXLSX,
  fetch,
  genericExtractApiDoc,
  genericSelfCheckCurrentCapture,
  genericTestModelConfig,
  getActiveTab,
  getWindowConfig,
  openOrReplaceTab,
  parsingXLSX,
  ping,
  swqaGetInterfaceDetail
} satisfies Record<string, ExtensionMessaging.MessageHandler>;
