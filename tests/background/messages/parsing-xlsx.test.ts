import { expect, test } from "vitest";
import type { WorkBook, WorkSheet } from "@/background/libs/xlsx/index.js";
import * as XLSX from "@/background/libs/xlsx/index.js";
import { getFirstWorksheet, parsingXLSX } from "@/background/messages/parsingXLSX";

test("XLSX CommonJS 边界提供真实导出并可读写最小工作簿", async () => {
  expect(XLSX.read).toBeTypeOf("function");
  expect(XLSX.utils.sheet_to_json).toBeTypeOf("function");

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["导入模板"],
    ["name", "username", "password", "host", "device_id", "rtsp_address", "count"],
    ["Camera 1", "admin", "secret", "192.0.2.1", "device-1", "rtsp://192.0.2.1/live", 2]
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const serializedWorkbook: unknown = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  expect(serializedWorkbook).toBeInstanceOf(ArrayBuffer);
  if (!(serializedWorkbook instanceof ArrayBuffer)) {
    throw new TypeError("XLSX.write 未返回 ArrayBuffer");
  }

  await expect(parsingXLSX(new Uint8Array(serializedWorkbook))).resolves.toEqual([
    {
      name: "Camera1",
      username: "admin",
      password: "secret",
      host: "192.0.2.1",
      device_id: "device-1",
      rtsp_address: "rtsp://192.0.2.1/live",
      count: 2
    }
  ]);
});

test("getFirstWorksheet 返回工作簿中的第一个工作表", () => {
  const firstWorksheet: WorkSheet = { A1: { t: "s", v: "标题" }, "!ref": "A1" };
  const workbook: WorkBook = {
    SheetNames: ["Sheet1"],
    Sheets: { Sheet1: firstWorksheet }
  };

  expect(getFirstWorksheet(workbook)).toBe(firstWorksheet);
});

test("getFirstWorksheet 在工作簿没有工作表时抛出明确错误", () => {
  const workbook: WorkBook = { SheetNames: [], Sheets: {} };

  expect(() => getFirstWorksheet(workbook)).toThrow("Excel 文件中未找到工作表");
});
