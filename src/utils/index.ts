import { clsx, type ClassValue } from "clsx";
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
  while ((match = tagPattern.exec(xmlString)) !== null) {
    const [, tag, value] = match;
    obj[tag] = value;
  }
  return obj;
}

const sanitizeReg = /\s+/g; // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions#special-white-space
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

export function jsonToBase64(jsonObject: Object) {
  // 将 JSON 对象转换为字符串
  const jsonString = JSON.stringify(jsonObject);
  // 将字符串转换为 UTF-8 字节数组
  const utf8Bytes = new TextEncoder().encode(jsonString);
  // 将 UTF-8 字节数组转换为 Base64
  const base64String = btoa(String.fromCharCode(...utf8Bytes));
  return base64String;
}
