import { OpenAPIHono } from "@hono/zod-openapi";
import { createRouter } from "./create.route";
import { statusRouter } from "./status.route";

export const generateRouter = new OpenAPIHono();

// Mount create and status routes
generateRouter.route("/", createRouter);
generateRouter.route("/", statusRouter);
