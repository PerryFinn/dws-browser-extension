import { buildGenericDomSummary } from "./dom-summary";
import type { GenericExtractionSource, GenericSanitizedCapture } from "./types";

const MAX_PREVIEW_TEXT_LENGTH = 240;

const noisyTextPatterns = [/^复制/, /^展开$/, /^收起$/];

const normalizeVisibleText = (value: string): string => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const createPreviewText = (value: string): string => {
  const flattened = value.replace(/\s+/g, " ").trim();

  if (flattened.length <= MAX_PREVIEW_TEXT_LENGTH) {
    return flattened;
  }

  return `${flattened.slice(0, MAX_PREVIEW_TEXT_LENGTH - 3)}...`;
};

const removeNoisyNodes = (root: HTMLElement): void => {
  // 只能在 clone 上清洗，避免修改原始 DOM。
  const removableSelectors = ["script", "style", "noscript", "template", "[hidden]"];

  for (const selector of removableSelectors) {
    for (const node of root.querySelectorAll(selector)) {
      node.remove();
    }
  }

  root.querySelectorAll("button").forEach((button) => {
    const text = normalizeVisibleText(button.textContent ?? "");
    if (noisyTextPatterns.some((pattern) => pattern.test(text))) {
      button.remove();
    }
  });
};

const buildCaptureSource = (input: {
  url: string;
  title: string;
  mode: GenericExtractionSource["mode"];
}): GenericExtractionSource => {
  return {
    url: input.url,
    title: input.title,
    mode: input.mode
  };
};

const buildSanitizedCapture = (input: { visibleText: string; domSummary: string | null }): GenericSanitizedCapture => {
  const normalizedVisibleText = normalizeVisibleText(input.visibleText);

  return {
    visibleText: normalizedVisibleText,
    // previewText 只服务于 popup 回显，长度要稳定可控，避免把整段正文重新塞回 UI。
    previewText: createPreviewText(normalizedVisibleText),
    domSummary: input.domSummary,
    pickedAt: Date.now()
  };
};

const assertNonEmptyVisibleText = (value: string, mode: GenericExtractionSource["mode"]): string => {
  const normalizedVisibleText = normalizeVisibleText(value);

  if (!normalizedVisibleText) {
    throw new Error(mode === "generic-selection" ? "当前页面没有可用的选中文本" : "未从目标区域读取到有效文本");
  }

  return normalizedVisibleText;
};

export const sanitizePickedElement = (input: {
  element: HTMLElement;
  url: string;
  title: string;
}): {
  source: GenericExtractionSource;
  capture: GenericSanitizedCapture;
} => {
  // 这里输出的是“最小必要上下文”，后续送模只使用清洗后的文本和结构摘要，不再传原始 outerHTML。
  const clone = input.element.cloneNode(true) as HTMLElement;
  removeNoisyNodes(clone);
  const visibleText = assertNonEmptyVisibleText(clone.textContent ?? "", "generic-dom");

  return {
    source: buildCaptureSource({
      url: input.url,
      title: input.title,
      mode: "generic-dom"
    }),
    capture: buildSanitizedCapture({
      visibleText,
      domSummary: buildGenericDomSummary(clone)
    })
  };
};

export const sanitizeSelectionText = (input: {
  text: string;
  url: string;
  title: string;
}): {
  source: GenericExtractionSource;
  capture: GenericSanitizedCapture;
} => {
  const visibleText = assertNonEmptyVisibleText(input.text, "generic-selection");

  return {
    source: buildCaptureSource({
      url: input.url,
      title: input.title,
      mode: "generic-selection"
    }),
    capture: buildSanitizedCapture({
      visibleText,
      domSummary: null
    })
  };
};

export { normalizeVisibleText };
