import {
    Asset,
    Horizon,
    Keypair,
    Operation,
    TransactionBuilder,
} from "@stellar/stellar-sdk";

import { env } from "~/env";
import { networkPassphrase, STELLAR_URL, TrxBaseFee } from "./constant";
import { StellarAccount } from "./stellar";





/**
 * Get server and mother account keypair
 */
export function getServerAndMotherAcc() {
    // Create a connection to the Stellar Horizon server
    const server = new Horizon.Server(STELLAR_URL);
    // Generate the keypair for the platform's mother account using its secret
    const motherAcc = Keypair.fromSecret(env.MOTHER_SECRET);
    // Return both the server and mother account keypair
    return { server, motherAcc };
}

/**
 * Load account and create transaction builder
 */
export async function createTransactionBuilder(
    accountPub: string,
    fee: string
): Promise<TransactionBuilder> {
    // Connect to the Stellar Horizon server
    const server = new Horizon.Server(STELLAR_URL);
    // Load the account details from the network using the public key
    const account = await server.loadAccount(accountPub);

    // Create and return a new TransactionBuilder for this account with the specified fee
    return new TransactionBuilder(account, {
        fee,
        networkPassphrase,
    });
}

/**
 * Check if account has trustline for asset
 */
export async function checkTrustline(
    accountPub: string,
    assetCode: string,
    assetIssuer: string
): Promise<boolean> {
    // Create a StellarAccount instance for the given public key
    const account = await StellarAccount.create(accountPub);
    // Check if this account has a trustline for the specified asset
    return account.hasTrustline(assetCode, assetIssuer);
}

/**
 * Add XLM payment and trustline operations if buyer doesn't have trust
 */
export function addTrustlineSetup(
    builder: TransactionBuilder,
    buyer: string,
    asset: Asset,
    motherPub: string
) {
    // Add a payment operation to send 0.5 XLM from mother account to buyer for trustline reserve
    builder
        .addOperation(
            Operation.payment({
                destination: buyer,
                amount: "0.5",
                asset: Asset.native(),
                source: motherPub,
            })
        )
        // Add a change trust operation to establish trustline for the asset on buyer's account
        .addOperation(
            Operation.changeTrust({
                asset: asset,
                source: buyer,
            })
        );
}

/**
 * Add payment operation
 */
export function addPaymentOp(
    builder: TransactionBuilder,
    destination: string,
    amount: string,
    asset: Asset,
    source?: string
) {
    // Add a payment operation to the transaction builder
    builder.addOperation(
        Operation.payment({
            destination,
            amount,
            asset,
            source,
        })
    );
}

/**
 * Build, sign and return XDR
 */
export function finalizeTransaction(
    builder: TransactionBuilder,
    signers: Keypair[]
): string {
    // Set transaction timeout to 0 (no timeout)
    builder.setTimeout(0);
    // Build the transaction
    const buildTrx = builder.build();
    // Sign the transaction with all provided signers
    buildTrx.sign(...signers);
    // Return the transaction as XDR string
    return buildTrx.toXDR();
}


/**
 * Get asset balance for an account
 */
export async function getAssetBalance(
    accountPub: string,
    assetCode: string,
    assetIssuer: string
): Promise<number> {
    const account = await StellarAccount.create(accountPub);
    const balance = account.getTokenBalance(assetCode, assetIssuer);
    return balance;
}


/**
 * Get native (XLM) balance for an account
 */
export async function getNativeBalance(accountPub: string): Promise<number> {
    const account = await StellarAccount.create(accountPub);
    const balance = account.getNativeBalance();
    return Number(balance);
}

/**
 * Get all balances for an account
 */
export async function getAllBalances(accountPub: string): Promise<(Horizon.HorizonApi.BalanceLineNative | Horizon.HorizonApi.BalanceLineAsset<"credit_alphanum4"> | Horizon.HorizonApi.BalanceLineAsset<"credit_alphanum12"> | Horizon.HorizonApi.BalanceLineLiquidityPool)[]> {
    const server = new Horizon.Server(STELLAR_URL);
    const transactionInializer = await server.loadAccount(accountPub);
    const balances = transactionInializer.balances;
    return balances;
}