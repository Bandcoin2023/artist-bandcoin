import { createRoute } from "@hono/zod-openapi";

import { z } from "@hono/zod-openapi";

const ParamsSchema = z.object({
  id: z
    .string()
    .min(3)
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: "1212121",
    }),
});

const UserSchema = z
  .object({
    id: z.string().openapi({
      example: "123",
    }),
    name: z.string().openapi({
      example: "John Doe",
    }),
    age: z.number().openapi({
      example: 42,
    }),
  })
  .openapi("User");

export const userRoute = createRoute({
  method: "get",
  path: "/users/{id}",
  request: {
    params: ParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
      description: "Retrieve the user",
    },
  },
});

const AuthUserSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
    role: z.string().openapi({ example: "user" }),
    isAuthenticated: z.boolean().openapi({ example: true }),
  })
  .openapi("AuthUser");

// Protected route
export const userAuthRoute = createRoute({
  method: "get",
  path: "/users/auth",
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AuthUserSchema,
        },
      },
      description: "Get authenticated user information",
    },
    401: {
      description: "Unauthorized - Invalid or missing bearer token",
    },
  },
});
