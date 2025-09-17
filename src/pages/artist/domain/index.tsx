"use client";

import type { DomainAssociation } from "@aws-sdk/client-amplify";
import {
    AlertCircle,
    Check,
    ChevronDown,
    Cog,
    Loader2,
    Trash2,
} from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import React from "react";
import { getDomainAssociation } from "~/lib/custom-domain";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import { api } from "~/utils/api";
import { Button } from "~/components/shadcn/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import { Input } from "~/components/shadcn/ui/input";
import { Badge } from "~/components/shadcn/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/shadcn/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "~/components/shadcn/ui/alert";
import { cn } from "~/lib/utils";

// server data
export async function getServerSideProps(context: GetServerSidePropsContext) {
    const session = await getServerAuthSession(context);
    const domain = await db.creatorCustomDomain.findFirst({
        where: {
            creatorId: session?.user?.id,
        },
    });

    if (domain) {
        try {
            const res = await getDomainAssociation();
            const associatedDomain = res.domainAssociations?.find(
                (d) => d.domainName == domain.domain,
            );

            return {
                props: {
                    domain,
                    associatedDomain: associatedDomain ?? null,
                },
            };
        } catch (error) {
            console.error("Error fetching domain association:", error);
            return {
                props: {
                    domain,
                    associatedDomain: null,
                },
            };
        }
    }

    return {
        props: {
            domain: null,
            associatedDomain: null,
        },
    };
}

