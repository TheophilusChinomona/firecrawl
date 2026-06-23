/**
 * E2E snip for /v2/agent (self-hosted omp sidecar).
 *
 * Requires: sidecar reachable at FIRECRAWL_AGENT_URL (started by docker compose).
 * Gated on: HAS_AI (OPENROUTER_API_KEY set) + ALLOW_TEST_SUITE_WEBSITE, or TEST_PRODUCTION.
 *
 * If the harness does not start the sidecar, this test will fail with a 500
 * and is expected to pass only in the full compose stack.
 */
import request from "supertest";
import {
  TEST_API_URL,
  HAS_AI,
  ALLOW_TEST_SUITE_WEBSITE,
  TEST_PRODUCTION,
  describeIf,
  idmux,
} from "../lib";

// Real delay: this is an integration test that polls a live async job against
// the actual running API. The job completes in real time; fake timers cannot
// drive the underlying BullMQ worker or the omp agent loop.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const HAS_SIDECAR =
  TEST_PRODUCTION || (HAS_AI && ALLOW_TEST_SUITE_WEBSITE);

async function pollAgent(
  jobId: string,
  apiKey: string,
  maxMs = 120_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const resp = await request(TEST_API_URL)
      .get(`/v2/agent/${jobId}`)
      .set("Authorization", `Bearer ${apiKey}`)
      .set("Content-Type", "application/json");

    const body = resp.body as Record<string, unknown>;
    if (body["status"] === "completed" || body["status"] === "failed") {
      return body;
    }
    await sleep(3000);
  }
  throw new Error("Agent timed out polling");
}

describeIf(HAS_SIDECAR)("POST /v2/agent (self-hosted sidecar)", () => {
  it(
    "markdown mode: scrapes example.com and returns non-empty summary",
    async () => {
      const identity = await idmux({
        name: "agent/markdown-mode",
        credits: 0,
      });

      const createResp = await request(TEST_API_URL)
        .post("/v2/agent")
        .set("Authorization", `Bearer ${identity.apiKey}`)
        .set("Content-Type", "application/json")
        .send({
          urls: ["https://example.com"],
          prompt: "Summarize this page in one sentence.",
        });

      expect(createResp.statusCode).toBe(200);
      expect(createResp.body.success).toBe(true);
      const jobId = createResp.body.id as string;
      expect(typeof jobId).toBe("string");

      const result = await pollAgent(jobId, identity.apiKey);

      expect(result["status"]).toBe("completed");
      expect(typeof result["model"]).toBe("string");
      const data = result["data"] as Record<string, unknown> | undefined;
      expect(data).toBeDefined();
      expect(typeof data?.["markdown"]).toBe("string");
      expect((data?.["markdown"] as string).length).toBeGreaterThan(10);
      expect(Array.isArray(data?.["sources"])).toBe(true);
      const sources = data?.["sources"] as Array<Record<string, unknown>>;
      expect(
        sources.some((s) =>
          (s["url"] as string | undefined)?.startsWith("https://example.com"),
        ),
      ).toBe(true);
    },
    120_000,
  );

  it(
    "schema mode: returns valid JSON matching the requested shape",
    async () => {
      const identity = await idmux({
        name: "agent/schema-mode",
        credits: 0,
      });

      const schema = {
        type: "object",
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      };

      const createResp = await request(TEST_API_URL)
        .post("/v2/agent")
        .set("Authorization", `Bearer ${identity.apiKey}`)
        .set("Content-Type", "application/json")
        .send({
          urls: ["https://example.com"],
          prompt: "Return a JSON object with a 'summary' field.",
          schema,
        });

      expect(createResp.statusCode).toBe(200);
      const jobId = createResp.body.id as string;

      const result = await pollAgent(jobId, identity.apiKey);

      expect(result["status"]).toBe("completed");
      const data = result["data"] as Record<string, unknown> | undefined;
      expect(data?.["json"]).toBeDefined();
      const json = data?.["json"] as Record<string, unknown>;
      expect(typeof json["summary"]).toBe("string");
    },
    120_000,
  );

  it(
    "DELETE /v2/agent/:id returns 200 for a processing job",
    async () => {
      const identity = await idmux({
        name: "agent/cancel",
        credits: 0,
      });

      const createResp = await request(TEST_API_URL)
        .post("/v2/agent")
        .set("Authorization", `Bearer ${identity.apiKey}`)
        .set("Content-Type", "application/json")
        .send({
          prompt:
            "Search for and read 20 pages about the history of the internet.",
        });

      expect(createResp.statusCode).toBe(200);
      const jobId = createResp.body.id as string;

      // Cancel immediately before the worker picks it up.
      const cancelResp = await request(TEST_API_URL)
        .delete(`/v2/agent/${jobId}`)
        .set("Authorization", `Bearer ${identity.apiKey}`);

      // 200 means cancelled; 409 means it already completed — both are valid.
      expect([200, 409]).toContain(cancelResp.statusCode);
    },
    30_000,
  );
});
