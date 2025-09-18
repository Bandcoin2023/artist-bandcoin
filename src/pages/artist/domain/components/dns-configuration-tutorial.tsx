"use client"

import React from "react"
import { AlertCircle, CheckCircle, Copy, ExternalLink, Info } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Alert, AlertDescription, AlertTitle } from "~/components/shadcn/ui/alert"
import { Badge } from "~/components/shadcn/ui/badge"
import { Separator } from "~/components/shadcn/ui/separator"
import toast from "react-hot-toast"

interface DNSConfigurationTutorialProps {
    domain?: string
    certificateValidationRecord?: string
    cloudfrontDomain?: string
}

export default function DNSConfigurationTutorial({
    domain = "yourdomain.com",
    certificateValidationRecord,
    cloudfrontDomain = "dmu3qfdeks96g.cloudfront.net",
}: DNSConfigurationTutorialProps) {
    const [copiedField, setCopiedField] = React.useState<string | null>(null)

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

    // Parse certificate validation record
    const parsedValidationRecord = certificateValidationRecord
        ? {
            hostname: certificateValidationRecord.split(" ")[0] ?? "_bf7c2caff81c8e7dd2628e9e38391abe.yourdomain.com",
            value:
                certificateValidationRecord.split(" ")[2] ??
                "_e2ed43f541224eba719707fd6f5cd479.xlfgrmvvlj.acm-validations.aws",
        }
        : {
            hostname: "_bf7c2caff81c8e7dd2628e9e38391abe.yourdomain.com",
            value: "_e2ed43f541224eba719707fd6f5cd479.xlfgrmvvlj.acm-validations.aws",
        }

    const steps = [
        {
            id: "access-dns",
            title: "Access Your DNS Provider",
            description: "Log in to your DNS provider's control panel",
            status: "pending",
        },
        {
            id: "ssl-validation",
            title: "Configure SSL Certificate Validation",
            description: "Add CNAME record for SSL certificate validation",
            status: "pending",
        },
        {
            id: "subdomain-config",
            title: "Configure Your Subdomain",
            description: "Point your subdomain to CloudFront distribution",
            status: "pending",
        },
        {
            id: "root-domain",
            title: "Root Domain Configuration (Optional)",
            description: "Set up root domain forwarding if needed",
            status: "pending",
        },
    ]

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
                            Your domain name: <code className="bg-muted px-1 rounded">{domain}</code>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>AWS CloudFront distribution details</span>
                    </div>
                </CardContent>
            </Card>

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
                        Configure SSL Certificate Validation (CNAME Record #1)
                    </CardTitle>
                    <CardDescription>This record validates your SSL certificate with AWS Certificate Manager</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Example Configuration</AlertTitle>
                        <AlertDescription>
                            Replace the example values below with your actual validation hostname and value from AWS
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-4">
                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                            <div className="font-medium">Hostname:</div>
                            <code className="text-sm bg-background px-2 py-1 rounded break-all">
                                {parsedValidationRecord.hostname}
                            </code>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(parsedValidationRecord.hostname, "ssl-hostname")}
                            >
                                {copiedField === "ssl-hostname" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                            <div className="font-medium">Type:</div>
                            <code className="text-sm bg-background px-2 py-1 rounded">CNAME</code>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard("CNAME", "ssl-type")}>
                                {copiedField === "ssl-type" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                            <div className="font-medium">Value:</div>
                            <code className="text-sm bg-background px-2 py-1 rounded break-all">{parsedValidationRecord.value}</code>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(parsedValidationRecord.value, "ssl-value")}
                            >
                                {copiedField === "ssl-value" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium">How to Add This Record:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>In your DNS management panel, click <b>Add Record</b> or <b>Create Record</b></li>
                            <li>
                                Set Type to <strong>CNAME</strong>
                            </li>
                            <li>For Name/Hostname, enter the validation hostname (without your domain)</li>
                            <li>For Value/Target, enter the validation value from AWS</li>
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
                        Configure Your Subdomain (CNAME Record #2)
                    </CardTitle>
                    <CardDescription>This record points your subdomain to your CloudFront distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                            <div className="font-medium">Hostname:</div>
                            <code className="text-sm bg-background px-2 py-1 rounded">www</code>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard("www", "subdomain-hostname")}>
                                {copiedField === "subdomain-hostname" ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                            <div className="font-medium">Type:</div>
                            <code className="text-sm bg-background px-2 py-1 rounded">CNAME</code>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard("CNAME", "subdomain-type")}>
                                {copiedField === "subdomain-type" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-center p-4 bg-muted/30 rounded-lg">
                            <div className="font-medium">Value:</div>
                            <code className="text-sm bg-background px-2 py-1 rounded break-all">{cloudfrontDomain}</code>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(cloudfrontDomain, "subdomain-value")}>
                                {copiedField === "subdomain-value" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Replace <b>www</b> with your desired subdomain (e.g., app, blog, etc.) and use your actual CloudFront
                            distribution domain
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Step 4: Root Domain Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline">4</Badge>
                        Root Domain Configuration (Optional)
                    </CardTitle>
                    <CardDescription>Only needed if you want your root domain to redirect to your subdomain</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                            This step is only needed if you want your root domain (example.com) to redirect to your subdomain
                            (www.example.com)
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium mb-2">For DNS Providers Supporting ANAME/ALIAS Records:</h4>
                            <p className="text-sm text-muted-foreground">
                                If your DNS provider supports ANAME or ALIAS records, you can point your root domain directly to your
                                CloudFront distribution.
                            </p>
                        </div>

                        <Separator />

                        <div>
                            <h4 className="font-medium mb-2">For GoDaddy Users (Domain Forwarding):</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                                Since GoDaddy doesn{"'"}t support ANAME/ALIAS records, use domain forwarding:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                <li>In your GoDaddy DNS panel, find the top menu and click <b>Forwarding</b></li>
                                <li>In the Domain section, click <b>Add Forwarding</b></li>
                                <li>
                                    Configure the forwarding:
                                    <ul className="list-disc list-inside ml-4 mt-1">
                                        <li>Protocol: Select http://</li>
                                        <li>Destination URL: Enter your subdomain (e.g., www.{domain})</li>
                                        <li>Forward Type: Select Temporary (302)</li>
                                    </ul>
                                </li>
                                <li>Click <b>Save</b></li>
                            </ol>
                        </div>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Alternative Recommendation</AlertTitle>
                            <AlertDescription>
                                For better performance and more features, consider migrating your DNS to Amazon Route 53, which fully
                                supports ANAME/ALIAS records.
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
                        <li>Test your domain by visiting it in a web browser</li>
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
