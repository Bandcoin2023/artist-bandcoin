import { z } from "zod";

import { createAsset } from "~/lib/stellar/fan/create_asset";
import {
  getPlatformAssetPrice,
  getplatformAssetNumberForXLM,
} from "~/lib/stellar/fan/get_token_price";

import { SignUser, WithSing } from "~/lib/stellar/utils";

import { Keypair } from "@stellar/stellar-sdk";

import { env } from "~/env";
import {
  PLATFORM_FEE,
  SIMPLIFIED_FEE,
  TrxBaseFeeInPlatformAsset,
} from "~/lib/stellar/constant";
import {
  createStorageTrx,
  createStorageTrxWithXLM,
} from "~/lib/stellar/fan/create_storage";
import { follow_creator } from "~/lib/stellar/fan/follow_creator";
import { sendGift, sendGitfAsPlatformAsset } from "~/lib/stellar/fan/send_gift";
import { StellarAccount } from "~/lib/stellar/stellar";
import {
  createUniAsset,
  createUniAssetWithXLM,
} from "~/lib/stellar/uni_create_asset";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { AccountType } from "~/lib/stellar/fan/utils";
enum assetType {
  PAGEASSET = "PAGEASSET",
  PLATFORMASSET = "PLATFORMASSET",
  SHOPASSET = "SHOPASSET",
}
const HIGHEST_LIMIT = "1000000000";
export const PaymentMethodEnum = z.enum(["asset", "xlm", "card"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export const FanGitFormSchema = z.object({
  pubkey: z.string().length(56),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
      message: "Amount must be a number",
    })
    .min(1),
});

