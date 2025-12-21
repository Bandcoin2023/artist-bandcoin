"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, FormProvider, type SubmitHandler, useForm, useFormContext } from "react-hook-form"
import { z } from "zod"
import toast from "react-hot-toast"
import { Loader, MapPin, ImageIcon, Settings, CheckCircle, Coins, Calendar } from "lucide-react"
import Image from "next/image"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { Controller, type SubmitHandler, useForm, FormProvider, useFormContext } from "react-hook-form"
import toast from "react-hot-toast"
import { match } from "ts-pattern"
import { z } from "zod"
import { api } from "~/utils/api"
import { BADWORDS } from "~/utils/banned-word"
import { error, loading, success } from "~/utils/trcp/patterns"
import { motion, AnimatePresence } from "framer-motion"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/shadcn/ui/tooltip"
import { Input } from "~/components/shadcn/ui/input"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Checkbox } from "~/components/shadcn/ui/checkbox"
import { Button } from "~/components/shadcn/ui/button"
import { Label } from "~/components/shadcn/ui/label"
import { Badge } from "~/components/shadcn/ui/badge"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { Separator } from "~/components/shadcn/ui/separator"
import { useAdminMapModalStore } from "../store/admin-map-modal-store"
import { useSelectCreatorStore } from "../store/creator-selection-store"
import { UploadS3Button } from "../common/upload-button"
import { cn } from "~/lib/utils"

type AssetType = {
    id: number
    code: string
    issuer: string
    thumbnail: string
}

export const PAGE_ASSET_NUM = -10
export const NO_ASSET = -99

// Define the steps as a type for better type safety
type FormStep = "basic" | "tokens" | "advanced"
const FORM_STEPS: FormStep[] = ["basic", "tokens", "advanced"]

export const createAdminPinFormSchema = z.object({
    lat: z
        .number({
            message: "Latitude is required",
        })
        .min(-180)
        .max(180),
    lng: z
        .number({
            message: "Longitude is required",
        })
        .min(-180)
        .max(180),
    description: z.string(),
    title: z
        .string()
        .min(3)
        .refine(
            (value) => {
                return !BADWORDS.some((word) => value.includes(word))
            },
            {
                message: "Input contains banned words.",
            },
        ),
    image: z.string().url().optional(),
    startDate: z.date(),
    endDate: z.date().min(new Date(new Date().setHours(0, 0, 0, 0))),
    url: z.string().url().optional(),
    autoCollect: z.boolean(),
    token: z.number().optional(),
    tokenAmount: z.number().nonnegative().optional(), // if it optional then no token selected
    pinNumber: z.number().nonnegative().min(1),
    radius: z.number().nonnegative(),
    pinCollectionLimit: z.number().min(0),
    tier: z.string().optional(),
    multiPin: z.boolean().optional(),
    creatorId: z.string(),
})

