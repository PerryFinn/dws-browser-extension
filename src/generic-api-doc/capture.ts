import type { GenericCaptureContext } from "./types";

const MAX_CAPTURE_TEXT_LENGTH = 6000;
const MAX_PREVIEW_TEXT_LENGTH = 240;
const MAX_DOM_SUMMARY_LENGTH = 2000;

const normalizeCaptureText = (value: string): string => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const truncateWithEllipsis = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
};

const createPreviewText = (value: string): string => {
  return truncateWithEllipsis(value.replace(/\s+/g, " ").trim(), MAX_PREVIEW_TEXT_LENGTH);
};

const buildCaptureContext = ({
  url,
  title,
  mode,
  text,
  domSummary
}: {
  url: string;
  title: string;
  mode: GenericCaptureContext["source"]["mode"];
  text: string;
  domSummary?: string | null;
}): GenericCaptureContext => {
  const normalizedText = normalizeCaptureText(text);

  if (!normalizedText) {
    throw new Error(mode === "generic-selection" ? "当前页面没有可用的选中文本" : "未从目标区域读取到有效文本");
  }

  return {
    source: {
      url,
      title,
      mode
    },
    rawText: truncateWithEllipsis(normalizedText, MAX_CAPTURE_TEXT_LENGTH),
    previewText: createPreviewText(normalizedText),
    domSummary: domSummary ? truncateWithEllipsis(domSummary.trim(), MAX_DOM_SUMMARY_LENGTH) : null
  };
};

export const createSelectionCaptureContext = (input: {
  url: string;
  title: string;
  text: string;
}): GenericCaptureContext => {
  return buildCaptureContext({
    ...input,
    mode: "generic-selection"
  });
};

export const createDomCaptureContext = (input: {
  url: string;
  title: string;
  text: string;
  htmlSnippet?: string;
}): GenericCaptureContext => {
  return buildCaptureContext({
    url: input.url,
    title: input.title,
    text: input.text,
    mode: "generic-dom",
    domSummary: input.htmlSnippet ?? null
  });
};
