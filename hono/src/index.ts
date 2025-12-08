import { OpenAPIHono } from "@hono/zod-openapi";
import { handle } from "hono/aws-lambda";
import { router } from "./routes";
import { swaggerUI } from "@hono/swagger-ui";

const app = new OpenAPIHono().basePath("/api/v1");

// Register routes
app.route("/", router);

// OpenAPI specification - standard naming
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Bandcoin Hono API",
    description: "AI Generation API with OpenAI and Google AI integration",
  },
});

// Swagger UI
app.get("/docs", swaggerUI({ url: "/api/v1/openapi.json" }));

export const handler = handle(app);
