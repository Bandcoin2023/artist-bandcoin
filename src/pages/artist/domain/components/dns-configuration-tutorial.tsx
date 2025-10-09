"use client"


import React from "react"
import { AlertCircle, CheckCircle, Copy, ExternalLink, Info } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Alert, AlertDescription, AlertTitle } from "~/components/shadcn/ui/alert"
import { Badge } from "~/components/shadcn/ui/badge"
import { Separator } from "~/components/shadcn/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import toast from "react-hot-toast"

interface DNSConfigurationTutorialProps {
    domain?: string
    subdomain?: string
    certificateValidationRecord?: string
    cloudfrontDomain?: string
}

export default function DNSConfigurationTutorial({
    domain = "yourdomain.com",
    subdomain,
    certificateValidationRecord,
    cloudfrontDomain = "dmu3qfdeks96g.cloudfront.net",
}: DNSConfigurationTutorialProps) {
    const [copiedField, setCopiedField] = React.useState<string | null>(null)

    const extractedSubdomain = React.useMemo(() => {
        if (subdomain) return subdomain

        // If domain contains a subdomain (e.g., "setup.yourdomain.com"), extract it
        const parts = domain.split(".")
        if (parts.length > 2) {
            return parts[0] // Return the first part as subdomain
        }

        return "setup" // Default subdomain for examples
    }, [domain, subdomain])

    const rootDomain = React.useMemo(() => {
        // Extract root domain (e.g., "yourdomain.com" from "setup.yourdomain.com")
        const parts = domain.split(".")
        if (parts.length > 2) {
            return parts.slice(1).join(".") // Return everything after the first part
        }
        return domain
    }, [domain])

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            toast.success("Copied to clipboard!")
            setTimeout(() => setCopiedField(null), 2000)
        } catch (err) {
            toast.error("Failed to copy to clipboard")
        }
    }

    const parsedValidationRecord = React.useMemo(() => {
        const domainPartlength = domain.split(".").length;

        if (certificateValidationRecord) {
            console.log("Parsing certificateValidationRecord:", certificateValidationRecord)
            const parts = certificateValidationRecord.split(" ")
            // AWS format: "hostname CNAME value"
            if (parts.length >= 3) {

                return {
                    hostname: `${parts[0]?.split(".")[0]}${domainPartlength === 3 ? `.${extractedSubdomain}` : ""}`, // Remove the last two parts (domain and TLD)
                    value: parts[2],
                }
            }
        }

        // Fallback to example values
        return {
            hostname: `_bf7c2caff81c8e7dd2628e9e38391abe${domainPartlength === 3 ? `.${extractedSubdomain}` : ""}`,
            value: "_e2ed43f541224eba719707fd6f5cd479.xlfgrmvvlj.acm-validations.aws",
        }
    }, [certificateValidationRecord, extractedSubdomain])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">DNS Configuration Tutorial</h2>
                <p className="text-muted-foreground">Complete guide for configuring DNS records for AWS CloudFront</p>
            </div>

            {/* Prerequisites */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Prerequisites
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Access to your DNS provider{"'"}s control panel</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>
                            Your domain name: <code className="bg-muted px-1 rounded">{rootDomain}</code>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>AWS CloudFront distribution details</span>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue={domain.split(".").length === 2 ? "domain" : "subdomain"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="subdomain" disabled={domain.split(".").length === 2}>Custom Subdomain</TabsTrigger>
                    <TabsTrigger value="domain" disabled={domain.split(".").length === 3}>Custom Domain</TabsTrigger>
                </TabsList>

                {/* Custom Subdomain Tab */}
                <TabsContent value="subdomain" className="space-y-6 mt-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Subdomain Setup Overview</AlertTitle>
                        <AlertDescription>
                            To connect a subdomain (e.g., {extractedSubdomain}.{rootDomain}) to your CloudFront distribution, you need
                            to add <strong>two CNAME records</strong>: one for SSL certificate validation and one for the subdomain
                            itself.
                        </AlertDescription>
                    </Alert>

                    {/* Step 1: Access DNS Provider */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">1</Badge>
                                Access Your DNS Provider
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>Go to your DNS provider{"'"}s website (e.g., GoDaddy, Namecheap, Cloudflare, Route 53)</li>
                                <li>Log in to your account</li>
                                <li>Navigate to the DNS management settings for your domain</li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* Step 2: SSL Certificate Validation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">2</Badge>
                                Add SSL Certificate Validation (CNAME Record #1)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!certificateValidationRecord && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>AWS Provides These Values</AlertTitle>
                                    <AlertDescription>
                                        You{"'"}ll find these exact values in your AWS Amplify or CloudFront console under SSL certificate
                                        settings. Replace the example values below with your actual validation record.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-4">
                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Type:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded">CNAME</code>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard("CNAME", "ssl-type")}>
                                        {copiedField === "ssl-type" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Name:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded break-all">
                                        {parsedValidationRecord.hostname}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(parsedValidationRecord.hostname, "ssl-hostname")}
                                    >
                                        {copiedField === "ssl-hostname" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Value:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded break-all">
                                        {parsedValidationRecord.value}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(parsedValidationRecord.value ?? "", "ssl-value")}
                                    >
                                        {copiedField === "ssl-value" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">How to Add This Record:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>
                                        In your DNS management panel, click <b>Add Record</b> or <b>Create Record</b>
                                    </li>
                                    <li>
                                        Set Type to <strong>CNAME</strong>
                                    </li>
                                    <li>
                                        For Name/Host, copy the validation hostname exactly as shown (e.g.,{" "}
                                        <code>_unique-string.{extractedSubdomain}</code>)
                                    </li>
                                    <li>For Value/Target, copy the ACM validation value from AWS</li>
                                    <li>Set TTL to 3600 (or leave as default)</li>
                                    <li>Save the record</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 3: Subdomain Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">3</Badge>
                                Add Your Subdomain (CNAME Record #2)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4">
                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Type:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded">CNAME</code>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard("CNAME", "subdomain-type")}>
                                        {copiedField === "subdomain-type" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Name:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded">{extractedSubdomain}</code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(extractedSubdomain ?? "", "subdomain-hostname")}
                                    >
                                        {copiedField === "subdomain-hostname" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Value:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded break-all">{cloudfrontDomain}</code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(cloudfrontDomain, "subdomain-value")}
                                    >
                                        {copiedField === "subdomain-value" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">How to Add This Record:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>
                                        In your DNS management panel, click <b>Add Record</b> or <b>Create Record</b>
                                    </li>
                                    <li>
                                        Set Type to <strong>CNAME</strong>
                                    </li>
                                    <li>
                                        For Name/Host, enter your subdomain name (e.g., <code>{extractedSubdomain}</code>, <code>www</code>,{" "}
                                        <code>app</code>, etc.)
                                    </li>
                                    <li>For Value/Target, enter your CloudFront or Amplify distribution domain</li>
                                    <li>Set TTL to 3600 (or leave as default)</li>
                                    <li>Save the record</li>
                                </ol>
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Common Subdomain Examples</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>
                                            <code>www</code> - www.{rootDomain}
                                        </li>
                                        <li>
                                            <code>app</code> - app.{rootDomain}
                                        </li>
                                        <li>
                                            <code>setup</code> - setup.{rootDomain}
                                        </li>
                                        <li>
                                            <code>blog</code> - blog.{rootDomain}
                                        </li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Step 4: Wait for Validation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">4</Badge>
                                Wait for DNS Propagation and SSL Validation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>AWS will automatically validate the SSL certificate using the first CNAME record</li>
                                <li>DNS propagation typically takes 5-30 minutes, but can take up to 48 hours</li>
                                <li>Once validated, your subdomain will be active with HTTPS enabled</li>
                            </ol>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Validation Status</AlertTitle>
                                <AlertDescription>
                                    You can check the SSL certificate validation status in your AWS Amplify or CloudFront console. Once it
                                    shows Issued or Active, your subdomain is ready to use.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Verification */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Verification & Testing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">After DNS propagation completes:</p>
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>
                                    Visit your subdomain in a web browser: https://{extractedSubdomain}.{rootDomain}
                                </li>
                                <li>Verify the SSL certificate is working (look for the lock icon in the address bar)</li>
                                <li>Use online DNS lookup tools to confirm both CNAME records are properly configured</li>
                            </ol>

                            <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        DNS Checker Tool
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://www.whatsmydns.net" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        What{"'"}s My DNS
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Custom Domain Tab */}
                <TabsContent value="domain" className="space-y-6 mt-6">
                    {/* Step 1: Access DNS Provider */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">1</Badge>
                                Access Your DNS Provider
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>Go to your DNS provider{"'"}s website (e.g., GoDaddy, Namecheap, Cloudflare)</li>
                                <li>Log in to your account</li>
                                <li>Navigate to the DNS management settings for your domain</li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* Step 2: SSL Certificate Validation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">2</Badge>
                                Configure SSL Certificate Validation (CNAME Record)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!certificateValidationRecord && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>AWS Provides These Values</AlertTitle>
                                    <AlertDescription>
                                        You{"'"}ll find these exact values in your AWS Amplify or CloudFront console under SSL certificate
                                        settings. Replace the example values below with your actual validation record.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-4">
                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Type:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded">CNAME</code>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard("CNAME", "ssl-type-domain")}>
                                        {copiedField === "ssl-type-domain" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Name:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded break-all">
                                        {parsedValidationRecord.hostname}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(parsedValidationRecord.hostname, "ssl-hostname-domain")}
                                    >
                                        {copiedField === "ssl-hostname-domain" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                    <div className="font-medium">Value:</div>
                                    <code className="text-sm bg-background px-2 py-1 rounded break-all">
                                        {parsedValidationRecord.value}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(parsedValidationRecord.value ?? "", "ssl-value-domain")}
                                    >
                                        {copiedField === "ssl-value-domain" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">How to Add This Record:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>
                                        In your DNS management panel, click <b>Add Record</b> or <b>Create Record</b>
                                    </li>
                                    <li>
                                        Set Type to <strong>CNAME</strong>
                                    </li>
                                    <li>
                                        For Name/Host, copy the validation hostname exactly as shown (e.g.,{" "}
                                        <code>_unique-string.{extractedSubdomain}</code>)
                                    </li>
                                    <li>For Value/Target, copy the ACM validation value from AWS</li>
                                    <li>Set TTL to 3600 (or leave as default)</li>
                                    <li>Save the record</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 3: Root Domain Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline">3</Badge>
                                Root Domain Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Important</AlertTitle>
                                <AlertDescription>
                                    Root domain configuration varies by DNS provider. Choose the method that works for your provider.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Option 1: ANAME/ALIAS Records (Recommended)</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        If your DNS provider supports ANAME or ALIAS records (Cloudflare, Route 53, DNSimple), you can point
                                        your root domain directly to your CloudFront distribution.
                                    </p>

                                    <div className="grid gap-4">
                                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                            <div className="font-medium">Hostname:</div>
                                            <code className="text-sm bg-background px-2 py-1 rounded">@ (or leave blank)</code>
                                            <Button size="sm" variant="outline" onClick={() => copyToClipboard("@", "root-hostname")}>
                                                {copiedField === "root-hostname" ? (
                                                    <CheckCircle className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                            <div className="font-medium">Type:</div>
                                            <code className="text-sm bg-background px-2 py-1 rounded">ANAME or ALIAS</code>
                                            <Button size="sm" variant="outline" onClick={() => copyToClipboard("ANAME", "root-type")}>
                                                {copiedField === "root-type" ? (
                                                    <CheckCircle className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                                            <div className="font-medium">Value:</div>
                                            <code className="text-sm bg-background px-2 py-1 rounded break-all">{cloudfrontDomain}</code>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(cloudfrontDomain, "root-value")}
                                            >
                                                {copiedField === "root-value" ? (
                                                    <CheckCircle className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h4 className="font-medium mb-2">Option 2: Domain Forwarding (GoDaddy, Namecheap)</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        If your DNS provider doesn{"'"}t support ANAME/ALIAS records, use domain forwarding to redirect your
                                        root domain to a subdomain:
                                    </p>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>
                                            In your DNS provider{"'"}s control panel, find the <b>Forwarding</b> or <b>Redirect</b> section
                                        </li>
                                        <li>
                                            Click <b>Add Forwarding</b> or <b>Add Redirect</b>
                                        </li>
                                        <li>
                                            Configure the forwarding:
                                            <ul className="list-disc list-inside ml-4 mt-1">
                                                <li>Source: Your root domain (e.g., {rootDomain})</li>
                                                <li>Destination: Your subdomain (e.g., www.{rootDomain})</li>
                                                <li>Redirect Type: Permanent (301) or Temporary (302)</li>
                                                <li>Protocol: HTTPS (if available)</li>
                                            </ul>
                                        </li>
                                        <li>Save the forwarding rule</li>
                                    </ol>
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Best Practice Recommendation</AlertTitle>
                                    <AlertDescription>
                                        For better performance and more features, consider migrating your DNS to Amazon Route 53 or
                                        Cloudflare, which fully support ANAME/ALIAS records for root domains.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Verification */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Verification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">After configuring your DNS records:</p>
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>Wait 24-48 hours for DNS propagation (though it{"'"}s often faster)</li>
                                <li>Test your root domain by visiting it in a web browser</li>
                                <li>Verify SSL certificate is working (look for the lock icon)</li>
                                <li>Use online DNS lookup tools to confirm your records are properly configured</li>
                            </ol>

                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        DNS Checker Tool
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://www.whatsmydns.net" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        What{"'"}s My DNS
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Final Warning */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>DNS Propagation Notice</AlertTitle>
                <AlertDescription>
                    DNS changes can take up to 48 hours to propagate globally. Most changes are visible within a few hours, but
                    some regions may take longer to update.
                </AlertDescription>
            </Alert>
        </div>
    )
}
