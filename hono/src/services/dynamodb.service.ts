import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import type {
  JobData,
  JobStatus,
  GeneratedItem,
} from "../types/generation.types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = Resource.GenerationJobs.name;

export class DynamoDBService {
  /**
   * Create a new job in DynamoDB
   */
  static async createJob(jobData: JobData): Promise<JobData> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: jobData,
    });

    await docClient.send(command);
    return jobData;
  }

  /**
   * Get job by ID
   */
  static async getJob(jobId: string): Promise<JobData | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { jobId },
    });

    const response = await docClient.send(command);
    return (response.Item as JobData) || null;
  }

  /**
   * Update job status
   */
  static async updateJobStatus(
    jobId: string,
    status: JobStatus,
    error?: string,
  ): Promise<void> {
    const updateExpression = error
      ? "SET #status = :status, #error = :error, #updatedAt = :updatedAt"
      : "SET #status = :status, #updatedAt = :updatedAt";

    const expressionAttributeValues: Record<string, string> = {
      ":status": status,
      ":updatedAt": new Date().toISOString(),
    };

    if (error) {
      expressionAttributeValues[":error"] = error;
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { jobId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        "#status": "status",
        "#updatedAt": "updatedAt",
        ...(error && { "#error": "error" }),
      },
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await docClient.send(command);
  }

  /**
   * Update job progress
   */
  static async updateJobProgress(
    jobId: string,
    progress: number,
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { jobId },
      UpdateExpression: "SET #progress = :progress, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#progress": "progress",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":progress": progress,
        ":updatedAt": new Date().toISOString(),
      },
    });

    await docClient.send(command);
  }

  /**
   * Set job as completed with results
   */
  static async setJobCompleted(
    jobId: string,
    items: GeneratedItem[],
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { jobId },
      UpdateExpression:
        "SET #status = :status, #progress = :progress, #result = :result, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
        "#progress": "progress",
        "#result": "result",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":status": "completed",
        ":progress": 100,
        ":result": { items },
        ":updatedAt": new Date().toISOString(),
      },
    });

    await docClient.send(command);
  }

  /**
   * Set job as failed with error message
   */
  static async setJobFailed(
    jobId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.updateJobStatus(jobId, "failed", errorMessage);
  }
}
