import type { Response } from "express";
import type { AgentStatusResponse, RequestWithAuth } from "./types";
import {
  supabaseGetAgentByIdDirect,
  supabaseGetAgentRequestByIdDirect,
} from "../../lib/supabase-jobs";
import { logger as _logger, logger } from "../../lib/logger";
import { getJobFromGCS } from "../../lib/gcs-jobs";
import { config } from "../../config";
import { getAgent, getAgentExpiry, getAgentResult } from "../../lib/agent/agent-redis";

export async function agentStatusController(
  req: RequestWithAuth<{ jobId: string }, AgentStatusResponse, unknown>,
  res: Response<AgentStatusResponse>,
) {
  // Local Redis branch — check first so self-hosted works without supabase.
  const localAgent = await getAgent(req.params.jobId);
  if (localAgent) {
    if (localAgent.team_id !== req.auth.team_id) {
      return res.status(404).json({ success: false, error: "Agent job not found" });
    }

    const expiresAt = await getAgentExpiry(req.params.jobId);
    const data =
      localAgent.status === "completed"
        ? await getAgentResult(req.params.jobId)
        : undefined;

    return res.status(200).json({
      success: true,
      status: localAgent.status,
      error: localAgent.error,
      data,
      model: localAgent.model,
      expiresAt: expiresAt.toISOString(),
      creditsUsed: localAgent.creditsUsed,
    });
  }

  // Remote / supabase branch (cloud mode with EXTRACT_V3_BETA_URL).
  const agentRequest = await supabaseGetAgentRequestByIdDirect(
    req.params.jobId,
  );

  if (!agentRequest || agentRequest.team_id !== req.auth.team_id) {
    return res.status(404).json({
      success: false,
      error: "Agent job not found",
    });
  }

  const agent = await supabaseGetAgentByIdDirect(req.params.jobId);

  let model: string;
  if (agent) {
    model =
      (
        agent.options !== null &&
        typeof agent.options === "object" &&
        "model" in (agent.options as Record<string, unknown>) &&
        typeof (agent.options as Record<string, unknown>)["model"] === "string"
          ? (agent.options as Record<string, unknown>)["model"]
          : "spark-1-pro"
      ) as string;
  } else {
    try {
      const optionsRequest = await fetch(
        config.EXTRACT_V3_BETA_URL +
          "/v2/extract/" +
          req.params.jobId +
          "/options",
        {
          headers: {
            Authorization: `Bearer ${config.AGENT_INTEROP_SECRET}`,
          },
        },
      );

      if (optionsRequest.status !== 200) {
        logger.warn("Failed to get agent request details", {
          status: optionsRequest.status,
          method: "agentStatusController",
          module: "api/v2",
          text: await optionsRequest.text(),
        });
        model = "spark-1-pro";
      } else {
        const opts: unknown = await optionsRequest.json();
        model =
          opts !== null &&
          typeof opts === "object" &&
          "model" in (opts as Record<string, unknown>) &&
          typeof (opts as Record<string, unknown>)["model"] === "string"
            ? ((opts as Record<string, unknown>)["model"] as string)
            : "spark-1-pro";
      }
    } catch (error) {
      logger.warn("Failed to get agent request details", {
        error,
        method: "agentStatusController",
        module: "api/v2",
        extractId: req.params.jobId,
      });
      model = "spark-1-pro";
    }
  }

  let data: unknown = undefined;
  if (agent?.is_successful) {
    data = await getJobFromGCS(agent.id);
  }

  return res.status(200).json({
    success: true,
    status: !agent
      ? "processing"
      : agent.is_successful
        ? "completed"
        : "failed",
    error: agent?.error ?? undefined,
    data,
    model,
    expiresAt: new Date(
      new Date(
        (agent?.created_at as string | undefined) ??
          (agentRequest.created_at as string),
      ).getTime() +
        1000 * 60 * 60 * 24,
    ).toISOString(),
    creditsUsed: agent?.credits_cost as number | undefined,
  });
}
