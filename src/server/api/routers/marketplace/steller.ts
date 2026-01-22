import { Keypair } from "@stellar/stellar-sdk";
import { AwardIcon } from "lucide-react";
import { getAccSecretFromRubyApi } from "package/connect_wallet/src/lib/stellar/get-acc-secret";
import { z } from "zod";
import { env } from "~/env";
import { XDR4SendPlotToInvestorInPlatformAsset, XDR4SendPlotToInvestorInUSDC, XDR4SendPlotToInvestorInXLM } from "~/lib/stellar/marketplace/trx/sendProfitToInvestors";

// import { getUserSecret } from "~/components/recharge/utils";
import { covertSiteAsset2XLM } from "~/lib/stellar/marketplace/trx/convert-site-asset";
import { alreadyHaveTrustOnNft } from "~/lib/stellar/marketplace/trx/utils";
import {
  XDR4BuyAsset,
  XDR4BuyAssetWithSquire,
  XDR4BuyAssetWithXLM,
  XDR4BuyUSDC,
} from "~/lib/stellar/music/trx/payment_xdr";
import { SignUser } from "~/lib/stellar/utils";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { getAssetToUSDCRate, getplatformAssetNumberForXLM, getPlatformAssetPrice, getXLMPrice, getXLMPriceByPlatformAsset } from "~/lib/stellar/fan/get_token_price";
import { getReservedXLM } from "~/lib/stellar/helper";

export type authDocType = {
  pubkey: string;
  secret: string;
};

const url = "https://next-actionverse.vercel.app/api/square";
process.env.NODE_ENV === "production"
  ? "https://next-actionverse.vercel.app/api/square"
  : "http://localhost:3000/api/square";


