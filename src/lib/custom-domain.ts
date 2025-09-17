import {
    AmplifyClient,
    CreateDomainAssociationCommand,
    DeleteDomainAssociationCommand,
    ListDomainAssociationsCommand,
} from "@aws-sdk/client-amplify"
import { type AmplifyError, isRateLimitError } from "./aws-error-types"

const AMPLIFY_APP_ID = process.env.AMPLIFY_APP_ID ?? "your-app-id"

const client = new AmplifyClient({
    region: process.env.AMPLIFY_REGION ?? "us-east-2",
    credentials: {
        accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID ?? "your-access-key-id",
        secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY ?? "your-secret-access-key",
    },
})

async function retryWithBackoff<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: AmplifyError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error: unknown) {
            lastError = error as AmplifyError

            // Don't retry on non-rate-limit errors or on final attempt
            if (!isRateLimitError(error) || attempt === maxRetries) {
                throw error
            }

            // Calculate delay with exponential backoff and jitter
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
            console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)

            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    throw lastError!
}

export async function addCustomDomain(domainName: string, subDomains: Array<{ prefix: string; branch: string }>) {
    return await retryWithBackoff(
        async () => {
            const command = new CreateDomainAssociationCommand({
                appId: AMPLIFY_APP_ID,
                domainName: domainName,

                subDomainSettings: subDomains.map((subDomain) => ({
                    branchName: subDomain.branch,
                    prefix: subDomain.prefix,
                })),
                enableAutoSubDomain: false,
                certificateSettings: {
                    type: "AMPLIFY_MANAGED",
                },
            })

            console.log(`Attempting to create domain association for: ${domainName}`)
            const response = await client.send(command)
            console.log(`Successfully created domain association for: ${domainName}`)
            return response
        },
        3,
        2000,
    ) // 3 retries with 2 second base delay
}

export async function deleteCustomDomain(domainName: string) {
    return await retryWithBackoff(
        async () => {
            const command = new DeleteDomainAssociationCommand({
                appId: AMPLIFY_APP_ID,
                domainName: domainName,
            })

            console.log(`Attempting to delete domain association for: ${domainName}`)
            const response = await client.send(command)
            console.log(`Successfully deleted domain association for: ${domainName}`)
            return response
        },
        2,
        1000,
    ) // 2 retries with 1 second base delay
}

export async function getDomainAssociation() {
    return await retryWithBackoff(
        async () => {
            const listCommand = new ListDomainAssociationsCommand({
                appId: AMPLIFY_APP_ID,
            })

            const listResponse = await client.send(listCommand)
            return listResponse
        },
        2,
        500,
    ) // 2 retries with 500ms base delay
}
