import "dotenv/config";
import { config } from "../config";
import "./sentry";
import { setSentryServiceTag } from "./sentry";
import * as Sentry from "@sentry/node";
import {
  getDeepResearchQueue,
  getGenerateLlmsTxtQueue,
  getAgentQueue,
  getRedisConnection,
} from "./queue-service";
import { Job, Queue, Worker } from "bullmq";
import { logger as _logger } from "../lib/logger";
import systemMonitor from "./system-monitor";
import { v7 as uuidv7 } from "uuid";
import { configDotenv } from "dotenv";
import { updateDeepResearch } from "../lib/deep-research/deep-research-redis";
import { performDeepResearch } from "../lib/deep-research/deep-research-service";
import { performGenerateLlmsTxt } from "../lib/generate-llmstxt/generate-llmstxt-service";
import { updateGeneratedLlmsTxt } from "../lib/generate-llmstxt/generate-llmstxt-redis";
import Express from "express";
import { robustFetch } from "../scraper/scrapeURL/lib/fetch";
import { initializeBlocklist } from "../scraper/WebScraper/utils/blocklist";
import { initializeEngineForcing } from "../scraper/WebScraper/utils/engine-forcing";
import { crawlFinishedQueue, NuQJob, scrapeQueue } from "./worker/nuq";
import { finishCrawlSuper } from "./worker/crawl-logic";
import { getCrawl } from "../lib/crawl-redis";
import { TransportableError } from "../lib/error";
import {
  processMonitorCheckJob,
  reconcileRunningMonitorChecks,
} from "./monitoring/runner";
import { enqueueDueMonitorChecks } from "./monitoring/scheduler";
import { consumeMonitorCheckJobs } from "./monitoring/queue";
import {
  getAgent,
  updateAgent,
  saveAgentResult,
} from "../lib/agent/agent-redis";

configDotenv();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const jobLockExtendInterval = config.JOB_LOCK_EXTEND_INTERVAL;
const jobLockExtensionTime = config.JOB_LOCK_EXTENSION_TIME;

const cantAcceptConnectionInterval = config.CANT_ACCEPT_CONNECTION_INTERVAL;
const connectionMonitorInterval = config.CONNECTION_MONITOR_INTERVAL;
const gotJobInterval = config.CONNECTION_MONITOR_INTERVAL;

const runningJobs: Set<string> = new Set();
let monitorSchedulerInterval: NodeJS.Timeout | null = null;

