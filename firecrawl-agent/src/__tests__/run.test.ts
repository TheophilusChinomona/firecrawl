import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";

// ── Fake omp SDK ────────────────────────────────────────────────────────────
// Replaced via module mock below; defined here so the spy can be referenced.

let capturedSessionOptions: Record<string, unknown> = {};
let fakeTextOutput = "";

const fakeSession = {
  subscribe(handler: (event: unknown) => void) {
    // Emit agent_end with an assistant message — matching the real SDK event shape.
    handler({
      type: "agent_end",
      messages: [
        { role: "user", content: [{ type: "text", text: "prompt" }] },
        {
          role: "assistant",
          stopReason: "end_turn",
          content: fakeTextOutput
            ? [{ type: "text", text: fakeTextOutput }]
            : [],
        },
      ],
    });
    return () => undefined;
  },
  async prompt(_fullPrompt: string) {
    // no-op; text emitted synchronously in subscribe above.
  },
  async dispose() {
    // no-op
  },
};

mock.module("@oh-my-pi/pi-coding-agent", () => {
  const { z } = require("zod");
  return {
    createAgentSession: async (opts: Record<string, unknown>) => {
      capturedSessionOptions = opts;
      return { session: fakeSession };
    },
    SessionManager: { inMemory: () => ({ type: "inMemory" }) },
    AuthStorage: class {
      async setRuntimeApiKey() {}
    },
    ModelRegistry: class {
      constructor(_auth: unknown) {}
      async refresh() {}
      find(_provider: string, _id: string) {
        return { id: "test/model:free", provider: "test" };
      }
    },
    // zod used by tools.ts for parameters schemas
    zod: z,
  };
});

// ── Fake fetch ──────────────────────────────────────────────────────────────
const fakeScrapeResponse = {
  data: {
    markdown: "# Example\nThis is example.com.",
    metadata: { title: "Example Domain" },
  },
};

const fakeSearchResponse = {
  data: [
    {
      url: "https://example.com",
      title: "Example Domain",
      description: "This domain is for illustrative examples.",
    },
  ],
};

function makeFetchSpy(scrapeBody: unknown, searchBody: unknown) {
  return spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/v1/scrape")) {
      return new Response(JSON.stringify(scrapeBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/v1/search")) {
      return new Response(JSON.stringify(searchBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not Found", { status: 404 });
  });
}

// Import server module AFTER mocks are set up.
// static import is fine here because bun:test hoists mock.module calls.
import { handleRunForTest } from "../server.js";

describe("sidecar /run handler", () => {
  beforeEach(() => {
    capturedSessionOptions = {};
    fakeTextOutput = "";
  });

  it("returns markdown mode response for a plain prompt", async () => {
    fakeTextOutput = "Example.com is a placeholder domain used in docs.";
    makeFetchSpy(fakeScrapeResponse, fakeSearchResponse);

    const res = await handleRunForTest({
      prompt: "Summarize example.com",
      urls: ["https://example.com"],
    });

    expect(res.success).toBe(true);
    if (!res.success) return;
    const data = res.data as { markdown: string; sources: unknown[] };
    expect(typeof data.markdown).toBe("string");
    expect(data.markdown.length).toBeGreaterThan(0);
    expect(Array.isArray(data.sources)).toBe(true);
  });

  it("parses JSON and returns json mode when schema is provided", async () => {
    fakeTextOutput = '{"title":"Example Domain"}';
    makeFetchSpy(fakeScrapeResponse, fakeSearchResponse);

    const res = await handleRunForTest({
      prompt: "Extract the page title",
      urls: ["https://example.com"],
      schema: { type: "object", properties: { title: { type: "string" } } },
    });

    expect(res.success).toBe(true);
    if (!res.success) return;
    const data = res.data as { json: unknown };
    expect(data.json).toEqual({ title: "Example Domain" });
  });

  it("returns success:false when agent output is not valid JSON in schema mode", async () => {
    fakeTextOutput = "not json at all";
    makeFetchSpy(fakeScrapeResponse, fakeSearchResponse);

    const res = await handleRunForTest({
      prompt: "Extract data",
      schema: { type: "object" },
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toMatch(/did not return valid JSON/i);
  });

  it("returns success:false when agent produces no output", async () => {
    fakeTextOutput = "";
    makeFetchSpy(fakeScrapeResponse, fakeSearchResponse);

    const res = await handleRunForTest({
      prompt: "Summarize something",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toMatch(/no output/i);
  });

  // ── Security-critical: tool lockdown check ──────────────────────────────

  it("passes toolNames:[] and exactly 2 custom tools to createAgentSession", async () => {
    fakeTextOutput = "done";
    makeFetchSpy(fakeScrapeResponse, fakeSearchResponse);

    await handleRunForTest({ prompt: "test" });

    expect(capturedSessionOptions.toolNames).toEqual([]);
    expect(
      Array.isArray(capturedSessionOptions.customTools) &&
        (capturedSessionOptions.customTools as unknown[]).length === 2,
    ).toBe(true);
    expect(capturedSessionOptions.enableMCP).toBe(false);
  });
});
