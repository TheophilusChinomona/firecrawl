import { redisEvictConnection } from "../../services/redis";
import { logger as _logger } from "../logger";
import type { AgentRequest } from "../../controllers/v2/types";

export type StoredAgentStatus =
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type StoredAgentSource = { url: string; title?: string };

export type StoredAgent = {
  id: string;
  team_id: string;
  createdAt: number;
  status: StoredAgentStatus;
  request: AgentRequest;
  model: string;
  error?: string;
  sources?: StoredAgentSource[];
  creditsUsed?: number;
  cancelledAt?: number;
};

// TTL of 6 hours for status; 24 hours for result blob.
const AGENT_STATUS_TTL = 6 * 60 * 60;
const AGENT_RESULT_TTL = 24 * 60 * 60;

export async function saveAgent(id: string, a: StoredAgent): Promise<void> {
  _logger.debug("Saving agent " + id + " to Redis...");
  await redisEvictConnection.set(
    "agent:" + id,
    JSON.stringify(a),
    "EX",
    AGENT_STATUS_TTL,
  );
}

export async function getAgent(id: string): Promise<StoredAgent | null> {
  const x = await redisEvictConnection.get("agent:" + id);
  return x ? (JSON.parse(x) as StoredAgent) : null;
}

export async function updateAgent(
  id: string,
  patch: Partial<StoredAgent>,
): Promise<void> {
  const current = await getAgent(id);
  if (!current) return;
  await redisEvictConnection.set(
    "agent:" + id,
    JSON.stringify({ ...current, ...patch }),
    "EX",
    AGENT_STATUS_TTL,
  );
}

export async function getAgentExpiry(id: string): Promise<Date> {
  const d = new Date();
  const ttl = await redisEvictConnection.pttl("agent:" + id);
  if (ttl < 0) return d;
  d.setMilliseconds(d.getMilliseconds() + ttl);
  d.setMilliseconds(0);
  return d;
}

export async function saveAgentResult(
  id: string,
  result: unknown,
): Promise<void> {
  await redisEvictConnection.set(
    "agent_result:" + id,
    JSON.stringify(result),
    "EX",
    AGENT_RESULT_TTL,
  );
}

export async function getAgentResult(id: string): Promise<unknown> {
  const x = await redisEvictConnection.get("agent_result:" + id);
  return x ? JSON.parse(x) : null;
}
