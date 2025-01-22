import { type PlasmoMessaging, sendToContentScript } from "@plasmohq/messaging";

import * as XLSX from "../libs/xlsx/index.js";

export type ExportXLSXReqBody = { data: any };
export type ExportXLSXResBody = { success: boolean; error?: any };

const handler: PlasmoMessaging.MessageHandler<ExportXLSXReqBody, ExportXLSXResBody> = async (request, response) => {
  try {
    const data = request.body?.data;
    if (!data) {
      throw new Error("data is required");
    }
    // 创建一个新的工作簿
    const workbook = XLSX.utils.book_new();

    // 创建一个新的工作表
    const worksheet: XLSX.WorkSheet = {
      "!ref": "A1:G14",
      A1: {
        t: "s",
        v: "注意事项：\n1. 多个password使用“/”分割\n",
        r: '<t xml:space="preserve">注意事项：&#10;1. 多个password使用“/”分割&#10;</t>',
        h: "注意事项：<br/>1. 多个password使用“/”分割<br/>",
        w: "注意事项：\n1. 多个password使用“/”分割\n",
        s: {
          alignment: {
            horizontal: "left",
            vertical: "top"
          },
          fill: {
            bgColor: {
              rgb: "FFFF00"
            }
          }
        }
      },
      A2: {
        t: "s",
        v: "name",
        r: "<t>name</t>",
        h: "name",
        w: "name"
      },
      B2: {
        t: "s",
        v: "ip",
        r: "<t>ip</t>",
        h: "ip",
        w: "ip"
      },
      C2: {
        t: "s",
        v: "username",
        r: "<t>username</t>",
        h: "username",
        w: "username"
      },
      D2: {
        t: "s",
        v: "password",
        r: "<t>password</t>",
        h: "password",
        w: "password"
      },
      E2: {
        t: "s",
        v: "count",
        r: "<t>count</t>",
        h: "count",
        w: "count"
      },
      F2: {
        t: "s",
        v: "rtsp_address",
        r: "<t>rtsp_address</t>",
        h: "rtsp_address",
        w: "rtsp_address"
      },
      G2: {
        t: "s",
        v: "device_id",
        r: "<t>device_id</t>",
        h: "device_id",
        w: "device_id"
      },
      "!margins": {
        left: 0.75,
        right: 0.75,
        top: 1,
        bottom: 1,
        header: 0.5,
        footer: 0.5
      },
      "!merges": [
        {
          s: {
            c: 0,
            r: 0
          },
          e: {
            c: 6,
            r: 0
          }
        }
      ],
      "!rows": [
        {
          hpx: 62,
          hpt: 62
        }
      ]
    };

    const worksheet2 = XLSX.utils.json_to_sheet(data);

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
  } catch (error) {
    console.error("exportXLSX error :>> ", error);
    response.send({ success: false, error });
  }
};

export default handler;
