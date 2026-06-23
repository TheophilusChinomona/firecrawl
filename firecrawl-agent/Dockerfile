FROM oven/bun:1 AS base
WORKDIR /app
COPY firecrawl-agent/package.json ./
RUN bun install
COPY firecrawl-agent/ ./
ENV PI_CODING_AGENT_DIR=/app/.omp/agent
EXPOSE 8090
CMD ["bun", "run", "src/server.ts"]
