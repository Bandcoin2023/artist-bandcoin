import { verifySignature } from "@upstash/qstash/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { dropPinsForHotspot } from "~/server/api/routers/maps/pin";
import { db } from "~/server/db";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as { hotspotId?: string };

    if (!body.hotspotId) {
      return res.status(400).json({ error: "Missing hotspotId" });
    }

    const result = await dropPinsForHotspot(db, body.hotspotId);

    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("[hotspot/drop] Error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

export default process.env.NODE_ENV === "development"
  ? handler
  : verifySignature(handler);
