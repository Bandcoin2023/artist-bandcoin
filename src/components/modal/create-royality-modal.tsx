"use client"

import type React from "react"

import { type SubmitHandler, useForm, FormProvider, type FieldErrors, type UseFormGetValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    PlusIcon,
    Calendar,
    Coins,
    FileMusic,
    ImageIcon,
    Info,
    Percent,
    CalendarClock,
    ArrowLeft,
    ArrowRight,
    Check,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"

import { clientsign } from "package/connect_wallet"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { z } from "zod"
import { PLATFORM_ASSET, PLATFORM_FEE, TrxBaseFeeInPlatformAsset } from "~/lib/stellar/constant"
import { AccountSchema, clientSelect } from "~/lib/stellar/fan/utils"

import { ipfsHashToUrl } from "~/utils/ipfs"
import { Input } from "~/components/shadcn/ui/input"
import { Label } from "~/components/shadcn/ui/label"

import { Textarea } from "~/components/shadcn/ui/textarea"
import { api } from "~/utils/api"
import Image from "next/image"
import { Button } from "~/components/shadcn/ui/button"
import useNeedSign from "~/lib/hook"
import { Alert, AlertDescription, AlertTitle } from "~/components/shadcn/ui/alert"
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/shadcn/ui/tooltip"
import { Progress } from "~/components/shadcn/ui/progress"
import { PaymentChoose, usePaymentMethodStore } from "../common/payment-options"
import { UploadS3Button } from "../common/upload-button"
import RechargeLink from "../payment/recharge-link"
import { useCreateRoyalityModalStore } from "../store/create-royality-modal"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../shadcn/ui/dialog"

// Enhanced schema with better validation
export const RoyalityFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    description: z.string().max(500, "Description must be less than 500 characters").optional().or(z.literal("")),
    coverImgUrl: z.string({
        required_error: "Cover image is required",
    }),
    sampleAudio: z.string().optional(), // Explicitly optional
    albumId: z.number(),
    price: z
        .number({
            required_error: "Price is required",
        })
        .nonnegative({
            message: "Price must be a positive number",
        })
        .min(0.1, "Minimum price is 0.1"),
    priceUSD: z
        .number({
            required_error: "USD Price is required",
        })
        .nonnegative({
            message: "Price must be a positive number",
        })
        .min(0.1, "Minimum price is $0.1"),
    limit: z
        .number({
            required_error: "Limit is required",
        })
        .int({
            message: "Limit must be a whole number",
        })
        .positive({
            message: "Limit must be a positive number",
        })
        .max(1000000, "Maximum limit is 1,000,000"),
    code: z
        .string({
            required_error: "Asset name is required",
        })
        .min(4, {
            message: "Asset name must be at least 4 characters",
        })
        .max(12, {
            message: "Asset name must be at most 12 characters",
        })
        .regex(/^[A-Za-z0-9]+$/, {
            message: "Asset name can only contain letters and numbers",
        }),
    issuer: AccountSchema.optional(),
    endDate: z
        .date({
            required_error: "End date is required",
            invalid_type_error: "End date must be a valid date",
        })
        .refine((date) => date > new Date(), {
            message: "End date must be in the future",
        }),
    percentage: z
        .number({
            required_error: "Royalty percentage is required",
        })
        .min(1, "Minimum percentage is 1%")
        .max(100, "Maximum percentage is 100%"),
    releaseDate: z
        .date({
            required_error: "Release date is required",
            invalid_type_error: "Release date must be a valid date",
        })
        .refine((date) => date > new Date(), {
            message: "Release date must be in the future",
        }),
})

type RoyalityFormType = z.infer<typeof RoyalityFormSchema>

// Step definitions for the multi-step form
const STEPS = [
    { id: "basics", title: "Basic Info", description: "Title, description, and royalty percentage" },
    { id: "media", title: "Media", description: "Cover image and demo audio" },
    { id: "dates", title: "Dates", description: "Funding end date and release date" },
    { id: "token", title: "Token Details", description: "Asset name, token limit, and pricing" },
    { id: "review", title: "Review & Submit", description: "Review and create your royalty item" },
]

// Animation variants
const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
}

const slideVariants = {
    hidden: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
    visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: (direction: number) => ({ x: direction < 0 ? 100 : -100, opacity: 0, transition: { duration: 0.2 } }),
}

