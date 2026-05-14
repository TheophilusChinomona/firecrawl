import { load } from "cheerio";

/**
 * data-* attributes managed internally by firecrawl that should never be
 * surfaced as annotations.
 */
const EXCLUDED_DATA_ATTRIBUTES = new Set(["data-original-tag"]);

/**
 * Non-visual elements whose attributes should never be annotated because
 * they do not produce visible content in the markdown output.
 */
const NON_VISUAL_ELEMENTS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "head",
  "link",
  "meta",
]);

/**
 * Void / self-closing elements that cannot have child text nodes.
 * Hoisted to module scope to avoid re-creating on every iteration.
 */
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Returns `true` when the attribute carries meaningful semantic information
 * that is useful for searchability (whitelist approach).
 */
function isMeaningfulAttribute(attrName: string): boolean {
  const lower = attrName.toLowerCase();

  // Always include these specific attributes
  if (lower === "title" || lower === "role") {
    return true;
  }

  // Include all aria-* attributes
  if (lower.startsWith("aria-")) {
    return true;
  }

  // Include all data-* attributes except firecrawl-internal ones
  if (lower.startsWith("data-") && !EXCLUDED_DATA_ATTRIBUTES.has(lower)) {
    return true;
  }

  return false;
}

/**
 * Escape characters in attribute values that could break HTML structure
 * or markdown formatting when injected as visible text.
 */
function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface InjectHtmlAttributeOptions {
  /**
   * If provided, only these attribute names will be annotated.
   * Overrides the default meaningful-attribute detection.
   */
  attributes?: string[];
}

/**
 * Pre-processes HTML to inject attribute annotations as visible text within elements.
 * Annotations are appended after the element's content in the format ` [attr=value]`.
 *
 * This is designed to be called before HTML-to-markdown conversion so that the
 * annotations become part of the markdown output.
 */
export function injectHtmlAttributeAnnotations(
  html: string,
  options?: InjectHtmlAttributeOptions,
): string {
  if (!html || html.trim().length === 0) {
    return "";
  }

  const $ = load(html, { xml: false });
  const customFilter = options?.attributes;

  $("*").each((_, el) => {
    if (el.type !== "tag") return;

    // Skip non-visual elements entirely
    if (NON_VISUAL_ELEMENTS.has(el.tagName.toLowerCase())) return;

    const attribs = el.attribs;
    if (!attribs) return;

    const annotations: string[] = [];

    for (const [attrName, attrValue] of Object.entries(attribs)) {
      if (!attrValue && attrValue !== "") continue;

      const shouldInclude = customFilter
        ? customFilter.includes(attrName)
        : isMeaningfulAttribute(attrName);

      if (shouldInclude) {
        annotations.push(` [${attrName}=${escapeAttrValue(attrValue)}]`);
      }
    }

    if (annotations.length > 0) {
      const $el = $(el);

      if (VOID_ELEMENTS.has(el.tagName.toLowerCase())) {
        // For void/self-closing elements place annotation after the element
        $el.after(annotations.join(""));
      } else {
        $el.append(annotations.join(""));
      }
    }
  });

  return $.html() || "";
}
