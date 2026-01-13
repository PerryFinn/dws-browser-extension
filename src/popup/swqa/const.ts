export const SWQA_HOST = "swqa.gz.cvte.cn";

// SWQA 接口详情页的路径格式：/interface/:id
export const INTERFACE_PATH_REGEX = /\/interface\/(\d+)/;

// SWQA 接口详情接口（需在 MAIN world 调用，借用同源 cookie）
export const INTERFACE_DETAIL_API_PATH = "/api/v1/httpService/apis.json";

export const buildInterfaceDetailApiUrl = (timestamp = Date.now()) => {
  return `${INTERFACE_DETAIL_API_PATH}?action=GET_INTERFACE_DETAIL&timestamp=${timestamp}&isAjax=1`;
};
