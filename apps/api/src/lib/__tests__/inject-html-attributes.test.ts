import { injectHtmlAttributeAnnotations } from "../inject-html-attributes";

describe("injectHtmlAttributeAnnotations", () => {
  it("should annotate elements with title attribute", () => {
    const html = '<h1 title="main-title">Hello</h1>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[title=main-title]");
    expect(result).toContain("Hello");
  });

  it("should annotate elements with role attribute", () => {
    const html = '<div role="navigation">Nav content</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[role=navigation]");
    expect(result).toContain("Nav content");
  });

  it("should annotate elements with aria-label attribute", () => {
    const html = '<button aria-label="Close dialog">X</button>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[aria-label=Close dialog]");
    expect(result).toContain("X");
  });

  it("should annotate elements with aria-describedby attribute", () => {
    const html =
      '<input aria-describedby="help-text" /><span id="help-text">Enter your email</span>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[aria-describedby=help-text]");
  });

  it("should annotate elements with data-testid attribute", () => {
    const html = '<div data-testid="login-form">Form content</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[data-testid=login-form]");
  });

  it("should annotate elements with data-* attributes", () => {
    const html = '<div data-vehicle-name="Tesla Model 3">Car info</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[data-vehicle-name=Tesla Model 3]");
  });

  it("should NOT annotate class attributes", () => {
    const html = '<div class="my-class">Content</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[class=");
  });

  it("should NOT annotate style attributes", () => {
    const html = '<div style="color: red;">Content</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[style=");
  });

  it("should NOT annotate id attributes", () => {
    const html = '<div id="main">Content</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[id=");
  });

  it("should NOT annotate href attributes (links handled by markdown)", () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[href=");
  });

  it("should NOT annotate src attributes (images handled by markdown)", () => {
    const html = '<img src="image.png" alt="photo" />';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[src=");
  });

  it("should annotate multiple attributes on the same element", () => {
    const html =
      '<div role="banner" aria-label="Site header" data-testid="header">Header</div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[role=banner]");
    expect(result).toContain("[aria-label=Site header]");
    expect(result).toContain("[data-testid=header]");
  });

  it("should annotate multiple elements independently", () => {
    const html =
      '<h1 title="page-title">Title</h1><p data-testid="intro">Intro text</p>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[title=page-title]");
    expect(result).toContain("[data-testid=intro]");
  });

  it("should return html unchanged when no meaningful attributes exist", () => {
    const html = '<div class="wrapper"><p>Simple text</p></div>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("Simple text");
    expect(result).not.toMatch(/\[[a-z-]+=.*?\]/);
  });

  it("should handle empty html", () => {
    expect(injectHtmlAttributeAnnotations("")).toBe("");
  });

  it("should handle nested elements with attributes", () => {
    const html =
      '<section role="main"><article data-testid="post"><h2 title="article-heading">Post title</h2></article></section>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).toContain("[role=main]");
    expect(result).toContain("[data-testid=post]");
    expect(result).toContain("[title=article-heading]");
  });

  it("should allow filtering to specific attributes", () => {
    const html =
      '<div role="navigation" title="nav" data-testid="sidebar">Content</div>';
    const result = injectHtmlAttributeAnnotations(html, {
      attributes: ["title"],
    });
    expect(result).toContain("[title=nav]");
    expect(result).not.toContain("[role=");
    expect(result).not.toContain("[data-testid=");
  });

  it("should skip non-visual elements like script and style", () => {
    const html =
      '<script data-testid="analytics">console.log("hi")</script><div role="main">Visible</div>';
    const result = injectHtmlAttributeAnnotations(html);
    // The script element should NOT have an annotation
    expect(result).not.toMatch(/\[data-testid=analytics\]/);
    // The div should still be annotated
    expect(result).toContain("[role=main]");
  });

  it("should skip style elements", () => {
    const html =
      '<style data-theme="dark">.foo { color: red; }</style><p title="intro">Text</p>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[data-theme=");
    expect(result).toContain("[title=intro]");
  });

  it("should escape HTML special characters in attribute values", () => {
    const html = '<div data-info="a<b&c>d">Content</div>';
    const result = injectHtmlAttributeAnnotations(html);
    // The < > & should be escaped so they don't break HTML
    expect(result).toContain("[data-info=a&lt;b&amp;c&gt;d]");
    expect(result).toContain("Content");
  });

  it("should not annotate firecrawl-internal data-original-tag attribute", () => {
    const html = '<span data-original-tag="h1">Title</span>';
    const result = injectHtmlAttributeAnnotations(html);
    expect(result).not.toContain("[data-original-tag=");
  });
});
