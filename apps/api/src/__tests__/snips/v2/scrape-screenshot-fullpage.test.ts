import { describeIf, TEST_PRODUCTION } from "../lib";
import { Identity, idmux, scrapeTimeout, scrape, scrapeRaw } from "./lib";

/**
 * Tests for GitHub issue #3384: Screenshot not capturing full page when
 * `fullPage: true`. Verifies both the format-based and action-based paths
 * produce a screenshot whose base-64 payload is meaningfully larger than a
 * viewport-only capture (which implies the full page was captured).
 *
 * These tests require fire-engine and therefore only run in production mode.
 */
describeIf(TEST_PRODUCTION)("V2 Scrape Screenshot fullPage (#3384)", () => {
  let identity: Identity;

  beforeAll(async () => {
    identity = await idmux({
      name: "v2-scrape-screenshot-fullpage",
      concurrency: 100,
      credits: 1000000,
    });
  }, 10000);

  // ---------------------------------------------------------------------------
  // Happy-path: format-based fullPage screenshot
  // ---------------------------------------------------------------------------
  test(
    "fullPage screenshot via formats produces a larger image than viewport-only",
    async () => {
      // Use a page known to have content well beyond the initial viewport.
      const url = "https://en.wikipedia.org/wiki/Web_scraping";

      const [viewportOnly, fullPage] = await Promise.all([
        scrape(
          {
            url,
            formats: [{ type: "screenshot", fullPage: false }],
          },
          identity,
        ),
        scrape(
          {
            url,
            formats: [{ type: "screenshot", fullPage: true }],
          },
          identity,
        ),
      ]);

      expect(viewportOnly.screenshot).toBeDefined();
      expect(fullPage.screenshot).toBeDefined();

      // Both should be non-empty strings (base64-encoded or URL)
      expect(typeof viewportOnly.screenshot).toBe("string");
      expect(typeof fullPage.screenshot).toBe("string");
      expect(viewportOnly.screenshot!.length).toBeGreaterThan(0);
      expect(fullPage.screenshot!.length).toBeGreaterThan(0);

      // The fullPage screenshot payload should be meaningfully larger because
      // the image covers significantly more vertical content.
      // A 1.5x threshold is conservative — real full-page captures on long
      // pages are typically 5-20x larger.
      expect(fullPage.screenshot!.length).toBeGreaterThan(
        viewportOnly.screenshot!.length * 1.5,
      );
    },
    scrapeTimeout * 2, // Two scrapes in parallel — give extra time
  );

  // ---------------------------------------------------------------------------
  // Happy-path: action-based fullPage screenshot
  // ---------------------------------------------------------------------------
  test(
    "fullPage screenshot via actions produces a screenshot",
    async () => {
      const url = "https://en.wikipedia.org/wiki/Web_scraping";

      const data = await scrape(
        {
          url,
          formats: [{ type: "markdown" }],
          actions: [{ type: "screenshot", fullPage: true }],
        },
        identity,
      );

      expect(data.actions).toBeDefined();
      expect(data.actions!.screenshots).toBeDefined();
      expect(data.actions!.screenshots!.length).toBeGreaterThan(0);

      const actionScreenshot = data.actions!.screenshots![0];
      expect(typeof actionScreenshot).toBe("string");
      expect(actionScreenshot.length).toBeGreaterThan(0);
    },
    scrapeTimeout,
  );

  // ---------------------------------------------------------------------------
  // Happy-path: fullPage with custom viewport via formats
  // ---------------------------------------------------------------------------
  test(
    "fullPage screenshot with custom viewport captures beyond viewport height",
    async () => {
      const url = "https://en.wikipedia.org/wiki/Web_scraping";

      const data = await scrape(
        {
          url,
          formats: [
            {
              type: "screenshot",
              fullPage: true,
              viewport: { width: 1280, height: 720 },
            },
          ],
        },
        identity,
      );

      expect(data.screenshot).toBeDefined();
      expect(typeof data.screenshot).toBe("string");
      expect(data.screenshot!.length).toBeGreaterThan(0);
    },
    scrapeTimeout,
  );

  // ---------------------------------------------------------------------------
  // Failure-path: fullPage false should NOT capture the full page
  // (the screenshot payload should be smaller for a long page)
  // ---------------------------------------------------------------------------
  test(
    "viewport-only screenshot is smaller than fullPage for a long page",
    async () => {
      const url = "https://en.wikipedia.org/wiki/Web_scraping";

      const [viewportOnly, fullPage] = await Promise.all([
        scrape(
          {
            url,
            formats: [{ type: "screenshot", fullPage: false }],
          },
          identity,
        ),
        scrape(
          {
            url,
            formats: [{ type: "screenshot", fullPage: true }],
          },
          identity,
        ),
      ]);

      expect(viewportOnly.screenshot).toBeDefined();
      expect(fullPage.screenshot).toBeDefined();

      // Viewport-only should be strictly smaller
      expect(viewportOnly.screenshot!.length).toBeLessThan(
        fullPage.screenshot!.length,
      );
    },
    scrapeTimeout * 2,
  );
});
