"use client"

import React, { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Button } from "~/components/shadcn/ui/button"
import { api } from "~/utils/api"

import { addrShort } from "~/utils/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog"
import { clientsign, WalletType } from "package/connect_wallet"

import { Card, CardHeader, CardTitle, CardDescription } from "~/components/shadcn/ui/card"
import {
    AlertCircle,
    Ban,
    Check,
    Clock,
    Eye,
    Globe,
    Instagram,
    Loader2,
    Pin,
    RefreshCw,
    Search,
    Sparkles,
    Trash,
    Twitter,
    UserCheck,
    UserX,
} from "lucide-react"
import { Input } from "~/components/shadcn/ui/input"
import { Badge } from "~/components/shadcn/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/shadcn/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import AdminLayout from "~/components/layout/root/AdminLayout"

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            when: "beforeChildren",
            staggerChildren: 0.1,
            duration: 0.3,
        },
    },
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 24 },
    },
}

const tableRowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1],
        },
    }),
    exit: { opacity: 0, x: -10, transition: { duration: 0.2 } },
}

const pulseAnimation = {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Number.POSITIVE_INFINITY },
}

export default function CreatorPage() {
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Simulate loading for animation purposes
        const timer = setTimeout(() => setIsLoaded(true), 300)
        return () => clearTimeout(timer)
    }, [])

    return (
        <AdminLayout>
            <motion.div
                initial="hidden"
                animate={isLoaded ? "visible" : "hidden"}
                variants={containerVariants}
                className=""
            >


                <motion.div variants={itemVariants}>
                    <CreatorDashboard />
                </motion.div>


            </motion.div>
        </AdminLayout>
    )
}

function CreatorDashboard() {
    const [activeTab, setActiveTab] = useState("all")

    return (
        <Card className="overflow-hidden border shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Creator Management
                </CardTitle>
                <CardDescription>View, approve, and manage creators on your platform</CardDescription>
            </CardHeader>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 pt-4">
                    <TabsList className="grid grid-cols-4 w-full max-w-md">
                        <TabsTrigger value="all" className="data-[state=active]:bg-primary/10">
                            All
                        </TabsTrigger>
                        <TabsTrigger
                            value="pending"
                            className="data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-700"
                        >
                            Pending
                        </TabsTrigger>
                        <TabsTrigger
                            value="approved"
                            className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-700"
                        >
                            Approved
                        </TabsTrigger>
                        <TabsTrigger value="banned" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-700">
                            Banned
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="all">
                    <Creators filterStatus={null} />
                </TabsContent>
                <TabsContent value="pending">
                    <Creators filterStatus="pending" />
                </TabsContent>
                <TabsContent value="approved">
                    <Creators filterStatus="approved" />
                </TabsContent>
                <TabsContent value="banned">
                    <Creators filterStatus="banned" />
                </TabsContent>
            </Tabs>
        </Card>
    )
}

