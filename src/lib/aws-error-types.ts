export interface AWSError extends Error {
    name: string
    message: string
    code?: string
    statusCode?: number
    retryable?: boolean
    time?: Date
    $fault?: "client" | "server"
    $service?: string
}

export interface AmplifyError extends AWSError {
    $metadata?: {
        httpStatusCode?: number
        requestId?: string
        attempts?: number
    }
}

export function isRateLimitError(error: unknown): error is AmplifyError {
    if (!error || typeof error !== "object") return false

    const amplifyError = error as AmplifyError

    return (
        (amplifyError.name === "BadRequestException" && amplifyError.message?.includes("Rate exceeded")) ||
        amplifyError.name === "ThrottlingException" ||
        amplifyError.name === "TooManyRequestsException"
    )
}

export function isRetryableError(error: unknown): error is AmplifyError {
    if (!error || typeof error !== "object") return false

    const amplifyError = error as AmplifyError

    // Rate limiting errors are retryable
    if (isRateLimitError(error)) return true

    // Server errors (5xx) are generally retryable
    if (amplifyError.$metadata?.httpStatusCode && amplifyError.$metadata.httpStatusCode >= 500) return true

    // Specific retryable error codes
    const retryableErrors = ["ServiceUnavailableException", "InternalServerError", "RequestTimeout"]

    return retryableErrors.includes(amplifyError.name || "")
}

export function getErrorMessage(error: unknown): string {
    if (!error || typeof error !== "object") return "An unknown error occurred"

    const amplifyError = error as AmplifyError

    if (isRateLimitError(error)) {
        return "Too many domain requests. Please wait a few minutes before trying again."
    }

    if (amplifyError.name === "BadRequestException") {
        if (amplifyError.message?.includes("Domain already exists")) {
            return "This domain is already associated with another Amplify app."
        }
        if (amplifyError.message?.includes("Invalid domain")) {
            return "Please enter a valid domain name."
        }
    }

    if (amplifyError.name === "UnauthorizedException") {
        return "Authentication failed. Please check your AWS credentials."
    }

    if (amplifyError.name === "LimitExceededException") {
        return "You have reached the maximum number of domains for this app."
    }

    return amplifyError.message || "An unexpected error occurred. Please try again."
}
