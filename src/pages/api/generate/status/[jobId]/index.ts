import type { NextApiRequest, NextApiResponse } from "next";

const HONO_API_URL = process.env.HONO_API_URL || "http://localhost:8787";
const HONO_API_KEY = process.env.HONO_API_KEY || "your-secret-token";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ error: "jobId query parameter required" });
  }

  try {
    // Forward request to Hono Lambda
    const response = await fetch(
      `${HONO_API_URL}/api/v1/generate/status/${jobId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HONO_API_KEY}`,
        },
      },
    );

    // Handle non-JSON responses (like 401 Unauthorized)
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = await response.json();
      console.log("data", data)
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res
        .status(response.status)
        .json({ error: text || "Request failed" });
    }
  } catch (error) {
    console.error("Status proxy error:", error);
    return res.status(500).json({ error: "Failed to get job status" });
  }
}