function Creators({ filterStatus }: { filterStatus: "pending" | "approved" | "banned" | null }) {
    const [searchTerm, setSearchTerm] = useState("")
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name">("newest")

    const creators = api.admin.creator.getCreators.useQuery(undefined, {
        refetchOnWindowFocus: false,
    })

    const utils = api.useUtils()

    const handleRefresh = () => {
        void utils.admin.creator.getCreators.invalidate()
    }

    // Filter creators based on search term and status
    const filteredCreators = React.useMemo(() => {
        if (!creators.data) return []

        return creators.data
            .filter((creator) => {
                // Search filter
                const matchesSearch =
                    creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    creator.id.toLowerCase().includes(searchTerm.toLowerCase())

                // Status filter
                let statusMatch = true
                if (filterStatus === "pending") statusMatch = creator.approved === null
                if (filterStatus === "approved") statusMatch = creator.approved === true
                if (filterStatus === "banned") statusMatch = creator.approved === false

                return matchesSearch && statusMatch
            })
            .sort((a, b) => {
                // Sort order
                if (sortOrder === "newest") return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
                if (sortOrder === "oldest") return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
                if (sortOrder === "name") return a.name.localeCompare(b.name)
                return 0
            })
    }, [creators.data, searchTerm, filterStatus, sortOrder])

    return (
        <div className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or pubkey..."
                        className="pl-9  bg-background/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest" | "name")}>
                        <SelectTrigger className="w-full md:w-[180px]  bg-background/50">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={creators.isLoading}
                        className=" bg-background/50"
                    >
                        <motion.div
                            animate={creators.isLoading ? { rotate: 360 } : {}}
                            transition={{ duration: 1, repeat: creators.isLoading ? Number.POSITIVE_INFINITY : 0, ease: "linear" }}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </motion.div>
                        <span className="sr-only">Refresh</span>
                    </Button>
                </div>
            </div>

            {creators.isLoading ? (
                <LoadingState />
            ) : creators.error ? (
                <ErrorState onRetry={handleRefresh} />
            ) : filteredCreators.length === 0 ? (
                <EmptyState searchTerm={searchTerm} filterStatus={filterStatus} />
            ) : (
                <div className="rounded-md border  bg-background/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Pubkey</TableHead>
                                    <TableHead>Joined At</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence initial={false}>
                                    {filteredCreators.map((creator, i) => (
                                        <motion.tr
                                            key={creator.id}
                                            custom={i}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            variants={tableRowVariants}
                                            className="border-b hover:bg-muted/30 transition-colors"
                                            layoutId={creator.id}
                                        >
                                            <TableCell className="font-medium">{i + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold">{creator.name}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                <div className="flex items-center gap-1">
                                                    <span>{addrShort(creator.id, 10)}</span>
                                                    <motion.button
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            void navigator.clipboard.writeText(creator.id)
                                                            toast.success("Pubkey copied to clipboard")
                                                        }}
                                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </motion.button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-2 w-2 rounded-full bg-primary/70" />
                                                    {formatDate(creator.joinedAt)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={creator.approved} />
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <ActionButton creatorId={creator.id} status={creator.approved} />
                                                    <DeleteCreatorButton creatorId={creator.id} />
                                                    <ViewCreatorButton creator={creator} />
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    )
}

function formatDate(date: Date) {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const day = 24 * 60 * 60 * 1000

    if (diff < day) {
        return "Today"
    } else if (diff < 2 * day) {
        return "Yesterday"
    } else {
        return new Date(date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }
}

function Copy({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
    )
}

function StatusBadge({ status }: { status: boolean | null }) {
    let badgeContent

    if (status === true) {
        badgeContent = (
            <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1.5 px-2.5 py-1"
            >
                <UserCheck className="h-3 w-3" />
                <span>Approved</span>
            </Badge>
        )
    } else if (status === false) {
        badgeContent = (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1.5 px-2.5 py-1">
                <Ban className="h-3 w-3" />
                <span>Banned</span>
            </Badge>
        )
    } else {
        badgeContent = (
            <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1.5 px-2.5 py-1"
            >
                <Clock className="h-3 w-3" />
                <span>Pending</span>
            </Badge>
        )
    }

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
            {badgeContent}
        </motion.div>
    )
}

function ActionButton({
    status,
    creatorId,
}: {
    status: boolean | null
    creatorId: string
}) {
    const [submitLoading, setSubmitLoading] = useState(false)
    const utils = api.useUtils()

    const actionM = api.admin.creator.creatorAction.useMutation({
        onSuccess: () => {
            toast.success(
                status === null
                    ? "Creator approved successfully"
                    : status === true
                        ? "Creator banned successfully"
                        : "Creator unbanned successfully",
            )
            void utils.admin.creator.getCreators.invalidate()
        },
        onError: () => {
            toast.error("Action failed. Please try again.")
        },
    })

    const xdr = api.admin.creator.creatorRequestXdr.useMutation({
        onSuccess: (data) => {
            if (data) {
                setSubmitLoading(true)
                const toastId = toast.loading(
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing transaction...</span>
                    </div>,
                )

                clientsign({
                    presignedxdr: data.xdr,
                    pubkey: "admin",
                    walletType: WalletType.isAdmin,
                })
                    .then((res) => {
                        if (res) {
                            actionM.mutate({
                                creatorId: creatorId,
                                action: "approve",
                                escrow: data.escrow,
                                storage: data.storage,
                            })
                        }

                        else {
                            toast.error("Transaction failed in Stellar Network. Please try again.")
                        }
                    })
                    .catch((e) => {
                        console.log(e)
                        toast.error("Error in signing transaction. Please try again.")
                    })
                    .finally(() => {
                        toast.dismiss(toastId)
                        setSubmitLoading(false)
                    })
            }
        },
    })

    function handleClick(action: "approve" | "ban" | "unban") {
        if (action === "approve") {
            xdr.mutate({
                creatorId: creatorId,
            })
        } else if (action == "ban") {
            actionM.mutate({
                creatorId: creatorId,
                action: "ban",
            })
        } else if (action == "unban") {
            actionM.mutate({
                creatorId: creatorId,
                action: "unban",
            })
        }
    }

    const loading = xdr.isLoading || actionM.isLoading || submitLoading

    if (status === null) {
        return (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                    size="sm"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    onClick={() => handleClick("approve")}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Check className="mr-1 h-4 w-4" />
                            Approve
                        </>
                    )}
                </Button>
            </motion.div>
        )
    }

    if (status === false) {
        return (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    className="border-green-600 text-green-600 hover:bg-green-50 shadow-sm"
                    onClick={() => handleClick("unban")}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <UserCheck className="mr-1 h-4 w-4" />
                            Unban
                        </>
                    )}
                </Button>
            </motion.div>
        )
    }

    return (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
                size="sm"
                variant="outline"
                disabled={loading}
                className="border-red-600 text-red-600 hover:bg-red-50 shadow-sm"
                onClick={() => handleClick("ban")}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <UserX className="mr-1 h-4 w-4" />
                        Ban
                    </>
                )}
            </Button>
        </motion.div>
    )
}

