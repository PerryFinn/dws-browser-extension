export type RequestOption = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: XMLHttpRequestBodyInit | null;
  responseType?: XMLHttpRequestResponseType;
} & { url: string };

export function xhrRequest<T = unknown>({
  method = "GET",
  url,
  headers = {},
  body = null,
  responseType = "text"
}: RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url, true);

    // 设置响应类型
    xhr.responseType = responseType as XMLHttpRequestResponseType;

    // 设置请求头
    for (const key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }

    // 处理响应
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`HTTP error: ${xhr.status}, ${xhr.statusText}`));
      }
    };

    // 处理请求错误
    xhr.onerror = (e) => {
      console.error("xhr.onerror :>> ", e);
      reject(new Error("Network error or CORS issue."));
    };

    // 发送请求
    xhr.send(body);
  });
}
