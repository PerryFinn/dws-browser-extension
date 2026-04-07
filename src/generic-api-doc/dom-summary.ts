const MAX_SUMMARY_ITEMS = 6;
const SECTION_HINTS = [
  { key: "request", patterns: [/请求参数/, /入参/, /\brequest\b/i, /\bparams?\b/i] },
  { key: "response", patterns: [/返回参数/, /响应参数/, /出参/, /\bresponse\b/i] },
  { key: "example", patterns: [/示例/, /样例/, /\bexample\b/i, /curl/i] }
] as const;

const normalizeSummaryText = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const collectHeadingTexts = (element: HTMLElement): string[] => {
  return Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .map((heading) => normalizeSummaryText(heading.textContent ?? ""))
    .filter(Boolean)
    .slice(0, MAX_SUMMARY_ITEMS);
};

const collectMatchedSections = (element: HTMLElement): string[] => {
  const candidates = Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6, dt, strong, summary"))
    .map((node) => normalizeSummaryText(node.textContent ?? ""))
    .filter(Boolean);

  return SECTION_HINTS.filter(({ patterns }) => {
    return candidates.some((candidate) => patterns.some((pattern) => pattern.test(candidate)));
  }).map(({ key }) => key);
};

const summarizeTables = (element: HTMLElement): string | null => {
  const tables = Array.from(element.querySelectorAll("table"));

  if (tables.length === 0) {
    return null;
  }

  const headers = tables
    .flatMap((table) =>
      Array.from(table.querySelectorAll("thead th")).map((cell) => normalizeSummaryText(cell.textContent ?? ""))
    )
    .filter(Boolean)
    .slice(0, MAX_SUMMARY_ITEMS);

  if (headers.length === 0) {
    return `tables: ${tables.length}`;
  }

  return `tables: ${tables.length} (${headers.join(", ")})`;
};

export const buildGenericDomSummary = (element: HTMLElement): string | null => {
  const sections: string[] = [];
  const headings = collectHeadingTexts(element);
  const matchedSections = collectMatchedSections(element);
  const tableSummary = summarizeTables(element);
  const listCount = element.querySelectorAll("ul, ol, dl").length;
  const codeExamples = element.querySelectorAll("pre").length;

  if (headings.length > 0) {
    sections.push(`headingPath: ${headings.join(" > ")}`);
  }

  if (matchedSections.length > 0) {
    sections.push(`sections: ${matchedSections.join(", ")}`);
  }

  if (tableSummary) {
    sections.push(tableSummary);
  }

  if (listCount > 0) {
    sections.push(`lists: ${listCount}`);
  }

  if (codeExamples > 0) {
    sections.push(`codeExamples: ${codeExamples}`);
  }

  return sections.length > 0 ? sections.join(" | ") : null;
};
