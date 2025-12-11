/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "bandcoint-hono-server",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // DynamoDB table for generation jobs
    const generationJobsTable = new sst.aws.Dynamo("GenerationJobs", {
      fields: {
        jobId: "string",
      },
      primaryIndex: { hashKey: "jobId" },
      ttl: "ttl",
    });

    // S3 bucket for generated images
    const generatedImagesBucket = new sst.aws.Bucket("GeneratedImages", {
      public: true,
    });

    // Secrets
    const openaiApiKey = new sst.Secret("OPENAI_API_KEY");
    const geminiApiKey = new sst.Secret("GEMINI_API_KEY");
    const bearerToken = new sst.Secret("BEARER_TOKEN");

    new sst.aws.Function("Hono", {
      url: true,
      handler: "src/index.handler",
      link: [generationJobsTable, generatedImagesBucket],
      timeout: "15 minutes",
      environment: {
        GENERATION_JOBS_TABLE: generationJobsTable.name,
        OPENAI_API_KEY: openaiApiKey.value,
        GEMINI_API_KEY: geminiApiKey.value,
        BEARER_TOKEN: bearerToken.value,
      },
    });
  },
});
