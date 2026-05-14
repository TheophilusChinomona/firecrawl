import { load } from "cheerio";

/**
 * Attributes that are always excluded from annotation because they are noise
 * or already handled by markdown conversion (e.g. href -> links, src -> images).
 */
const EXCLUDED_ATTRIBUTES = new Set([
  "class",
  "style",
  "id",
  "href",
  "src",
  "srcset",
  "alt", // alt text is already rendered by markdown img syntax
  "width",
  "height",
  "colspan",
  "rowspan",
  "type", // too noisy on input/script/link elements
  "rel",
  "target",
  "charset",
  "name", // meta name, input name - too noisy
  "content", // meta content - too noisy
  "http-equiv",
  "action",
  "method",
  "enctype",
  "value", // form values - could be sensitive
  "placeholder",
  "for",
  "tabindex",
  "autocomplete",
  "autofocus",
  "disabled",
  "readonly",
  "required",
  "checked",
  "selected",
  "multiple",
  "maxlength",
  "minlength",
  "pattern",
  "min",
  "max",
  "step",
  "hidden",
  "loading",
  "decoding",
  "crossorigin",
  "integrity",
  "referrerpolicy",
  "sandbox",
  "allow",
  "allowfullscreen",
  "frameborder",
  "scrolling",
  "marginwidth",
  "marginheight",
  "xmlns",
  "lang",
  "dir",
  "translate",
  "spellcheck",
  "contenteditable",
  "draggable",
  "contextmenu",
  "accesskey",
  "itemprop",
  "itemscope",
  "itemtype",
  "itemid",
  "itemref",
  "property",
  "about",
  "datatype",
  "inlist",
  "prefix",
  "resource",
  "typeof",
  "vocab",
  "nonce",
  "slot",
  "is",
  "part",
  "exportparts",
  "elementtiming",
  "fetchpriority",
  "blocking",
  "importance",
  "sizes",
  "media",
  "ping",
  "download",
  "hreflang",
  "referrer",
  "scope",
  "headers",
  "abbr",
  "axis",
  "bgcolor",
  "border",
  "cellpadding",
  "cellspacing",
  "rules",
  "summary",
  "valign",
  "align",
  "nowrap",
  "face",
  "color",
  "size",
  "compact",
  "noshade",
  "start",
  "reversed",
  "coords",
  "shape",
  "usemap",
  "ismap",
  "longdesc",
  "vspace",
  "hspace",
  "alink",
  "link",
  "text",
  "vlink",
  "background",
  "topmargin",
  "leftmargin",
  "rightmargin",
  "bottommargin",
  "data-original-tag", // firecrawl internal attribute
]);

/**
 * Attribute name patterns that are always meaningful and should be included.
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

  // Include all data-* attributes (except excluded ones)
  if (lower.startsWith("data-") && !EXCLUDED_ATTRIBUTES.has(lower)) {
    return true;
  }

  return false;
}

export interface InjectHtmlAttributeOptions {
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

    const attribs = el.attribs;
    if (!attribs) return;

    const annotations: string[] = [];

    for (const [attrName, attrValue] of Object.entries(attribs)) {
      if (!attrValue && attrValue !== "") continue;

      const shouldInclude = customFilter
        ? customFilter.includes(attrName)
        : isMeaningfulAttribute(attrName);

      if (shouldInclude) {
        annotations.push(` [${attrName}=${attrValue}]`);
      }
    }

    if (annotations.length > 0) {
      const $el = $(el);
      // For void/self-closing elements (input, img, br, etc.), wrap with a span
      // so the annotation appears in the text flow
      const voidElements = new Set([
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

      if (voidElements.has(el.tagName.toLowerCase())) {
        $el.after(annotations.join(""));
      } else {
        $el.append(annotations.join(""));
      }
    }
  });

  return $.html() || "";
}
