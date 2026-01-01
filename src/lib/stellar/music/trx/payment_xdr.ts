import { Asset, BASE_FEE, Keypair, Operation } from "@stellar/stellar-sdk"
import type { SignUserType } from "../../utils"
import { WithSing } from "../../utils"
import { PLATFORM_ASSET, PLATFORM_FEE, TrxBaseFee, TrxBaseFeeInPlatformAsset } from "../../constant"
import { env } from "~/env"
import {
  getplatformAssetNumberForXLM,
  getPlatformAssetPrice,
  getXLMNumberForPlatformAsset,
  getXLMPrice,
} from "../../fan/get_token_price"
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"
import {
  addPaymentOp,
  addTrustlineSetup,
  checkTrustline,
  createTransactionBuilder,
  finalizeTransaction,
  getServerAndMotherAcc,
  getNativeBalance,
  getAssetBalance,
} from "../../helper"

export async function XDR4BuyUSDC({
  signWith,
  code,
  issuerPub,
  buyer,
  price,
  storageSecret,
  seller,
  usdcPriceRate,
}: {
  buyer: string
  code: string
  issuerPub: string
  price: string
  signWith: SignUserType
  storageSecret: string
  seller: string
  usdcPriceRate: number
}) {
  // Step 1: Create asset objects for the token being bought and USDC for payment
  const asset = new Asset(code, issuerPub)
  const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER)

  // Step 2: Get keypairs for the storage account (holds the token) and mother account (platform account)
  const storageAcc = Keypair.fromSecret(storageSecret)
  const { motherAcc } = getServerAndMotherAcc()

  // Step 3: Create a transaction builder starting from the mother account with base fee
  const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee)

  // Step 4: Check if the buyer already has a trustline for this asset to avoid unnecessary operations
  const hasTrust = await checkTrustline(buyer, code, issuerPub)

  // Step 5: If no trustline, calculate how much platform asset is needed to cover 0.5 XLM for trustline setup
  const requiredAsset2refundXlm = hasTrust ? 0 : await getplatformAssetNumberForXLM(0.5)

  // Step 6: Get the current price of the platform asset in USD for fee conversion
  const assetPriceInUsd = await getPlatformAssetPrice()

  // Step 7: Calculate total platform fee in platform asset units (includes XLM refund, platform fee, and transaction fee)
  const totalPlatformFee = requiredAsset2refundXlm + Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset)

  // Step 8: Convert the total platform fee from platform asset to USDC equivalent using the exchange rate
  const totalPlatformFeeInUSD = (totalPlatformFee * assetPriceInUsd) / usdcPriceRate

  // Step 9: Add payment operation to pay the platform fee in USDC from the buyer
  addPaymentOp(Tx2, motherAcc.publicKey(), totalPlatformFeeInUSD.toFixed(7), USDC, buyer)

  // Step 10: If the asset has a price, add payment to the seller in USDC
  if (Number(price) > 0) {
    addPaymentOp(Tx2, seller, price, USDC, buyer)
  }

  // Step 11: If buyer doesn't have trustline, add operations to set it up (pay 0.5 XLM and create trustline)
  if (!hasTrust) {
    addTrustlineSetup(Tx2, buyer, asset, motherAcc.publicKey())
  }

  // Step 12: Add operation to transfer the token from storage account to buyer
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey())

  // Step 13: Finalize the transaction by building, signing with mother and storage accounts, and adding user signature
  const xdr = finalizeTransaction(Tx2, [motherAcc, storageAcc])
  const singedXdr = await WithSing({ xdr, signWith })
  return singedXdr
}

/**
 * Purchase asset using PLATFORM tokens as payment method
 * Handles 5 cases:
 * 1. Account not active (no PLATFORM trust, no XLM) → Error
 * 2. No PLATFORM trust but has XLM → Convert XLM to PLATFORM
 * 3. Has PLATFORM trust but insufficient balance, has XLM → Convert XLM to PLATFORM
 * 4. Has PLATFORM but no XLM for asset trustline → Convert PLATFORM to XLM
 * 5. Has both sufficient → Use normally
 */
