import { OpenAPIHono } from "@hono/zod-openapi";
import { bearerAuth } from "hono/bearer-auth";
import { getJobStatusRoute } from "./schemas";
import { DynamoDBService } from "../../services/dynamodb.service";

export const statusRouter = new OpenAPIHono();

// Apply bearer auth
statusRouter.use(
  "*",
  bearerAuth({
    token: process.env.BEARER_TOKEN || "your-secret-token",
  }),
);

// GET /status/{jobId} - Get job status
statusRouter.openapi(getJobStatusRoute, async (c) => {
  const { jobId } = c.req.valid("param");

  // Get job from DynamoDB
  const job = await DynamoDBService.getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return c.json(job, 200);
});
