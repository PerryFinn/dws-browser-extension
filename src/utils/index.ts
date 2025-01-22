import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const reg = /<([a-zA-Z0-9]+)>([^<]+)<\/\1>/g;
export function parseXMLtoObject(xmlString: string) {
  const obj = {};
  const tagPattern = reg;
  let match: RegExpExecArray | null;

  // 使用正则表达式匹配每个标签和值
  while (true) {
    match = tagPattern.exec(xmlString);
    if (match === null) break;
    const [, tag, value] = match;
    obj[tag] = value;
  }
  return obj;
}

// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions#special-white-space
const sanitizeReg = /\s+/g;
export function sanitizeString(input: string): string {
  // 使用正则表达式去除不可见字符，如 \t、\n、空格等
  return input.replace(sanitizeReg, "");
}

export function getRandInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function base64ToBlob(base64: string, mimeType = "image/png") {
  // 移除Base64字符串的前缀（如果有）
  const byteCharacters = atob(base64.split(",")[1] || base64);
  // 创建一个数组来保存二进制数据
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  // 创建Uint8Array
  const byteArray = new Uint8Array(byteNumbers);
  // 创建Blob对象
  return new Blob([byteArray], { type: mimeType });
}

export function jsonToBase64(jsonObject: Record<string, any>) {
  // 将 JSON 对象转换为字符串
  const jsonString = JSON.stringify(jsonObject);
  // 将字符串转换为 UTF-8 字节数组
  const utf8Bytes = new TextEncoder().encode(jsonString);
  // 将 UTF-8 字节数组转换为 Base64
  const base64String = btoa(String.fromCharCode(...utf8Bytes));
  return base64String;
}

type CopyFunction = (text: string) => Promise<boolean>;
/**
 * 将提供的文本复制到剪贴板。
 *
 * 此函数尝试使用现代的 Clipboard API 将文本复制到剪贴板。
 * 如果 Clipboard API 不可用，则回退到使用临时的 textarea 元素。
 *
 * 不适用于移动端。
 *
 * @param text - 要复制到剪贴板的文本。
 * @returns 当文本成功复制时返回一个已解决的 promise，否则返回一个带有错误的拒绝 promise。
 */
export const copyToClipboard: CopyFunction = (() => {
  // 检查 navigator.clipboard API
  if (typeof navigator.clipboard?.writeText === "function") {
    return async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error("复制失败:", err);
        throw err;
      }
    };
  }

  // 降级方案：使用 document.execCommand
  return async (text: string) => {
    const textarea = document.createElement("textarea");
    try {
      textarea.value = text;
      // 样式优化：确保完全隐藏且不影响布局
      Object.assign(textarea.style, {
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        opacity: "0",
        width: "1px",
        height: "1px",
        padding: "0",
        border: "none",
        pointerEvents: "none"
      });
      // 安全性和可访问性优化
      textarea.setAttribute("readonly", "");
      textarea.setAttribute("aria-hidden", "true");
      textarea.setAttribute("tabindex", "-1"); // 防止键盘焦点
      textarea.setAttribute("data-temp-clipboard", "true"); // 标记临时元素
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand("copy");
      return Promise.resolve(result);
    } catch (err) {
      console.error("复制失败:", err);
      return Promise.reject(err);
    } finally {
      document.body.removeChild(textarea);
    }
  };
})();
