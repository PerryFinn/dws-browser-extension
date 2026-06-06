import type { ExtensionMessaging } from "@/lib/extension-messaging";

import { sanitizeString } from "@/utils/index.js";

import * as XLSX from "../libs/xlsx/index.js";

export type parsingXLSXReqBody = { data: Array<number> };
export type parsingXLSXResBody = {
  success: boolean;
  data: Array<parseXlsxInfo>;
  message?: string;
};

export interface parseXlsxInfo {
  name: string;
  username: string;
  password: string;
  host: string;
  device_id: string;
  rtsp_address: string;
  count: number;
}

// 遍历一个对象的所有键，如果值是字符串，则调用 sanitizeString
const sanitizeObject = (obj: parseXlsxInfo) => {
  return {
    name: sanitizeString(String(obj.name)),
    username: sanitizeString(String(obj.username)),
    password: sanitizeString(String(obj.password)),
    host: sanitizeString(String(obj.host)),
    device_id: sanitizeString(String(obj.device_id)),
    rtsp_address: sanitizeString(String(obj.rtsp_address)),
    count: Number(obj.count) || 0
  };
};

const sanitizeJsonArray = (jsonArray: Array<parseXlsxInfo>) => {
  return jsonArray.map((item) => {
    return sanitizeObject(item);
  });
};

export const parsingXLSX = async (ab: Uint8Array) => {
  const workbook = XLSX.read(ab.buffer);
  const firstWorksheet = workbook.Sheets[workbook.SheetNames[0]];
  // https://docs.sheetjs.com/docs/api/utilities/array
  const json = XLSX.utils.sheet_to_json<parseXlsxInfo>(firstWorksheet, { range: 1, defval: "" });
  return sanitizeJsonArray(json);
};

const handler: ExtensionMessaging.MessageHandler<parsingXLSXReqBody, parsingXLSXResBody> = async (
  request,
  response
) => {
  console.log("parsingXLSX 收到消息：", request);
  try {
    const data = request.body?.data;
    if (!data) {
      throw new Error("data is required");
    }
    const result = await parsingXLSX(Uint8Array.from(data));
    response.send({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("parsingXLSX error :>> ", message);
    response.send({ success: false, data: [], message });
  }
};

export default handler;