function ViewCreatorButton({ creator }: { creator: { id: string; name: string; approved: boolean | null; joinedAt: Date; profileUrl: string | null; coverUrl: string | null; bio?: string | null; website?: string | null; twitter?: string | null; instagram?: string | null; pageAsset?: { code: string; thumbnail: string | null; priceUSD?: number } | null } }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState("overview")

    const creatorDetails = api.fan.creator.getCreator.useQuery(
        { id: creator.id },
        {
            enabled: isOpen,
            refetchOnWindowFocus: false,
        }
    )

    const creatorNFT = api.marketplace.market.getCreatorNftsByCreatorID.useInfiniteQuery(
        { limit: 10, creatorId: creator.id ?? "" },
        {
            enabled: isOpen && activeTab === "assets",
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
    )

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                    </Button>
                </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto p-0 bg-white">
                {creatorDetails.isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center h-80"
                    >
                        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                    </motion.div>
                ) : creatorDetails.error ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-80"
                    >
                        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                        <p className="text-neutral-600 text-center font-medium">Unable to load creator profile</p>
                    </motion.div>
                ) : creatorDetails.data ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col overflow-hidden">
                        {/* Header Section */}
                        <div className="border-b border-neutral-200">

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="w-full h-40 bg-neutral-100 overflow-hidden"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={creatorDetails.data.coverUrl ?? "/images/logo.png"}
                                    alt="Cover"
                                    onError={(e) => {
                                        e.currentTarget.src = "/images/logo.png"
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            </motion.div>


                            {/* Profile Section */}
                            <div className="px-8 py-8">
                                <div className="flex items-end gap-6 mb-8">
                                    {/* Profile Image */}
                                    {creatorDetails.data.profileUrl ? (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={creatorDetails.data.profileUrl}
                                                alt={creatorDetails.data.name}
                                                className="w-24 h-24 rounded-lg object-cover border border-neutral-300"
                                            />
                                        </motion.div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-lg bg-neutral-200 border border-neutral-300" />
                                    )}

                                    {/* Name & Handle */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="flex-1 pb-2"
                                    >
                                        <h1 className="text-2xl font-semibold text-neutral-900 mb-1">{creatorDetails.data.name}</h1>
                                        <p className="text-sm text-neutral-500">@{addrShort(creatorDetails.data.id, 10)}</p>
                                    </motion.div>
                                </div>

                                {/* Stats */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                    className="flex gap-12 mb-8"
                                >
                                    <div>
                                        <div className="text-xl font-semibold text-neutral-900">{creatorDetails.data._count?.postGroups || 0}</div>
                                        <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide mt-1">Posts</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-semibold text-neutral-900">{creatorDetails.data._count?.followers || 0}</div>
                                        <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide mt-1">Followers</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-semibold text-neutral-900">{creatorDetails.data._count?.assets || 0}</div>
                                        <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide mt-1">Assets</div>
                                    </div>
                                </motion.div>

                                {/* Tab Navigation */}
                                <TabsList className="w-full bg-transparent border-t border-neutral-200 rounded-none p-0 h-auto -mx-8 px-8">
                                    <TabsTrigger
                                        value="overview"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent px-0 py-3 mr-8 text-sm font-medium text-neutral-500 data-[state=active]:text-neutral-900"
                                    >
                                        About
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="assets"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent px-0 py-3 text-sm font-medium text-neutral-500 data-[state=active]:text-neutral-900"
                                    >
                                        Gallery
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto bg-neutral-50">
                            <TabsContent value="overview" className="m-0 border-0 p-8">

                                {/* Bio */}
                                {creatorDetails.data.bio && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="space-y-3"
                                    >
                                        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">About</h3>
                                        <p className="text-base leading-relaxed text-neutral-700">{creatorDetails.data.bio}</p>
                                    </motion.div>
                                )}

                                {/* Social Links */}
                                {(creatorDetails.data.website ?? creatorDetails.data.twitter ?? creatorDetails.data.instagram) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                        className="space-y-4 pt-6 border-t border-neutral-200"
                                    >
                                        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Connect</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {creatorDetails.data.website && (
                                                <motion.a
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    href={creatorDetails.data.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors border border-neutral-200"
                                                >
                                                    <Globe className="h-4 w-4" />
                                                    Website
                                                </motion.a>
                                            )}
                                            {creatorDetails.data.twitter && (
                                                <motion.a
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    href={`https://twitter.com/${creatorDetails.data.twitter}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors border border-neutral-200"
                                                >
                                                    <Twitter className="h-4 w-4" />
                                                    {creatorDetails.data.twitter}
                                                </motion.a>
                                            )}
                                            {creatorDetails.data.instagram && (
                                                <motion.a
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    href={`https://instagram.com/${creatorDetails.data.instagram}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors border border-neutral-200"
                                                >
                                                    <Instagram className="h-4 w-4" />
                                                    {creatorDetails.data.instagram}
                                                </motion.a>
                                            )}
                                        </div>
                                    </motion.div>
                                )}



                                {/* Account Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="space-y-3 pt-6 border-t border-neutral-200"
                                >
                                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Member Since</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-700">
                                            {new Date(creatorDetails.data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                        <StatusBadge status={creatorDetails.data.approved} />
                                    </div>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="assets" className="m-0 border-0 p-8">
                                {creatorNFT.isLoading ? (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                        {Array.from({ length: 15 }).map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="aspect-square rounded-lg bg-neutral-200 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : creatorNFT.data?.pages[0]?.nfts.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-24"
                                    >
                                        <Sparkles className="h-14 w-14 text-neutral-300 mb-4" />
                                        <p className="text-neutral-700 font-medium mb-1">No assets published yet</p>
                                        <p className="text-sm text-neutral-500">Check back soon for new works</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.4 }}
                                            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                                        >
                                            {creatorNFT.data?.pages.map((pageData, pageIdx) =>
                                                pageData?.nfts?.map((nft, nftIdx) => (
                                                    <motion.div
                                                        key={`${pageIdx}-${nftIdx}`}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: nftIdx * 0.02 }}
                                                        className="group relative rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                                    >
                                                        {nft.asset.thumbnail ? (
                                                            <img
                                                                src={nft.asset.thumbnail}
                                                                alt={nft.asset.name || "Asset"}
                                                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                        ) : (
                                                            <div className="w-full aspect-square bg-neutral-200 flex items-center justify-center">
                                                                <Sparkles className="h-6 w-6 text-neutral-400" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
                                                        {nft.asset.name && (
                                                            <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                <p className="text-white text-xs font-semibold truncate">
                                                                    {nft.asset.name}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )),
                                            )}
                                        </motion.div>

                                        {creatorNFT.hasNextPage && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex justify-center pt-10"
                                            >
                                                <Button
                                                    onClick={() => creatorNFT.fetchNextPage()}
                                                    disabled={creatorNFT.isFetchingNextPage}
                                                    variant="outline"
                                                    className="rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                                                >
                                                    {creatorNFT.isFetchingNextPage ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        "Load More"
                                                    )}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}



function DeleteCreatorButton({ creatorId }: { creatorId: string }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const utils = api.useUtils()

    const deleteCreator = api.admin.creator.deleteCreator.useMutation({
        onSuccess: () => {
            toast.success("Creator deleted successfully")
            setIsOpen(false)
            void utils.admin.creator.getCreators.invalidate()
        },
        onError: () => {
            toast.error("Failed to delete creator")
        },
    })

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0">
                        <Trash className="h-4 w-4" />
                    </Button>
                </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Delete Creator
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6">
                        <motion.div animate={pulseAnimation} className="p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
                            <p className="text-red-800">
                                Are you sure you want to delete this creator? This action is irreversible and will remove all associated
                                data.
                            </p>
                        </motion.div>
                    </div>
                    <DialogFooter className="w-full">
                        <div className="flex w-full gap-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="w-full">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() => deleteCreator.mutate(creatorId)}
                                disabled={deleteCreator.isLoading}
                                className="w-full"
                            >
                                {deleteCreator.isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash className="h-4 w-4 mr-2" />
                                )}
                                Delete Creator
                            </Button>
                        </div>
                    </DialogFooter>
                </motion.div>
            </DialogContent>
        </Dialog>
    )
}

function LoadingState() {
    return (
        <div className="rounded-md border  bg-background/50 p-8">
            <div className="flex flex-col items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center gap-4"
                >
                    <motion.div
                        animate={{
                            rotate: 360,
                            transition: { duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                        }}
                    >
                        <Loader2 className="h-10 w-10 text-primary" />
                    </motion.div>
                    <p className="text-muted-foreground">Loading creators...</p>

                    <div className="w-full max-w-md space-y-3 mt-4">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4"
                            >
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-md border bg-red-50 border-red-200 p-8 flex flex-col items-center justify-center"
        >
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="bg-red-100 p-3 rounded-full"
                >
                    <AlertCircle className="h-8 w-8 text-red-600" />
                </motion.div>
                <h3 className="text-lg font-semibold text-red-800">Failed to load creators</h3>
                <p className="text-red-700">
                    There was an error loading the creator data. Please try again or contact support if the problem persists.
                </p>
                <Button variant="outline" onClick={onRetry} className="mt-2 border-red-300 text-red-700 hover:bg-red-100">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                </Button>
            </div>
        </motion.div>
    )
}

function EmptyState({
    searchTerm,
    filterStatus,
}: { searchTerm: string; filterStatus: "pending" | "approved" | "banned" | null }) {
    let message = "No creators found"
    let description = "There are no creators in the system yet."

    if (searchTerm) {
        message = "No matching creators"
        description = `No creators found matching "${searchTerm}".`
    } else if (filterStatus) {
        message = `No ${filterStatus} creators`
        description = `There are no creators with ${filterStatus} status.`
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-md border  bg-background/50 p-12 flex flex-col items-center justify-center text-center"
        >
            <div className="flex flex-col items-center gap-4 max-w-md">
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="bg-muted/50 p-4 rounded-full"
                >
                    <UserX className="h-8 w-8 text-muted-foreground" />
                </motion.div>
                <h3 className="text-lg font-semibold">{message}</h3>
                <p className="text-muted-foreground">{description}</p>
                {searchTerm && (
                    <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Filters
                    </Button>
                )}
            </div>
        </motion.div>
    )
}

