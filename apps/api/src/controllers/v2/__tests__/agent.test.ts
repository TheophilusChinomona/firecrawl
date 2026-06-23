import type { Mock } from "vitest";
import type { Response } from "express";
import { agentController } from "../agent";
import type { AgentRequest, AgentResponse, RequestWithAuth } from "../types";
import { config } from "../../../config";
import { saveAgent } from "../../../lib/agent/agent-redis";
import { getAgentQueue } from "../../../services/queue-service";
import { logRequest } from "../../../services/logging/log_job";
import { getScrapeZDR } from "../../../lib/zdr-helpers";

vi.mock("../../../lib/agent/agent-redis", () => ({
  saveAgent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../services/queue-service", () => ({
  getAgentQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock("../../../services/logging/log_job", () => ({
  logRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../db/rpc", () => ({
  agentConsumeFreeRequestIfLeft: vi.fn().mockResolvedValue([{ consumed: false }]),
}));

vi.mock("../../../lib/zdr-helpers", () => ({
  getScrapeZDR: vi.fn(() => "allowed"),
}));

describe("agentController (local branch)", () => {
  const buildReq = (
    overrides: Record<string, unknown> = {},
  ): RequestWithAuth<Record<string, never>, AgentResponse, AgentRequest> =>
    ({
      body: {
        prompt: "Summarize example.com",
        model: config.AGENT_MODEL,
        origin: "api",
        ...overrides,
      },
      auth: { team_id: "team-abc" },
      acuc: { sub_id: "sub-1", api_key_id: "key-1", api_key: "fc-test", flags: {} },
      params: {},
    }) as unknown as RequestWithAuth<Record<string, never>, AgentResponse, AgentRequest>;

  const buildRes = () =>
    ({
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }) as unknown as Response<AgentResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore ZDR mock to "allowed" so test 4 (forced-ZDR) doesn't bleed
    // into later tests via clearAllMocks (which resets history, not impl).
    (getScrapeZDR as Mock).mockReturnValue("allowed");
    // Restore queue mock to a fresh add-spy.
    (getAgentQueue as Mock).mockReturnValue({ add: vi.fn().mockResolvedValue(undefined) });
    // Ensure no remote passthrough — override via Object.defineProperty since
    // config is a parsed const; cannot reassign directly.
    Object.defineProperty(config, "EXTRACT_V3_BETA_URL", {
      get: () => undefined,
      configurable: true,
    });
  });

  it("returns success:true with an id and enqueues the job", async () => {
    const res = buildRes();
    await agentController(buildReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = (res.json as Mock).mock.calls[0]?.[0] as {
      success: boolean;
      id: string;
    };
    expect(json.success).toBe(true);
    expect(typeof json.id).toBe("string");
    expect(json.id.length).toBeGreaterThan(0);

    expect(saveAgent).toHaveBeenCalledOnce();
    expect(getAgentQueue).toHaveBeenCalledOnce();
  });

  it("uses config.AGENT_MODEL as default model", async () => {
    const res = buildRes();
    await agentController(buildReq(), res);

    const saved = (saveAgent as Mock).mock.calls[0]?.[1] as { model: string };
    expect(saved.model).toBe(config.AGENT_MODEL);
  });

  it("enqueues with correct jobData shape", async () => {
    const queueAddMock = vi.fn().mockResolvedValue(undefined);
    (getAgentQueue as Mock).mockReturnValue({ add: queueAddMock });

    const res = buildRes();
    await agentController(buildReq({ urls: ["https://example.com"] }), res);

    expect(queueAddMock).toHaveBeenCalledOnce();
    const [, jobData, opts] = queueAddMock.mock.calls[0] as [
      string,
      { agentId: string; teamId: string; request: unknown },
      { jobId: string },
    ];
    expect(typeof jobData.agentId).toBe("string");
    expect(jobData.teamId).toBe("team-abc");
    expect(opts.jobId).toBe(jobData.agentId);
  });

  it("returns 400 for forced ZDR", async () => {
    (getScrapeZDR as Mock).mockReturnValue("forced");
    const res = buildRes();
    await agentController(buildReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const json = (res.json as Mock).mock.calls[0]?.[0] as {
      success: boolean;
      error: string;
    };
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/zero data retention/i);
  });

  it("calls logRequest with kind:'agent' and api_version:'v2'", async () => {
    const res = buildRes();
    await agentController(buildReq(), res);

    expect(logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "agent", api_version: "v2" }),
    );
  });
});