export async function XDR4BuyAsset({
  signWith,
  code,
  issuerPub,
  buyer,
  price,
  storageSecret,
  seller,
}: {
  buyer: string
  code: string
  issuerPub: string
  price: string
  signWith: SignUserType
  storageSecret: string
  seller: string
}) {
  const asset = new Asset(code, issuerPub)
  const storageAcc = Keypair.fromSecret(storageSecret)
  const { motherAcc } = getServerAndMotherAcc()

  // Check balances and trustlines
  const xlmBalance = await getNativeBalance(buyer)
  const platformBalance = await getAssetBalance(buyer, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer)
  const hasPlatformTrust = await checkTrustline(buyer, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer)
  const hasAssetTrust = await checkTrustline(buyer, code, issuerPub)

  // Calculate platform asset needed for 0.5 XLM trustline if needed
  const trustPriceInPlatformAsset = await getplatformAssetNumberForXLM(0.5)
  const requiredAsset2refundXlm = (hasAssetTrust && hasPlatformTrust) ? 0 : (hasAssetTrust || hasPlatformTrust) ? trustPriceInPlatformAsset : 2 * trustPriceInPlatformAsset
  const totalPlatformFee = requiredAsset2refundXlm + Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset)
  const totalPlatformNeeded = totalPlatformFee + Number(price)

  // CASE 1: Account not active (no PLATFORM trust AND low XLM)
  if (!hasPlatformTrust && xlmBalance < 1) {
    throw new Error("Your account isn't active. Please activate your account by adding XLM to establish trustlines.")
  }

  const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee)

  let platformFromConversion = 0
  let xlmFromConversion = 0

  // CASE 2: No PLATFORM trust but has XLM → Convert XLM to PLATFORM
  if (!hasPlatformTrust && xlmBalance >= 1) {
    const xlmNeeded = (await getXLMNumberForPlatformAsset(totalPlatformNeeded)) + 0.5 // +0.5 for trustline

    if (xlmBalance < xlmNeeded) {
      const platformPrice = await getPlatformAssetPrice()
      const xlmPrice = await getXLMPrice()
      const xlmToUsd = xlmPrice
      const platformToUsd = platformPrice
      throw new Error(
        `Insufficient XLM to complete purchase. You need ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmToUsd).toFixed(2)}) to convert to ${totalPlatformNeeded.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(totalPlatformNeeded * platformToUsd).toFixed(2)}). You have ${xlmBalance.toFixed(2)} XLM (≈$${(xlmBalance * xlmToUsd).toFixed(2)}).`,
      )
    }

    // Establish PLATFORM trustline
    Tx2.addOperation(
      Operation.changeTrust({
        asset: PLATFORM_ASSET,
        source: buyer,
      }),
    )

    // Convert XLM to PLATFORM via payment from mother account
    const xlmToConvert = xlmNeeded - 0.5
    addPaymentOp(Tx2, motherAcc.publicKey(), xlmToConvert.toFixed(7), Asset.native(), buyer)

    addPaymentOp(Tx2, buyer, totalPlatformNeeded.toFixed(7), PLATFORM_ASSET, motherAcc.publicKey())
    platformFromConversion = totalPlatformNeeded
  }

  // CASE 3: Has PLATFORM trust but insufficient balance AND has XLM → Convert XLM to PLATFORM
  if (hasPlatformTrust && platformBalance < totalPlatformNeeded && xlmBalance > 0) {
    const platformShortage = totalPlatformNeeded - platformBalance
    const xlmNeeded = await getXLMNumberForPlatformAsset(platformShortage)

    if (xlmBalance < xlmNeeded) {
      const platformPrice = await getPlatformAssetPrice()
      const xlmPrice = await getXLMPrice()
      throw new Error(
        `Insufficient funds to complete purchase. You need ${platformShortage.toFixed(0)} more ${PLATFORM_ASSET.code} (≈$${(platformShortage * platformPrice).toFixed(2)}). This requires ~${xlmNeeded.toFixed(2)} XLM to convert, but you only have ${xlmBalance.toFixed(2)} XLM (≈$${(xlmBalance * xlmPrice).toFixed(2)}). You're short by ${(xlmNeeded - xlmBalance).toFixed(2)} XLM (≈$${((xlmNeeded - xlmBalance) * xlmPrice).toFixed(2)}).`,
      )
    }

    // Send XLM to mother account then receive PLATFORM back
    addPaymentOp(Tx2, motherAcc.publicKey(), xlmNeeded.toFixed(7), Asset.native(), buyer)
    addPaymentOp(Tx2, buyer, platformShortage.toFixed(7), PLATFORM_ASSET, motherAcc.publicKey())

    platformFromConversion = platformShortage
  }

  // CASE 4: Has PLATFORM but no XLM for asset trustline → Convert PLATFORM to XLM
  if (hasPlatformTrust && xlmBalance < 0.5 && !hasAssetTrust) {
    const platformToConvert = await getplatformAssetNumberForXLM(0.5)

    if (platformBalance < platformToConvert + totalPlatformNeeded) {
      const platformPrice = await getPlatformAssetPrice()
      const insufficientPlatform = platformToConvert + totalPlatformNeeded - platformBalance
      throw new Error(
        `Insufficient ${PLATFORM_ASSET.code} balance. You need ${(platformToConvert + totalPlatformNeeded).toFixed(0)} ${PLATFORM_ASSET.code} (≈$${((platformToConvert + totalPlatformNeeded) * platformPrice).toFixed(2)}) total. You have ${platformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformBalance * platformPrice).toFixed(2)}). You're short by ${insufficientPlatform.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(insufficientPlatform * platformPrice).toFixed(2)}).`,
      )
    }

    // Send PLATFORM to mother account then receive XLM back
    addPaymentOp(Tx2, motherAcc.publicKey(), platformToConvert.toFixed(7), PLATFORM_ASSET, buyer)
    addPaymentOp(Tx2, buyer, "0.5", Asset.native(), motherAcc.publicKey())

    xlmFromConversion = 0.5
  }

  // CASE 5: Normal flow - check effective balances after conversions
  const effectivePlatformBalance = platformBalance + platformFromConversion
  const effectiveXlmBalance = xlmBalance + xlmFromConversion

  if (effectivePlatformBalance < totalPlatformNeeded) {
    const platformPrice = await getPlatformAssetPrice()
    const xlmPrice = await getXLMPrice()
    const platformShortage = totalPlatformNeeded - effectivePlatformBalance
    const xlmNeededForConversion = await getXLMNumberForPlatformAsset(platformShortage)

    throw new Error(
      `Insufficient ${PLATFORM_ASSET.code} balance. You need ${totalPlatformNeeded.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(totalPlatformNeeded * platformPrice).toFixed(2)}) but have ${effectivePlatformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(effectivePlatformBalance * platformPrice).toFixed(2)}).\n\nYou can use XLM to convert: You need ${xlmNeededForConversion.toFixed(2)} XLM (≈$${(xlmNeededForConversion * xlmPrice).toFixed(2)}) to buy ${platformShortage.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformShortage * platformPrice).toFixed(2)}).`,
    )
  }

  if (effectiveXlmBalance < (hasAssetTrust ? 0 : 0.5)) {
    throw new Error(
      `Insufficient XLM for trustline setup. You need ${hasAssetTrust ? "0" : "0.5"} XLM but have ${effectiveXlmBalance.toFixed(2)} XLM.`,
    )
  }

  // Add platform fee payment
  addPaymentOp(Tx2, motherAcc.publicKey(), totalPlatformFee.toString(), PLATFORM_ASSET, buyer)

  // Add seller payment
  if (Number(price) > 0) {
    addPaymentOp(Tx2, seller, price, PLATFORM_ASSET, buyer)
  }

  // Set up trustline if needed
  if (!hasAssetTrust) {
    addTrustlineSetup(Tx2, buyer, asset, motherAcc.publicKey())
  }

  // Transfer asset
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey())

  // Finalize and sign
  const xdr = finalizeTransaction(Tx2, [motherAcc, storageAcc])
  const signedXdr = await WithSing({ xdr, signWith })
  return signedXdr
}