const processDeepResearchJobInternal = async (
  token: string,
  job: Job & { id: string },
) => {
  const logger = _logger.child({
    module: "deep-research-worker",
    method: "processJobInternal",
    jobId: job.id,
    researchId: job.data.researchId,
    teamId: job.data?.teamId ?? undefined,
  });

  const extendLockInterval = setInterval(async () => {
    logger.info(`🔄 Worker extending lock on job ${job.id}`);
    await job.extendLock(token, jobLockExtensionTime);
  }, jobLockExtendInterval);

  try {
    console.log(
      "[Deep Research] Starting deep research: ",
      job.data.researchId,
    );
    const result = await performDeepResearch({
      researchId: job.data.researchId,
      teamId: job.data.teamId,
      query: job.data.request.query,
      maxDepth: job.data.request.maxDepth,
      timeLimit: job.data.request.timeLimit,
      subId: job.data.subId,
      maxUrls: job.data.request.maxUrls,
      analysisPrompt: job.data.request.analysisPrompt,
      systemPrompt: job.data.request.systemPrompt,
      formats: job.data.request.formats,
      jsonOptions: job.data.request.jsonOptions,
      apiKeyId: job.data.apiKeyId,
    });

    if (result.success) {
      // Move job to completed state in Redis and update research status
      await job.moveToCompleted(result, token, false);
      return result;
    } else {
      // If the deep research failed but didn't throw an error
      const error = new Error("Deep research failed without specific error");
      await updateDeepResearch(job.data.researchId, {
        status: "failed",
        error: error.message,
      });
      await job.moveToFailed(error, token, false);

      return { success: false, error: error.message };
    }
  } catch (error) {
    logger.error(`🚫 Job errored ${job.id} - ${error}`, { error });

    // Filter out TransportableErrors (flow control)
    if (!(error instanceof TransportableError)) {
      Sentry.captureException(error, {
        data: {
          job: job.id,
        },
      });
    }

    try {
      // Move job to failed state in Redis
      await job.moveToFailed(error, token, false);
    } catch (e) {
      logger.error("Failed to move job to failed state in Redis", { error });
    }

    await updateDeepResearch(job.data.researchId, {
      status: "failed",
      error: error.message || "Unknown error occurred",
    });

    return { success: false, error: error.message || "Unknown error occurred" };
  } finally {
    clearInterval(extendLockInterval);
  }
};
const processAgentJobInternal = async (
  token: string,
  job: Job & { id: string },
) => {
  const { agentId, teamId } = job.data as {
    agentId: string;
    teamId: string;
    request: unknown;
    subId: string | undefined;
    apiKeyId: string | null;
  };

  const logger = _logger.child({
    module: "agent-worker",
    method: "processAgentJobInternal",
    jobId: job.id,
    agentId,
    teamId,
  });

  const extendLockInterval = setInterval(async () => {
    logger.info(`🔄 Worker extending lock on job ${job.id}`);
    await job.extendLock(token, jobLockExtensionTime);
  }, jobLockExtendInterval);

  try {
    // Cooperative cancel check before starting expensive work.
    const stored = await getAgent(agentId);
    if (stored?.status === "cancelled") {
      await job.moveToCompleted({ cancelled: true }, token, false);
      return { cancelled: true };
    }

    const storedRequest = stored?.request as Record<string, unknown> | undefined;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.AGENT_TIMEOUT_MS,
    );

    let sidecarResponse: Response;
    try {
      sidecarResponse = await fetch(`${config.FIRECRAWL_AGENT_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: storedRequest?.["prompt"],
          urls: storedRequest?.["urls"],
          schema: storedRequest?.["schema"],
          model: stored?.model,
          strictConstrainToURLs: storedRequest?.["strictConstrainToURLs"],
          maxSources: config.AGENT_MAX_SOURCES,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!sidecarResponse.ok) {
      const errText = await sidecarResponse.text();
      const err = new Error(`sidecar returned ${sidecarResponse.status}: ${errText}`);
      await updateAgent(agentId, { status: "failed", error: err.message });
      await job.moveToFailed(err, token, false);
      return { success: false, error: err.message };
    }

    const body: unknown = await sidecarResponse.json();
    const success =
      body !== null &&
      typeof body === "object" &&
      "success" in (body as Record<string, unknown>) &&
      (body as Record<string, unknown>)["success"] === true;

    if (success) {
      const bodyObj = body as Record<string, unknown>;
      const data = bodyObj["data"];
      const model = typeof bodyObj["model"] === "string" ? bodyObj["model"] : stored?.model ?? "";
      const sources =
        data !== null &&
        typeof data === "object" &&
        "sources" in (data as Record<string, unknown>)
          ? ((data as Record<string, unknown>)["sources"] as unknown[])
          : [];
      await saveAgentResult(agentId, data);
      await updateAgent(agentId, {
        status: "completed",
        model,
        sources: Array.isArray(sources)
          ? sources.map((s: unknown) => {
              const obj = s as Record<string, unknown>;
              return {
                url: typeof obj["url"] === "string" ? obj["url"] : "",
                ...(typeof obj["title"] === "string" ? { title: obj["title"] } : {}),
              };
            })
          : [],
      });
      await job.moveToCompleted(body, token, false);
      return body;
    } else {
      const errMsg =
        body !== null &&
        typeof body === "object" &&
        "error" in (body as Record<string, unknown>) &&
        typeof (body as Record<string, unknown>)["error"] === "string"
          ? (body as Record<string, unknown>)["error"] as string
          : "Agent sidecar reported failure";
      const err = new Error(errMsg);
      await updateAgent(agentId, { status: "failed", error: errMsg });
      await job.moveToFailed(err, token, false);
      return { success: false, error: errMsg };
    }
  } catch (error) {
    logger.error(`🚫 Agent job errored ${job.id}`, { error });

    if (!(error instanceof TransportableError)) {
      Sentry.captureException(error, { data: { job: job.id } });
    }

    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred";

    try {
      await job.moveToFailed(
        error instanceof Error ? error : new Error(errMsg),
        token,
        false,
      );
    } catch (e) {
      logger.error("Failed to move agent job to failed state", { error: e });
    }

    await updateAgent(agentId, { status: "failed", error: errMsg });
    return { success: false, error: errMsg };
  } finally {
    clearInterval(extendLockInterval);
  }
};


const processGenerateLlmsTxtJobInternal = async (
  token: string,
  job: Job & { id: string },
) => {
  const logger = _logger.child({
    module: "generate-llmstxt-worker",
    method: "processJobInternal",
    jobId: job.id,
    generateId: job.data.generateId,
    teamId: job.data?.teamId ?? undefined,
  });

  const extendLockInterval = setInterval(async () => {
    logger.info(`🔄 Worker extending lock on job ${job.id}`);
    await job.extendLock(token, jobLockExtensionTime);
  }, jobLockExtendInterval);

  try {
    const result = await performGenerateLlmsTxt({
      generationId: job.data.generationId,
      teamId: job.data.teamId,
      url: job.data.request.url,
      maxUrls: job.data.request.maxUrls,
      showFullText: job.data.request.showFullText,
      subId: job.data.subId,
      cache: job.data.request.cache,
      apiKeyId: job.data.apiKeyId,
    });

    if (result.success) {
      await job.moveToCompleted(result, token, false);
      await updateGeneratedLlmsTxt(job.data.generateId, {
        status: "completed",
        generatedText: result.data.generatedText,
        fullText: result.data.fullText,
      });
      return result;
    } else {
      const error = new Error(
        "LLMs text generation failed without specific error",
      );
      await job.moveToFailed(error, token, false);
      await updateGeneratedLlmsTxt(job.data.generateId, {
        status: "failed",
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  } catch (error) {
    logger.error(`🚫 Job errored ${job.id} - ${error}`, { error });

    // Filter out TransportableErrors (flow control)
    if (!(error instanceof TransportableError)) {
      Sentry.captureException(error, {
        data: {
          job: job.id,
        },
      });
    }

    try {
      await job.moveToFailed(error, token, false);
    } catch (e) {
      logger.error("Failed to move job to failed state in Redis", { error });
    }

    await updateGeneratedLlmsTxt(job.data.generateId, {
      status: "failed",
      error: error.message || "Unknown error occurred",
    });

    return { success: false, error: error.message || "Unknown error occurred" };
  } finally {
    clearInterval(extendLockInterval);
  }
};

async function processFinishCrawlJobInternal(_job: NuQJob) {
  const job = await crawlFinishedQueue.getJob(_job.id);

  if (!job) {
    throw new Error("crawlFinish job disappeared");
  }

  if (!job.groupId) {
    throw new Error("crawlFinish job with no groupId");
  }

  if (!job.ownerId) {
    throw new Error("crawlFinish job with no ownerId");
  }

  const sc = await getCrawl(job.groupId);

  if (!sc) {
    throw new Error("crawlFinish job with sc expired");
  }

  const anyJob = await scrapeQueue.getGroupAnyJob(job.groupId, job.ownerId);

  if (!anyJob) {
    throw new Error("crawlFinish couldn't find anyJob");
  }

  await finishCrawlSuper(anyJob);
}

let isShuttingDown = false;
let isWorkerStalled = false;

if (require.main === module) {
  process.on("SIGINT", () => {
    _logger.debug("Received SIGINT. Shutting down gracefully...");
    isShuttingDown = true;
  });

  process.on("SIGTERM", () => {
    _logger.debug("Received SIGTERM. Shutting down gracefully...");
    isShuttingDown = true;
  });
}

let cantAcceptConnectionCount = 0;

const workerFun = async (
  queue: Queue,
  processJobInternal: (token: string, job: Job) => Promise<any>,
) => {
  const logger = _logger.child({ module: "queue-worker", method: "workerFun" });

  const worker = new Worker(queue.name, null, {
    connection: getRedisConnection(),
    lockDuration: 60 * 1000, // 60 seconds
    stalledInterval: 60 * 1000, // 60 seconds
    maxStalledCount: 10, // 10 times
  });

  worker.startStalledCheckTimer();

  const monitor = await systemMonitor;

  while (true) {
    if (isShuttingDown) {
      _logger.info("No longer accepting new jobs. SIGINT");
      break;
    }
    const token = uuidv7();
    const canAcceptConnection = await monitor.acceptConnection();
    if (!canAcceptConnection) {
      console.log("Can't accept connection due to RAM/CPU load");
      logger.info("Can't accept connection due to RAM/CPU load");
      cantAcceptConnectionCount++;

      isWorkerStalled = cantAcceptConnectionCount >= 25;

      if (isWorkerStalled) {
        logger.error("WORKER STALLED", {
          cpuUsage: await monitor.checkCpuUsage(),
          memoryUsage: await monitor.checkMemoryUsage(),
        });
      }

      await sleep(cantAcceptConnectionInterval); // more sleep
      continue;
    } else if (!currentLiveness) {
      logger.info("Not accepting jobs because the liveness check failed");

      await sleep(cantAcceptConnectionInterval);
      continue;
    } else {
      cantAcceptConnectionCount = 0;
    }

    const job = await worker.getNextJob(token);
    if (job) {
      if (job.id) {
        runningJobs.add(job.id);
      }

      processJobInternal(token, job).finally(() => {
        if (job.id) {
          runningJobs.delete(job.id);
        }
      });

      await sleep(gotJobInterval);
    } else {
      await sleep(connectionMonitorInterval);
    }
  }
};

const crawlFinishWorker = async () => {
  const __logger = _logger.child({
    module: "extract-worker",
    method: "crawlFinishWorker",
  });

  let noJobTimeout = 1500;

  while (!isShuttingDown) {
    const job = await crawlFinishedQueue.getJobToProcess();

    if (job === null) {
      __logger.info("No jobs to process", { module: "nuq/metrics" });
      await new Promise(resolve => setTimeout(resolve, noJobTimeout));
      if (!config.NUQ_RABBITMQ_URL) {
        noJobTimeout = Math.min(noJobTimeout * 2, 10000);
      }
      continue;
    }

    noJobTimeout = 500;

    const logger = __logger.child({
      zeroDataRetention: job.data?.zeroDataRetention ?? false,
      crawlId: job.groupId,
    });

    logger.info("Acquired job");

    const lockRenewInterval = setInterval(async () => {
      logger.info("Renewing lock");
      if (!(await crawlFinishedQueue.renewLock(job.id, job.lock!, logger))) {
        logger.warn("Failed to renew lock");
        clearInterval(lockRenewInterval);
        return;
      }
      logger.info("Renewed lock");
    }, 15000);

    let processResult:
      | {
          ok: true;
          data: Awaited<ReturnType<typeof processFinishCrawlJobInternal>>;
        }
      | { ok: false; error: any };

    try {
      processResult = {
        ok: true,
        data: await processFinishCrawlJobInternal(job),
      };
    } catch (error) {
      processResult = { ok: false, error };
    }

    clearInterval(lockRenewInterval);

    if (processResult.ok) {
      if (
        !(await crawlFinishedQueue.jobFinish(
          job.id,
          job.lock!,
          processResult.data,
          logger,
        ))
      ) {
        logger.warn("Could not update job status");
      }
    } else {
      if (
        !(await crawlFinishedQueue.jobFail(
          job.id,
          job.lock!,
          processResult.error instanceof Error
            ? processResult.error.message
            : typeof processResult.error === "string"
              ? processResult.error
              : JSON.stringify(processResult.error),
          logger,
        ))
      ) {
        logger.warn("Could not update job status");
      }
    }
  }
};

// Start all workers
const app = Express();

let currentLiveness: boolean = true;

app.get("/liveness", (req, res) => {
  _logger.info("Liveness endpoint hit");
  if (config.USE_DB_AUTHENTICATION && config.NUQ_RABBITMQ_URL) {
    // networking check for Kubernetes environments
    const host = config.FIRECRAWL_APP_HOST;
    const port = config.FIRECRAWL_APP_PORT;
    const scheme = config.FIRECRAWL_APP_SCHEME;

    robustFetch({
      url: `${scheme}://${host}:${port}`,
      method: "GET",
      mock: null,
      logger: _logger,
      abort: AbortSignal.timeout(5000),
      ignoreResponse: true,
      useCacheableLookup: false,
    })
      .then(() => {
        currentLiveness = true;
        res.status(200).json({ ok: true });
      })
      .catch(e => {
        _logger.error("WORKER NETWORKING CHECK FAILED", { error: e });
        currentLiveness = false;
        res.status(500).json({ ok: false });
      });
  } else {
    currentLiveness = true;
    res.status(200).json({ ok: true });
  }
});

