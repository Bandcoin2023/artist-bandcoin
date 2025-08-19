"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"
import {
    Calendar,
    Upload,
    FileText,
    Percent,
    Coins,
    FileMusic,
    Info,
    Users,
    DollarSign,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Share2,
    Download,
    Music,
    Video,
    ImageIcon,
    ArrowLeft,
    BarChart3,
    HelpCircle,
    Play,
    Sparkles,
} from "lucide-react"
import { api } from "~/utils/api"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "~/components/shadcn/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Badge } from "~/components/shadcn/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "~/components/shadcn/ui/alert"
import { Input } from "~/components/shadcn/ui/input"
import { Label } from "~/components/shadcn/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/shadcn/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/shadcn/ui/accordion"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/shadcn/ui/tooltip"
import { Separator } from "~/components/shadcn/ui/separator"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { clientsign, WalletType } from "package/connect_wallet"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { ItemPrivacy, MarketType } from "@prisma/client"
import { CreditCard, PaymentForm } from "react-square-web-payments-sdk"
import { env } from "~/env"
import { submitSignedXDRToServer4User } from "package/connect_wallet/src/lib/stellar/trx/payment_fb_g"
import { UploadS3Button } from "~/components/common/upload-button"
import useNeedSign from "~/lib/hook"

// Type definitions based on the database schema
enum MediaType {
    MUSIC = "MUSIC",
    VIDEO = "VIDEO",
    IMAGE = "IMAGE",
    DOCUMENT = "DOCUMENT",
}




interface MarketAsset {
    id: number
    price: number
    priceUSD: number
    type: MarketType
    privacy: ItemPrivacy
}

interface User_Asset {
    userId: string
    assetId: number
    amount?: number
    buyAt?: Date
    parcentage?: number
}

interface Asset {
    id: number
    name: string
    description: string | null
    limit: number | null
    code: string
    issuer: string
    issuerPrivate?: string
    demoMediaUrl: string | null
    fundEndDate: Date | null
    releaseDate: Date | null
    mediaType: MediaType
    mediaUrl: string
    thumbnail: string
    percentage: number | null
    privacy: ItemPrivacy
    creatorId: string | null
    createdAt: Date
    marketItems: MarketAsset[]
    buyers: User_Asset[]
}

interface FunderData {
    publicKey: string
    amount: number
    percentage: number
    email?: string
    name?: string
}

enum PaymentMethod {
    xlm = "xlm",
    asset = "asset",
    usd = "usd",
}