/**
 * Purchase asset using XLM as payment method
 * Handles 4 cases:
 * 1. Account not active (no PLATFORM trust, no XLM) → Error
 * 2. No PLATFORM trust and insufficient XLM → Error
 * 3. Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
 * 4. Has enough XLM → Proceed normally
 */
export async function XDR4BuyAssetWithXLM({
  signWith,
  code,
  issuerPub,
  buyer,
  priceInNative,
  storageSecret,
  seller,
}: {
  buyer: string
  code: string
  issuerPub: string
  priceInNative: string
  signWith: SignUserType
  storageSecret: string
  seller: string
}) {
  const asset = new Asset(code, issuerPub)
  const storageAcc = Keypair.fromSecret(storageSecret)
  const { motherAcc } = getServerAndMotherAcc()

  // Check balances and trustlines
  const xlmBalance = await getNativeBalance(buyer)
  const platformBalance = await getAssetBalance(buyer, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer)
  const hasPlatformTrust = await checkTrustline(buyer, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer)
  const hasAssetTrust = await checkTrustline(buyer, code, issuerPub)

  // Calculate XLM requirements
  const xlmForTrustline = (hasAssetTrust && hasPlatformTrust) ? 0 : (hasAssetTrust || hasPlatformTrust) ? 0.5 : 1
  const xlmPlatformFee = 2
  const totalXlmNeeded = Number(priceInNative) + xlmForTrustline + xlmPlatformFee

  // CASE 1: Account not active (no PLATFORM trust AND low XLM)
  if (!hasPlatformTrust && xlmBalance < 1) {
    throw new Error("Your account isn't active. Please activate your account by adding XLM.")
  }

  // CASE 2: No PLATFORM trust and insufficient XLM
  if (!hasPlatformTrust && xlmBalance < totalXlmNeeded) {
    const xlmPrice = await getXLMPrice()
    const xlmNeeded = totalXlmNeeded - xlmBalance
    throw new Error(
      `Insufficient XLM to complete purchase. You need ${totalXlmNeeded.toFixed(2)} XLM (≈$${(totalXlmNeeded * xlmPrice).toFixed(2)}) but have ${xlmBalance.toFixed(2)} XLM (≈$${(xlmBalance * xlmPrice).toFixed(2)}). You're short by ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}). Please add more XLM or use a different payment method.`,
    )
  }

  const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee)

  // CASE 3: Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
  if (xlmBalance < totalXlmNeeded && platformBalance > 0) {
    const xlmShortage = totalXlmNeeded - xlmBalance
    const platformToConvert = await getplatformAssetNumberForXLM(xlmShortage)

    if (platformBalance < platformToConvert) {
      const platformPrice = await getPlatformAssetPrice()
      const xlmPrice = await getXLMPrice()
      const insufficientPlatform = platformToConvert - platformBalance
      throw new Error(
        `Insufficient funds to complete XLM payment. You need ${xlmShortage.toFixed(2)} more XLM (≈$${(xlmShortage * xlmPrice).toFixed(2)}). This requires ~${platformToConvert.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformToConvert * platformPrice).toFixed(2)}). You only have ${platformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformBalance * platformPrice).toFixed(2)}). You're short by ${insufficientPlatform.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(insufficientPlatform * platformPrice).toFixed(2)}). Please recharge your account.`,
      )
    }

    // Convert PLATFORM to XLM via mother account
    addPaymentOp(Tx2, motherAcc.publicKey(), platformToConvert.toFixed(7), PLATFORM_ASSET, buyer)
    addPaymentOp(Tx2, buyer, xlmShortage.toFixed(7), Asset.native(), motherAcc.publicKey())
  }

  // CASE 4: Normal flow - pay seller, set up trustline, transfer asset
  if (Number(priceInNative) > 0) {
    addPaymentOp(Tx2, seller, priceInNative, Asset.native(), buyer)
  }

  if (!hasAssetTrust) {
    addTrustlineSetup(Tx2, buyer, asset, motherAcc.publicKey())
  }

  // Transfer asset
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey())

  // Pay platform fee from buyer
  addPaymentOp(Tx2, motherAcc.publicKey(), xlmPlatformFee.toFixed(7), Asset.native(), buyer)

  // Finalize and sign
  const xdr = finalizeTransaction(Tx2, [motherAcc, storageAcc])
  const signedXdr = await WithSing({ xdr, signWith })
  return signedXdr
}