export const trxRouter = createTRPCRouter({



  createAssetTrx: protectedProcedure
    .input(
      z.object({ code: z.string(), limit: z.number(), signWith: SignUser }),
    )
    .mutation(async ({ ctx, input }) => {
      const assetAmout = await getplatformAssetNumberForXLM();

      return await createAsset({
        actionAmount: assetAmout.toString(),
        pubkey: ctx.session.user.id,
        code: input.code,
        limit: input.limit,
        signWith: input.signWith,
      });
    }),

  createUniAssetTrx: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        limit: z.number(),
        signWith: SignUser,
        ipfsHash: z.string(),
        native: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input: i }) => {
      const assetAmount = await getplatformAssetNumberForXLM();
      const signWith = i.signWith;
      const limit = i.limit.toString();

      // set this for admin and user
      let pubkey = ctx.session.user.id;
      let storageSecret: string;
      const homeDomain = env.NEXT_PUBLIC_HOME_DOMAIN;

      if (signWith && "isAdmin" in signWith) {
        storageSecret = env.STORAGE_SECRET;
        pubkey = Keypair.fromSecret(env.MOTHER_SECRET).publicKey();
      } else {
        const storage = await db.creator.findFirstOrThrow({
          where: { id: ctx.session.user.id },
          select: { storageSecret: true },
        });

        storageSecret = storage.storageSecret;
      }

      // console.log("storageSecret", storageSecret);

      if (i.native) {
        return await createUniAssetWithXLM({
          actionAmount: assetAmount.toString(),
          pubkey,
          storageSecret,
          code: i.code,
          homeDomain,
          limit,
          signWith,
          ipfsHash: i.ipfsHash,
        });
      } else {
        return await createUniAsset({
          pubkey,
          storageSecret,
          code: i.code,
          homeDomain,
          limit,
          signWith,
          ipfsHash: i.ipfsHash,
        });
      }
    }),
  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),

  getAssetPrice: publicProcedure.query(async () => {
    return await getPlatformAssetPrice();
  }),

  getAssetNumberforXlm: publicProcedure
    .input(z.number().optional())
    .query(async ({ input }) => {
      return await getplatformAssetNumberForXLM(input);
    }),

  createStorageAccount: protectedProcedure
    .input(z.object({ signWith: SignUser, native: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.native) {
        return await createStorageTrxWithXLM({
          pubkey: ctx.session.user.id,
          signWith: input.signWith,
        });
      } else {
        return await createStorageTrx({
          pubkey: ctx.session.user.id,
          signWith: input.signWith,
        });
      }
    }),

  followCreatorTRX: protectedProcedure
    .input(z.object({ creatorId: z.string().min(56), signWith: SignUser }))
    .mutation(async ({ input, ctx }) => {
      const { creatorId, signWith } = input;
      const userId = ctx.session.user.id;

      const creator = await ctx.db.creator.findUniqueOrThrow({
        where: { id: creatorId },
        include: { pageAsset: true },
      });

      const userAcc = await StellarAccount.create(userId);

      if (creator.pageAsset) {
        const { code, issuer } = creator.pageAsset;

        const hasTrust = userAcc.hasTrustline(code, issuer);

        if (hasTrust) {
          return true;
        } else {
          // creat trust with userId
          const xdr = await follow_creator({
            creatorPageAsset: { code, issuer },
            userPubkey: userId,
            signWith,
          });
          return xdr;
        }
      } else {
        if (creator.customPageAssetCodeIssuer) {
          const [code, issuer] = creator.customPageAssetCodeIssuer.split("-");
          const issuerVal = z.string().length(56).safeParse(issuer);
          if (issuerVal.success && code) {
            const hasTrust = userAcc.hasTrustline(code, issuerVal.data);
            if (hasTrust) {
              return true;
            } else {
              const xdr = await follow_creator({
                creatorPageAsset: { code, issuer: issuerVal.data },
                userPubkey: userId,
                signWith,
              });
              return xdr;
            }
          } else {
            throw new Error("Issuer is invalid");
          }
        }
        throw new Error("creator has no page asset");
      }
    }),
  giftFollowerXDR: protectedProcedure // only logged creator can do that
    .input(
      z.object({
        pubkey: z.string().length(56),
        amount: z
          .number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number",
            message: "Amount must be a number",
          })
          .int()
          .positive(),
        assetCode: z.string().nonempty(),
        assetIssuer: z.string().nonempty(),
        assetType: z.nativeEnum(assetType),
        signWith: SignUser,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const creatorId = ctx.session.user.id;
      const { pubkey, amount, assetCode, assetIssuer } = input;

      const isFollower = await ctx.db.follow.findUnique({
        where: {
          userId_creatorId: {
            creatorId: creatorId,
            userId: pubkey,
          },
        },
      });
      if (!isFollower) throw new Error("User is not a follower");

      const creator = await db.creator.findUniqueOrThrow({
        where: { id: creatorId },
        include: { pageAsset: true },
      });
      const { storageSecret } = creator;

      if (input.assetType === assetType.PAGEASSET) {
        if (creator.pageAsset) {
          const { code, issuer } = creator.pageAsset;
          console.log(code, issuer);
          // send email

          return await sendGift({
            customerPubkey: pubkey,
            creatorPageAsset: { code, issuer },
            creatorStorageSec: storageSecret,
            creatorPub: creatorId,
            price: input.amount,
            signWith: input.signWith,
          });
        } else if (creator.customPageAssetCodeIssuer) {
          const [code, issuer] = creator.customPageAssetCodeIssuer.split("-");
          const issuerVal = z.string().length(56).safeParse(issuer);
          if (issuerVal.success && code) {
            const { storageSecret } = creator;
            return await sendGift({
              customerPubkey: pubkey,
              creatorPageAsset: { code, issuer: issuerVal.data },
              creatorStorageSec: storageSecret,
              creatorPub: creatorId,
              price: input.amount,
              signWith: input.signWith,
            });
          } else {
            throw new Error("Issuer is invalid");
          }
        } else {
          throw new Error("creator has no page asset");
        }
      } else if (input.assetType === assetType.PLATFORMASSET) {
        return await sendGitfAsPlatformAsset({
          reciver: pubkey,
          creatorId: creatorId,
          amount: amount,
          assetCode: assetCode,
          assetIssuer: assetIssuer,
          signWith: input.signWith,
        });
      } else if (input.assetType === assetType.SHOPASSET) {
        return await sendGift({
          customerPubkey: pubkey,
          creatorPageAsset: { code: assetCode, issuer: assetIssuer },
          creatorStorageSec: storageSecret,
          creatorPub: creatorId,
          price: input.amount,
          signWith: input.signWith,
        });
      }
    }),

  getRequiredPlatformAsset: publicProcedure
    .input(
      z.object({
        xlm: z.number(),
        platformAsset: z.number().default(SIMPLIFIED_FEE),
      }),
    )
    .query(async ({ ctx, input }) => {
      const token = await getplatformAssetNumberForXLM(input.xlm);
      return token;
    }),

  checkAssetCodeAvailability: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existingAsset = await db.asset.findFirst({
        where: { code: input.code, creatorId: ctx.session.user.id },
      });

      return {
        available: !existingAsset,
        message: existingAsset ? "Asset code already in use" : "Available",
      };
    }),
});
