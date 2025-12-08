import { OpenAPIHono } from "@hono/zod-openapi";
import { userAuthRoute, userRoute } from "./user";
import { bearerAuth } from "hono/bearer-auth";
import { generateRouter } from "./generate";

export const router = new OpenAPIHono();

// Register user route
router.openapi(userRoute, (c) => {
  const { id } = c.req.valid("param");
  return c.json({
    id,
    age: 20,
    name: "Ultra-man",
  });
});

// Protected route - /users/auth
router.use(
  "/users/auth",
  bearerAuth({
    token: process.env.BEARER_TOKEN || "your-secret-token",
  }),
);
router.openapi(userAuthRoute, (c) => {
  return c.json({
    id: "123",
    email: "user@example.com",
    role: "user",
    isAuthenticated: true,
  });
});

// Register generate routes
router.route("/generate", generateRouter);
