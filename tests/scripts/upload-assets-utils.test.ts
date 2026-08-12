import { expect, test } from "vitest";
import type { UploadPolicy } from "../../scripts/upload-assets/types.js";
import { getPrimaryUploadPolicy } from "../../scripts/upload-assets/utils.js";

const createUploadPolicy = (policyList: UploadPolicy["policyList"]): UploadPolicy => ({
  formFields: [],
  uploadUrl: "https://example.com/fallback",
  policyList,
  keyPrefix: "assets/"
});

test("getPrimaryUploadPolicy 返回列表中的第一个上传策略", () => {
  const primaryPolicy = {
    formFields: [{ key: "token", value: "test-token" }],
    uploadUrl: "https://example.com/upload"
  };

  expect(getPrimaryUploadPolicy(createUploadPolicy([primaryPolicy]))).toBe(primaryPolicy);
});

test("getPrimaryUploadPolicy 在策略列表为空时抛出明确错误", () => {
  expect(() => getPrimaryUploadPolicy(createUploadPolicy([]))).toThrow("上传策略为空");
});
