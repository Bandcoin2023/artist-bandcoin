import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";

// Request schema
export const CreateJobRequestSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .openapi({ example: "A beautiful sunset over mountains" }),
  mediaType: z.enum(["image", "video"]).openapi({ example: "image" }),
  model: z.string().openapi({ example: "dall-e-3" }),
  provider: z.enum(["openai", "google"]).openapi({ example: "openai" }),
  style: z.string().optional().openapi({ example: "Vivid" }),
  size: z.string().optional().openapi({ example: "1024x1024" }),
  aspectRatio: z.string().optional().openapi({ example: "16:9" }),
  numberOfImages: z.number().int().min(1).max(10).openapi({ example: 1 }),
  duration: z.enum(["4", "8", "12"]).optional().openapi({ example: "4" }),
  quality: z
    .enum(["standard", "hd"])
    .optional()
    .nullable()
    .openapi({ example: "standard" }),
  referenceImage: z.string().optional().nullable().openapi({
    example: "data:image/png;base64,iVBORw0KG...",
  }),
  cameraGear: z.string().optional().openapi({ example: "canon-r5" }),
  remixVariety: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .openapi({ example: 30 }),
});

// Response schemas
export const CreateJobResponseSchema = z.object({
  jobId: z
    .string()
    .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  status: z.enum(["pending", "processing", "completed", "failed"]).openapi({
    example: "pending",
  }),
  message: z.string().openapi({ example: "Job created successfully" }),
});

export const JobStatusResponseSchema = z.object({
  jobId: z
    .string()
    .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  status: z.enum(["pending", "processing", "completed", "failed"]).openapi({
    example: "processing",
  }),
  progress: z.number().min(0).max(100).openapi({ example: 45 }),
  type: z.enum(["image", "video"]).openapi({ example: "image" }),
  provider: z.enum(["openai", "google"]).openapi({ example: "openai" }),
  prompt: z.string().openapi({ example: "A beautiful sunset over mountains" }),
  result: z
    .object({
      items: z.array(
        z.object({
          url: z.string().openapi({ example: "https://..." }),
          type: z.enum(["image", "video"]).openapi({ example: "image" }),
        }),
      ),
    })
    .optional(),
  error: z.string().optional().openapi({ example: "Generation failed" }),
  createdAt: z.string().openapi({ example: "2025-12-08T10:30:00Z" }),
  updatedAt: z.string().openapi({ example: "2025-12-08T10:32:00Z" }),
});

export const JobIdParamSchema = z.object({
  jobId: z.string().openapi({
    param: { name: "jobId", in: "path" },
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
});

// Route definitions
export const createJobRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Generation"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateJobRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      content: {
        "application/json": {
          schema: CreateJobResponseSchema,
        },
      },
      description: "Job created and processing started",
    },
    400: {
      description: "Invalid request",
    },
    401: {
      description: "Unauthorized",
    },
  },
});

export const getJobStatusRoute = createRoute({
  method: "get",
  path: "/status/{jobId}",
  tags: ["Generation"],
  security: [{ Bearer: [] }],
  request: {
    params: JobIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: JobStatusResponseSchema,
        },
      },
      description: "Job status retrieved successfully",
    },
    404: {
      description: "Job not found",
    },
    401: {
      description: "Unauthorized",
    },
  },
});
