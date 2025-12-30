import { Asset, Horizon } from "@stellar/stellar-sdk";
import { z } from "zod";
import { STELLAR_URL } from "~/lib/stellar/constant";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
export const tradeFormSchema = z.object({
  selling: z.string(),
  buying: z.string(),
  amount: z.number({
    required_error: "Amount  must be a number",
    invalid_type_error: "Amount must be a number",
  }).positive(),
  price: z.number({
    required_error: "Price  must be a number",
    invalid_type_error: "Price must be a number",
  }).positive(),
});
export const tradeRouter = createTRPCRouter({
  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),





  getOffers: protectedProcedure.query(async ({ ctx, input }) => {
    const id = ctx.session.user.id;
    const server = new Horizon.Server(STELLAR_URL);
    const offers = await server
      .offers()
      .forAccount("GD5UILGTWNRIWERORCB7YBLDRITMVP47QZ25UPYBJHHHHSM5AFE73HHB")
      .call();

    return offers;
  }),

  getOffer: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const server = new Horizon.Server(STELLAR_URL);
      const offer = await server.offers().offer(input).call();
      return offer;
    }),
});

function assetFromInput(input: string) {
  const [code, issuer] = input.split("-");
  if (!code || !issuer) {
    throw new Error("Invalid asset input");
  }
  return new Asset(code, issuer);
}
