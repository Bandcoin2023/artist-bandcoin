"use client"

import type { DomainAssociation } from "@aws-sdk/client-amplify"
import { AlertCircle, Check, ChevronDown, Cog, Loader2, Trash2, Copy } from "lucide-react"
import type { GetServerSidePropsContext } from "next"
import React, { useState, useEffect } from "react"
import { getDomainAssociation } from "~/lib/custom-domain"
import { getServerAuthSession } from "~/server/auth"
import { db } from "~/server/db"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Input } from "~/components/shadcn/ui/input"
import { Badge } from "~/components/shadcn/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/shadcn/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "~/components/shadcn/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { cn } from "~/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import type { Creator, VanitySubscription } from "@prisma/client"
import { format, formatDistanceToNow } from "date-fns"
import { env } from "~/env"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import useNeedSign from "~/lib/hook"
import { clientsign } from "package/connect_wallet"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { useSession } from "next-auth/react"
import DNSConfigurationTutorial from "./components/dns-configuration-tutorial"
import VanityURLManager from "./components/vanity-manager"

const VanityURLSchema = z.object({
    vanityURL: z.string().min(2).max(30),
})

type VanityURLFormData = z.infer<typeof VanityURLSchema>


export type CreatorWithSubscription = Creator & {
    vanitySubscription: VanitySubscription | null;
};


// server data
export async function getServerSideProps(context: GetServerSidePropsContext) {
    const session = await getServerAuthSession(context)
    const domain = await db.creatorCustomDomain.findFirst({
        where: {
            creatorId: session?.user?.id,
        },
    })

    if (domain) {
        try {
            const res = await getDomainAssociation()
            const associatedDomain = res.domainAssociations?.find((d) => d.domainName == domain.domain)

            return {
                props: {
                    domain,
                    associatedDomain: associatedDomain ?? null,
                },
            }
        } catch (error) {
            console.error("Error fetching domain association:", error)
            return {
                props: {
                    domain,
                    associatedDomain: null,
                },
            }
        }
    }

    return {
        props: {
            domain: null,
            associatedDomain: null,
        },
    }
}

export default function DomainVanityManager({
    domain,
    associatedDomain,

}: {
    domain: {
        domain: string
    } | null
    associatedDomain: DomainAssociation | null

}) {
    const [activeTab, setActiveTab] = React.useState("domain")
    const { data: creator } = api.fan.creator.vanitySubscription.useQuery();

    return (
        <div className="container mx-auto max-w-6xl py-8 px-4">
            <Card className="shadow-lg">
                <CardHeader className="border-b">
                    <div className="flex flex-col gap-2">
                        <CardTitle className="text-2xl">Domain & URL Management</CardTitle>
                        <CardDescription>Manage your custom domain and vanity URL settings</CardDescription>
                    </div>
                </CardHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0 h-auto">
                        <TabsTrigger
                            value="domain"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            <Cog className="mr-2 h-4 w-4" />
                            Domain Management
                        </TabsTrigger>
                        <TabsTrigger
                            value="vanity"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            Vanity URL
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="domain" className="p-0">
                        {domain ? (
                            <DomainDetails domain={domain} associatedDomain={associatedDomain ?? undefined} />
                        ) : (
                            <NoDomainView />
                        )}
                    </TabsContent>

                    <TabsContent value="vanity" className="p-0">
                        <CardContent className="pt-6">
                            <VanityURLManager creator={creator as CreatorWithSubscription} />
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    )
}