// Type for step completion status function
interface StepCompletionParams {
    errors: FieldErrors<RoyalityFormType>
    watchedName: string | undefined
    watchedPercentage: number | undefined
    coverImgUrl: string | undefined
    watchedCode: string | undefined
    watchedLimit: number | undefined
    watchedPrice: number | undefined
    watchedPriceUSD: number | undefined
    getValues: UseFormGetValues<RoyalityFormType>
}

// Function to determine step completion status
const getStepCompletionStatus = ({
    errors,
    watchedName,
    watchedPercentage,
    coverImgUrl,
    watchedCode,
    watchedLimit,
    watchedPrice,
    watchedPriceUSD,
    getValues,
}: StepCompletionParams): boolean[] => {
    const stepStatus: boolean[] = [
        // Step 1: Basic Info
        !errors.name && !errors.percentage && !!watchedName && !!watchedPercentage,
        // Step 2: Media
        !!coverImgUrl, // sampleAudio is optional
        // Step 3: Dates
        !errors.endDate && !errors.releaseDate && !!getValues("endDate") && !!getValues("releaseDate"),
        // Step 4: Token Details
        !errors.code &&
        !errors.limit &&
        !errors.price &&
        !errors.priceUSD &&
        !!watchedCode &&
        !!watchedLimit &&
        !!watchedPrice &&
        !!watchedPriceUSD,
    ]

    return stepStatus
}