export async function XDR4BuyAssetWithSquire({
  signWith,
  code,
  issuerPub,
  buyer,
  price,
  storageSecret,
  seller,
}: {
  buyer: string
  code: string
  issuerPub: string
  price: string
  signWith: SignUserType
  storageSecret: string
  seller: string
}) {
  // Step 1: Create asset object for the token
  const asset = new Asset(code, issuerPub)
  const storageAcc = Keypair.fromSecret(storageSecret)
  const mother = Keypair.fromSecret(env.MOTHER_SECRET)

  // Step 2: Create transaction builder from mother account with base fee
  const Tx2 = await createTransactionBuilder(mother.publicKey(), BASE_FEE)

  // Step 3: Check if buyer has trustline for the asset
  const hasTrust = await checkTrustline(buyer, code, issuerPub)

  // Step 4: Pay the price in Squire (platform asset) to the seller
  if (Number(price) > 0) {
    addPaymentOp(Tx2, seller, price, PLATFORM_ASSET)
  }

  // Step 5: If no trustline, pay 0.5 XLM to buyer and create trustline
  if (!hasTrust) {
    Tx2.addOperation(
      Operation.payment({
        destination: buyer,
        amount: "0.5",
        asset: Asset.native(),
      }),
    )
    Tx2.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: buyer,
      }),
    )
  }

  // Step 6: Transfer the token to the buyer
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey())

  // Step 7: Finalize and sign the transaction with storage and mother accounts, then user signs
  const xdr = finalizeTransaction(Tx2, [storageAcc, mother])
  const singedXdr = await WithSing({ xdr, signWith })
  return singedXdr
}