export const stellarRouter = createTRPCRouter({
  buyFromMarketPaymentXDR: protectedProcedure // this contrained to only fans activity
    .input(
      z.object({
        assetCode: z.string(),
        issuerPub: z.string(),
        limit: z.number(),
        placerId: z.string().optional().nullable(),
        signWith: SignUser,
        method: z.enum(["xlm", "asset", "usdc", "card"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { limit: l, assetCode, issuerPub, signWith, placerId } = input;

      const buyer = ctx.session.user.id; // customer pubkey

      const dbAsset = await ctx.db.asset.findUnique({
        where: { code_issuer: { code: assetCode, issuer: issuerPub } },
        select: { creatorId: true, id: true },
      });

      if (!dbAsset) throw new Error("asset not found");

      const marketAsset = await ctx.db.marketAsset.findFirst({
        where: { AND: [{ assetId: dbAsset.id }, { placerId: placerId }] },
        select: { price: true, priceUSD: true },
      });

      if (!marketAsset) throw new Error("asset is not in market");

      // validate and transform input

      let seller: string;
      let sellerStorageSec: string;

      if (placerId) {
        seller = placerId;

        const storage = await ctx.db.creator.findUnique({
          where: { id: placerId },
          select: { storageSecret: true },
        });
        if (!storage?.storageSecret) {
          throw new Error("storage does not exist");
        }
        sellerStorageSec = storage.storageSecret;
      } else {
        // admin asset or music
        seller = Keypair.fromSecret(env.MOTHER_SECRET).publicKey();
        sellerStorageSec = env.STORAGE_SECRET;
      }

      switch (input.method) {
        case "xlm": {
          const nativePrice = marketAsset.priceUSD;
          return await XDR4BuyAssetWithXLM({
            seller: seller,
            storageSecret: sellerStorageSec,
            code: assetCode,
            issuerPub,
            buyer,
            priceInNative: nativePrice.toString(),
            signWith,
          });
        }
        case "asset": {
          return await XDR4BuyAsset({
            seller: seller,
            storageSecret: sellerStorageSec,
            code: assetCode,
            issuerPub,
            buyer,
            price: marketAsset.price.toString(),
            signWith,
          });
        }
        case "usdc": {
          const usdcPrice = await getAssetToUSDCRate();
          return await XDR4BuyUSDC({
            seller: seller,
            storageSecret: sellerStorageSec,
            code: assetCode,
            issuerPub,
            buyer,
            price: ((1 / usdcPrice) * marketAsset.priceUSD).toString(),
            signWith,
            usdcPriceRate: usdcPrice,
          });
        }
        case "card": {
          return await XDR4BuyAssetWithSquire({
            seller: seller,
            storageSecret: sellerStorageSec,
            code: assetCode,
            issuerPub,
            buyer,
            price: marketAsset.priceUSD.toString(),
            signWith,
          });
        }
      }
    }),

  convertSiteAsset: protectedProcedure
    .input(
      z.object({
        xlm: z.string(),
        siteAssetAmount: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { siteAssetAmount, xlm } = input;
      const user = ctx.session.user;

      if (user.email) {
        console.log("Converting site asset to XLM for user:", user.id);
        console.log("Site asset email:", user.email);
        const secret = await getAccSecretFromRubyApi(user.email);

        const xdr = await covertSiteAsset2XLM({
          pubkey: user.id,
          xlm,
          siteAssetAmount,
          secret,
        });
        return xdr;
      } else {
        throw new Error("No email attached to the account");
      }
    }),

  hasTrust: publicProcedure
    .input(
      z.object({
        pubkey: z.string(),
        asset: z.object({ code: z.string(), issuer: z.string() }),
      }),
    )
    .query(async ({ input }) => {
      const { asset, pubkey } = input;
      return await alreadyHaveTrustOnNft({ asset, pubkey });
    }),
  sendProfitToInvestor: protectedProcedure
    .input(
      z.object({
        payWith: z.enum(["xlm", "asset", "usd"]),
        amount: z.number(),
        holders: z.array(z.string()),
        signWith: SignUser,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { payWith, amount, holders, signWith } = input;
      const user = ctx.session.user;
      if (payWith === "xlm") {
        return await XDR4SendPlotToInvestorInXLM({
          pubkey: user.id,
          TotalAmount: amount,
          holders,
          signWith
        });


      } else if (payWith === "asset") {
        return await XDR4SendPlotToInvestorInPlatformAsset({
          pubkey: user.id,
          TotalAmount: amount,
          holders,
          signWith
        }
        );

      }
      else if (payWith === "usd") {

        return await XDR4SendPlotToInvestorInUSDC({
          pubkey: user.id,
          TotalAmount: amount,
          holders,
          signWith
        }
        );

      }

    }),
  paymentInUSD: protectedProcedure
    .input(
      z.object({
        sourceId: z.string().optional(),
        amount: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { amount: priceUSD, sourceId } = input;
      const result = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceId: sourceId,
          priceUSD: Number(priceUSD),
        }),
      });

      if (result.ok) {
        const data = (await result.json()) as { id: string; status: string };

        if (data.status === "COMPLETED") {
          return true;
        } else {
          throw new Error("Payment was not successful");
        }
      }

      if (result.status === 400) {
        throw new Error("Something went wrong with the payment");
      }
      return false;
    }),

  test: publicProcedure.query(() => {
    return "test";
  }),
  estimateXlmForPlatform: publicProcedure
    .input(
      z.object({
        platformAmount: z.number()
      })
    )
    .query(async ({ input }) => {
      const { platformAmount } = input;

      // Get current prices
      const platformPrice = await getPlatformAssetPrice();
      const xlmPrice = await getXLMPrice();

      // Calculate XLM needed for the given platform amount
      // Formula: (platformAmount * platformPrice) / xlmPrice
      const xlmNeeded = (platformAmount * platformPrice) / xlmPrice;

      return {
        xlmNeeded: Number(xlmNeeded.toFixed(7)),
        platformAmount,
        platformPrice,
        xlmPrice,
        rate: platformPrice / xlmPrice
      };
    }),

  estimatePlatformForXlm: publicProcedure
    .input(
      z.object({
        xlm: z.number()
      })
    )
    .query(async ({ input }) => {
      const { xlm } = input;

      if (xlm === 0) {
        return {
          platformNeeded: 0,
          xlm: 0,
          platformPrice: 0,
          xlmPrice: 0,
          rate: 0
        };
      }

      // Get platform tokens needed for the given XLM amount
      const platformNeeded = await getplatformAssetNumberForXLM(xlm);

      // Get prices for additional context
      const platformPrice = await getPlatformAssetPrice();
      const xlmPrice = await getXLMPrice();

      return {
        platformNeeded,
        xlm,
        platformPrice,
        xlmPrice,
        rate: xlmPrice / platformPrice
      };
    }),

  getRequiredPlatformAsset: publicProcedure
    .input(
      z.object({
        xlm: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { xlm } = input;

      // Get the platform asset amount needed for trustline setup
      const requiredAsset = await getplatformAssetNumberForXLM(xlm);
      return requiredAsset;
    }),

  getReservedXLM: protectedProcedure.input(
    z.object({
      userId: z.string().optional()
    })
  ).query(async ({ input, ctx }) => {
    const userId = input.userId ?? ctx.session.user.id
    return getReservedXLM(userId)
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
