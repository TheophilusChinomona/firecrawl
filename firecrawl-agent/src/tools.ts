import type { CustomTool } from "@oh-my-pi/pi-coding-agent";
import { zod } from "@oh-my-pi/pi-coding-agent";

const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL ?? "http://api:3002";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY ?? "";

export type ScrapedSource = { url: string; title?: string };

/** Extract a string at a dotted path from an unknown JSON blob. */
function dig(obj: unknown, ...keys: string[]): string | undefined {
  let cursor: unknown = obj;
  for (const k of keys) {
    if (cursor === null || typeof cursor !== "object" || !(k in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[k];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

type ToolContent = { type: "text"; text: string };
type ToolResult = { content: ToolContent[]; details: Record<string, unknown> };

/**
 * Build a pair of CustomTool objects with a shared per-request `sources` array.
 * Instantiate once per request so sources is request-scoped.
 */
export function makeTools(): {
  sources: ScrapedSource[];
  firecrawlScrape: CustomTool;
  firecrawlSearch: CustomTool;
} {
  const sources: ScrapedSource[] = [];

  const firecrawlScrape: CustomTool = {
    name: "firecrawl_scrape",
    label: "Scrape URL",
    description:
      "Scrape a URL and return its content as markdown. Use to read a specific page.",
    parameters: zod.object({
      url: zod.string().url().describe("The URL to scrape"),
    }),
    async execute(
      _toolCallId,
      params,
      _onUpdate,
      _ctx,
      signal,
    ): Promise<ToolResult> {
      const p = params as { url: string };
      const response = await fetch(`${FIRECRAWL_API_URL}/v1/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: p.url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`scrape failed: ${response.status}`);
      }

      const raw: unknown = await response.json();
      const markdown = dig(raw, "data", "markdown") ?? "";
      const title = dig(raw, "data", "metadata", "title");

      sources.push({ url: p.url, ...(title !== undefined ? { title } : {}) });

      return {
        content: [{ type: "text", text: markdown }],
        details: { url: p.url, ...(title !== undefined ? { title } : {}) },
      };
    },
  };

  const firecrawlSearch: CustomTool = {
    name: "firecrawl_search",
    label: "Search the web",
    description:
      "Search the web and return relevant URLs with titles and descriptions.",
    parameters: zod.object({
      query: zod.string().describe("The search query"),
      limit: zod
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Maximum number of results"),
    }),
    async execute(
      _toolCallId,
      params,
      _onUpdate,
      _ctx,
      signal,
    ): Promise<ToolResult> {
      const p = params as { query: string; limit?: number };
      const maxSources = Number(process.env.AGENT_MAX_SOURCES ?? "5");
      const response = await fetch(`${FIRECRAWL_API_URL}/v1/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          query: p.query,
          limit: p.limit ?? maxSources,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`search failed: ${response.status}`);
      }

      const raw: unknown = await response.json();
      const rawData =
        raw !== null &&
        typeof raw === "object" &&
        "data" in raw &&
        Array.isArray((raw as Record<string, unknown>)["data"])
          ? ((raw as Record<string, unknown>)["data"] as unknown[])
          : [];

      type SearchResult = {
        url: string;
        title?: string;
        description?: string;
      };

      const results: SearchResult[] = rawData
        .map((r: unknown): SearchResult | null => {
          if (r === null || typeof r !== "object") return null;
          const obj = r as Record<string, unknown>;
          const url = typeof obj["url"] === "string" ? obj["url"] : "";
          if (!url) return null;
          return {
            url,
            ...(typeof obj["title"] === "string" ? { title: obj["title"] } : {}),
            ...(typeof obj["description"] === "string"
              ? { description: obj["description"] }
              : {}),
          };
        })
        .filter((r): r is SearchResult => r !== null);

      return {
        content: [{ type: "text", text: JSON.stringify(results) }],
        details: { count: results.length },
      };
    },
  };

  return { sources, firecrawlScrape, firecrawlSearch };
}
