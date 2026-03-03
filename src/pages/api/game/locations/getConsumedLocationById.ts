import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { EnableCors } from "~/server/api-cors";
import { db } from "~/server/db";
import { ConsumedLocation } from "~/types/game/location";
import { avaterIconUrl } from "../brands";
import { WadzzoIconURL } from "./index";
import { z } from "zod";

// import { getSession } from "next-auth/react";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    await EnableCors(req, res);

    const session = await getToken({ req });

    // Check if the user is authenticated
    if (!session) {
        res.status(401).json({
            error: "User is not authenticated",
        });
        return;
    }

    const data = z.object({ location_id: z.string() }).safeParse(req.body);
    if (!data.success) {
        res.status(400).json({
            error: data.error,
        });
        return;
    }
    const location = data.data;

    const dbLocation = await db.location.findUnique({
        include: {
            locationGroup: {
                include: {
                    creator: true,
                    locations: {
                        include: {
                            _count: {
                                select: {
                                    consumers: {
                                        where: { userId: session.sub },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            consumers: {
                select: {
                    userId: true,
                    viewedAt: true,
                },
            },
        },

        where: {
            id: location.location_id,
        },
    });
    if (!dbLocation) {
        res.status(404).json({
            error: "Location not found",
        });
        return;
    }

    if (!dbLocation.locationGroup) return;

    const totalGroupConsumers = dbLocation.locationGroup.locations.reduce(
        (sum, location) => sum + location._count.consumers,
        0,
    );

    const remaining = dbLocation.locationGroup.limit - totalGroupConsumers;

    const loc: ConsumedLocation = {
        id: dbLocation.id,
        lat: dbLocation.latitude,
        lng: dbLocation.longitude,
        title: dbLocation.locationGroup.title,
        description:
            dbLocation.locationGroup?.description ?? "No description provided",
        viewed: dbLocation.consumers.some((el) => el.viewedAt != null),
        auto_collect: dbLocation.autoCollect,
        brand_image_url:
            dbLocation.locationGroup?.creator.profileUrl ?? avaterIconUrl,
        brand_id: dbLocation.locationGroup?.creator.id,
        modal_url: "https://vong.cong/",
        collected: true,
        collection_limit_remaining: remaining,
        brand_name: dbLocation.locationGroup.creator.name,
        image_url:
            dbLocation.locationGroup.image ??
            dbLocation.locationGroup.creator.profileUrl ??
            WadzzoIconURL,
        url: dbLocation.locationGroup.link ?? "https://bandcoin.io/images/logo.png",
    };




    res.status(200).json({ loc });
}
