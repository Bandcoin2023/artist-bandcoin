import { OpenAPIHono } from "@hono/zod-openapi";
import { bearerAuth } from "hono/bearer-auth";
import { createJobRoute } from "./schemas";
import { DynamoDBService } from "../../services/dynamodb.service";
import { JobProcessorService } from "../../services/job-processor.service";
import type { JobData, GenerationOptions } from "../../types/generation.types";
import { randomUUID } from "crypto";

export const createRouter = new OpenAPIHono();

// Apply bearer auth
createRouter.use(
  "*",
  bearerAuth({
    token: process.env.BEARER_TOKEN ?? "your-secret-token",
  }),
);

// POST /generate - Create job
createRouter.openapi(createJobRoute, async (c) => {
  const requestData = c.req.valid("json");

  // Create job ID
  const jobId = randomUUID();

  // Calculate TTL (24 hours from now)
  const ttl = Math.floor(Date.now() / 1000) + 86400;

  // Create job data
  const jobData: JobData = {
    jobId,
    status: "pending",
    progress: 0,
    type: requestData.mediaType,
    provider: requestData.provider,
    prompt: requestData.prompt,
    options: requestData as GenerationOptions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ttl,
  };

  // Save to DynamoDB
  await DynamoDBService.createJob(jobData);

  // Start processing asynchronously (fire and forget)
  JobProcessorService.processJob(jobId, requestData as GenerationOptions).catch(
    (error) => {
      console.error(`Failed to process job ${jobId}:`, error);
    },
  );

  return c.json(
    {
      jobId,
      status: "pending" as const,
      message: "Job created successfully and processing started",
    },
    202,
  );
});
