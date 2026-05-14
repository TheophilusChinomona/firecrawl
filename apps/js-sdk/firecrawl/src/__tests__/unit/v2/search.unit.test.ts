/**
 * Unit tests for v2 search and searchWithMetadata.
 * - search() returns SearchData (backwards compatible)
 * - searchWithMetadata() returns the full response envelope (SearchResponse)
 */
import { describe, test, expect, jest } from "@jest/globals";
import { search, searchWithMetadata } from "../../../v2/methods/search.js";
import type { HttpClient } from "../../../v2/utils/httpClient.js";

function mockHttp(responseData: Record<string, unknown>): HttpClient {
  return {
    post: jest.fn<any>().mockResolvedValue({
      status: 200,
      data: responseData,
    }),
  } as unknown as HttpClient;
}

describe("v2.search unit – backwards compatibility", () => {
  test("search() returns SearchData with web results", async () => {
    const http = mockHttp({
      success: true,
      id: "search-xyz",
      creditsUsed: 3,
      warning: "some warning",
      data: {
        web: [
          { url: "https://example.com", title: "Test", description: "Test" },
        ],
      },
    });

    const result = await search(http, { query: "test" });

    // search() returns SearchData — id and warning are NOT included
    expect(result).toHaveProperty("web");
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("warning");
  });
});

describe("v2.searchWithMetadata unit", () => {
  test("returns full envelope with data, id, creditsUsed, and warning", async () => {
    const http = mockHttp({
      success: true,
      id: "search-abc-123",
      creditsUsed: 5,
      warning: "Rate limit approaching",
      data: {
        web: [
          {
            url: "https://example.com",
            title: "Example",
            description: "An example site",
          },
        ],
      },
    });

    const result = await searchWithMetadata(http, { query: "test query" });

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("id", "search-abc-123");
    expect(result).toHaveProperty("creditsUsed", 5);
    expect(result).toHaveProperty("warning", "Rate limit approaching");
    expect(result.data).toHaveProperty("web");
    expect(result.data.web).toHaveLength(1);
    expect((result.data.web![0] as any).url).toBe("https://example.com");
  });

  test("handles missing optional envelope fields gracefully", async () => {
    const http = mockHttp({
      success: true,
      data: {
        web: [
          {
            url: "https://example.com",
            title: "Example",
            description: "A site",
          },
        ],
      },
    });

    const result = await searchWithMetadata(http, { query: "test" });

    expect(result).toHaveProperty("data");
    expect(result.id).toBeUndefined();
    expect(result.creditsUsed).toBeUndefined();
    expect(result.warning).toBeUndefined();
    expect(result.data.web).toHaveLength(1);
  });

  test("handles warning as null", async () => {
    const http = mockHttp({
      success: true,
      id: "search-def-456",
      creditsUsed: 2,
      warning: null,
      data: {
        web: [
          {
            url: "https://example.com",
            title: "Test",
            description: "Test site",
          },
        ],
      },
    });

    const result = await searchWithMetadata(http, { query: "test" });

    expect(result.id).toBe("search-def-456");
    expect(result.creditsUsed).toBe(2);
    expect(result.warning).toBeNull();
  });

  test("transforms data arrays correctly (documents vs web results)", async () => {
    const http = mockHttp({
      success: true,
      id: "search-ghi-789",
      creditsUsed: 10,
      data: {
        web: [
          {
            url: "https://example.com",
            title: "Web Result",
            description: "A web result",
          },
          { markdown: "# Scraped content", metadata: { title: "Scraped" } },
        ],
        news: [
          {
            title: "News item",
            url: "https://news.example.com",
            snippet: "Breaking",
          },
        ],
      },
    });

    const result = await searchWithMetadata(http, { query: "test" });

    expect(result.data.web).toHaveLength(2);
    expect(result.data.news).toHaveLength(1);
    expect(result.data.images).toBeUndefined();
    expect(result.id).toBe("search-ghi-789");
    expect(result.creditsUsed).toBe(10);
  });

  test("passes timeout option to HTTP layer", async () => {
    const post = jest.fn<any>().mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: {
          web: [],
        },
      },
    });
    const http = { post } as unknown as HttpClient;

    await searchWithMetadata(http, { query: "test", timeout: 30000 });

    expect(post).toHaveBeenCalledWith(
      "/v2/search",
      expect.objectContaining({ query: "test", timeout: 30000 }),
      { timeoutMs: 35000 },
    );
  });
});
