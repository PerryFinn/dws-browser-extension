import type { PlasmoMessaging } from "@plasmohq/messaging";

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
  const newObj = {} as parseXlsxInfo;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      newObj[key] = sanitizeString(obj[key]);
    }
  }
  return newObj;
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

const handler: PlasmoMessaging.MessageHandler<parsingXLSXReqBody, parsingXLSXResBody> = async (request, response) => {
  console.log("parsingXLSX 收到消息：", request);
  try {
    const data = request.body.data;
    const result = await parsingXLSX(Uint8Array.from(data));
    response.send({ success: true, data: result });
  } catch (error) {
    console.error("parsingXLSX error :>> ", error);
    response.send({ success: false, data: [], message: error.message });
  }
};

export default handler;
