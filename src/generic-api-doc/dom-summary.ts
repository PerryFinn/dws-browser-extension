const MAX_SUMMARY_ITEMS = 6;

const normalizeSummaryText = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const collectHeadingTexts = (element: HTMLElement): string[] => {
  return Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .map((heading) => normalizeSummaryText(heading.textContent ?? ""))
    .filter(Boolean)
    .slice(0, MAX_SUMMARY_ITEMS);
};

const collectTableHeaders = (element: HTMLElement): string[] => {
  return Array.from(element.querySelectorAll("table"))
    .flatMap((table) =>
      Array.from(table.querySelectorAll("thead th")).map((cell) => normalizeSummaryText(cell.textContent ?? ""))
    )
    .filter(Boolean)
    .slice(0, MAX_SUMMARY_ITEMS);
};

const countCodeBlocks = (element: HTMLElement): number => {
  return element.querySelectorAll("pre").length;
};

export const buildGenericDomSummary = (element: HTMLElement): string | null => {
  const sections: string[] = [];
  const headings = collectHeadingTexts(element);
  const tableHeaders = collectTableHeaders(element);
  const codeBlocks = countCodeBlocks(element);

  if (headings.length > 0) {
    sections.push(`headings: ${headings.join(", ")}`);
  }

  if (tableHeaders.length > 0) {
    sections.push(`tables: ${tableHeaders.join(", ")}`);
  }

  if (codeBlocks > 0) {
    sections.push(`codeBlocks: ${codeBlocks}`);
  }

  return sections.length > 0 ? sections.join(" | ") : null;
};