const workerPort = config.WORKER_PORT || config.PORT;
app.listen(workerPort, () => {
  _logger.info(`Liveness endpoint is running on port ${workerPort}`);
});

(async () => {
  setSentryServiceTag("queue-worker");

  await initializeBlocklist().catch(e => {
    _logger.error("Failed to initialize blocklist", { error: e });
    process.exit(1);
  });

  initializeEngineForcing();

  if (config.USE_DB_AUTHENTICATION && !config.DISABLE_MONITORING) {
    monitorSchedulerInterval = setInterval(() => {
      enqueueDueMonitorChecks().catch(error => {
        _logger.error("Failed to enqueue due monitor checks", { error });
      });
      reconcileRunningMonitorChecks().catch(error => {
        _logger.error("Failed to reconcile running monitor checks", { error });
      });
    }, 60_000);
    enqueueDueMonitorChecks().catch(error => {
      _logger.error("Failed to enqueue due monitor checks", { error });
    });
    reconcileRunningMonitorChecks().catch(error => {
      _logger.error("Failed to reconcile running monitor checks", { error });
    });

    await consumeMonitorCheckJobs(processMonitorCheckJob);
  } else if (!config.USE_DB_AUTHENTICATION) {
    _logger.info(
      "Skipping monitor worker startup because database authentication is disabled",
    );
  } else {
    _logger.info(
      "Skipping monitor worker startup because NUQ_RABBITMQ_URL is not configured",
    );
  }

  await Promise.all([
    workerFun(getDeepResearchQueue(), processDeepResearchJobInternal),
    workerFun(getGenerateLlmsTxtQueue(), processGenerateLlmsTxtJobInternal),
    workerFun(getAgentQueue(), processAgentJobInternal),
    crawlFinishWorker(),
  ]);

  if (monitorSchedulerInterval) {
    clearInterval(monitorSchedulerInterval);
  }

  _logger.info("All workers exited. Waiting for all jobs to finish...");

  while (runningJobs.size > 0) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  _logger.info("All jobs finished. Shutting down...");
  process.exit(0);
})();
