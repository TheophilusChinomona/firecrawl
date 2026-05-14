/**
 * Unit tests for v2 search: country/enterprise fields (#3437)
 * and searchWithMetadata envelope (#3438).
 */
import { describe, test, expect } from "@jest/globals";
import { prepareSearchPayload, search, searchWithMetadata } from "../../../v2/methods/search";
import type { SearchRequest } from "../../../v2/types";
import type { HttpClient } from "../../../v2/utils/httpClient";

function mockHttp(responseData: Record<string, unknown>): HttpClient {
  return {
    post: jest.fn().mockResolvedValue({
      status: 200,
      data: {
        success: true,
        ...responseData,
      },
    }),
  } as unknown as HttpClient;
}

describe("v2 prepareSearchPayload", () => {
  test("forwards country when provided", () => {
    const req: SearchRequest = { query: "test", country: "US" };
    const payload = prepareSearchPayload(req);
    expect(payload.country).toBe("US");
  });

  test("does not include country when not provided", () => {
    const req: SearchRequest = { query: "test" };
    const payload = prepareSearchPayload(req);
    expect(payload).not.toHaveProperty("country");
  });

  test("forwards enterprise when provided", () => {
    const req: SearchRequest = {
      query: "test",
      enterprise: ["default", "anon"],
    };
    const payload = prepareSearchPayload(req);
    expect(payload.enterprise).toEqual(["default", "anon"]);
  });

  test("does not include enterprise when not provided", () => {
    const req: SearchRequest = { query: "test" };
    const payload = prepareSearchPayload(req);
    expect(payload).not.toHaveProperty("enterprise");
  });

  test("forwards both country and enterprise together", () => {
    const req: SearchRequest = {
      query: "test",
      country: "GB",
      enterprise: ["zdr"],
    };
    const payload = prepareSearchPayload(req);
    expect(payload.country).toBe("GB");
    expect(payload.enterprise).toEqual(["zdr"]);
  });
});

const FULL_API_RESPONSE = {
  id: "search-abc-123",
  creditsUsed: 5,
  warning: "Rate limit approaching",
  data: {
    web: [
      { url: "https://example.com", title: "Example", description: "A site" },
    ],
    news: [
      { title: "News item", url: "https://news.example.com", snippet: "Breaking" },
    ],
  },
};

describe("v2 search()", () => {
  test("returns only SearchData without envelope metadata", async () => {
    const http = mockHttp(FULL_API_RESPONSE);
    const result = await search(http, { query: "test query" });

    expect(result.web).toBeDefined();
    expect(result.web).toHaveLength(1);
    expect(result.web![0]).toMatchObject({ url: "https://example.com" });
    expect(result.news).toBeDefined();
    expect(result.news).toHaveLength(1);

    expect((result as any).id).toBeUndefined();
    expect((result as any).creditsUsed).toBeUndefined();
    expect((result as any).warning).toBeUndefined();
  });

  test("returns empty SearchData when API returns no data", async () => {
    const http = mockHttp({});
    const result = await search(http, { query: "empty" });
    expect(result).toEqual({});
  });
});

describe("v2 searchWithMetadata()", () => {
  test("returns full envelope with id, creditsUsed, warning, and data", async () => {
    const http = mockHttp(FULL_API_RESPONSE);
    const result = await searchWithMetadata(http, { query: "test query" });

    expect(result.id).toBe("search-abc-123");
    expect(result.creditsUsed).toBe(5);
    expect(result.warning).toBe("Rate limit approaching");

    expect(result.data.web).toBeDefined();
    expect(result.data.web).toHaveLength(1);
    expect(result.data.web![0]).toMatchObject({ url: "https://example.com" });
    expect(result.data.news).toBeDefined();
    expect(result.data.news).toHaveLength(1);
  });

  test("omits optional envelope fields when not present in response", async () => {
    const http = mockHttp({
      data: {
        web: [{ url: "https://example.com", title: "Example" }],
      },
    });
    const result = await searchWithMetadata(http, { query: "minimal" });

    expect(result.data.web).toHaveLength(1);
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("creditsUsed");
    expect(result).not.toHaveProperty("warning");
  });

  test("includes warning: null when API explicitly returns null", async () => {
    const http = mockHttp({
      id: "search-xyz",
      creditsUsed: 1,
      warning: null,
      data: { web: [] },
    });
    const result = await searchWithMetadata(http, { query: "null warning" });

    expect(result.id).toBe("search-xyz");
    expect(result.creditsUsed).toBe(1);
    expect(result.warning).toBeNull();
  });

  test("transforms Document-like items in search results correctly", async () => {
    const http = mockHttp({
      id: "search-doc",
      creditsUsed: 2,
      data: {
        web: [
          { markdown: "# Hello", metadata: { title: "Hello" } },
          { url: "https://plain.example.com", title: "Plain result" },
        ],
      },
    });
    const result = await searchWithMetadata(http, { query: "documents" });

    expect(result.data.web).toHaveLength(2);
    expect((result.data.web![0] as any).markdown).toBe("# Hello");
    expect((result.data.web![1] as any).url).toBe("https://plain.example.com");
  });
});

describe("search payload validation", () => {
  test("throws on empty query", async () => {
    const http = mockHttp({});
    await expect(search(http, { query: "" })).rejects.toThrow("Query cannot be empty");
    await expect(searchWithMetadata(http, { query: "  " })).rejects.toThrow("Query cannot be empty");
  });

  test("throws on non-positive limit", async () => {
    const http = mockHttp({});
    await expect(search(http, { query: "test", limit: 0 })).rejects.toThrow("limit must be positive");
    await expect(searchWithMetadata(http, { query: "test", limit: -1 })).rejects.toThrow("limit must be positive");
  });

  test("throws when both includeDomains and excludeDomains are set", async () => {
    const http = mockHttp({});
    await expect(
      search(http, { query: "test", includeDomains: ["a.com"], excludeDomains: ["b.com"] }),
    ).rejects.toThrow("includeDomains and excludeDomains cannot both be specified");
  });
});
