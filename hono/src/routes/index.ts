import { OpenAPIHono } from "@hono/zod-openapi";
import { userRoute } from "./user";

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

// Add more routes here as you create them
// router.openapi(postRoute, handler);
// router.openapi(productRoute, handler);
