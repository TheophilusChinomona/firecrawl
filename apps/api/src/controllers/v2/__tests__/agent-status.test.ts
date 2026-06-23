import type { Mock } from "vitest";
import type { Response } from "express";
import { agentStatusController } from "../agent-status";
import type { RequestWithAuth, AgentStatusResponse } from "../types";
import {
  supabaseGetAgentByIdDirect,
  supabaseGetAgentRequestByIdDirect,
} from "../../../lib/supabase-jobs";
import { getJobFromGCS } from "../../../lib/gcs-jobs";
import {
  getAgent,
  getAgentExpiry,
  getAgentResult,
} from "../../../lib/agent/agent-redis";

vi.mock("../../../lib/supabase-jobs", () => ({
  supabaseGetAgentByIdDirect: vi.fn(),
  supabaseGetAgentRequestByIdDirect: vi.fn(),
}));

vi.mock("../../../lib/gcs-jobs", () => ({
  getJobFromGCS: vi.fn(),
}));

vi.mock("../../../lib/agent/agent-redis", () => ({
  getAgent: vi.fn(),
  getAgentExpiry: vi.fn(),
  getAgentResult: vi.fn(),
}));

describe("agentStatusController", () => {
  const baseReq = {
    params: { jobId: "job-123" },
    auth: { team_id: "team-123" },
  } as RequestWithAuth<{ jobId: string }, AgentStatusResponse, unknown>;

  const buildRes = () =>
    ({
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }) as unknown as Response<AgentStatusResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no local record, no remote record.
    (getAgent as Mock).mockResolvedValue(null);
    (supabaseGetAgentRequestByIdDirect as Mock).mockResolvedValue(null);
    (supabaseGetAgentByIdDirect as Mock).mockResolvedValue(null);
    (getAgentExpiry as Mock).mockResolvedValue(new Date("2099-01-01T00:00:00Z"));
    (getAgentResult as Mock).mockResolvedValue(null);
  });

  // ── Local Redis branch ────────────────────────────────────────────────────

  it("returns 404 when no local record and no remote record", async () => {
    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const json = (res.json as Mock).mock.calls[0]?.[0] as { success: boolean };
    expect(json.success).toBe(false);
  });

  it("returns 404 for local record with wrong team_id", async () => {
    (getAgent as Mock).mockResolvedValue({
      id: "job-123",
      team_id: "other-team",
      status: "processing",
      model: "openrouter/test",
      createdAt: Date.now(),
      request: { prompt: "test", model: "openrouter/test", origin: "api" },
    });

    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns processing status from local Redis", async () => {
    (getAgent as Mock).mockResolvedValue({
      id: "job-123",
      team_id: "team-123",
      status: "processing",
      model: "openrouter/test",
      createdAt: Date.now(),
      request: { prompt: "test", model: "openrouter/test", origin: "api" },
    });

    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = (res.json as Mock).mock.calls[0]?.[0] as AgentStatusResponse;
    if (!json.success) throw new Error("Expected success");
    expect(json.status).toBe("processing");
    expect(json.data).toBeUndefined();
  });

  it("returns completed status with data from local Redis", async () => {
    (getAgent as Mock).mockResolvedValue({
      id: "job-123",
      team_id: "team-123",
      status: "completed",
      model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
      createdAt: Date.now(),
      request: { prompt: "test", model: "openrouter/test", origin: "api" },
    });
    (getAgentResult as Mock).mockResolvedValue({
      markdown: "Summary text",
      sources: [{ url: "https://example.com" }],
    });

    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = (res.json as Mock).mock.calls[0]?.[0] as AgentStatusResponse;
    if (!json.success) throw new Error("Expected success");
    expect(json.status).toBe("completed");
    expect(json.model).toBe("openrouter/nvidia/nemotron-3-super-120b-a12b:free");
    expect(json.data).toBeDefined();
  });

  it("returns cancelled status from local Redis", async () => {
    (getAgent as Mock).mockResolvedValue({
      id: "job-123",
      team_id: "team-123",
      status: "cancelled",
      model: "openrouter/test",
      createdAt: Date.now(),
      cancelledAt: Date.now(),
      request: { prompt: "test", model: "openrouter/test", origin: "api" },
    });

    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = (res.json as Mock).mock.calls[0]?.[0] as AgentStatusResponse;
    if (!json.success) throw new Error("Expected success");
    expect(json.status).toBe("cancelled");
  });

  // ── Remote / supabase branch ──────────────────────────────────────────────

  it("returns model from agent options (remote branch)", async () => {
    (getAgent as Mock).mockResolvedValue(null);
    (supabaseGetAgentRequestByIdDirect as Mock).mockResolvedValue({
      team_id: "team-123",
      created_at: "2025-01-01T00:00:00Z",
    });
    (supabaseGetAgentByIdDirect as Mock).mockResolvedValue({
      id: "job-123",
      is_successful: true,
      options: { model: "spark-1-mini" },
      created_at: "2025-01-01T00:00:00Z",
    });
    (getJobFromGCS as Mock).mockResolvedValue({ result: "ok" });

    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = (res.json as Mock).mock.calls[0]?.[0] as AgentStatusResponse;
    if (!json.success) throw new Error("Expected success");
    expect(json.model).toBe("spark-1-mini");
  });

  it("defaults model to spark-1-pro when missing (remote branch)", async () => {
    (getAgent as Mock).mockResolvedValue(null);
    (supabaseGetAgentRequestByIdDirect as Mock).mockResolvedValue({
      team_id: "team-123",
      created_at: "2025-01-01T00:00:00Z",
    });
    (supabaseGetAgentByIdDirect as Mock).mockResolvedValue({
      id: "job-123",
      is_successful: false,
      options: null,
      created_at: "2025-01-01T00:00:00Z",
    });

    const res = buildRes();
    await agentStatusController(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const json = (res.json as Mock).mock.calls[0]?.[0] as AgentStatusResponse;
    if (!json.success) throw new Error("Expected success");
    expect(json.model).toBe("spark-1-pro");
  });
});