export default function DomainPage({
    domain,
    associatedDomain,
}: {
    domain: {
        domain: string;
    } | null;
    associatedDomain: DomainAssociation | null;
}) {
    const domainStatus = associatedDomain?.domainStatus ?? "PENDING";
    // console.log(domainStatus, "domainStatus", associatedDomain);

    // Determine the step status
    const steps = [
        {
            id: "ssl-creation",
            name: "SSL creation",
            status:
                domainStatus === "REQUESTING_CERTIFICATE" ||
                    domainStatus === "IMPORTING_CUSTOM_CERTIFICATE"
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
                domainStatus === "PENDING_VERIFICATION" ||
                    domainStatus === "AWAITING_APP_CNAME"
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
    ];

    return (
        <div className="container mx-auto max-w-4xl py-8">
            {domain ? (
                <DomainDetails
                    domain={domain}
                    associatedDomain={associatedDomain ?? undefined}
                    steps={steps}
                />
            ) : (
                <NoDomainView />
            )}
        </div>
    );
}

function DomainDetails({
    domain,
    associatedDomain,
    steps,
}: {
    domain: { domain: string };
    associatedDomain?: DomainAssociation;
    steps: { id: string; name: string; status: string }[];
}) {
    const [viewDnsRecordsOpen, setViewDnsRecordsOpen] = React.useState(false);
    const domainStatus = associatedDomain?.domainStatus ?? "PENDING";
    const currentStep = steps.findIndex((step) => step.status === "in-progress");

    return (
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b">
                <div className="flex items-center gap-3">
                    <div>
                        <CardTitle className="text-xl">
                            Custom domain: {domain.domain}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Manage your custom domain settings
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                        {domainStatus}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Actions <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => setViewDnsRecordsOpen(true)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                <Cog className="mr-2 h-4 w-4" />
                                View DNS Records
                            </DropdownMenuItem>
                            <DeleteDomainDialog associatedDomain={associatedDomain}>
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete domain
                                </DropdownMenuItem>
                            </DeleteDomainDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline">
                        <Cog className="mr-2 h-4 w-4" />
                        Domain configuration
                    </Button>
                </div>
            </CardHeader>
            <Dialog open={viewDnsRecordsOpen} onOpenChange={setViewDnsRecordsOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>DNS Configuration</DialogTitle>
                        <DialogDescription>
                            Configure these DNS records with your domain provider
                        </DialogDescription>
                    </DialogHeader>
                    <DomainEntry associatedDomain={associatedDomain} />

                    <DialogFooter>
                        <Button onClick={() => setViewDnsRecordsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CardContent className="p-0">
                <div className="grid min-h-[300px] grid-cols-[250px_1fr]">
                    <div className="border-r bg-muted/30 p-6">
                        <div className="space-y-8">
                            {steps.map((step, index) => (
                                <div key={step.id} className="relative flex items-center gap-4">
                                    {index > 0 && (
                                        <div
                                            className={cn(
                                                "absolute left-[15px] top-[-32px] h-[32px] w-[2px]",
                                                step.status === "pending"
                                                    ? "bg-muted-foreground/20"
                                                    : "bg-primary",
                                            )}
                                        />
                                    )}
                                    <div
                                        className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm",
                                            step.status === "complete"
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : step.status === "in-progress"
                                                    ? "animate-pulse border-primary text-primary"
                                                    : "border-muted-foreground/20 text-muted-foreground/20",
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
                                                "font-medium",
                                                step.status === "pending"
                                                    ? "text-muted-foreground/50"
                                                    : "",
                                            )}
                                        >
                                            {step.name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center p-8">
                        {currentStep === 2 ? (
                            <div className="max-w-xl space-y-4">
                                <h3 className="text-xl font-semibold">Activating domain...</h3>
                                <p className="text-muted-foreground">
                                    We are propagating your custom domain to our global content
                                    delivery network which could take up to 30 minutes.
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                        This process is automatic and no further action is required
                                    </span>
                                </div>
                            </div>
                        ) : currentStep === 1 ? (
                            <div className="max-w-xl space-y-4">
                                <h3 className="text-xl font-semibold">
                                    Configure DNS settings
                                </h3>
                                <p className="text-muted-foreground">
                                    To verify your domain, add the following DNS records to your
                                    domain provider:
                                </p>

                                <DomainEntry associatedDomain={associatedDomain} />
                            </div>
                        ) : (
                            <>
                                {associatedDomain ? (
                                    <>
                                        <div className="max-w-xl space-y-4">
                                            <h3 className="text-xl font-semibold">
                                                SSL Certificate Created
                                            </h3>
                                            <p className="text-muted-foreground">
                                                We&apos;ve successfully created an SSL certificate for
                                                your domain. The next step is to configure your DNS
                                                settings.
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-green-600">
                                                <Check className="h-4 w-4" />
                                                <span>SSL certificate created successfully</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">
                                        Domain association {domain.domain} not found. There are some
                                        misconfiguration in domain setup. try deleting and resetting
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DomainEntry({
    associatedDomain,
}: {
    associatedDomain?: DomainAssociation;
}) {
    return (
        <div className="space-y-4 w-full">
            <div className="rounded-md border bg-muted/30 p-4">
                <h3 className="mb-2 font-medium">Verification Record</h3>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="font-medium">Hostname</div>
                    <div>
                        {associatedDomain?.certificateVerificationDNSRecord
                            ? associatedDomain.certificateVerificationDNSRecord.split(" ")[0]
                            : ""}
                    </div>
                    <div className="font-medium">Type</div>
                    <div>
                        {associatedDomain?.certificateVerificationDNSRecord
                            ? associatedDomain.certificateVerificationDNSRecord.includes(
                                "CNAME",
                            )
                                ? "CNAME"
                                : ""
                            : "CNAME"}
                    </div>
                    <div className="font-medium">Data/URL</div>
                    <div className="break-all">
                        {associatedDomain?.certificateVerificationDNSRecord
                            ? associatedDomain.certificateVerificationDNSRecord.split(" ")
                                .length > 2
                                ? associatedDomain.certificateVerificationDNSRecord.split(
                                    " ",
                                )[2]
                                : associatedDomain.certificateVerificationDNSRecord
                            : ""}
                    </div>
                </div>
            </div>

            {associatedDomain?.subDomains?.map((subDomain, index) => {
                if (subDomain.dnsRecord) {
                    const parsedData = parseDNSRecord(subDomain.dnsRecord);
                    if (parsedData) {
                        const { data, hostname, type } = parsedData;
                        return (
                            <div key={index} className="rounded-md border bg-muted/30 p-4">
                                <h3 className="mb-2 font-medium">Subdomain Records</h3>
                                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                    <div className="font-medium">Hostname</div>
                                    <div>{hostname ?? "@"}</div>
                                    <div className="font-medium">Type</div>
                                    <div>{type}</div>
                                    <div className="font-medium">Data/URL</div>
                                    <div className="break-all">{data}</div>
                                    <div className="font-medium">Verified</div>
                                    <div>{subDomain.verified ? "Yes" : "No"}</div>
                                </div>
                            </div>
                        );
                    }
                }
            })}

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                    DNS changes can take up to 48 hours to propagate globally.
                </AlertDescription>
            </Alert>
        </div>
    );
}

function NoDomainView() {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Custom Domain</CardTitle>
                <CardDescription>
                    Add a custom domain to personalize your site
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-lg border border-dashed p-10 text-center">
                    <h3 className="mb-2 text-lg font-medium">No domain configured</h3>
                    <p className="mb-6 text-muted-foreground">
                        Add a custom domain to make your site more professional and easier
                        to remember.
                    </p>
                    <AddDomainDialog />
                </div>
            </CardContent>
        </Card>
    );
}

function AddDomainDialog() {
    const [open, setOpen] = React.useState(false);
    const [domain, setDomain] = React.useState("");
    const [isValidDomain, setIsValidDomain] = React.useState(false);

    const add = api.domain.domain.add.useMutation({
        onSuccess: () => {
            setOpen(false);
            window.location.reload();
        },
        onError: (error) => {
            console.error("Error adding domain:", error);
        },
    });

    const validateDomain = (value: string) => {
        // Simple domain validation regex
        const domainRegex =
            /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return domainRegex.test(value);
    };

    const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDomain(value);
        setIsValidDomain(validateDomain(value));
    };

    const handleAddDomain = () => {
        if (isValidDomain) {
            add.mutate({ domain });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Domain</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Custom Domain</DialogTitle>
                    <DialogDescription>
                        Enter your domain name below. Make sure you own this domain.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="example.com"
                            value={domain}
                            onChange={handleDomainChange}
                        />
                        {domain && !isValidDomain && (
                            <p className="text-sm text-destructive">
                                Please enter a valid domain
                            </p>
                        )}
                    </div>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                            You&apos;ll need to configure DNS settings with your domain
                            provider after adding your domain.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddDomain}
                        disabled={!isValidDomain || add.isLoading}
                    >
                        {add.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Domain
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDomainDialog({
    children,
    associatedDomain,
}: {
    children: React.ReactNode;
    associatedDomain?: DomainAssociation;
}) {
    const [open, setOpen] = React.useState(false);

    const deleteDomain = api.domain.domain.delete.useMutation({
        onSuccess: () => {
            setOpen(false);
            window.location.reload();
        },
        onError: (error) => {
            console.error("Error deleting domain:", error);
        },
    });

    const handleDeleteDomain = () => {
        const dbOnly = associatedDomain ? false : true;
        // console.log(associatedDomain, "associatedDomain", dbOnly);
        deleteDomain.mutate({ dbOnly });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Custom Domain</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this domain? This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            Deleting this domain will immediately remove it from your site.
                            Any traffic to this domain will no longer reach your site.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteDomain}
                        disabled={deleteDomain.isLoading}
                    >
                        {deleteDomain.isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Delete Domain
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type DNSRecord = {
    hostname: string;
    type: string;
    data: string;
};

function parseDNSRecord(dnsRecord: string): DNSRecord | undefined {
    const regex = /^(\S+)?\s*(CNAME|A|TXT|MX|NS|SRV|PTR|AAAA)\s+(\S+)$/;
    const match = dnsRecord.match(regex);

    if (!match) return;

    let [, hostname, type, data] = match;
    if (!hostname) {
        hostname = "@"; // Default to @ if hostname is missing
        type = "ANAME";
    }

    if (type && data) {
        data = data;
        return { hostname, type, data };
    }
}