export default function CreateRoyalityModal() {
    const [file, setFile] = useState<File>()
    const [ipfs, setIpfs] = useState<string>()
    const [uploading, setUploading] = useState(false)
    const inputFile = useRef<HTMLInputElement>(null)
    const [musicUrl, setMusicUrl] = useState<string>()
    const [coverImgUrl, setCover] = useState<string>()
    const [submitLoading, setSubmitLoading] = useState(false)
    const { needSign } = useNeedSign()
    const { paymentMethod, setIsOpen: setPaymentModalOpen } = usePaymentMethodStore()
    const { albumId, setIsOpen, isOpen } = useCreateRoyalityModalStore()
    const [currentStep, setCurrentStep] = useState(0)
    const [direction, setDirection] = useState(0)

    const session = useSession()
    const { platformAssetBalance } = useUserStellarAcc()
    const totalFeees = Number(TrxBaseFeeInPlatformAsset) + Number(PLATFORM_FEE)

    const { data: requiredTokenAmount, isLoading: requiredTokenAmountLoading } =
        api.fan.trx.getRequiredPlatformAsset.useQuery(
            {
                xlm: 2,
            },
            {
                enabled: !!albumId,
            },
        )

    // Format date to YYYY-MM-DD string for HTML date inputs
    const formatDateForInput = (date: Date | null) => {
        if (!date) return ""
        return date.toISOString().split("T")[0]
    }

    // Set minimum date for end date and release date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const minDate = formatDateForInput(tomorrow)

    // Set default dates
    const oneMonthFromNow = new Date()
    oneMonthFromNow.setDate(tomorrow.getDate())
    oneMonthFromNow.setMonth(tomorrow.getMonth() + 1)

    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

    // Default form values with properly formatted dates
    const defaultValues = {
        albumId,
        price: 2,
        priceUSD: 2,
        limit: 100,
        percentage: 10, // Default 10% royalty
        endDate: oneMonthFromNow,
        releaseDate: threeMonthsFromNow,
    }

    const methods = useForm<RoyalityFormType>({
        mode: "onChange",
        resolver: zodResolver(RoyalityFormSchema),
        defaultValues,
    })

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        reset,
        watch,
        trigger,
        formState: { errors, isValid, isDirty },
    } = methods

    // Watch values for validation feedback
    const watchedPrice = watch("price")
    const watchedPriceUSD = watch("priceUSD")
    const watchedLimit = watch("limit")
    const watchedCode = watch("code")
    const watchedPercentage = watch("percentage")
    const watchedName = watch("name")
    const watchedDescription = watch("description")

    const addRoyality = api.fan.music.createRoyalityItem.useMutation({
        onSuccess: () => {
            toast.success("Royality item added successfully")
            reset()
            setPaymentModalOpen(false)
            setIsOpen(false)
            setFile(undefined)
            setIpfs(undefined)
            setCover(undefined)
            setMusicUrl(undefined)
            setCurrentStep(0)
            setDirection(0)
            setSubmitLoading(false)

        },
        onError: (error) => {
            toast.error(`Failed to add royality item: ${error.message}`)
            setSubmitLoading(false)
        },
    })

    const xdrMutation = api.fan.trx.createUniAssetTrx.useMutation({
        onSuccess(data, variables, context) {
            const { issuer, xdr } = data
            setValue("issuer", issuer)

            setSubmitLoading(true)

            toast.promise(
                clientsign({
                    presignedxdr: xdr,
                    pubkey: session.data?.user.id,
                    walletType: session.data?.user.walletType,
                    test: clientSelect(),
                })
                    .then((res) => {
                        if (res) {
                            const data = getValues()
                            addRoyality.mutate({ ...data })
                        } else {
                            toast.error("Transaction Failed")
                            setSubmitLoading(false)
                        }
                    })
                    .catch((e) => {
                        console.log(e)
                        setSubmitLoading(false)
                    }),
                {
                    loading: "Signing Transaction",
                    success: "Transaction Signed Successfully",
                    error: "Signing Transaction Failed",
                },
            )
        },
        onError: (error) => {
            toast.error(`Transaction creation failed: ${error.message}`)
        },
    })

    const onSubmit: SubmitHandler<RoyalityFormType> = () => {
        if (!ipfs) {
            toast.error("Please upload a cover image.")
            return
        }

        xdrMutation.mutate({
            code: getValues("code"),
            limit: getValues("limit"),
            signWith: needSign(),
            ipfsHash: ipfs,
            native: paymentMethod === "xlm",
        })
    }

    const uploadFile = async (fileToUpload: File) => {
        try {
            setUploading(true)
            const formData = new FormData()
            formData.append("file", fileToUpload, fileToUpload.name)
            const res = await fetch("/api/file", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) {
                throw new Error(`Upload failed with status: ${res.status}`)
            }

            const ipfsHash = await res.text()
            const thumbnail = ipfsHashToUrl(ipfsHash)
            setCover(thumbnail)
            setIpfs(ipfsHash)
            setValue("coverImgUrl", thumbnail, { shouldValidate: true })
            setUploading(false)
        } catch (e) {
            console.error(e)
            setUploading(false)
            toast.error("Trouble uploading file. Please try again.")
        }
    }

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            const file = files[0]
            if (file) {
                if (file.size > 1024 * 1024) {
                    toast.error("File size should be less than 1MB")
                    return
                }
                setFile(file)
                await uploadFile(file)
            }
        }
    }

    // Generate a random asset code suggestion
    useEffect(() => {
        if (!getValues("code") || getValues("code") === "") {
            const randomCode = `ROY${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            setValue("code", randomCode, { shouldValidate: true })
        }
    }, [getValues, setValue])

    // Step navigation functions
    const nextStep = async () => {
        let fieldsToValidate: (keyof RoyalityFormType)[] = []

        // Define which fields to validate for each step
        switch (currentStep) {
            case 0: // Basic Info
                fieldsToValidate = ["name", "percentage"]
                break
            case 1: // Media
                fieldsToValidate = ["coverImgUrl"]
                // sampleAudio is optional, so we don't include it
                break
            case 2: // Dates
                fieldsToValidate = ["endDate", "releaseDate"]
                break
            case 3: // Token Details
                fieldsToValidate = ["code", "limit", "price", "priceUSD"]
                break
        }

        // Validate the fields for the current step
        const isStepValid = await trigger(fieldsToValidate)

        if (isStepValid) {
            setDirection(1)
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
        } else {
            // Show more specific error message
            const errorFields = Object.keys(errors).filter((key) => fieldsToValidate.includes(key as keyof RoyalityFormType))

            if (errorFields.length > 0) {
                toast.error(`Please complete all required fields: ${errorFields.join(", ")}`)
            } else {
                toast.error("Please fix the errors before proceeding")
            }
        }
    }

    const prevStep = () => {
        setDirection(-1)
        setCurrentStep((prev) => Math.max(prev - 1, 0))
    }

    const goToStep = (step: number) => {
        setDirection(step > currentStep ? 1 : -1)
        setCurrentStep(step)
    }
    const handleClose = () => {
        setIsOpen(false)

    }

    // Get step completion status
    const stepStatus = getStepCompletionStatus({
        errors,
        watchedName,
        watchedPercentage,
        coverImgUrl,
        watchedCode,
        watchedLimit,
        watchedPrice,
        watchedPriceUSD,
        getValues,
    })

    if (requiredTokenAmountLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent>
                    <div className="space-y-6">
                        {/* Info Card Skeleton */}
                        <div className="rounded-lg border bg-card shadow-sm">
                            <div className="p-4">
                                <div className="flex items-start gap-2">
                                    <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-3 w-full bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Skeleton */}
                        <div className="space-y-4">
                            <div className="h-2 w-full bg-slate-200 rounded animate-pulse"></div>
                            <div className="flex justify-between">
                                {Array.from({ length: STEPS.length }, (_, index) => index + 1).map((step) => (
                                    <div key={step} className="flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse mb-1"></div>
                                        <div className="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step Completion Status Skeleton */}
                        <div className="flex justify-between mb-4">
                            {Array.from({ length: 5 }, (_, index) => index + 1).map((step) => (
                                <div key={step} className="flex flex-col items-center">
                                    <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse"></div>
                                </div>
                            ))}
                        </div>

                        {/* Form Card Skeleton */}
                        <div className="rounded-lg border bg-card shadow-sm">
                            {/* Card Header */}
                            <div className="p-6 border-b">
                                <div className="h-6 w-1/3 bg-slate-200 rounded animate-pulse"></div>
                            </div>

                            {/* Card Content */}
                            <div className="p-6 space-y-6">
                                {/* Form Fields */}
                                {Array.from({ length: 2 }, (_, index) => index + 1).map((field) => (
                                    <div key={field} className="space-y-2">
                                        <div className="h-4 w-1/4 bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-10 w-full bg-slate-200 rounded animate-pulse"></div>
                                        {field === 1 && <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse"></div>}
                                    </div>
                                ))}
                            </div>

                            {/* Card Footer */}
                            <div className="p-6 border-t flex justify-between">
                                <div className="h-10 w-24 bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-10 w-24 bg-slate-200 rounded animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (requiredTokenAmount)
        return (
            <Dialog
                open={isOpen}
                onOpenChange={handleClose}
            >
                <DialogContent className="max-w-2xl">

                    <TooltipProvider>
                        <div>
                            <Card className="mb-4">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-2">
                                        <Info className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-sm">About Royalty Items</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Royalty items allow fans to invest in your music and earn a share of future revenue. Set a fair
                                                price and limit to attract investors.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Progress indicator */}
                            <div className="mb-6">
                                <Progress value={(currentStep / (STEPS.length - 1)) * 100} className="h-2" />
                                <div className="flex justify-between mt-2">
                                    {STEPS.map((step, index) => (
                                        <motion.div
                                            key={step.id}
                                            className={`flex flex-col items-center cursor-pointer text-muted-foreground`}
                                            onClick={() => index <= currentStep && goToStep(index)}
                                            whileHover={{ scale: index <= currentStep ? 1.05 : 1 }}
                                            whileTap={{ scale: index <= currentStep ? 0.95 : 1 }}
                                        >
                                            <motion.div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${index < currentStep
                                                    ? "bg-primary"
                                                    : index === currentStep
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}
                                                initial={false}
                                                animate={index <= currentStep ? { scale: [null, 1.2, 1], transition: { duration: 0.3 } } : {}}
                                            >
                                                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                                            </motion.div>
                                            <span className="text-xs font-medium hidden md:block">{step.title}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Add this right after the Progress indicator component */}
                            <div className="mb-4 flex justify-between">
                                {STEPS.map((step, index) => (
                                    <div key={step.id} className="flex flex-col items-center">
                                        {index <= currentStep && (
                                            <div
                                                className={`text-xs px-2 py-1 rounded-full ${index < currentStep && stepStatus[index]
                                                    ? "bg-green-100 text-green-800"
                                                    : index === currentStep
                                                        ? "bg-primary shadow-sm"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}
                                            >
                                                {stepStatus[index] ? "Complete" : "Incomplete"}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <FormProvider {...methods}>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <AnimatePresence mode="wait" custom={direction}>
                                        {/* Step 1: Basic Info */}
                                        {currentStep === 0 && (
                                            <motion.div
                                                key="step1"
                                                custom={direction}
                                                variants={slideVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Basic Information</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div>
                                                            <Label htmlFor="name" className="flex items-center gap-1">
                                                                Title <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Input
                                                                id="name"
                                                                {...register("name")}
                                                                placeholder="Enter Royalty Item Title"
                                                                className={errors.name ? "border-destructive" : watchedName ? "border-green-500" : ""}
                                                            />
                                                            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                                                            {!errors.name && watchedName && (
                                                                <p className="text-xs text-green-500 mt-1">Title looks good!</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="description" className="flex items-center gap-1">
                                                                Description <span className="text-muted-foreground">(Optional)</span>
                                                            </Label>
                                                            <Textarea
                                                                id="description"
                                                                {...register("description")}
                                                                placeholder="Write a short description about this royalty item"
                                                                className="min-h-[100px]"
                                                            />
                                                            {errors.description && (
                                                                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="percentage" className="flex items-center gap-1">
                                                                <Percent className="h-4 w-4" />
                                                                Royalty Percentage <span className="text-destructive">*</span>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">
                                                                            The percentage of revenue that will be shared with token holders. Higher percentages
                                                                            attract more investors but reduce your earnings.
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </Label>
                                                            <div className="relative">
                                                                <Input
                                                                    id="percentage"
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    step="1"
                                                                    {...register("percentage", { valueAsNumber: true })}
                                                                    placeholder="Enter royalty percentage"
                                                                    className={
                                                                        errors.percentage
                                                                            ? "border-destructive pr-8"
                                                                            : watchedPercentage && watchedPercentage >= 1 && watchedPercentage <= 100
                                                                                ? "border-green-500 pr-8"
                                                                                : "pr-8"
                                                                    }
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                                            </div>
                                                            {errors.percentage && (
                                                                <p className="text-sm text-destructive mt-1">{errors.percentage.message}</p>
                                                            )}
                                                            {!errors.percentage && watchedPercentage && (
                                                                <p className="text-xs text-muted-foreground mt-1">Recommended: 5-20% royalty</p>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-end">
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button
                                                                type="button"
                                                                onClick={nextStep}
                                                                className="group"
                                                                disabled={!watchedName || !watchedPercentage || !!errors.name || !!errors.percentage}
                                                            >
                                                                Next <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                            </Button>
                                                        </motion.div>
                                                    </CardFooter>
                                                </Card>
                                            </motion.div>
                                        )}

                                        {/* Step 2: Media */}
                                        {currentStep === 1 && (
                                            <motion.div
                                                key="step2"
                                                custom={direction}
                                                variants={slideVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Media Files</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="coverImg" className="flex items-center gap-1">
                                                                <ImageIcon className="h-4 w-4" />
                                                                Cover Image <span className="text-destructive">*</span>
                                                            </Label>
                                                            <div
                                                                className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-md p-4 hover:bg-muted/50 transition-colors ${!coverImgUrl && "border-destructive/50"}`}
                                                            >
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => document.getElementById("coverImg")?.click()}
                                                                    className="w-full"
                                                                >
                                                                    <PlusIcon className="mr-2 h-4 w-4" />
                                                                    Choose Cover Image
                                                                </Button>
                                                                <Input
                                                                    id="coverImg"
                                                                    type="file"
                                                                    accept=".jpg, .jpeg, .png"
                                                                    onChange={handleChange}
                                                                    className="hidden"
                                                                />
                                                                <p className="text-xs text-muted-foreground">JPG, PNG. Max 1MB.</p>
                                                                {uploading && (
                                                                    <progress className="w-full h-1 bg-primary/20" value="50" max="100"></progress>
                                                                )}
                                                            </div>
                                                            {coverImgUrl && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 20 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="mt-2 flex justify-center"
                                                                >
                                                                    <div className="relative h-32 w-32 overflow-hidden rounded-md shadow-md">
                                                                        <Image
                                                                            width={128}
                                                                            height={128}
                                                                            alt="preview image"
                                                                            src={coverImgUrl ?? "/placeholder.svg"}
                                                                            className="object-cover"
                                                                        />
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                            {!coverImgUrl && <p className="text-sm text-destructive mt-1">Cover image is required</p>}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="musicFile" className="flex items-center gap-2">
                                                                <FileMusic className="h-4 w-4" />
                                                                Demo Music File <span className="text-muted-foreground">(Optional)</span>
                                                            </Label>
                                                            <UploadS3Button
                                                                endpoint="musicUploader"

                                                                className="w-full mt-1"
                                                                label="Upload Sample Audio"
                                                                onClientUploadComplete={(res) => {
                                                                    const data = res
                                                                    if (data?.url) {
                                                                        setMusicUrl(data.url)
                                                                        setValue("sampleAudio", data.url)
                                                                    }
                                                                }}
                                                                onUploadError={(error: Error) => {
                                                                    toast.error(`Upload error: ${error.message}`)
                                                                }}
                                                            />
                                                            {musicUrl && (
                                                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                                                                    <audio controls className="w-full">
                                                                        <source src={musicUrl} type="audio/mpeg" />
                                                                    </audio>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-between">
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button type="button" variant="outline" onClick={prevStep} className="group">
                                                                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back
                                                            </Button>
                                                        </motion.div>
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button type="button" onClick={nextStep} className="group" disabled={!coverImgUrl}>
                                                                Next <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                            </Button>
                                                        </motion.div>
                                                    </CardFooter>
                                                </Card>
                                            </motion.div>
                                        )}

                                        {/* Step 3: Dates */}
                                        {currentStep === 2 && (
                                            <motion.div
                                                key="step3"
                                                custom={direction}
                                                variants={slideVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Important Dates</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div>
                                                            <Label htmlFor="endDate" className="flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                Funding End Date <span className="text-destructive">*</span>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">
                                                                            The date when funding for this royalty item will end. After this date, no more tokens
                                                                            can be purchased.
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </Label>
                                                            <Input
                                                                id="endDate"
                                                                type="date"
                                                                min={minDate}
                                                                value={formatDateForInput(getValues("endDate") ?? oneMonthFromNow)}
                                                                onChange={(e) => {
                                                                    const date = e.target.value ? new Date(e.target.value) : null
                                                                    if (date) {
                                                                        setValue("endDate", date, { shouldValidate: true })
                                                                    }
                                                                }}
                                                                className={errors.endDate ? "border-destructive" : ""}
                                                            />
                                                            {errors.endDate && <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="releaseDate" className="flex items-center gap-1">
                                                                <CalendarClock className="h-4 w-4" />
                                                                Content Release Date <span className="text-destructive">*</span>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">
                                                                            The expected date when the music or content will be released. This helps investors
                                                                            understand the timeline.
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </Label>
                                                            <Input
                                                                id="releaseDate"
                                                                type="date"
                                                                min={minDate}
                                                                value={formatDateForInput(getValues("releaseDate") ?? threeMonthsFromNow)}
                                                                onChange={(e) => {
                                                                    const date = e.target.value ? new Date(e.target.value) : null
                                                                    if (date) {
                                                                        setValue("releaseDate", date, { shouldValidate: true })
                                                                    }
                                                                }}
                                                                className={errors.releaseDate ? "border-destructive" : ""}
                                                            />
                                                            {errors.releaseDate && (
                                                                <p className="text-sm text-destructive mt-1">{errors.releaseDate.message}</p>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-between">
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button type="button" variant="outline" onClick={prevStep} className="group">
                                                                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back
                                                            </Button>
                                                        </motion.div>
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button
                                                                type="button"
                                                                onClick={nextStep}
                                                                className="group"
                                                                disabled={
                                                                    !getValues("endDate") ||
                                                                    !getValues("releaseDate") ||
                                                                    !!errors.endDate ||
                                                                    !!errors.releaseDate
                                                                }
                                                            >
                                                                Next <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                            </Button>
                                                        </motion.div>
                                                    </CardFooter>
                                                </Card>
                                            </motion.div>
                                        )}

                                        {/* Step 4: Token Details */}
                                        {currentStep === 3 && (
                                            <motion.div
                                                key="step4"
                                                custom={direction}
                                                variants={slideVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Token Details</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div>
                                                            <Label htmlFor="code" className="flex items-center gap-1">
                                                                Asset Name <span className="text-destructive">*</span>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">
                                                                            This is the unique identifier for your royalty token on the blockchain. Must be 4-12
                                                                            characters, letters and numbers only.
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </Label>
                                                            <Input
                                                                id="code"
                                                                {...register("code")}
                                                                placeholder="Enter Asset Name"
                                                                className={
                                                                    errors.code
                                                                        ? "border-destructive"
                                                                        : watchedCode && watchedCode.length >= 4
                                                                            ? "border-green-500"
                                                                            : ""
                                                                }
                                                            />
                                                            {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
                                                            {!errors.code && watchedCode && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    This will be the token symbol for your royalty NFT
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="limit" className="flex items-center gap-1">
                                                                Token Limit <span className="text-destructive">*</span>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">
                                                                            The maximum number of royalty tokens that can be created. This determines how many
                                                                            investors can participate.
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </Label>
                                                            <Input
                                                                id="limit"
                                                                type="number"
                                                                {...register("limit", { valueAsNumber: true })}
                                                                placeholder="Enter token limit"
                                                                className={
                                                                    errors.limit
                                                                        ? "border-destructive"
                                                                        : watchedLimit && watchedLimit > 0
                                                                            ? "border-green-500"
                                                                            : ""
                                                                }
                                                            />
                                                            {errors.limit && <p className="text-sm text-destructive mt-1">{errors.limit.message}</p>}
                                                            {!errors.limit && watchedLimit && (
                                                                <p className="text-xs text-muted-foreground mt-1">Recommended: 100-1000 tokens</p>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="price" className="flex items-center gap-1">
                                                                    <Coins className="h-4 w-4" />
                                                                    Price Per Token in {PLATFORM_ASSET.code} <span className="text-destructive">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="price"
                                                                    type="number"
                                                                    step="0.1"
                                                                    {...register("price", { valueAsNumber: true })}
                                                                    placeholder={`Price Per Token in ${PLATFORM_ASSET.code}`}
                                                                    className={
                                                                        errors.price
                                                                            ? "border-destructive"
                                                                            : watchedPrice && watchedPrice >= 0.1
                                                                                ? "border-green-500"
                                                                                : ""
                                                                    }
                                                                />
                                                                {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                                                            </div>

                                                            <div>
                                                                <Label htmlFor="priceUSD" className="flex items-center gap-1">
                                                                    Price Per Token in USD <span className="text-destructive">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="priceUSD"
                                                                    type="number"
                                                                    step="0.1"
                                                                    {...register("priceUSD", { valueAsNumber: true })}
                                                                    placeholder="Price Per Token in USD"
                                                                    className={
                                                                        errors.priceUSD
                                                                            ? "border-destructive"
                                                                            : watchedPriceUSD && watchedPriceUSD >= 0.1
                                                                                ? "border-green-500"
                                                                                : ""
                                                                    }
                                                                />
                                                                {errors.priceUSD && (
                                                                    <p className="text-sm text-destructive mt-1">{errors.priceUSD.message}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-between">
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button type="button" variant="outline" onClick={prevStep} className="group">
                                                                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back
                                                            </Button>
                                                        </motion.div>
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button
                                                                type="button"
                                                                onClick={nextStep}
                                                                className="group"
                                                                disabled={
                                                                    !watchedCode ||
                                                                    !watchedLimit ||
                                                                    !watchedPrice ||
                                                                    !watchedPriceUSD ||
                                                                    Boolean(errors.code) ||
                                                                    Boolean(errors.limit) ||
                                                                    Boolean(errors.price) ||
                                                                    Boolean(errors.priceUSD)
                                                                }
                                                            >
                                                                Next <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                            </Button>
                                                        </motion.div>
                                                    </CardFooter>
                                                </Card>
                                            </motion.div>
                                        )}

                                        {/* Step 5: Review & Submit */}
                                        {currentStep === 4 && (
                                            <motion.div
                                                key="step5"
                                                custom={direction}
                                                variants={slideVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Review & Submit</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-4">
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.1 }}
                                                                >
                                                                    <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                                                                    <div className="mt-1 p-3 bg-muted/50 rounded-md">
                                                                        <p className="font-medium">{watchedName ?? "No title provided"}</p>
                                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                                            {watchedDescription ?? "No description"}
                                                                        </p>
                                                                        <p className="text-sm mt-2">
                                                                            Royalty: <span className="font-medium">{watchedPercentage}%</span>
                                                                        </p>
                                                                    </div>
                                                                </motion.div>

                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.2 }}
                                                                >
                                                                    <h3 className="text-sm font-medium text-muted-foreground">Important Dates</h3>
                                                                    <div className="mt-1 p-3 bg-muted/50 rounded-md">
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                            <p className="text-sm">
                                                                                Funding ends:{" "}
                                                                                <span className="font-medium">{getValues("endDate")?.toLocaleDateString()}</span>
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                                                                            <p className="text-sm">
                                                                                Release date:{" "}
                                                                                <span className="font-medium">
                                                                                    {getValues("releaseDate")?.toLocaleDateString()}
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>

                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.3 }}
                                                                >
                                                                    <h3 className="text-sm font-medium text-muted-foreground">Token Details</h3>
                                                                    <div className="mt-1 p-3 bg-muted/50 rounded-md">
                                                                        <p className="text-sm">
                                                                            Asset name: <span className="font-medium">{watchedCode}</span>
                                                                        </p>
                                                                        <p className="text-sm mt-1">
                                                                            Token limit: <span className="font-medium">{watchedLimit}</span>
                                                                        </p>
                                                                        <p className="text-sm mt-1">
                                                                            Price per token:{" "}
                                                                            <span className="font-medium">
                                                                                {watchedPrice} {PLATFORM_ASSET.code}
                                                                            </span>
                                                                        </p>
                                                                        <p className="text-sm mt-1">
                                                                            USD price: <span className="font-medium">${watchedPriceUSD}</span>
                                                                        </p>
                                                                    </div>
                                                                </motion.div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.4 }}
                                                                >
                                                                    <h3 className="text-sm font-medium text-muted-foreground">Media Preview</h3>
                                                                    <div className="mt-1 p-3 bg-muted/50 rounded-md flex flex-col items-center">
                                                                        {coverImgUrl ? (
                                                                            <div className="relative h-40 w-40 overflow-hidden rounded-md shadow-md">
                                                                                <Image
                                                                                    width={160}
                                                                                    height={160}
                                                                                    alt="preview image"
                                                                                    src={coverImgUrl ?? "/placeholder.svg"}
                                                                                    className="object-cover"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-sm text-destructive">No cover image uploaded</p>
                                                                        )}

                                                                        {musicUrl && (
                                                                            <div className="mt-3 w-full">
                                                                                <p className="text-sm font-medium mb-1">Demo Audio:</p>
                                                                                <audio controls className="w-full">
                                                                                    <source src={musicUrl} type="audio/mpeg" />
                                                                                </audio>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>

                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.5 }}
                                                                    className="pt-4 border-t"
                                                                >
                                                                    <PaymentChoose
                                                                        costBreakdown={[
                                                                            {
                                                                                label: "Asset Creation Cost",
                                                                                amount: paymentMethod === "asset" ? requiredTokenAmount - totalFeees : 2,
                                                                                type: "cost",
                                                                                highlighted: true,
                                                                            },
                                                                            {
                                                                                label: "Platform Fee",
                                                                                amount: paymentMethod === "asset" ? totalFeees : 2,
                                                                                highlighted: false,
                                                                                type: "fee",
                                                                            },
                                                                            {
                                                                                label: "Total Cost",
                                                                                amount: paymentMethod === "asset" ? requiredTokenAmount : 4,
                                                                                highlighted: false,
                                                                                type: "total",
                                                                            },
                                                                        ]}
                                                                        XLM_EQUIVALENT={4}
                                                                        handleConfirm={handleSubmit(onSubmit)}
                                                                        loading={xdrMutation.isLoading ?? addRoyality.isLoading ?? submitLoading}
                                                                        requiredToken={requiredTokenAmount}
                                                                        trigger={
                                                                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                                                <Button
                                                                                    type="button"
                                                                                    disabled={
                                                                                        xdrMutation.isLoading ??
                                                                                        addRoyality.isLoading ??
                                                                                        submitLoading ??
                                                                                        (requiredTokenAmount !== undefined &&
                                                                                            requiredTokenAmount > platformAssetBalance) ??
                                                                                        !isValid ??
                                                                                        !ipfs
                                                                                    }
                                                                                    className="w-full"
                                                                                >
                                                                                    {(xdrMutation.isLoading ?? addRoyality.isLoading ?? submitLoading) && (
                                                                                        <span className="loading loading-spinner mr-2"></span>
                                                                                    )}
                                                                                    Create Royalty Item
                                                                                </Button>
                                                                            </motion.div>
                                                                        }
                                                                    />
                                                                </motion.div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-between">
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button type="button" variant="outline" onClick={prevStep} className="group">
                                                                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back
                                                            </Button>
                                                        </motion.div>
                                                    </CardFooter>
                                                </Card>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </form>
                            </FormProvider>

                            {requiredTokenAmount && requiredTokenAmount > platformAssetBalance && (
                                <Alert className="mt-4 border-amber-200 bg-amber-50">
                                    <AlertTitle className="text-amber-800">Insufficient Balance</AlertTitle>
                                    <AlertDescription className="text-amber-700">
                                        You don{"'t"} have enough {PLATFORM_ASSET.code} to create this royalty item. Please recharge your
                                        account.
                                    </AlertDescription>
                                    <div className="mt-2">
                                        <RechargeLink />
                                    </div>
                                </Alert>
                            )}
                        </div>
                    </TooltipProvider>
                </DialogContent>
            </Dialog>
        )
}
