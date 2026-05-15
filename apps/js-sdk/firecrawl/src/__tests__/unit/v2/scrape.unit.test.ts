/**
 * Minimal unit test for v2 scrape (no mocking; sanity check payload path)
 */
import { describe, test, expect, jest } from "@jest/globals";
import { FirecrawlClient } from "../../../v2/client";
import { scrape } from "../../../v2/methods/scrape";

describe("v2.scrape unit", () => {
  test("constructor requires apiKey", () => {
    expect(() => new FirecrawlClient({ apiKey: "", apiUrl: "https://api.firecrawl.dev" })).toThrow();
  });

  test("scrape converts seconds-based body timeout to ms axios timeout", async () => {
    const post = jest.fn(async () => ({
      status: 200,
      data: { success: true, data: { markdown: "hello" } },
    }));

    const http = { post } as any;
    await scrape(http, "https://example.com", { timeout: 300 });

    // API body should contain timeout in seconds (300)
    // Axios config should contain timeoutMs = 300 * 1000 + 5000 = 305000
    expect(post).toHaveBeenCalledWith(
      "/v2/scrape",
      expect.objectContaining({ url: "https://example.com", timeout: 300 }),
      { timeoutMs: 305000 },
    );
  });

  test("scrape without timeout does not set axios timeout override", async () => {
    const post = jest.fn(async () => ({
      status: 200,
      data: { success: true, data: { markdown: "hello" } },
    }));

    const http = { post } as any;
    await scrape(http, "https://example.com");

    expect(post).toHaveBeenCalledWith(
      "/v2/scrape",
      expect.objectContaining({ url: "https://example.com" }),
      {},
    );
  });
});

