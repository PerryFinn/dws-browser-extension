import { buildGenericDomSummary } from "./dom-summary";
import type { GenericExtractionSource, GenericSanitizedCapture } from "./types";

const MAX_PREVIEW_TEXT_LENGTH = 240;
const MAX_VISIBLE_TEXT_LENGTH = 4000;
const MAX_VISIBLE_TEXT_LINES = 120;
const TEXT_BLOCK_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, dt, dd, tr, pre";
const PRIORITY_TEXT_PATTERNS = [
  /请求/,
  /响应|返回/,
  /参数/,
  /header/i,
  /query/i,
  /body/i,
  /method/i,
  /path/i,
  /url/i,
  /示例|样例|example/i,
  /auth/i
];

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

const collectVisibleTextBlocks = (root: HTMLElement): string[] => {
  return Array.from(root.querySelectorAll(TEXT_BLOCK_SELECTOR))
    .map((node) => normalizeVisibleText(node.textContent ?? ""))
    .filter(Boolean);
};

const scoreTextBlock = (block: string, index: number): number => {
  let score = Math.max(0, 24 - index);

  if (PRIORITY_TEXT_PATTERNS.some((pattern) => pattern.test(block))) {
    score += 60;
  }

  if (block.length <= 80) {
    score += 10;
  }

  return score;
};

const fitTextIntoBudget = (
  value: string,
  remainingChars: number,
  remainingLines: number
): { text: string | null; truncated: boolean } => {
  if (remainingChars <= 0 || remainingLines <= 0) {
    return { text: null, truncated: true };
  }

  const lines = value.split("\n").filter(Boolean);
  const fittedLines: string[] = [];
  let usedChars = 0;
  let truncated = false;

  for (const line of lines) {
    if (fittedLines.length >= remainingLines) {
      truncated = true;
      break;
    }

    const separatorLength = fittedLines.length > 0 ? 1 : 0;
    const remainingLineChars = remainingChars - usedChars - separatorLength;

    if (remainingLineChars <= 0) {
      truncated = true;
      break;
    }

    if (line.length > remainingLineChars) {
      const ellipsisLength = remainingLineChars > 3 ? 3 : 0;
      const sliceLength = Math.max(0, remainingLineChars - ellipsisLength);
      const clippedLine = `${line.slice(0, sliceLength)}${ellipsisLength > 0 ? "..." : ""}`.trim();

      if (clippedLine) {
        fittedLines.push(clippedLine);
      }
      truncated = true;
      break;
    }

    fittedLines.push(line);
    usedChars += line.length + separatorLength;
  }

  if (fittedLines.length === 0) {
    return { text: null, truncated: truncated || value.length > 0 };
  }

  return {
    text: fittedLines.join("\n"),
    truncated: truncated || fittedLines.length < lines.length
  };
};

const buildBudgetedVisibleText = (value: string): { visibleText: string; truncated: boolean } => {
  const normalizedVisibleText = normalizeVisibleText(value);

  if (
    normalizedVisibleText.length <= MAX_VISIBLE_TEXT_LENGTH &&
    normalizedVisibleText.split("\n").length <= MAX_VISIBLE_TEXT_LINES
  ) {
    return {
      visibleText: normalizedVisibleText,
      truncated: false
    };
  }

  return {
    visibleText: fitTextIntoBudget(normalizedVisibleText, MAX_VISIBLE_TEXT_LENGTH, MAX_VISIBLE_TEXT_LINES).text ?? "",
    truncated: true
  };
};

const buildElementVisibleText = (root: HTMLElement): { visibleText: string; truncated: boolean } => {
  const blocks = collectVisibleTextBlocks(root);

  if (blocks.length === 0) {
    return buildBudgetedVisibleText(root.textContent ?? "");
  }

  const selectedBlocks = new Map<number, string>();
  let usedChars = 0;
  let usedLines = 0;
  let truncated = false;

  const candidateIndexes = blocks
    .map((block, index) => ({
      block,
      index,
      score: scoreTextBlock(block, index)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.index);

  for (const index of candidateIndexes) {
    if (selectedBlocks.has(index)) {
      continue;
    }

    const block = blocks[index];
    const fitted = fitTextIntoBudget(block, MAX_VISIBLE_TEXT_LENGTH - usedChars, MAX_VISIBLE_TEXT_LINES - usedLines);

    if (!fitted.text) {
      truncated = true;
      continue;
    }

    selectedBlocks.set(index, fitted.text);
    usedChars += fitted.text.length + (usedChars > 0 ? 1 : 0);
    usedLines += fitted.text.split("\n").length;

    if (fitted.truncated) {
      truncated = true;
      break;
    }
  }

  if (selectedBlocks.size < blocks.length) {
    truncated = true;
  }

  const candidateVisibleText = Array.from(selectedBlocks.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, value]) => value)
    .join("\n");

  const fallbackVisibleText = candidateVisibleText || normalizeVisibleText(root.textContent ?? "");
  const budgetedVisibleText = buildBudgetedVisibleText(fallbackVisibleText);

  return {
    visibleText: budgetedVisibleText.visibleText,
    truncated: truncated || budgetedVisibleText.truncated
  };
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

const buildSanitizedCapture = (input: {
  visibleText: string;
  truncated?: boolean;
  domSummary: string | null;
}): GenericSanitizedCapture => {
  const normalizedVisibleText = normalizeVisibleText(input.visibleText);
  const qualityHints: GenericSanitizedCapture["qualityHints"] = [];

  if (input.truncated) {
    qualityHints.push("truncated-visible-text");
  }

  if (!input.domSummary) {
    qualityHints.push("missing-dom-summary");
  }

  return {
    visibleText: normalizedVisibleText,
    // previewText 只服务于 popup 回显，长度要稳定可控，避免把整段正文重新塞回 UI。
    previewText: createPreviewText(normalizedVisibleText),
    domSummary: input.domSummary,
    pickedAt: Date.now(),
    charCount: normalizedVisibleText.length,
    truncated: !!input.truncated,
    qualityHints
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
  const { visibleText, truncated } = buildElementVisibleText(clone);
  const domSummary = buildGenericDomSummary(clone);
  const nonEmptyVisibleText = assertNonEmptyVisibleText(visibleText, "generic-dom");

  return {
    source: buildCaptureSource({
      url: input.url,
      title: input.title,
      mode: "generic-dom"
    }),
    capture: buildSanitizedCapture({
      visibleText: nonEmptyVisibleText,
      truncated,
      domSummary
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
  const { visibleText, truncated } = buildBudgetedVisibleText(input.text);
  const nonEmptyVisibleText = assertNonEmptyVisibleText(visibleText, "generic-selection");

  return {
    source: buildCaptureSource({
      url: input.url,
      title: input.title,
      mode: "generic-selection"
    }),
    capture: buildSanitizedCapture({
      visibleText: nonEmptyVisibleText,
      truncated,
      domSummary: null
    })
  };
};

export { normalizeVisibleText };
