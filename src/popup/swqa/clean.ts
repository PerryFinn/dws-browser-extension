import type { ParsedSwqaUrl } from "./url";

export interface RawSwqaDetailResponse {
  detail?: RawSwqaDetail;
  [key: string]: unknown;
}

export interface RawSwqaDetail {
  req_body_json?: unknown;
  req_query?: unknown;
  res_body?: unknown;
  [key: string]: unknown;
}

export interface RawReqQueryItem {
  required?: string;
  value?: string;
  [key: string]: unknown;
}

export interface CleanedReqQueryItem {
  required: boolean;
  exampleValue?: string;
  [key: string]: unknown;
}

export type CleanedSwqaInterfaceDetail = {
  req_body_json?: unknown;
  req_query?: Array<CleanedReqQueryItem>;
  res_body?: unknown;
} & Record<string, unknown>;

const REMOVABLE_FIELDS: Array<keyof RawSwqaDetail> = [
  "base_path",
  "comment_num",
  "contentType",
  "creator",
  "descs",
  "dubbo",
  "groupId",
  "hash",
  "id",
  "isDelete",
  "iv_cased_list",
  "iv_type",
  "mock",
  "modifyTime",
  "projectId",
  "relater",
  "req_body_form",
  "req_body_is_json_schema",
  "req_body_raw",
  "req_body_type",
  "req_demo",
  "req_demo_is_customize",
  "req_headers",
  "res_body_is_json_schema",
  "res_body_type",
  "res_code",
  "res_demo",
  "res_demo_is_customize",
  "status",
  "tag",
  "updater"
];

const cloneDetail = (detail: RawSwqaDetail): RawSwqaDetail => {
  if (typeof structuredClone === "function") {
    return structuredClone(detail);
  }
  return JSON.parse(JSON.stringify(detail));
};

const safeParseJson = (value: unknown, field: string): unknown => {
  if (value == null) return value;
  if (typeof value === "object") return value;
  if (typeof value !== "string") {
    throw new Error(`Unexpected ${field} type: ${typeof value}`);
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Parse ${field} failed: ${message}`);
  }
};

const normalizeReqQuery = (raw: unknown): Array<CleanedReqQueryItem> => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const { value, required, ...rest } = (item || {}) as RawReqQueryItem;
    return {
      ...rest,
      required: String(required) !== "0", // 0 表示可选，1 表示必选
      exampleValue: value
    };
  });
};

const isEmptyObjectPlaceholder = (value: unknown) => {
  return Boolean(value && typeof value === "object" && (value as { title?: string }).title === "empty object");
};

/**
 * 将 SWQA 接口详情返回数据清洗成精简 JSON。
 * 逻辑来源于 src/demo.js，增加了类型校验与错误提示，方便维护。
 */
export const cleanSwqaInterfaceDetail = (raw: RawSwqaDetailResponse): CleanedSwqaInterfaceDetail => {
  const detail = raw?.detail;
  if (!detail || typeof detail !== "object") {
    throw new Error("Missing detail field in response");
  }

  const data = cloneDetail(detail);

  // 删除无关字段，保留核心业务字段，减少噪声。
  for (const key of REMOVABLE_FIELDS) {
    delete (data as Record<string, unknown>)[key];
  }

  // 解析请求体与响应体 JSON。
  const parsedReqBody = safeParseJson(data.req_body_json, "req_body_json");
  data.req_body_json = isEmptyObjectPlaceholder(parsedReqBody) ? {} : parsedReqBody;

  const parsedResBody = safeParseJson(data.res_body, "res_body");
  data.res_body = isEmptyObjectPlaceholder(parsedResBody) ? null : parsedResBody;

  // 规范化 query，补充 required 布尔与示例值。
  data.req_query = normalizeReqQuery(data.req_query);

  return data as CleanedSwqaInterfaceDetail;
};