export default function CreateAdminPinModal() {
    const { manual, position, duplicate, isOpen, setIsOpen, prevData } = useAdminMapModalStore()
    const { setData: setSelectedCreator, data: selectedCreator } = useSelectCreatorStore()

    const [coverUrl, setCover] = useState<string>()
    const [selectedToken, setSelectedToken] = useState<AssetType & { bal: number }>()
    const [isPageAsset, setIsPageAsset] = useState<boolean>()
    const [storageBalance, setStorageBalance] = useState<number>(0)
    const [remainingBalance, setRemainingBalance] = useState<number>(0)
    const [activeStep, setActiveStep] = useState<FormStep>("basic")
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Format dates for input fields
    const formatDateForInput = (date: Date) => {
        return date.toISOString().split("T")[0]
    }

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const methods = useForm<z.infer<typeof createAdminPinFormSchema>>({
        resolver: zodResolver(createAdminPinFormSchema),
        defaultValues: {
            lat: position?.lat,
            lng: position?.lng,
            radius: 0,
            pinNumber: 1,
            description: prevData?.description ?? "",
            creatorId: selectedCreator?.id,
            pinCollectionLimit: 1,
            autoCollect: false,
            multiPin: false,
            startDate: prevData?.startDate ?? today,
            endDate: prevData?.endDate ?? tomorrow,
            title: prevData?.title ?? "",
            url: prevData?.url ?? "",
        },
        mode: "onChange",
    })

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        getValues,
        reset,
        watch,
        formState: { errors, isValid, isDirty },
        control,
    } = methods

    const tokenAmount = watch("pinCollectionLimit")
    const startDate = watch("startDate")
    const endDate = watch("endDate")

    // query
    const assets = api.fan.asset.getCreatorPageAsset.useQuery({
        creatorId: selectedCreator?.id ?? "",
    })
    const GetAssetBalance = api.fan.asset.getAssetBalance.useMutation()

    const tiers = api.fan.member.getAllMembership.useQuery()

    const assetsDropdown = match(assets)
        .with(success, () => {
            const pageAsset = assets.data?.pageAsset

            if (isPageAsset && pageAsset) {
                return <p>{pageAsset.code}</p>
            }
            // if (isPageAsset === false && shopAsset)
            if (true)
                return (
                    <div className="space-y-2 w-full">
                        <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 " />
                            <Label htmlFor="token-select" className="text-sm font-medium">
                                Choose Token
                            </Label>
                        </div>
                        <Select
                            disabled={selectedCreator === undefined || GetAssetBalance.isLoading}
                            onValueChange={(value) => {
                                handleTokenOptionChange({
                                    target: { value },
                                } as ChangeEvent<HTMLSelectElement>)
                            }}
                        >
                            <SelectTrigger id="token-select" className="w-full">
                                <SelectValue placeholder="Select a token" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_ASSET.toString()}>Pin (No asset)</SelectItem>
                                <SelectItem value={PAGE_ASSET_NUM.toString()}>{pageAsset?.code} - Page Asset</SelectItem>
                                {assets.data?.shopAsset.map((asset: AssetType) => (
                                    <SelectItem key={asset.id} value={asset.id.toString()}>
                                        {asset.code} - Shop Asset
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {GetAssetBalance.isLoading && (
                            <div className="flex items-center gap-2 mt-1">
                                <Loader className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Loading balance...</span>
                            </div>
                        )}
                    </div>
                )
        })
        .with(loading, (data) => (
            <div className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <p>Loading tokens...</p>
            </div>
        ))
        .with(error, (data) => (
            <div className="text-red-500">
                <p>{data.failureReason?.message}</p>
            </div>
        ))
        .otherwise(() => <p>Failed to fetch assets</p>)

    function TiersOptions() {
        if (tiers.isLoading) return <div className="h-10 w-full bg-muted animate-pulse rounded-md"></div>
        if (tiers.data) {
            return (
                <div className="space-y-2 w-full">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 " />
                        <Label htmlFor="tier-select" className="text-sm font-medium">
                            Choose Tier
                        </Label>
                    </div>
                    <Controller
                        name="tier"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="tier-select" className="w-full">
                                    <SelectValue placeholder="Choose Tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="private">Only Followers</SelectItem>
                                    {tiers.data.map((model) => (
                                        <SelectItem key={model.id} value={model.id.toString()}>
                                            {`${model.name} : ${model.price} ${model.creator.pageAsset?.code}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )
        }
    }

    const closePopup = () => {
        setIsOpen(false)
        resetState()
    }

    // mutations
    const addPinM = api.maps.pin.createForAdminPin.useMutation({
        onSuccess: () => {
            toast.success("Pin sent for approval")
            closePopup()
        },
    })

    // functions
    function resetState() {
        setCover(undefined)
        setSelectedToken(undefined)
        setRemainingBalance(0)
        setIsPageAsset(undefined)
        setActiveStep("basic")
        reset()
    }

    // Navigation functions
    const goToNextTab = () => {
        const currentIndex = FORM_STEPS.indexOf(activeStep)
        if (currentIndex < FORM_STEPS.length - 1) {
            const nextStep = FORM_STEPS[currentIndex + 1]
            if (nextStep) {
                setActiveStep(nextStep)
            }
        }
    }

    const goToPreviousTab = () => {
        const currentIndex = FORM_STEPS.indexOf(activeStep)
        if (currentIndex > 0) {
            const previousStep = FORM_STEPS[currentIndex - 1]
            if (previousStep) {
                setActiveStep(previousStep)
            }
        }
    }

    const onSubmit: SubmitHandler<z.infer<typeof createAdminPinFormSchema>> = (data) => {
        setValue("token", selectedToken?.id)

        if (selectedToken) {
            if (data.pinCollectionLimit > selectedToken.bal) {
                setError("pinCollectionLimit", {
                    type: "manual",
                    message: "Collection limit can't be more than token balance",
                })
                return
            }
        }

        if (position) {
            setValue("lat", position.lat)
            setValue("lng", position.lng)
            addPinM.mutate({ ...data, lat: position.lat, lng: position.lng })
        } else {
            addPinM.mutate({ ...data })
        }
    }

    function handleTokenOptionChange(event: ChangeEvent<HTMLSelectElement>): void {
        const selectedAssetId = Number(event.target.value)
        if (selectedAssetId === NO_ASSET) {
            setSelectedToken(undefined)
            return
        }
        if (selectedAssetId === PAGE_ASSET_NUM) {
            const pageAsset = assets.data?.pageAsset

            if (pageAsset) {
                GetAssetBalance.mutate(
                    {
                        code: pageAsset.code,
                        issuer: pageAsset.issuer,
                        creatorId: selectedCreator?.id ?? "",
                    },
                    {
                        onSuccess: (data) => {
                            setSelectedToken({
                                bal: data ?? 0,
                                code: pageAsset.code,
                                issuer: pageAsset.issuer,
                                id: PAGE_ASSET_NUM,
                                thumbnail: pageAsset.thumbnail ?? "",
                            })
                            setRemainingBalance(data)
                            setValue("token", PAGE_ASSET_NUM)
                        },
                    },
                )
            } else {
                toast.error("No page asset found")
            }
        }

        const selectedAsset = assets.data?.shopAsset.find((asset) => asset.id === selectedAssetId)
        if (selectedAsset) {
            GetAssetBalance.mutate(
                {
                    code: selectedAsset.code,
                    issuer: selectedAsset.issuer,
                    creatorId: selectedCreator?.id ?? "",
                },
                {
                    onSuccess: (data) => {
                        const bal = data ?? 0
                        setSelectedToken({ ...selectedAsset, bal: bal })
                        setRemainingBalance(bal)
                        setValue("token", selectedAsset.id)
                    },
                },
            )
        }
    }

    useEffect(() => {
        setRemainingBalance(0)
        setSelectedToken(undefined)
        if (selectedCreator) {
            setValue("creatorId", selectedCreator?.id)
        }
    }, [selectedCreator, setValue])

    useEffect(() => {
        if (isOpen && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0
        }
        if (duplicate) {
            if (prevData) {
                if (prevData.title) {
                    setValue("title", prevData.title)
                }
                if (prevData.description) {
                    setValue("description", prevData.description)
                }
                if (prevData.image) {
                    setCover(prevData.image)
                    setValue("image", prevData.image)
                }
                if (prevData.startDate) {
                    setValue("startDate", prevData.startDate)
                }
                if (prevData.endDate) {
                    setValue("endDate", prevData.endDate)
                }
                if (prevData.url) {
                    setValue("url", prevData.url)
                }
                if (prevData.autoCollect) {
                    setValue("autoCollect", prevData.autoCollect)
                }
                if (prevData.pinCollectionLimit) {
                    setValue("pinCollectionLimit", prevData.pinCollectionLimit)
                }
                if (prevData.token) {
                    handleTokenOptionChange({
                        target: { value: prevData.token.toString() },
                    } as ChangeEvent<HTMLSelectElement>)
                }

                if (prevData.tier) {
                    setValue("tier", prevData.tier)
                }
                if (prevData.image) {
                    setCover(prevData.image)
                }

                if (prevData.pinNumber) {
                    setValue("pinNumber", prevData.pinNumber)
                }
            }
        }

        if (position) {
            setValue("lat", position.lat)
            setValue("lng", position.lng)
        }
    }, [isOpen, duplicate, prevData, position, setValue])

    useEffect(() => {
        if (selectedToken && tokenAmount) {
            setRemainingBalance(selectedToken.bal - tokenAmount)
        }
    }, [tokenAmount, selectedToken])
    // Navigation functions
    const goToNextStep = () => {
        const currentIndex = FORM_STEPS.indexOf(activeStep)
        if (currentIndex < FORM_STEPS.length - 1) {
            const nextStep = FORM_STEPS[currentIndex + 1]
            if (nextStep) {
                setActiveStep(nextStep)
            }
        }
    }

    const goToPreviousStep = () => {
        const currentIndex = FORM_STEPS.indexOf(activeStep)
        if (currentIndex > 0) {
            const previousStep = FORM_STEPS[currentIndex - 1]
            if (previousStep) {
                setActiveStep(previousStep)
            }
        }
    }
    return (
        <>
            <AnimatePresence>
                <Dialog open={isOpen && !!selectedCreator} onOpenChange={setIsOpen}>
                    <DialogContent className="m-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto scrollbar-hide rounded-xl p-0">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col h-full"
                        >
                            <DialogHeader className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <MapPin className="h-5 w-5 " />
                                    Create Admin Pin
                                </DialogTitle>
                                <DialogDescription>Create manual and specific pin hot spot as admin</DialogDescription>
                            </DialogHeader>

                            {selectedCreator ? (
                                <>
                                    <div className="w-full px-6 pt-6">
                                        <div className="flex items-center justify-between">
                                            {FORM_STEPS.map((step, index) => (
                                                <div key={step} className="flex flex-col items-center">
                                                    <div
                                                        className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm mb-1 ",
                                                            activeStep === step ? "bg-primary  shadow-sm shadow-foreground" : "bg-muted text-muted-foreground",
                                                        )}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-xs",
                                                            activeStep === step ? " font-medium" : "text-muted-foreground",
                                                        )}
                                                    >
                                                        {step === "basic" ? "Basic Info" : step === "tokens" ? "Tokens & Tiers" : "Advanced"}
                                                    </span>
                                                </div>
                                            ))}

                                            <div className="absolute left-0 right-0 top-[6.5rem] px-6 z-0">
                                                <div className="h-[2px] bg-muted w-full relative">
                                                    <div
                                                        className="absolute h-full bg-destructive transition-all duration-300"
                                                        style={{
                                                            width: activeStep === "basic" ? "0%" : activeStep === "tokens" ? "50%" : "100%",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div ref={scrollContainerRef} className="flex-grow overflow-y-auto px-6 py-4">
                                        <FormProvider {...methods}>
                                            <form className="mt-2" onSubmit={handleSubmit(onSubmit)}>
                                                {activeStep === "basic" && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="space-y-4"
                                                    >
                                                        <ManualLatLanInputField />

                                                    <div className="space-y-2">
                                                        <Label htmlFor="title" className="text-sm font-medium">
                                                            Pin Title <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            id="title"
                                                            {...register("title")}
                                                            className="bg-input border-border focus:ring-ring"
                                                            placeholder="Enter a catchy title for your pin"
                                                        />
                                                        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
                                                    </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <ImageIcon className="h-4 w-4 " />
                                                                <Label className="text-sm font-medium">Pin Cover Image</Label>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <UploadS3Button
                                                                    endpoint="imageUploader"
                                                                    variant="button"
                                                                    onClientUploadComplete={(res) => {
                                                                        const data = res
                                                                        if (data?.url) {
                                                                            setCover(data.url)
                                                                            setValue("image", data.url)
                                                                        }
                                                                    }}
                                                                    onUploadError={(error: Error) => {
                                                                        toast.error(`ERROR! ${error.message}`)
                                                                    }}
                                                                />

                                                                <AnimatePresence>
                                                                    {coverUrl && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="mt-2 rounded-lg border p-2"
                                                                        >
                                                                            <Image
                                                                                className="rounded-md"
                                                                                width={120}
                                                                                height={120}
                                                                                alt="preview image"
                                                                                src={coverUrl || "/placeholder.svg"}
                                                                            />
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="url" className="text-sm font-medium">
                                                                URL / Link <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Input
                                                                id="url"
                                                                {...register("url")}
                                                                className="bg-input border-border focus:ring-ring"
                                                                placeholder="https://example.com"
                                                            />
                                                            {errors.url && <p className="text-destructive text-sm">{errors.url.message}</p>}
                                                        </div>
                                                    </div>

                                                    <ImageUploadField coverUrl={coverUrl} setCover={setCover} setValue={setValue} />


                                                </CardContent>
                                        </Card>

                                        <div className="flex flex-col gap-8">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-lg">
                                                        <Settings className="w-5 h-5 text-primary" />
                                                        Collection & Tier Settings
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex flex-col gap-2">
                                                    <TiersOptions creatorId={selectedCreator?.id ?? ""} />
                                                    <CollectionInputs

                                                        creatorId={selectedCreator?.id ?? ""}
                                                        setSelectedToken={setSelectedToken}
                                                        setRemainingBalance={setRemainingBalance}
                                                        assetsQuery={assetsQuery}

                                                        selectedToken={selectedToken}
                                                        remainingBalance={remainingBalance}
                                                    />
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-lg">
                                                        <Calendar className="w-5 h-5 text-primary" />
                                                        Schedule
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="startDate" className="text-sm font-medium">
                                                                Start Date <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Controller
                                                                name="startDate"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Input
                                                                        type="datetime-local"
                                                                        id="startDate"
                                                                        value={field.value ? formatDateForInput(new Date(field.value)) : formatDateForInput(today)}
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                            const v = e.target.value
                                                                            field.onChange(v ? new Date(v) : undefined)
                                                                        }}
                                                                        className="bg-input border-border focus:ring-ring"
                                                                    />
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="endDate" className="text-sm font-medium">
                                                                End Date <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Controller
                                                                name="endDate"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Input
                                                                        type="datetime-local"
                                                                        id="endDate"
                                                                        value={field.value ? formatDateForInput(new Date(field.value)) : formatDateForInput(tomorrow)}
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                            const v = e.target.value
                                                                            field.onChange(v ? new Date(v) : undefined)
                                                                        }}
                                                                        className="bg-input border-border focus:ring-ring "
                                                                    />
                                                                )}
                                                            />
                                                            {errors.endDate && <p className="text-destructive text-sm">{errors.endDate.message}</p>}

                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                    </div>

                                    {errors.pinCollectionLimit && (
                                        <p className="text-sm text-destructive">{errors.pinCollectionLimit.message}</p>
                                    )}
                                </motion.div>
                                                                )}
                        </AnimatePresence>
                    </div>
                </motion.div>
                                                )}


                {activeStep === "advanced" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 " />
                                <Label htmlFor="radius" className="text-sm font-medium">
                                    Radius (meters)
                                </Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="rounded-full bg-muted px-1 text-xs">?</div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs text-xs">
                                                Set the radius around the pin location where users can collect it
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Input
                                min={0}
                                type="number"
                                id="radius"
                                {...register("radius", { valueAsNumber: true })}
                            />
                            {errors.radius && <p className="text-sm text-destructive">{errors.radius.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 " />
                                <Label htmlFor="pinNumber" className="text-sm font-medium">
                                    Number of pins
                                </Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="rounded-full bg-muted px-1 text-xs">?</div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs text-xs">
                                                How many identical pins to create at this location
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Input
                                type="number"
                                min={1}
                                id="pinNumber"
                                {...register("pinNumber", { valueAsNumber: true })}
                            />
                            {errors.pinNumber && (
                                <p className="text-sm text-destructive">{errors.pinNumber.message}</p>
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-start space-x-2">
                                <Checkbox id="autoCollect" {...register("autoCollect")} />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor="autoCollect"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Auto Collect
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Automatically collect when in range</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2">
                                <Checkbox id="multiPin" {...register("multiPin")} />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor="multiPin"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Multi Pin
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Allow multiple collections</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}



                {addPinM.isError && (
                    <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
                        <p>{addPinM.failureReason?.message}</p>
                    </div>
                )}
            </form>
        </FormProvider >
                                    </div >
        <DialogFooter className="px-4 py-2 border-t-2 ">
            <div className="flex items-center justify-between w-full">
                <Button type="button" variant="outline" onClick={closePopup}>
                    Cancel
                </Button>

                <div className="flex items-center gap-2">
                    {activeStep !== "basic" && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={goToPreviousTab}
                            className="flex items-center gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                    )}

                    {activeStep !== "advanced" ? (
                        <Button type="button" onClick={goToNextTab}
                            variant='sidebar'
                            className="flex items-center gap-1">
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit(onSubmit)}
                            variant='sidebar'
                            disabled={addPinM.isLoading || remainingBalance < 0 || !isValid}
                            className="flex items-center gap-1 shadow-sm shadow-foreground"
                        >
                            {addPinM.isLoading ? (
                                <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Pin"
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </DialogFooter>
                                </>
                            ) : (
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-medium">No Creator Selected</h3>
                <p className="text-sm text-muted-foreground mt-1">Please select a creator before creating a pin</p>
            </div>
            <Button variant="outline" onClick={closePopup}>
                Close
            </Button>
        </div>
    )
}
                        </motion.div >
                    </DialogContent >
                </Dialog >
            </AnimatePresence >
        </>
    )
}

function CollectionInputs({
    creatorId,
    setSelectedToken,
    setRemainingBalance,
    assetsQuery,

    selectedToken,
    remainingBalance,
}: {
    creatorId: string
    setSelectedToken: (asset: (AssetType & { bal: number } | undefined)) => void
    setRemainingBalance: (balance: number) => void
    assetsQuery: {
        data: {
            pageAsset?: {
                code: string;
                creatorId: string;
                issuer: string;
                thumbnail: string | null;
            }
            shopAsset: AssetType[]
        } | null | undefined
    }

    selectedToken: (AssetType & { bal: number } | undefined)
    remainingBalance: number
}) {
    const { control, setValue, register, formState: { errors } } = useFormContext<z.infer<typeof createAdminPinFormSchema>>()
    const GetAssetBalance = api.fan.asset.getAssetBalance.useMutation()

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-sm font-medium">Choose Token</Label>
                <Controller
                    name="token"
                    control={control}
                    render={({ field }) => (
                        <Select
                            onValueChange={(value) => {
                                const selectedAssetId = Number(value)
                                field.onChange(selectedAssetId === NO_ASSET ? undefined : selectedAssetId)

                                if (selectedAssetId === NO_ASSET) {
                                    setSelectedToken(undefined)
                                    setRemainingBalance(0)
                                    return
                                }

                                if (selectedAssetId === PAGE_ASSET_NUM) {
                                    const pageAsset = assetsQuery.data?.pageAsset
                                    if (pageAsset) {
                                        GetAssetBalance.mutate(
                                            {
                                                code: pageAsset.code,
                                                issuer: pageAsset.issuer,
                                                creatorId: creatorId,
                                            },
                                            {
                                                onSuccess: (data) => {
                                                    setSelectedToken({
                                                        bal: data ?? 0,
                                                        code: pageAsset.code,
                                                        issuer: pageAsset.issuer,
                                                        id: PAGE_ASSET_NUM,
                                                        thumbnail: pageAsset.thumbnail ?? "",
                                                    })
                                                    setRemainingBalance(data)
                                                    setValue("token", PAGE_ASSET_NUM)
                                                },
                                            },
                                        )
                                    } else {
                                        toast.error("No page asset found")
                                    }
                                    return
                                }

                                const selectedAsset = assetsQuery.data?.shopAsset.find(
                                    (asset: AssetType) => asset.id === selectedAssetId,
                                )
                                if (selectedAsset) {
                                    GetAssetBalance.mutate(
                                        {
                                            code: selectedAsset.code,
                                            issuer: selectedAsset.issuer,
                                            creatorId: creatorId,
                                        },
                                        {
                                            onSuccess: (data) => {
                                                const bal = data ?? 0
                                                setSelectedToken({ ...selectedAsset, bal: bal })
                                                setRemainingBalance(bal)
                                                setValue("token", selectedAsset.id)
                                            },
                                        },
                                    )
                                }
                            }}
                            defaultValue={NO_ASSET.toString()}
                        >
                            <SelectTrigger className="bg-input border-border">
                                <SelectValue placeholder="Choose Token" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_ASSET.toString()}>Pin (No asset)</SelectItem>
                                {assetsQuery.data?.pageAsset && (
                                    <SelectItem value={PAGE_ASSET_NUM.toString()}>
                                        {assetsQuery.data.pageAsset.code} - Page Asset
                                    </SelectItem>
                                )}
                                {assetsQuery.data?.shopAsset?.map((asset: AssetType) => (
                                    <SelectItem key={asset.id} value={asset.id.toString()}>
                                        {asset.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="radius" className="text-sm font-medium">
                        Radius (meters) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        type="number"
                        id="radius"
                        min={0}
                        {...register("radius", { valueAsNumber: true })}
                        className="bg-input border-border focus:ring-ring"
                        placeholder="50"
                    />
                    {errors.radius && <p className="text-destructive text-sm">{errors.radius.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pinNumber" className="text-sm font-medium">
                        Number of Pins <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        type="number"
                        id="pinNumber"
                        min={1}
                        {...register("pinNumber", { valueAsNumber: true })}
                        className="bg-input border-border focus:ring-ring"
                        placeholder="1"
                    />
                    {errors.pinNumber && <p className="text-destructive text-sm">{errors.pinNumber.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="pinCollectionLimit" className="text-sm font-medium">
                    Pin Collection Limit <span className="text-destructive">*</span>
                </Label>
                <Input
                    type="number"
                    id="pinCollectionLimit"
                    min={0}
                    {...register("pinCollectionLimit", { valueAsNumber: true })}
                    className="bg-input border-border focus:ring-ring"
                    placeholder="Enter collection limit"
                />
                {selectedToken && (
                    <div className="text-xs space-y-1 p-2 bg-muted rounded">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Available Balance:</span>
                            <span className="font-medium">{selectedToken.bal}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining Balance:</span>
                            <span className={`font-medium ${remainingBalance < 0 ? "text-destructive" : "text-accent"}`}>
                                {remainingBalance}
                            </span>
                        </div>
                    </div>
                )}
                {selectedToken && remainingBalance < 0 && (
                    <p className="text-destructive text-sm">Insufficient token balance</p>
                )}
                {errors.pinCollectionLimit && <p className="text-destructive text-sm">{errors.pinCollectionLimit.message}</p>}
            </div>
        </div>
    )
}
interface ManualCoordinatesInputProps {
    manual: boolean
    position: { lat: number; lng: number } | undefined

}

function ManualCoordinatesInput({ manual, position }: ManualCoordinatesInputProps) {
    const { register, formState: { errors } } = useFormContext<z.infer<typeof createAdminPinFormSchema>>()
    if (manual) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 " />
                        <p className="font-medium">Pin Location</p>
                        <MapPin className="h-4 w-4 " />
                        <p className="font-medium">Pin Location</p>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm">
                        <p>
                            Latitude:{" "}
                            <Badge variant="outline" className="font-mono">
                                {position?.lat.toFixed(6)}
                            </Badge>
                        </p>
                        <p>
                            Longitude:{" "}
                            <Badge variant="outline" className="font-mono">
                                {position?.lng.toFixed(6)}
                            </Badge>
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-blue-50/50">
            <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Selected Location</span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Latitude:</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {position?.lat?.toFixed(6)}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Longitude:</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {position?.lng?.toFixed(6)}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">

                        <LocationAddressDisplay latitude={position?.lat ?? 0} longitude={position?.lng ?? 0} />

                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface ImageUploadFieldProps {
    coverUrl: string | undefined
    setCover: (url: string | undefined) => void
    setValue: (name: "image", value: string | undefined) => void
}

function ImageUploadField({ coverUrl, setCover, setValue }: ImageUploadFieldProps) {
    return (
        <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Pin Cover Image <span className="text-destructive">*</span></Label>
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                    <UploadS3Button
                        endpoint="imageUploader"
                        className="w-full"
                        onClientUploadComplete={(res) => {
                            const data = res
                            if (data?.url) {
                                setCover(data.url)
                                setValue("image", data.url)
                            }
                        }}
                        onUploadError={(error: Error) => {
                            console.error(`ERROR! ${error.message}`)
                        }}
                    />
                    {coverUrl && (
                        <div className="mt-6 flex justify-center">
                            <div className="relative group">
                                <Image
                                    className="rounded-xl shadow-lg transition-transform duration-200 group-hover:scale-105 border border-gray-200"
                                    width={200}
                                    height={200}
                                    alt="preview image"
                                    src={coverUrl ?? "/placeholder.svg"}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-200 flex items-center justify-center">
                                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                                        Preview
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}


function PinTypeToggles() {
    const { control } = useFormContext<CreateAdminPinType>()
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-700">Advanced Settings</h4>
            </div>

            <div className="space-y-3">


                <Card className="border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label htmlFor="multiPin" className="text-sm font-medium cursor-pointer text-gray-900">
                                    Multi Pin
                                </Label>
                                <p className="text-xs text-gray-500 mt-1">Allow multiple pins to be collected from this location</p>
                            </div>
                            <Controller
                                name="multiPin"
                                control={control} // Fixed to use control instead of register
                                render={({ field }) => <Switch id="multiPin" checked={field.value} onCheckedChange={field.onChange} />}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
function TiersOptions({ creatorId }: { creatorId: string }) {
    const tiersQuery = api.fan.member.getAllMembership.useQuery({
        creatorId: creatorId
    })
    const { control } = useFormContext<CreateAdminPinType>()
    if (tiersQuery.isLoading) return <div className="skeleton h-10 w-20"></div>;
    if (tiersQuery.data) {
        return (
            <div className="space-y-2">
                <Label className="text-sm font-medium">Choose Tier <span className="text-destructive">*</span></Label>
                <Controller
                    name="tier"
                    control={control}
                    render={({ field }) => (
                        <Select
                            onValueChange={(value) => {
                                field.onChange(value)
                            }}
                        >
                            <SelectTrigger className="bg-input border-border">
                                <SelectValue placeholder="Choose Tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="follower">Only Follower</SelectItem>
                                <SelectItem value="private">Only Members</SelectItem>
                                {tiersQuery.data.map((model) => (

                                    <SelectItem key={model.id} value={model.id.toString()}>
                                        {`${model.name} : ${model.price} ${model.creator.pageAsset?.code}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            // <div>
            //     <h4 className="text-sm font-semibold text-gray-700">Tier Settings</h4>
            //     <Controller
            //         name="tier"
            //         control={control}
            //         render={({ field }) => (
            //             <select {...field} className="select select-bordered ">
            //                 <option disabled>Choose Tier</option>
            //                 <option value="public">Public</option>
            //                 <option value="private">Only Followers</option>
            //                 {tiersQuery.data.map((model) => (
            //                     <option
            //                         key={model.id}
            //                         value={model.id}
            //                     >{`${model.name} : ${model.price} ${model.creator.pageAsset?.code}`}</option>
            //                 ))}
            //             </select>
            //         )}
            //     />
            // </div>
        );
    }
}