function DomainDetails({
    domain,
    associatedDomain,
}: {
    domain: { domain: string }
    associatedDomain?: DomainAssociation
}) {
    const [dnsConfigOpen, setDnsConfigOpen] = React.useState(false)
    const [viewDnsRecordsOpen, setViewDnsRecordsOpen] = React.useState(false)
    const domainStatus = associatedDomain?.domainStatus ?? "PENDING"

    // Determine the step status
    const steps = [
        {
            id: "ssl-creation",
            name: "SSL creation",
            status:
                domainStatus === "REQUESTING_CERTIFICATE" || domainStatus === "IMPORTING_CUSTOM_CERTIFICATE"
                    ? "in-progress"
                    : domainStatus === "FAILED"
                        ? "pending"
                        : domainStatus === "PENDING"
                            ? "pending"
                            : "complete",
        },
        {
            id: "ssl-configuration",
            name: "CNAME configuration or Pending Verification",
            status:
                domainStatus === "PENDING_VERIFICATION" || domainStatus === "AWAITING_APP_CNAME"
                    ? "in-progress"
                    : domainStatus === "FAILED"
                        ? "pending"
                        : domainStatus === "PENDING"
                            ? "pending"
                            : domainStatus === "REQUESTING_CERTIFICATE" ||
                                domainStatus === "CREATING" ||
                                domainStatus === "IMPORTING_CUSTOM_CERTIFICATE"
                                ? "pending"
                                : "complete",
        },
        {
            id: "domain-activation",
            name: "Pending Deployment",
            status:
                domainStatus === "PENDING_DEPLOYMENT" || domainStatus === "IN_PROGRESS"
                    ? "in-progress"
                    : domainStatus === "FAILED" || domainStatus === "PENDING"
                        ? "pending"
                        : domainStatus === "AVAILABLE"
                            ? "complete"
                            : "pending",
        },
    ]

    const currentStep = steps.findIndex((step) => step.status === "in-progress")

    return (
        <CardContent className="p-0">
            <div className="grid min-h-[400px] grid-cols-[280px_1fr]">
                {/* Sidebar with steps */}
                <div className="border-r bg-muted/20 p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Setup Progress</h3>
                    </div>
                    <div className="space-y-8">
                        {steps.map((step, index) => (
                            <div key={step.id} className="relative flex items-center gap-4">
                                {index > 0 && (
                                    <div
                                        className={cn(
                                            "absolute left-[15px] top-[-32px] h-[32px] w-[2px]",
                                            step.status === "pending" ? "bg-muted-foreground/20" : "bg-primary",
                                        )}
                                    />
                                )}
                                <div
                                    className={cn(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                                        step.status === "complete"
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : step.status === "in-progress"
                                                ? "animate-pulse border-primary bg-primary/10 text-primary"
                                                : "border-muted-foreground/20 bg-muted/50 text-muted-foreground/50",
                                    )}
                                >
                                    {step.status === "complete" ? (
                                        <Check className="h-4 w-4" />
                                    ) : step.status === "in-progress" ? (
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span
                                        className={cn(
                                            "text-sm font-medium",
                                            step.status === "pending" ? "text-muted-foreground/50" : "text-foreground",
                                        )}
                                    >
                                        {step.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col p-8">
                    {/* Domain header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="text-xl font-semibold">{domain.domain}</h3>
                                <p className="text-sm text-muted-foreground mt-1">Custom Domain Configuration</p>
                            </div>
                            <Badge variant={domainStatus === "AVAILABLE" ? "default" : "secondary"} className="ml-4">
                                {domainStatus}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        Actions <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setViewDnsRecordsOpen(true)} onSelect={(e) => e.preventDefault()}>
                                        <Cog className="mr-2 h-4 w-4" />
                                        View DNS Records
                                    </DropdownMenuItem>
                                    <DeleteDomainDialog associatedDomain={associatedDomain}>
                                        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete domain
                                        </DropdownMenuItem>
                                    </DeleteDomainDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="outline" size="sm" onClick={() => setDnsConfigOpen(true)}>
                                <Cog className="mr-2 h-4 w-4" />
                                Configuration
                            </Button>
                        </div>
                    </div>

                    {/* DNS Dialogs */}
                    <Dialog open={dnsConfigOpen} onOpenChange={setDnsConfigOpen}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>DNS Configuration Tutorial</DialogTitle>
                                <DialogDescription>
                                    Complete guide for configuring DNS records for your domain with AWS CloudFront
                                </DialogDescription>
                            </DialogHeader>
                            <DNSConfigurationTutorial
                                domain={domain.domain}
                                certificateValidationRecord={associatedDomain?.certificateVerificationDNSRecord}
                                cloudfrontDomain={
                                    associatedDomain?.subDomains?.[0]?.dnsRecord
                                        ? parseDNSRecord(associatedDomain.subDomains[0].dnsRecord)?.data
                                        : undefined
                                }
                            />
                            <DialogFooter>
                                <Button onClick={() => setDnsConfigOpen(false)}>Close</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={viewDnsRecordsOpen} onOpenChange={setViewDnsRecordsOpen}>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>DNS Configuration</DialogTitle>
                                <DialogDescription>Configure these DNS records with your domain provider</DialogDescription>
                            </DialogHeader>
                            <DomainEntry associatedDomain={associatedDomain} />
                            <DialogFooter>
                                <Button onClick={() => setViewDnsRecordsOpen(false)}>Close</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Status content */}
                    <div className="space-y-4">
                        {currentStep === 2 ? (
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 space-y-4">
                                <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Activating domain...
                                </h4>
                                <p className="text-muted-foreground">
                                    We are propagating your custom domain to our global content delivery network which could take up to 30
                                    minutes.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    This process is automatic and no further action is required
                                </p>
                            </div>
                        ) : currentStep === 1 ? (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-6">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5" />
                                        Configure DNS settings
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        To verify your domain, add the following DNS records to your domain provider:
                                    </p>
                                </div>
                                <DomainEntry associatedDomain={associatedDomain} />
                            </div>
                        ) : (
                            <>
                                {associatedDomain ? (
                                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-6">
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-600" />
                                            SSL Certificate Created
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            We&apos;ve successfully created an SSL certificate for your domain. The next step is to configure
                                            your DNS settings.
                                        </p>
                                    </div>
                                ) : (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>
                                            Domain association {domain.domain} not found. Try deleting and resetting your domain.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </CardContent>
    )
}

function DomainEntry({
    associatedDomain,
}: {
    associatedDomain?: DomainAssociation
}) {
    return (
        <div className="space-y-4 w-full">
            <div className="rounded-md border bg-muted/30 p-4">
                <h3 className="mb-4 font-semibold text-sm">Verification Record</h3>
                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                    <div className="font-medium text-muted-foreground">Hostname</div>
                    <div className="font-mono">
                        {associatedDomain?.certificateVerificationDNSRecord
                            ? associatedDomain.certificateVerificationDNSRecord.split(" ")[0]
                            : ""}
                    </div>
                    <div className="font-medium text-muted-foreground">Type</div>
                    <div className="font-mono">
                        {associatedDomain?.certificateVerificationDNSRecord
                            ? associatedDomain.certificateVerificationDNSRecord.includes("CNAME")
                                ? "CNAME"
                                : ""
                            : "CNAME"}
                    </div>
                    <div className="font-medium text-muted-foreground">Data/URL</div>
                    <div className="font-mono break-all">
                        {associatedDomain?.certificateVerificationDNSRecord
                            ? associatedDomain.certificateVerificationDNSRecord.split(" ").length > 2
                                ? associatedDomain.certificateVerificationDNSRecord.split(" ")[2]
                                : associatedDomain.certificateVerificationDNSRecord
                            : ""}
                    </div>
                </div>
            </div>

            {associatedDomain?.subDomains?.map((subDomain, index) => {
                if (subDomain.dnsRecord) {
                    const parsedData = parseDNSRecord(subDomain.dnsRecord)
                    if (parsedData) {
                        const { data, hostname, type } = parsedData
                        return (
                            <div key={index} className="rounded-md border bg-muted/30 p-4">
                                <h3 className="mb-4 font-semibold text-sm">Subdomain Records</h3>
                                <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                                    <div className="font-medium text-muted-foreground">Hostname</div>
                                    <div className="font-mono">{hostname ?? "@"}</div>
                                    <div className="font-medium text-muted-foreground">Type</div>
                                    <div className="font-mono">{type}</div>
                                    <div className="font-medium text-muted-foreground">Data/URL</div>
                                    <div className="font-mono break-all">{data}</div>
                                    <div className="font-medium text-muted-foreground">Verified</div>
                                    <div>{subDomain.verified ? "✓ Yes" : "✗ No"}</div>
                                </div>
                            </div>
                        )
                    }
                }
            })}

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>DNS Propagation Time</AlertTitle>
                <AlertDescription>DNS changes can take up to 48 hours to propagate globally.</AlertDescription>
            </Alert>
        </div>
    )
}

function NoDomainView() {
    return (
        <CardContent className="py-12">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-12 text-center">
                <div className="mb-4">
                    <Cog className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No domain configured</h3>
                <p className="mb-6 text-muted-foreground">
                    Add a custom domain to make your site more professional and easier to remember.
                </p>
                <AddDomainDialog />
            </div>
        </CardContent>
    )
}

function AddDomainDialog() {
    const [open, setOpen] = React.useState(false)
    const [domain, setDomain] = React.useState("")
    const [isValidDomain, setIsValidDomain] = React.useState(false)

    const add = api.domain.domain.add.useMutation({
        onSuccess: () => {
            setOpen(false)
            window.location.reload()
        },
        onError: (error) => {
            console.error("Error adding domain:", error)
        },
    })

    const validateDomain = (value: string) => {
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
        return domainRegex.test(value)
    }

    const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDomain(value)
        setIsValidDomain(validateDomain(value))
    }

    const handleAddDomain = () => {
        if (isValidDomain) {
            add.mutate({ domain })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Domain</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Custom Domain</DialogTitle>
                    <DialogDescription>Enter your domain name below. Make sure you own this domain.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Input placeholder="example.com" value={domain} onChange={handleDomainChange} />
                        {domain && !isValidDomain && <p className="text-sm text-destructive">Please enter a valid domain</p>}
                    </div>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                            You&apos;ll need to configure DNS settings with your domain provider after adding your domain.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddDomain} disabled={!isValidDomain || add.isLoading}>
                        {add.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Domain
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function DeleteDomainDialog({
    children,
    associatedDomain,
}: {
    children: React.ReactNode
    associatedDomain?: DomainAssociation
}) {
    const [open, setOpen] = React.useState(false)

    const deleteDomain = api.domain.domain.delete.useMutation({
        onSuccess: () => {
            setOpen(false)
            window.location.reload()
        },
        onError: (error) => {
            console.error("Error deleting domain:", error)
        },
    })

    const handleDeleteDomain = () => {
        const dbOnly = associatedDomain ? false : true
        deleteDomain.mutate({ dbOnly })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Custom Domain</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this domain? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            Deleting this domain will immediately remove it from your site. Any traffic to this domain will no longer
                            reach your site.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteDomain} disabled={deleteDomain.isLoading}>
                        {deleteDomain.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Domain
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


type DNSRecord = {
    hostname: string
    type: string
    data: string
}

function parseDNSRecord(dnsRecord: string): DNSRecord | undefined {
    const regex = /^(\S+)?\s*(CNAME|A|TXT|MX|NS|SRV|PTR|AAAA)\s+(\S+)$/
    const match = dnsRecord.match(regex)

    if (!match) return

    let [, hostname, type, data] = match
    if (!hostname) {
        hostname = "@"
        type = "ANAME"
    }

    if (type && data) {
        data = data
        return { hostname, type, data }
    }
}