const RoyalityPage = () => {
    const { id } = useParams()
    const router = useRouter()
    const session = useSession()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [xdr, setXdr] = useState<string | null>(null)
    // State management
    const [mediaUrl, setMediaUrl] = useState<string>("")
    const [uploading, setUploading] = useState(false)
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)
    const [showAllFunders, setShowAllFunders] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")
    const [tokenAmount, setTokenAmount] = useState(1)
    const [showTooltips, setShowTooltips] = useState(true)
    const [paymentCurrency, setPaymentCurrency] = useState(PaymentMethod.asset) // Default to bandcoin
    const [isLoadingPayment, setIsLoadingPayment] = useState(false)
    // Add state for profit documents and payment modal
    // const [profitDocuments, setProfitDocuments] = useState<{ url: string; name: string; uploadDate: Date }[]>([])
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState("")
    const { needSign } = useNeedSign()
    // Add state for payment confirmation
    const [confirmingPayment, setConfirmingPayment] = useState(false)
    // Add state for document preview
    const [previewDocument, setPreviewDocument] = useState<{ mediaUrl: string; mediaName: string; updatedAt: Date } | null>(null)

    // Fetch royalty item data
    const {
        data: royaltyItem,
        isLoading,
        refetch,
    } = api.marketplace.market.getARoyalityItem.useQuery({ id: id as string }, { enabled: !!id })

    const updateReportHistory = api.marketplace.market.updateReportHistory.useMutation({
        onSuccess: () => {
            toast.success("Report history updated successfully")
            refetch()
        },
        onError: (error) => {
            toast.error(`Failed to update report history: ${error.message}`)
        },
    })
    const { data: prize } = api.bounty.Bounty.getCurrentUSDFromAsset.useQuery();

    // Mutation for updating media URL
    const updateMediaUrl = api.fan.asset.updateMusicURL.useMutation({
        onSuccess: () => {
            toast.success("Media uploaded successfully")
            refetch()
        },
        onError: (error) => {
            toast.error(`Failed to update media: ${error.message}`)
        },
    })
    const paymentInUSD = api.marketplace.steller.paymentInUSD.useMutation({
        onSuccess: async (data) => {
            setIsPaymentProcessing(true)
            toast.success(`${data}`);
            if (data && xdr) {
                toast.success("xdr get");
                if (data) {
                    const id = data;
                    const tostId = toast.loading("Submitting transaction");
                    submitSignedXDRToServer4User(xdr)
                        .then((data) => {
                            if (data) {
                                toast.success("Payment Successful");
                            }
                        })
                        .catch((e) => {

                            toast.error("Payment failed");
                        })
                        .finally(() => {
                            toast.dismiss(tostId);
                        });
                }
            } else {
                toast.error("Payment failed. Please try again.");
            }
            setIsPaymentProcessing(false)
        },
        onError: (e) => {
            toast.error("Something went wrong. Please try again.");
            setIsPaymentProcessing(false)
        },


    })
    // Mutation for processing payments
    const processPayments = api.marketplace.steller.sendProfitToInvestor.useMutation({
        onSuccess: async (data) => {

            console.log("Payment successful:", data);
            if (data && paymentCurrency !== PaymentMethod.usd) {
                try {

                    // Sign the transaction
                    const result = await clientsign({
                        presignedxdr: data,
                        pubkey: session.data?.user.id,
                        walletType: session.data?.user.walletType,
                        test: clientSelect(),
                    })

                    if (result) {
                        toast.success("Payments processed successfully")
                        setIsPaymentModalOpen(false)
                        setPaymentAmount("")
                    } else {
                        toast.error("Transaction signing failed")
                    }
                } catch (error) {
                    console.error(error)
                    toast.error("Payment processing failed")
                } finally {
                    setConfirmingPayment(false)
                }
            }
            else if (data && paymentCurrency === PaymentMethod.usd) {
                setXdr(data)
            }

        },
        onError: (error) => {
            toast.error(`Payment processing failed: ${error.message}`)
            setIsPaymentProcessing(false)
        },
    })

    // Hide tooltips after first view
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTooltips(false)
        }, 10000)
        return () => clearTimeout(timer)
    }, [])

    // Get the market item for this royalty asset
    const getMarketItem = () => {
        if (!royaltyItem?.marketItems || royaltyItem.marketItems.length === 0) return null
        // Find the ROYALTY type market item, or return the first one
        return royaltyItem.marketItems.find((item) => item.type === MarketType.ROYALTY) ?? royaltyItem.marketItems[0]
    }

    // Get funders from buyers relation
    const getFunders = () => {
        if (!royaltyItem?.buyers) return []
        return royaltyItem.buyers
    }

    // Check if current user is the creator
    const isCreator = session.data?.user.id === royaltyItem?.creatorId

    // Calculate funding progress
    const calculateProgress = () => {
        if (!royaltyItem) return 0
        const totalFunded = getFunders().length
        const limit = royaltyItem.limit ?? 1000 // Default to 1000 if limit is null
        return Math.min((totalFunded / limit) * 100, 100)
    }

    // Determine current status based on dates
    const getCurrentStatus = () => {
        if (!royaltyItem) return "loading"
        if (!royaltyItem.fundEndDate || !royaltyItem.releaseDate) return "released" // If dates are not set, consider it released

        const now = new Date()
        const fundEndDate = new Date(royaltyItem.fundEndDate)
        const releaseDate = new Date(royaltyItem.releaseDate)

        if (now < fundEndDate) {
            return "funding"
        } else if (now >= fundEndDate && now < releaseDate) {
            return "waiting"
        } else {
            return "released"
        }
    }

    // Format date for display
    const formatDate = (date: Date | null) => {
        if (!date) return "Not set"
        return format(new Date(date), "MMMM d, yyyy")
    }

    // Format relative time
    const formatRelativeTime = (date: Date | null) => {
        if (!date) return "Not set"
        return formatDistanceToNow(new Date(date), { addSuffix: true })
    }

    // Handle media upload
    const handleMediaUpload = (url: string) => {
        setMediaUrl(url)
        updateMediaUrl.mutate({
            assetId: Number(id),
            musicUrl: url,
        })
    }


    // Replace handleProcessPayments function with:
    const handleProcessPayments = async () => {
        setIsPaymentModalOpen(true)
    }

    // Add function to process payment with total amount
    const processPaymentWithAmount = async () => {
        if (!paymentAmount || Number.parseFloat(paymentAmount) <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setConfirmingPayment(true)

        const publicKeys = funders.map((item) => item.userId)
        const amount = Number.parseFloat(paymentAmount)


        // Get XDR for the transaction
        await processPayments.mutateAsync({
            payWith: paymentCurrency,
            amount: paymentCurrency === PaymentMethod.usd ? amount / (prize ?? 0) : amount,
            holders: publicKeys,
            signWith: needSign(),
        })

    }

    // Get media type icon
    const getMediaTypeIcon = (type: MediaType) => {
        switch (type) {
            case MediaType.MUSIC:
                return <Music className="h-4 w-4" />
            case MediaType.VIDEO:
                return <Video className="h-4 w-4" />
            case MediaType.IMAGE:
                return <ImageIcon className="h-4 w-4" />
            case MediaType.DOCUMENT:
                return <FileText className="h-4 w-4" />
            default:
                return <FileText className="h-4 w-4" />
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto py-8 max-w-5xl">
                <div className="space-y-6">
                    <div className="h-8 w-1/3 bg-slate-200 rounded animate-pulse"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <div className="h-64 bg-slate-200 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div className="h-8 w-2/3 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse"></div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="h-20 bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-20 bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-20 bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-20 bg-slate-200 rounded animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (!royaltyItem) {
        return (
            <div className="container mx-auto py-8 max-w-5xl">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Could not load royalty item. Please try again or contact support.</AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        )
    }

    const status = getCurrentStatus()
    const marketItem = getMarketItem()
    const funders = getFunders()

    return (
        <TooltipProvider>
            <div className="container mx-auto py-8 max-w-5xl">
                {/* Back button */}
                <Button size="sm" onClick={() => router.back()} className="mb-6 hover:bg-background/80 group">
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Royalties
                </Button>

                {/* Status Banner */}
                <div className="mb-6">
                    {status === "funding" && (
                        <Alert className="bg-blue-50 border-blue-200 shadow-sm">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <AlertTitle className="text-blue-800 text-lg">Funding Period Active</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <span>
                                        This royalty item is currently in the funding period. Funding ends{" "}
                                        {formatRelativeTime(royaltyItem.fundEndDate)}.
                                    </span>
                                    {/* {!isCreator && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-2 sm:mt-0">
                                            <Coins className="mr-2 h-4 w-4" />
                                            Fund Now
                                        </Button>
                                    )} */}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === "waiting" && (
                        <Alert className="bg-amber-50 border-amber-200 shadow-sm">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <AlertTitle className="text-amber-800 text-lg">Waiting for Release</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <span>
                                        Funding period has ended. Content will be released {formatRelativeTime(royaltyItem.releaseDate)}.
                                    </span>
                                    {isCreator && !royaltyItem.mediaUrl && (
                                        <Button
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700 text-white mt-2 sm:mt-0"
                                            onClick={() => {
                                                setActiveTab("content")
                                                window.scrollTo({ top: 0, behavior: "smooth" })
                                            }}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload Content
                                        </Button>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === "released" && (
                        <Alert className="bg-green-50 border-green-200 shadow-sm">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <AlertTitle className="text-green-800 text-lg">Content Released</AlertTitle>
                            <AlertDescription className="text-green-700">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <span>
                                        This royalty item has been released and is now available to token holders.
                                        {isCreator && !royaltyItem.mediaUrl && " Please upload the final content for your supporters."}
                                    </span>
                                    {royaltyItem.mediaUrl ? (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white mt-2 sm:mt-0"
                                            onClick={() => {
                                                setActiveTab("content")
                                                window.scrollTo({ top: 0, behavior: "smooth" })
                                            }}
                                        >
                                            <Play className="mr-2 h-4 w-4" />
                                            View Content
                                        </Button>
                                    ) : isCreator ? (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white mt-2 sm:mt-0"
                                            onClick={() => {
                                                setActiveTab("content")
                                                window.scrollTo({ top: 0, behavior: "smooth" })
                                            }}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload Content
                                        </Button>
                                    ) : null}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column - Image and Stats */}
                    <div className="md:col-span-1 space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <div className="relative aspect-square overflow-hidden rounded-xl border shadow-md group">
                                <Image
                                    src={royaltyItem.thumbnail ?? "/placeholder.svg?height=400&width=400"}
                                    alt={royaltyItem.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="flex items-center gap-2">
                                        {getMediaTypeIcon(royaltyItem.mediaType as MediaType)}
                                        <span className="text-sm font-medium">{royaltyItem.mediaType}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Funding Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative pt-1">
                                    <div className="flex mb-2 items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-primary/10 text-primary">
                                                {Math.round(calculateProgress())}% Complete
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-semibold inline-block text-primary">
                                                {funders.length}/{royaltyItem.limit ?? "∞"} Tokens
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-primary/20">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${calculateProgress()}%` }}
                                            transition={{ duration: 1, delay: 0.2 }}
                                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                                        ></motion.div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="bg-white/50 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Coins className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-medium text-muted-foreground">Price</span>
                                        </div>
                                        <span className="text-lg font-bold">
                                            {marketItem ? marketItem.price : "N/A"} {PLATFORM_ASSET.code}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            ${marketItem ? marketItem.priceUSD : "N/A"} USD
                                        </span>
                                    </div>

                                    <div className="bg-white/50 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Percent className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-medium text-muted-foreground">Royalty</span>
                                        </div>
                                        <span className="text-lg font-bold">{royaltyItem.percentage ?? "N/A"}%</span>
                                        <span className="block text-xs text-muted-foreground">of revenue</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border shadow-sm">
                            <CardHeader className="pb-2 bg-muted/30">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Asset Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Asset Code</span>
                                    <Badge variant="outline" className="font-mono">
                                        {royaltyItem.code}
                                    </Badge>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Issuer</span>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded cursor-help">
                                                {royaltyItem.issuer.substring(0, 6)}...
                                                {royaltyItem.issuer.substring(royaltyItem.issuer.length - 4)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-mono text-xs break-all max-w-xs">{royaltyItem.issuer}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Created</span>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>{formatRelativeTime(royaltyItem.createdAt)}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{formatDate(royaltyItem.createdAt)}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Privacy</span>
                                    <Badge variant={royaltyItem.privacy === ItemPrivacy.PUBLIC ? "default" : "secondary"}>
                                        {royaltyItem.privacy}
                                    </Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 pt-3">
                                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                                    <a
                                        href={`https://stellar.expert/explorer/public/asset/${royaltyItem.code}-${royaltyItem.issuer}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Share2 className="mr-2 h-3 w-3" />
                                        View on Stellar Explorer
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Important Dates Card */}
                        <Card className="overflow-hidden border shadow-sm">
                            <CardHeader className="pb-2 bg-muted/30">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Important Dates
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm pt-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`h-8 w-8 rounded-full flex items-center justify-center ${status === "funding" ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Funding End Date</p>
                                        <p className="text-muted-foreground">{formatDate(royaltyItem.fundEndDate)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div
                                        className={`h-8 w-8 rounded-full flex items-center justify-center ${status === "waiting" ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Release Date</p>
                                        <p className="text-muted-foreground">{formatDate(royaltyItem.releaseDate)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Details and Actions */}
                    <div className="md:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <div className="mb-6">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold">{royaltyItem.name}</h1>
                                    <div className="flex gap-2">
                                        <Badge
                                            variant={status === "funding" ? "default" : status === "waiting" ? "outline" : "secondary"}
                                            className={
                                                status === "funding"
                                                    ? "bg-blue-500"
                                                    : status === "waiting"
                                                        ? "border-amber-500 text-amber-700"
                                                        : ""
                                            }
                                        >
                                            {status === "funding" ? "Funding" : status === "waiting" ? "Waiting for Release" : "Released"}
                                        </Badge>
                                        <Badge variant="outline" className="bg-primary/5 flex items-center gap-1">
                                            {getMediaTypeIcon(royaltyItem.mediaType as MediaType)}
                                            {royaltyItem.mediaType}
                                        </Badge>
                                    </div>
                                </div>
                                {royaltyItem.description && (
                                    <p className="mt-2 text-muted-foreground leading-relaxed">{royaltyItem.description}</p>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none shadow-sm overflow-hidden">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className="bg-blue-500/10 p-2 rounded-full mb-2">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <p className="text-xs text-blue-700 font-medium">Funding Ends</p>
                                        <p className="text-sm font-bold text-blue-800">{formatRelativeTime(royaltyItem.fundEndDate)}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-none shadow-sm overflow-hidden">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className="bg-amber-500/10 p-2 rounded-full mb-2">
                                            <Calendar className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <p className="text-xs text-amber-700 font-medium">Release Date</p>
                                        <p className="text-sm font-bold text-amber-800">{formatRelativeTime(royaltyItem.releaseDate)}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none shadow-sm overflow-hidden">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className="bg-green-500/10 p-2 rounded-full mb-2">
                                            <Percent className="h-5 w-5 text-green-600" />
                                        </div>
                                        <p className="text-xs text-green-700 font-medium">Royalty Share</p>
                                        <p className="text-sm font-bold text-green-800">{royaltyItem.percentage ?? "N/A"}%</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none shadow-sm overflow-hidden">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className="bg-purple-500/10 p-2 rounded-full mb-2">
                                            <Users className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <p className="text-xs text-purple-700 font-medium">Funders</p>
                                        <p className="text-sm font-bold text-purple-800">
                                            {funders.length} of {royaltyItem.limit ?? "∞"}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid grid-cols-3 mb-6 bg-muted/30 p-1 rounded-lg">
                                    <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-white">
                                        <Info className="h-4 w-4 mr-2" />
                                        Overview
                                    </TabsTrigger>
                                    <TabsTrigger value="content" className="rounded-md data-[state=active]:bg-white">
                                        <FileMusic className="h-4 w-4 mr-2" />
                                        Content
                                    </TabsTrigger>

                                    <TabsTrigger value="manage" className="rounded-md data-[state=active]:bg-white">
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        {isCreator ? "Manage" : "Report"}
                                    </TabsTrigger>

                                </TabsList>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <TabsContent value="overview" className="space-y-6">
                                            <Card className="overflow-hidden border shadow-sm">
                                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
                                                    <CardTitle>About This Royalty Item</CardTitle>
                                                    <CardDescription>
                                                        Learn how this royalty-based funding opportunity works and what to expect
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-6 pt-6">
                                                    <div className="prose prose-sm max-w-none">
                                                        <p>
                                                            This is a royalty-based funding opportunity for {royaltyItem.mediaType.toLowerCase()}. By
                                                            purchasing tokens, you receive {royaltyItem.percentage ?? "a percentage"}% of future
                                                            revenue generated by this content, distributed proportionally among all token holders.
                                                        </p>

                                                        <p>
                                                            When you invest in this royalty item, you{"'re"} supporting the creator while also gaining the
                                                            opportunity to earn returns based on the content{"'s"} success.
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                                                        <div className="space-y-4">
                                                            <h3 className="text-sm font-medium flex items-center gap-2">
                                                                <Clock className="h-4 w-4 text-primary" />
                                                                Timeline
                                                            </h3>
                                                            <div className="relative border-l-2 border-muted pl-4 space-y-4">
                                                                <div className="relative">
                                                                    <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-blue-100 border-2 border-blue-400"></div>
                                                                    <h4 className="text-sm font-medium">Funding Period</h4>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Until {formatDate(royaltyItem.fundEndDate)}
                                                                    </p>
                                                                    <p className="text-xs mt-1">
                                                                        During this period, supporters can purchase tokens to fund the project.
                                                                    </p>
                                                                </div>

                                                                <div className="relative">
                                                                    <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-amber-100 border-2 border-amber-400"></div>
                                                                    <h4 className="text-sm font-medium">Waiting Period</h4>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {formatDate(royaltyItem.fundEndDate)} to {formatDate(royaltyItem.releaseDate)}
                                                                    </p>
                                                                    <p className="text-xs mt-1">
                                                                        The creator prepares the final content for release during this time.
                                                                    </p>
                                                                </div>

                                                                <div className="relative">
                                                                    <div className="absolute -left-[21px] top-0 h-4 w-4 rounded-full bg-green-100 border-2 border-green-400"></div>
                                                                    <h4 className="text-sm font-medium">Content Release</h4>
                                                                    <p className="text-xs text-muted-foreground">{formatDate(royaltyItem.releaseDate)}</p>
                                                                    <p className="text-xs mt-1">
                                                                        The final content is released and royalty payments begin to be distributed.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h3 className="text-sm font-medium flex items-center gap-2">
                                                                <Coins className="h-4 w-4 text-primary" />
                                                                Investment Details
                                                            </h3>
                                                            <div className="space-y-3">
                                                                <div className="bg-muted/30 p-3 rounded-lg">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-sm">Token Price:</span>
                                                                        <span className="font-medium">
                                                                            {marketItem ? marketItem.price : "N/A"} {PLATFORM_ASSET.code}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center mt-1">
                                                                        <span className="text-sm">USD Equivalent:</span>
                                                                        <span className="font-medium">${marketItem ? marketItem.priceUSD : "N/A"}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-muted/30 p-3 rounded-lg">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-sm">Royalty Share:</span>
                                                                        <span className="font-medium">{royaltyItem.percentage ?? "N/A"}% of revenue</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center mt-1">
                                                                        <span className="text-sm">Total Supply:</span>
                                                                        <span className="font-medium">{royaltyItem.limit ?? "Unlimited"} tokens</span>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-primary/5 p-3 rounded-lg">
                                                                    <h4 className="text-sm font-medium mb-1">How Royalties Work</h4>
                                                                    <p className="text-xs">
                                                                        When the content generates revenue, {royaltyItem.percentage ?? "a percentage"}% is
                                                                        distributed to token holders proportionally based on how many tokens they own.
                                                                        Payments are processed monthly by the creator.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                                {/* {status === "funding" && !isCreator && (
                                                    <CardFooter className="bg-muted/10 border-t">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button className="w-full">
                                                                    <Coins className="mr-2 h-4 w-4" />
                                                                    Fund This Project
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-md">
                                                                <DialogHeader>
                                                                    <DialogTitle>Fund {royaltyItem.name}</DialogTitle>
                                                                    <DialogDescription>
                                                                        Purchase tokens to receive {royaltyItem.percentage ?? "a percentage"}% of future
                                                                        revenue from this content.
                                                                    </DialogDescription>
                                                                </DialogHeader>

                                                                <div className="space-y-6 py-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="tokens">Number of Tokens</Label>
                                                                        <div className="flex items-center">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="rounded-r-none"
                                                                                onClick={() => setTokenAmount(Math.max(1, tokenAmount - 1))}
                                                                            >
                                                                                -
                                                                            </Button>
                                                                            <Input
                                                                                id="tokens"
                                                                                type="number"
                                                                                min="1"
                                                                                max={royaltyItem.limit ?? 1000}
                                                                                value={tokenAmount}
                                                                                onChange={(e) => setTokenAmount(Number.parseInt(e.target.value) ?? 1)}
                                                                                className="rounded-none text-center"
                                                                            />
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="rounded-l-none"
                                                                                onClick={() =>
                                                                                    setTokenAmount(Math.min(royaltyItem.limit ?? 1000, tokenAmount + 1))
                                                                                }
                                                                            >
                                                                                +
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="rounded-md bg-muted p-4">
                                                                        <div className="flex justify-between text-sm mb-2">
                                                                            <span>Price per token:</span>
                                                                            <span>
                                                                                {marketItem ? marketItem.price : "N/A"} {PLATFORM_ASSET.code}
                                                                            </span>
                                                                        </div>
                                                                        <Separator className="my-2" />
                                                                        <div className="flex justify-between text-sm mb-2">
                                                                            <span>Number of tokens:</span>
                                                                            <span>{tokenAmount}</span>
                                                                        </div>
                                                                        <Separator className="my-2" />
                                                                        <div className="flex justify-between font-medium">
                                                                            <span>Total:</span>
                                                                            <span className="text-primary">
                                                                                {marketItem ? (marketItem.price * tokenAmount).toFixed(2) : "N/A"}{" "}
                                                                                {PLATFORM_ASSET.code}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-end text-xs text-muted-foreground">
                                                                            ≈ ${marketItem ? (marketItem.priceUSD * tokenAmount).toFixed(2) : "N/A"} USD
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-blue-50 p-3 rounded-md">
                                                                        <div className="flex items-start gap-2">
                                                                            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                                                                            <div className="text-xs text-blue-700">
                                                                                <p className="font-medium">What you{"'ll"} receive:</p>
                                                                                <ul className="list-disc list-inside mt-1 space-y-1">
                                                                                    <li>
                                                                                        {tokenAmount} {royaltyItem.code} tokens
                                                                                    </li>
                                                                                    <li>
                                                                                        {royaltyItem.percentage ?? "A percentage"}% royalty share proportional to
                                                                                        your token ownership
                                                                                    </li>
                                                                                    <li>Access to exclusive content when released</li>
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <DialogFooter className="sm:justify-between">
                                                                    <DialogTrigger asChild>
                                                                        <Button variant="outline">Cancel</Button>
                                                                    </DialogTrigger>
                                                                    <Button type="submit">
                                                                        <Coins className="mr-2 h-4 w-4" />
                                                                        Confirm Purchase
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </CardFooter>
                                                )} */}
                                            </Card>

                                            {funders.length > 0 && (
                                                <Card className="overflow-hidden border shadow-sm">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <Users className="h-4 w-4 text-primary" />
                                                                <span>Funders</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setShowAllFunders(!showAllFunders)}
                                                                className="h-8"
                                                            >
                                                                {showAllFunders ? (
                                                                    <>
                                                                        Show Less <ChevronUp className="ml-1 h-4 w-4" />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Show All <ChevronDown className="ml-1 h-4 w-4" />
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="overflow-x-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>User ID</TableHead>
                                                                        <TableHead>Invested at</TableHead>

                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {(showAllFunders ? funders : funders.slice(0, 5)).map((funder, index) => (
                                                                        <TableRow key={index}>
                                                                            <TableCell className="font-mono text-xs">
                                                                                {funder.userId.substring(0, 6)}...
                                                                                {funder.userId.substring(funder.userId.length - 4)}
                                                                            </TableCell>
                                                                            <TableCell>{format(new Date(funder.buyAt), "yyyy-MM-dd HH:mm:ss")}</TableCell>

                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        {!showAllFunders && funders.length > 5 && (
                                                            <p className="text-center text-sm text-muted-foreground mt-2">
                                                                Showing 5 of {funders.length} funders
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="content" className="space-y-6">
                                            <Card className="overflow-hidden border shadow-sm">
                                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                                                    <CardTitle className="flex items-center gap-2">
                                                        {royaltyItem.mediaType === MediaType.MUSIC ? (
                                                            <Music className="h-5 w-5 text-primary" />
                                                        ) : royaltyItem.mediaType === MediaType.VIDEO ? (
                                                            <Video className="h-5 w-5 text-primary" />
                                                        ) : royaltyItem.mediaType === MediaType.IMAGE ? (
                                                            <ImageIcon className="h-5 w-5 text-primary" />
                                                        ) : (
                                                            <FileText className="h-5 w-5 text-primary" />
                                                        )}
                                                        {royaltyItem.mediaType} Content
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {status === "released"
                                                            ? "The content for this royalty item is now available"
                                                            : "Content will be available after the release date"}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    {royaltyItem.mediaUrl ? (
                                                        <div>
                                                            <div className="p-4 bg-green-50 border-b border-green-100 flex items-start gap-3">
                                                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                                                <div>
                                                                    <h3 className="text-green-800 font-medium">Content Available</h3>
                                                                    <p className="text-green-700 text-sm">
                                                                        The creator has uploaded the final content for this royalty item.
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="p-6">
                                                                {royaltyItem.mediaType === MediaType.MUSIC && (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="w-full max-w-md bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 mb-4">
                                                                            <div className="flex items-center gap-4 mb-4">
                                                                                <div className="h-16 w-16 bg-primary/20 rounded-lg flex items-center justify-center">
                                                                                    <FileMusic className="h-8 w-8 text-primary" />
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-lg font-medium">{royaltyItem.name}</h3>
                                                                                    <p className="text-sm text-muted-foreground">
                                                                                        Released on {formatDate(royaltyItem.releaseDate)}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <audio controls className="w-full">
                                                                                <source src={royaltyItem.mediaUrl} type="audio/mpeg" />
                                                                                Your browser does not support the audio element.
                                                                            </audio>
                                                                        </div>
                                                                        <Button variant="outline" size="sm" className="mt-2" asChild>
                                                                            <a href={royaltyItem.mediaUrl} download target="_blank" rel="noopener noreferrer">
                                                                                <Download className="mr-2 h-4 w-4" />
                                                                                Download Audio
                                                                            </a>
                                                                        </Button>
                                                                    </div>
                                                                )}

                                                                {royaltyItem.mediaType === MediaType.VIDEO && (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="w-full rounded-xl overflow-hidden shadow-md mb-4">
                                                                            <video
                                                                                src={royaltyItem.mediaUrl}
                                                                                controls
                                                                                className="w-full"
                                                                                poster={royaltyItem.thumbnail}
                                                                            >
                                                                                Your browser does not support the video element.
                                                                            </video>
                                                                        </div>
                                                                        <div className="flex items-center justify-between w-full max-w-md">
                                                                            <div>
                                                                                <h3 className="text-lg font-medium">{royaltyItem.name}</h3>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    Released on {formatDate(royaltyItem.releaseDate)}
                                                                                </p>
                                                                            </div>
                                                                            <Button variant="outline" size="sm" asChild>
                                                                                <a
                                                                                    href={royaltyItem.mediaUrl}
                                                                                    download
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    <Download className="mr-2 h-4 w-4" />
                                                                                    Download
                                                                                </a>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {royaltyItem.mediaType === MediaType.IMAGE && (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="w-full max-w-2xl rounded-xl overflow-hidden shadow-md mb-4">
                                                                            <div className="relative aspect-video">
                                                                                <Image
                                                                                    src={royaltyItem.mediaUrl ?? "/placeholder.svg"}
                                                                                    alt={royaltyItem.name}
                                                                                    fill
                                                                                    className="object-contain"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between w-full max-w-md">
                                                                            <div>
                                                                                <h3 className="text-lg font-medium">{royaltyItem.name}</h3>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    Released on {formatDate(royaltyItem.releaseDate)}
                                                                                </p>
                                                                            </div>
                                                                            <Button variant="outline" size="sm" asChild>
                                                                                <a
                                                                                    href={royaltyItem.mediaUrl}
                                                                                    download
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    <Download className="mr-2 h-4 w-4" />
                                                                                    Download
                                                                                </a>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* {royaltyItem.mediaType === MediaType.DOCUMENT && (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="w-full max-w-md bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 mb-4 text-center">
                                                                            <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                                                                            <h3 className="text-lg font-medium mb-2">{royaltyItem.name}</h3>
                                                                            <p className="text-sm text-muted-foreground mb-4">
                                                                                Released on {formatDate(royaltyItem.releaseDate)}
                                                                            </p>
                                                                            <Button asChild>
                                                                                <a
                                                                                    href={royaltyItem.mediaUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="w-full"
                                                                                >
                                                                                    <Download className="mr-2 h-4 w-4" />
                                                                                    Download Document
                                                                                </a>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )} */}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-8 text-center">
                                                            {isCreator && (status === "waiting" || status === "released") ? (
                                                                <div className="space-y-6">
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                                                            <Upload className="h-8 w-8 text-primary" />
                                                                        </div>
                                                                        <h3 className="text-xl font-medium">Upload Content</h3>
                                                                        <p className="text-muted-foreground max-w-md mx-auto mt-2">
                                                                            Please upload the final content for your supporters. This will be available to all
                                                                            token holders.
                                                                        </p>
                                                                    </div>

                                                                    <div className="bg-muted/30 rounded-lg p-6 max-w-md mx-auto">
                                                                        <UploadS3Button
                                                                            endpoint="musicUploader"
                                                                            className="w-full"
                                                                            label={`Upload ${royaltyItem.mediaType.toLowerCase()}`}
                                                                            onClientUploadComplete={(res) => {
                                                                                const data = res
                                                                                if (data?.url) {
                                                                                    handleMediaUpload(data.url)
                                                                                }
                                                                            }}
                                                                            onUploadError={(error: Error) => {
                                                                                toast.error(`Upload error: ${error.message}`)
                                                                            }}
                                                                        />
                                                                        <p className="text-xs text-muted-foreground mt-3">
                                                                            Supported formats:{" "}
                                                                            {royaltyItem.mediaType === MediaType.MUSIC
                                                                                ? "MP3, WAV, FLAC (max 50MB)"
                                                                                : royaltyItem.mediaType === MediaType.VIDEO
                                                                                    ? "MP4, MOV, WebM (max 500MB)"
                                                                                    : royaltyItem.mediaType === MediaType.IMAGE
                                                                                        ? "JPG, PNG, WebP (max 10MB)"
                                                                                        : "PDF, DOCX, TXT (max 20MB)"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                                                        <Clock className="h-8 w-8 text-muted-foreground" />
                                                                    </div>
                                                                    <h3 className="text-xl font-medium">Content Not Available Yet</h3>
                                                                    <p className="text-muted-foreground max-w-md mx-auto mt-2">
                                                                        {status === "funding"
                                                                            ? "Content will be available after the funding period ends and the creator uploads it."
                                                                            : "The creator has not uploaded the content yet. Please check back later."}
                                                                    </p>
                                                                    <div className="mt-6 bg-muted/30 rounded-lg p-4 max-w-md mx-auto">
                                                                        <div className="flex items-start gap-3">
                                                                            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                                            <div>
                                                                                <h4 className="text-sm font-medium">Expected Release</h4>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    {formatDate(royaltyItem.releaseDate)} (
                                                                                    {formatRelativeTime(royaltyItem.releaseDate)})
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {royaltyItem.demoMediaUrl && (
                                                <Card className="overflow-hidden border shadow-sm">
                                                    <CardHeader className="bg-muted/30">
                                                        <CardTitle className="flex items-center gap-2">
                                                            <Play className="h-4 w-4 text-primary" />
                                                            Demo Content
                                                        </CardTitle>
                                                        <CardDescription>Preview sample content provided by the creator</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="p-6">
                                                        <div className="rounded-lg border overflow-hidden bg-muted/10">
                                                            {royaltyItem.mediaType === MediaType.MUSIC && (
                                                                <div className="p-6 flex flex-col items-center">
                                                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                                                        <FileMusic className="h-6 w-6 text-primary" />
                                                                    </div>
                                                                    <h3 className="text-lg font-medium mb-3">Demo Track</h3>
                                                                    <audio controls className="w-full max-w-md">
                                                                        <source src={royaltyItem.demoMediaUrl} type="audio/mpeg" />
                                                                        Your browser does not support the audio element.
                                                                    </audio>
                                                                </div>
                                                            )}

                                                            {royaltyItem.mediaType === MediaType.VIDEO && (
                                                                <div className="overflow-hidden rounded-lg">
                                                                    <video
                                                                        src={royaltyItem.demoMediaUrl}
                                                                        controls
                                                                        className="w-full"
                                                                        poster={royaltyItem.thumbnail}
                                                                    >
                                                                        Your browser does not support the video element.
                                                                    </video>
                                                                    <div className="p-3 bg-muted/30">
                                                                        <p className="text-sm font-medium">Demo Preview</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            This is a sample of the content that will be available after release.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>


                                        <TabsContent value="manage" className="space-y-6">
                                            {
                                                isCreator && (
                                                    <>
                                                        <Card className="overflow-hidden border shadow-sm">
                                                            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                                                                <CardTitle>Manage Content</CardTitle>
                                                                <CardDescription>Upload and manage content for your royalty item</CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="space-y-6 pt-6">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-4">
                                                                        <h3 className="text-sm font-medium flex items-center gap-2">
                                                                            <Upload className="h-4 w-4 text-primary" />
                                                                            Upload Final Content
                                                                        </h3>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Upload the final content that will be available to token holders after the release
                                                                            date.
                                                                        </p>

                                                                        <div className="bg-muted/30 rounded-lg p-4">
                                                                            <UploadS3Button
                                                                                endpoint="musicUploader"
                                                                                className="w-full"
                                                                                label={`Upload ${royaltyItem.mediaType.toLowerCase()}`}
                                                                                onClientUploadComplete={(res) => {
                                                                                    const data = res
                                                                                    if (data?.url) {
                                                                                        handleMediaUpload(data.url)
                                                                                    }
                                                                                }}
                                                                                onUploadError={(error: Error) => {
                                                                                    toast.error(`Upload error: ${error.message}`)
                                                                                }}
                                                                            />
                                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                                Supported formats:{" "}
                                                                                {royaltyItem.mediaType === MediaType.MUSIC
                                                                                    ? "MP3, WAV, FLAC (max 50MB)"
                                                                                    : royaltyItem.mediaType === MediaType.VIDEO
                                                                                        ? "MP4, MOV, WebM (max 500MB)"
                                                                                        : royaltyItem.mediaType === MediaType.IMAGE
                                                                                            ? "JPG, PNG, WebP (max 10MB)"
                                                                                            : "PDF, DOCX, TXT (max 20MB)"}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <h3 className="text-sm font-medium flex items-center gap-2">
                                                                            <Info className="h-4 w-4 text-primary" />
                                                                            Content Status
                                                                        </h3>
                                                                        <div className="rounded-lg border p-4 bg-muted/10">
                                                                            <div className="flex items-center gap-3 mb-3">
                                                                                <div
                                                                                    className={`h-10 w-10 rounded-full flex items-center justify-center ${royaltyItem.mediaUrl
                                                                                        ? "bg-green-100 text-green-600"
                                                                                        : "bg-amber-100 text-amber-600"
                                                                                        }`}
                                                                                >
                                                                                    {royaltyItem.mediaUrl ? (
                                                                                        <CheckCircle className="h-5 w-5" />
                                                                                    ) : (
                                                                                        <AlertCircle className="h-5 w-5" />
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="font-medium">
                                                                                        {royaltyItem.mediaUrl ? "Content Uploaded" : "Content Not Uploaded"}
                                                                                    </h4>
                                                                                    <p className="text-sm text-muted-foreground">
                                                                                        {royaltyItem.mediaUrl
                                                                                            ? "Your content has been uploaded and will be available to token holders."
                                                                                            : "Please upload your content before the release date."}
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="bg-muted/30 p-3 rounded-lg">
                                                                                <div className="flex justify-between items-center text-sm">
                                                                                    <span>Release Date:</span>
                                                                                    <span className="font-medium">{formatDate(royaltyItem.releaseDate)}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-sm mt-1">
                                                                                    <span>Time Remaining:</span>
                                                                                    <span className="font-medium">{formatRelativeTime(royaltyItem.releaseDate)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>

                                                        <Card className="overflow-hidden border shadow-sm ">
                                                            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                                                                <CardTitle>Royalty Payments</CardTitle>
                                                                <CardDescription>
                                                                    Manage profit history and distribute royalty payments to token holders
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="space-y-6 pt-6">
                                                                <div className="rounded-lg border p-4 bg-blue-50">
                                                                    <div className="flex items-start gap-3">
                                                                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                                                        <div>
                                                                            <h3 className="text-blue-800 font-medium">How Royalty Payments Work</h3>
                                                                            <p className="text-blue-700 text-sm mt-1">
                                                                                Upload profit history documents to keep track of earnings, and distribute royalties
                                                                                to token holders with a single click. The system will automatically distribute the
                                                                                amount proportionally based on token ownership.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-4">
                                                                        <h3 className="text-sm font-medium flex items-center gap-2">
                                                                            <FileText className="h-4 w-4 text-primary" />
                                                                            Upload Profit History
                                                                        </h3>
                                                                        <div className="bg-muted/30 rounded-lg p-4">
                                                                            <div className="flex flex-col gap-3">
                                                                                <Button

                                                                                    variant="outline"
                                                                                    onClick={() =>
                                                                                        document.getElementById("fileInput")?.click()
                                                                                    }
                                                                                    disabled={uploading}
                                                                                    className="w-full"
                                                                                >
                                                                                    <Upload className="mr-2 h-4 w-4" />
                                                                                    {uploading ? "Uploading..." : "Upload Profit Document"}
                                                                                </Button>

                                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                                    Upload any document (PDF, Word, Excel, Text) that contains profit information.
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <h3 className="text-sm font-medium flex items-center gap-2">
                                                                            <DollarSign className="h-4 w-4 text-primary" />
                                                                            Process Payments
                                                                        </h3>
                                                                        <div className="bg-muted/30 rounded-lg p-4">
                                                                            <Button
                                                                                onClick={handleProcessPayments}
                                                                                disabled={funders.length === 0 || isPaymentProcessing}
                                                                                className="w-full"
                                                                            >
                                                                                {isPaymentProcessing ? (
                                                                                    <>Processing...</>
                                                                                ) : (
                                                                                    <>
                                                                                        <DollarSign className="mr-2 h-4 w-4" />
                                                                                        Pay All Token Holders
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                                {funders.length > 0
                                                                                    ? `Distribute payments to ${funders.length} token holders proportionally`
                                                                                    : "No token holders found"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {royaltyItem.royaltyReport.length > 0 && (
                                                                    <div className="mt-4">
                                                                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                                                            <FileText className="h-4 w-4 text-primary" />
                                                                            Profit History Documents
                                                                        </h3>
                                                                        <div className="rounded-lg border overflow-hidden">
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow>
                                                                                        <TableHead>Document</TableHead>
                                                                                        <TableHead>Upload Date</TableHead>
                                                                                        <TableHead>Actions</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {royaltyItem.royaltyReport.map((doc, index) => (
                                                                                        <TableRow key={index}>
                                                                                            <TableCell className="font-medium">{doc.mediaName}</TableCell>
                                                                                            <TableCell>{format(doc.updatedAt, "MMM d, yyyy")}</TableCell>
                                                                                            <TableCell>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Button
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        onClick={() => setPreviewDocument(doc)}
                                                                                                    >
                                                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                                                        View
                                                                                                    </Button>
                                                                                                    <Button variant="ghost" size="sm" asChild>
                                                                                                        <a href={doc.mediaUrl} target="_blank" rel="noopener noreferrer">
                                                                                                            <Download className="mr-2 h-4 w-4" />
                                                                                                            Download
                                                                                                        </a>
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Payment Modal */}
                                                                <Dialog open={isPaymentModalOpen} onOpenChange={() => {
                                                                    setIsPaymentModalOpen(false);
                                                                    setPaymentAmount("");
                                                                    setPaymentCurrency(PaymentMethod.xlm);
                                                                    setIsPaymentProcessing(false);
                                                                    setConfirmingPayment(false);
                                                                    setXdr(null);
                                                                }}>
                                                                    <DialogContent className="">
                                                                        <DialogHeader>
                                                                            <DialogTitle>Distribute Royalty Payments</DialogTitle>
                                                                            <DialogDescription>
                                                                                Enter the total amount to distribute among {funders.length} token holders. The
                                                                                amount will be divided proportionally based on token ownership.
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <div className="grid gap-4 py-4">
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="amount" className="text-right">
                                                                                    Total Amount
                                                                                </Label>
                                                                                <div className="col-span-3 flex items-center gap-2">
                                                                                    <Input
                                                                                        id="amount"
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        min="0.1"
                                                                                        value={paymentAmount}
                                                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                                                        placeholder="Enter amount to distribute"
                                                                                        className="col-span-2"
                                                                                    />
                                                                                    <span className="text-sm font-medium">
                                                                                        {paymentCurrency === PaymentMethod.xlm ? "XLM" :
                                                                                            paymentCurrency === PaymentMethod.usd
                                                                                                ? "USD"
                                                                                                : PLATFORM_ASSET.code.toUpperCase()}

                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="currency" className="text-right">
                                                                                    Choose:
                                                                                </Label>
                                                                                <div className="col-span-3">
                                                                                    <div className="flex items-center space-x-2">
                                                                                        {session.status === "authenticated" && (() => {
                                                                                            const walletType = session.data.user.walletType;
                                                                                            const showCardOption =
                                                                                                walletType === WalletType.emailPass ||
                                                                                                walletType === WalletType.google ||
                                                                                                walletType === WalletType.facebook;

                                                                                            return (
                                                                                                <>
                                                                                                    {
                                                                                                        showCardOption && (
                                                                                                            <Button
                                                                                                                type="button"
                                                                                                                variant={paymentCurrency === PaymentMethod.usd ? "default" : "outline"}
                                                                                                                size="sm"
                                                                                                                onClick={() => setPaymentCurrency(PaymentMethod.usd)}
                                                                                                                className="flex-1"
                                                                                                            >
                                                                                                                <Coins className="mr-2 h-4 w-4" />
                                                                                                                CARD
                                                                                                            </Button>
                                                                                                        )
                                                                                                    }
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant={paymentCurrency === PaymentMethod.asset ? "default" : "outline"}
                                                                                            size="sm"
                                                                                            onClick={() => setPaymentCurrency(PaymentMethod.asset)}
                                                                                            className="flex-1"
                                                                                        >
                                                                                            <Coins className="mr-2 h-4 w-4" />
                                                                                            {PLATFORM_ASSET.code.toUpperCase()}
                                                                                        </Button>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant={paymentCurrency === PaymentMethod.xlm ? "default" : "outline"}
                                                                                            size="sm"
                                                                                            onClick={() => setPaymentCurrency(PaymentMethod.xlm)}
                                                                                            className="flex-1"
                                                                                        >
                                                                                            <Coins className="mr-2 h-4 w-4" />
                                                                                            XLM
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>


                                                                            <div className="bg-muted/30 p-3 rounded-md">
                                                                                <h4 className="text-sm font-medium mb-2">Payment Preview</h4>
                                                                                <div className="space-y-1 text-sm">
                                                                                    <div className="flex justify-between">
                                                                                        <span>Token Holders:</span>
                                                                                        <span>{funders.length}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span>Total Amount:</span>
                                                                                        <span>
                                                                                            {paymentAmount ?? "0"}{" "}
                                                                                            {paymentCurrency === PaymentMethod.xlm ? "XLM" :
                                                                                                paymentCurrency === PaymentMethod.usd
                                                                                                    ? "USD"
                                                                                                    : PLATFORM_ASSET.code.toUpperCase()}

                                                                                        </span>
                                                                                    </div>
                                                                                    {
                                                                                        paymentCurrency === PaymentMethod.usd && (
                                                                                            <div className="flex justify-between">
                                                                                                <span>Converted Amount: </span>
                                                                                                <span>
                                                                                                    {
                                                                                                        Number(paymentAmount) / Number(prize)
                                                                                                    } {PLATFORM_ASSET.code.toUpperCase()}
                                                                                                </span>
                                                                                            </div>
                                                                                        )
                                                                                    }
                                                                                    <div className="flex justify-between">
                                                                                        <span>Amount per Token Holder:</span>
                                                                                        <span>
                                                                                            {paymentAmount && funders.length > 0
                                                                                                ? (Number.parseFloat(paymentAmount) / funders.length).toFixed(2)
                                                                                                : "0"}{" "}
                                                                                            {paymentCurrency === PaymentMethod.xlm ? "XLM" :
                                                                                                paymentCurrency === PaymentMethod.usd
                                                                                                    ? "USD"
                                                                                                    : PLATFORM_ASSET.code.toUpperCase()}

                                                                                        </span>
                                                                                    </div>
                                                                                    <Separator className="my-2" />
                                                                                    <div className="flex justify-between font-medium">
                                                                                        <span>Distribution Method:</span>
                                                                                        <span>Proportional to ownership</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {
                                                                                paymentCurrency === PaymentMethod.usd && xdr && (
                                                                                    <PaymentForm
                                                                                        applicationId={env.NEXT_PUBLIC_SQUARE_APP_ID}
                                                                                        cardTokenizeResponseReceived={(token, verifiedBuyer) =>
                                                                                            void (async () => {
                                                                                                setIsPaymentProcessing(true);


                                                                                                if (token.token) {
                                                                                                    paymentInUSD.mutate({
                                                                                                        sourceId: token.token,
                                                                                                        amount: paymentAmount,
                                                                                                    });
                                                                                                } else {
                                                                                                    toast.error("Error squire in token");
                                                                                                }

                                                                                                setIsPaymentProcessing(false);
                                                                                            })()
                                                                                        }
                                                                                        locationId={env.NEXT_PUBLIC_SQUARE_LOCATION}
                                                                                    >
                                                                                        <CreditCard />
                                                                                    </PaymentForm>
                                                                                )

                                                                            }
                                                                        </div>
                                                                        <DialogFooter>
                                                                            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                                                                                Cancel
                                                                            </Button>
                                                                            <Button
                                                                                onClick={processPaymentWithAmount}
                                                                                disabled={
                                                                                    !paymentAmount || Number.parseFloat(paymentAmount) <= 0 || confirmingPayment
                                                                                }
                                                                            >
                                                                                {confirmingPayment ? (
                                                                                    <>Processing...</>
                                                                                ) : (
                                                                                    <>
                                                                                        <DollarSign className="mr-2 h-4 w-4" />
                                                                                        Confirm Payment
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>

                                                                {/* Document Preview Modal */}
                                                                <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
                                                                    <DialogContent className="sm:max-w-3xl">
                                                                        <DialogHeader>
                                                                            <DialogTitle>
                                                                                <div className="flex items-center gap-2">
                                                                                    <FileText className="h-5 w-5" />
                                                                                    {previewDocument?.mediaName}
                                                                                </div>
                                                                            </DialogTitle>
                                                                            <DialogDescription>
                                                                                Uploaded on {previewDocument && format(previewDocument.updatedAt, "MMMM d, yyyy")}
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <div className="py-4">
                                                                            {previewDocument && (
                                                                                <div className="border rounded-md overflow-hidden">
                                                                                    {previewDocument.mediaUrl.endsWith(".pdf") ? (
                                                                                        <div className="h-[60vh] w-full">
                                                                                            <iframe
                                                                                                src={`${previewDocument.mediaUrl}#toolbar=0`}
                                                                                                className="w-full h-full"
                                                                                                title={previewDocument.mediaName}
                                                                                            />
                                                                                        </div>
                                                                                    ) : previewDocument.mediaUrl.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                                                                                        <div className="flex justify-center p-4 bg-muted/20">
                                                                                            <Image
                                                                                                src={previewDocument.mediaUrl ?? "/placeholder.svg"}
                                                                                                alt={previewDocument.mediaName}
                                                                                                width={600}
                                                                                                height={400}
                                                                                                className="max-h-[60vh] object-contain"
                                                                                            />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="p-8 text-center">
                                                                                            <div className="flex flex-col items-center gap-4">
                                                                                                <FileText className="h-16 w-16 text-muted-foreground" />
                                                                                                <div>
                                                                                                    <p className="font-medium">Preview not available</p>
                                                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                                                        This file type cannot be previewed directly. Please download the file to
                                                                                                        view it.
                                                                                                    </p>
                                                                                                </div>
                                                                                                <Button asChild>
                                                                                                    <a href={previewDocument.mediaUrl} target="_blank" rel="noopener noreferrer">
                                                                                                        <Download className="mr-2 h-4 w-4" />
                                                                                                        Download File
                                                                                                    </a>
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <DialogFooter>
                                                                            <Button variant="outline" onClick={() => setPreviewDocument(null)}>
                                                                                Close
                                                                            </Button>
                                                                            {previewDocument && (
                                                                                <Button asChild>
                                                                                    <a href={previewDocument.mediaUrl} target="_blank" rel="noopener noreferrer">
                                                                                        <Download className="mr-2 h-4 w-4" />
                                                                                        Download
                                                                                    </a>
                                                                                </Button>
                                                                            )}
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </CardContent>
                                                        </Card>
                                                    </>
                                                )
                                            }

                                            <Card className="overflow-hidden border shadow-sm">
                                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        All Profit Reports
                                                    </CardTitle>
                                                    <CardDescription>
                                                        View and manage all your profit history documents in one place
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="pt-6">
                                                    {royaltyItem.royaltyReport.length > 0 ? (
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                                {royaltyItem.royaltyReport.map((doc, index) => (
                                                                    <Card
                                                                        key={index}
                                                                        className="overflow-hidden border hover:shadow-md transition-shadow"
                                                                    >
                                                                        <CardContent className="p-0">
                                                                            <div className="p-4 bg-muted/20 flex items-center justify-center h-32">
                                                                                {doc.mediaUrl.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                                                                                    <div className="relative w-full h-full">
                                                                                        <Image
                                                                                            src={doc.mediaUrl ?? "/placeholder.svg"}
                                                                                            alt={doc.mediaName}
                                                                                            fill
                                                                                            className="object-contain"
                                                                                        />
                                                                                    </div>
                                                                                ) : doc.mediaUrl.endsWith(".pdf") ? (
                                                                                    <FileText className="h-16 w-16 text-primary/60" />
                                                                                ) : doc.mediaUrl.match(/\.(doc|docx)$/i) ? (
                                                                                    <FileText className="h-16 w-16 text-blue-500/60" />
                                                                                ) : doc.mediaUrl.match(/\.(xls|xlsx)$/i) ? (
                                                                                    <FileText className="h-16 w-16 text-green-500/60" />
                                                                                ) : (
                                                                                    <FileText className="h-16 w-16 text-muted-foreground" />
                                                                                )}
                                                                            </div>
                                                                            <div className="p-4">
                                                                                <h4 className="font-medium text-sm truncate" title={doc.mediaName}>
                                                                                    {doc.mediaName}
                                                                                </h4>
                                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                                    {format(doc.updatedAt, "MMMM d, yyyy")}
                                                                                </p>
                                                                            </div>
                                                                        </CardContent>
                                                                        <CardFooter className="flex justify-between p-2 bg-muted/10 border-t">
                                                                            <Button variant="ghost" size="sm" onClick={() => setPreviewDocument(doc)}>
                                                                                <FileText className="mr-1 h-4 w-4" />
                                                                                View
                                                                            </Button>
                                                                            <Button variant="ghost" size="sm" asChild>
                                                                                <a href={doc.mediaUrl} download target="_blank" rel="noopener noreferrer">
                                                                                    <Download className="mr-1 h-4 w-4" />
                                                                                    Download
                                                                                </a>
                                                                            </Button>
                                                                        </CardFooter>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <div className="flex flex-col items-center gap-4">
                                                                <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center">
                                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-medium">No profit reports yet</h3>
                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                        Upload your first profit report to keep track of your earnings
                                                                    </p>
                                                                </div>
                                                                {
                                                                    isCreator && (
                                                                        <Button
                                                                            variant="outline"
                                                                            onClick={() => document.getElementById("fileInput")?.click()}
                                                                            className="mt-2"
                                                                        >
                                                                            <Upload className="mr-2 h-4 w-4" />
                                                                            Upload First Report
                                                                        </Button>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                            <UploadS3Button
                                                id='fileInput'
                                                className="hidden"
                                                endpoint="blobUploader"
                                                onClientUploadComplete={async (res) => {
                                                    const data = res
                                                    if (data?.url) {
                                                        const media = {
                                                            name: data.name,
                                                            url: data.url,
                                                            type: data.type,
                                                            size: data.size,
                                                        }
                                                        await updateReportHistory.mutateAsync({
                                                            id: royaltyItem.id,
                                                            media

                                                        })
                                                        toast.success("File uploaded successfully")
                                                    }
                                                }}
                                                onUploadError={(error: Error) => {
                                                    toast.error(`Upload error: ${error.message}`)
                                                }}
                                            />
                                            {/* <Accordion type="single" collapsible className="w-full">
                                                    <AccordionItem value="analytics" className="border rounded-lg shadow-sm">
                                                        <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 rounded-t-lg">
                                                            <div className="flex items-center gap-2">
                                                                <BarChart3 className="h-4 w-4 text-primary" />
                                                                <span>Analytics & Reports</span>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="px-4 pb-4">
                                                            <div className="space-y-4 pt-2">
                                                                <p className="text-sm text-muted-foreground">
                                                                    View analytics and generate reports for your royalty item.
                                                                </p>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <Card className="bg-muted/10">
                                                                        <CardContent className="p-4">
                                                                            <div className="flex justify-between items-center">
                                                                                <h3 className="text-sm font-medium">Total Funded</h3>
                                                                                <span className="text-lg font-bold">
                                                                                    {marketItem ? ((funders?.length ?? 0) * marketItem.price).toFixed(2) : "N/A"}{" "}
                                                                                    {PLATFORM_ASSET.code}
                                                                                </span>
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>

                                                                    <Card className="bg-muted/10">
                                                                        <CardContent className="p-4">
                                                                            <div className="flex justify-between items-center">
                                                                                <h3 className="text-sm font-medium">Funding Progress</h3>
                                                                                <span className="text-lg font-bold">{Math.round(calculateProgress())}%</span>
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                </div>

                                                                <Button variant="outline" className="w-full">
                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                    Generate Full Report
                                                                </Button>
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion> */}
                                        </TabsContent>

                                    </motion.div>
                                </AnimatePresence>
                            </Tabs>
                        </motion.div>
                    </div>
                </div>

            </div>
        </TooltipProvider>
    )
}

export default RoyalityPage
