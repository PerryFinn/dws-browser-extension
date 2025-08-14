import type { PlasmoMessaging } from "@plasmohq/messaging";

import * as XLSX from "../libs/xlsx/index.js";

export interface ExportXlsxRow {
  name?: string;
  ip?: string;
  username?: string;
  password?: string;
  count?: number;
  rtsp_address?: string;
  device_id?: string;
}

export type ExportXLSXReqBody = { data: ExportXlsxRow[] };
export type ExportXLSXResBody = { success: boolean; error?: string };

const handler: PlasmoMessaging.MessageHandler<ExportXLSXReqBody, ExportXLSXResBody> = async (request, response) => {
  try {
    const data = request.body?.data;
    if (!data || !Array.isArray(data)) {
      throw new Error("data is required");
    }
    // 创建一个新的工作簿
    const workbook = XLSX.utils.book_new();

    // 此处原有示例化静态表头对象未被使用，已移除以避免未使用变量告警

    const worksheet2 = XLSX.utils.json_to_sheet<ExportXlsxRow>(data);

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet2, "Template");

    // 写入 Excel 文件
    // XLSX.writeFile(workbook, "template.xlsx");

    XLSX.writeFileXLSX(workbook, "template.xlsx");

    /* generate Base64 string */
    // var b64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });

    // chrome.downloads.onDeterminingFilename.addListener(handleDeterminingFilename);
    // chrome.downloads
    //   .download({
    //     url: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`,
    //     conflictAction: "uniquify",
    //     filename: "demo.xlsx",
    //     saveAs: true
    //   })
    //   .then((res) => {
    //     console.log("res :>> ", res);
    //   })
    //   .finally(() => {
    //     // chrome.downloads.onDeterminingFilename.removeListener(handleDeterminingFilename);
    //   });

    response.send({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("exportXLSX error :>> ", message);
    response.send({ success: false, error: message });
  }
};

export default handler;
