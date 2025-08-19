"use client";

import type React from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Coins,
    ImageIcon,
    FileText,
    DollarSign,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Upload,
    Check,
    X,
    Calendar,
    Percent,
    CalendarClock,
    FileMusic,
    Info,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { clientsign } from "package/connect_wallet";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { z } from "zod";
import {
    PLATFORM_ASSET,
    PLATFORM_FEE,
    TrxBaseFeeInPlatformAsset,
} from "~/lib/stellar/constant";
import { AccountSchema, clientSelect } from "~/lib/stellar/fan/utils";
import { ipfsHashToPinataGatewayUrl } from "~/utils/ipfs";
import { Input } from "~/components/shadcn/ui/input";
import { Label } from "~/components/shadcn/ui/label";
import { Textarea } from "~/components/shadcn/ui/textarea";
import { api } from "~/utils/api";
import Image from "next/image";
import { Button } from "~/components/shadcn/ui/button";
import useNeedSign from "~/lib/hook";
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    CardContent,
    CardFooter,
    CardTitle,
} from "~/components/shadcn/ui/card";
import { Badge } from "~/components/shadcn/ui/badge";
import { Progress } from "~/components/shadcn/ui/progress";
import { Separator } from "~/components/shadcn/ui/separator";
import { useCreateRoyalityModalStore } from "../store/create-royality-modal";
import { UploadS3Button } from "../common/upload-button";
import {
    PaymentChoose,
    usePaymentMethodStore,
} from "../common/payment-options";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
} from "../shadcn/ui/dialog";
import { cn } from "~/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "~/components/shadcn/ui/tooltip";

export const RoyalityFormSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters"),
    description: z
        .string()
        .max(500, "Description must be less than 500 characters")
        .optional()
        .or(z.literal("")),
    coverImgUrl: z.string({
        required_error: "Cover image is required",
    }),
    sampleAudio: z.string().optional(),
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
});

type RoyalityFormType = z.infer<typeof RoyalityFormSchema>;

// Define the steps
type FormStep = "basics" | "media" | "dates" | "pricing" | "review";
const FORM_STEPS: FormStep[] = [
    "basics",
    "media",
    "dates",
    "pricing",
    "review",
];

export default function CreateRoyalityModal() {
    const [activeStep, setActiveStep] = useState<FormStep>("basics");
    const [formProgress, setFormProgress] = useState(20);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { albumId, isOpen, setIsOpen } = useCreateRoyalityModalStore();

    // Set default dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(tomorrow.getDate());
    oneMonthFromNow.setMonth(tomorrow.getMonth() + 1);

    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const methods = useForm<RoyalityFormType>({
        mode: "onChange",
        resolver: zodResolver(RoyalityFormSchema),
        defaultValues: {
            albumId,
            price: 2,
            priceUSD: 2,
            limit: 100,
            percentage: 10,
            endDate: oneMonthFromNow,
            releaseDate: threeMonthsFromNow,
            name: "",
            description: "",
            code: "",
        },
    });

    // Update progress based on active step
    useEffect(() => {
        const stepIndex = FORM_STEPS.indexOf(activeStep);
        setFormProgress((stepIndex + 1) * (100 / FORM_STEPS.length));
    }, [activeStep]);

    // Generate random asset code
    useEffect(() => {
        if (!methods.getValues("code") || methods.getValues("code") === "") {
            const randomCode = `ROY${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            methods.setValue("code", randomCode, { shouldValidate: true });
        }
    }, [methods]);

    // Navigation functions
    const goToNextStep = () => {
        const currentIndex = FORM_STEPS.indexOf(activeStep);
        if (currentIndex < FORM_STEPS.length - 1) {
            const nextStep = FORM_STEPS[currentIndex + 1];
            if (nextStep) {
                setActiveStep(nextStep);
            }
        }
    };

    const goToPreviousStep = () => {
        const currentIndex = FORM_STEPS.indexOf(activeStep);
        if (currentIndex > 0) {
            const previousStep = FORM_STEPS[currentIndex - 1];
            if (previousStep) {
                setActiveStep(previousStep);
            }
        }
    };

    // Check if current step is valid before allowing to proceed
    const canProceed = () => {
        const { trigger } = methods;

        // Define fields to validate for each step
        const fieldsToValidate: Record<FormStep, (keyof RoyalityFormType)[]> = {
            basics: ["name", "percentage"],
            media: ["coverImgUrl"],
            dates: ["endDate", "releaseDate"],
            pricing: ["code", "limit", "price", "priceUSD"],
            review: [],
        };

        // Trigger validation for the current step's fields
        const validateStep = async () => {
            const result = await trigger(fieldsToValidate[activeStep]);
            return result;
        };

        return validateStep();
    };

    const handleNext = async () => {
        const isValid = await canProceed();
        if (isValid) {
            goToNextStep();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setActiveStep("basics");
        methods.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl p-2"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-full flex-col"
                >
                    <DialogHeader className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Coins className="h-5 w-5" />
                            <CardTitle>Create Royalty Item</CardTitle>
                        </div>
                        <DialogDescription>
                            Create a new royalty investment opportunity
                        </DialogDescription>

                        <Progress value={formProgress} className="mt-2 h-2" />

                        <div className="w-full px-6">
                            <div className="flex items-center justify-between">
                                {FORM_STEPS.map((step, index) => (
                                    <div key={step} className="flex flex-col items-center">
                                        <div
                                            className={cn(
                                                "mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium",
                                                activeStep === step
                                                    ? "bg-primary shadow-sm shadow-foreground"
                                                    : "bg-muted text-muted-foreground",
                                            )}
                                        >
                                            {index + 1}
                                        </div>
                                        <span
                                            className={cn(
                                                "text-xs",
                                                activeStep === step
                                                    ? "font-medium"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            {step === "basics"
                                                ? "Basics"
                                                : step === "media"
                                                    ? "Media"
                                                    : step === "dates"
                                                        ? "Dates"
                                                        : step === "pricing"
                                                            ? "Pricing"
                                                            : "Review"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogHeader>

                    <FormProvider {...methods}>
                        <form>
                            <CardContent className="p-6">
                                <AnimatePresence mode="wait">
                                    {activeStep === "basics" && <BasicsStep key="basics" />}
                                    {activeStep === "media" && <MediaStep key="media" />}
                                    {activeStep === "dates" && <DatesStep key="dates" />}
                                    {activeStep === "pricing" && <PricingStep key="pricing" />}
                                    {activeStep === "review" && <ReviewStep key="review" />}
                                </AnimatePresence>
                            </CardContent>

                            <CardFooter className="flex justify-between border-t p-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={goToPreviousStep}
                                    disabled={activeStep === "basics" || isSubmitting}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>

                                {activeStep !== "review" ? (
                                    <Button
                                        type="button"
                                        className="shadow-foreground"
                                        onClick={handleNext}
                                    >
                                        Next
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <SubmitButton albumId={albumId} setIsOpen={setIsOpen} />
                                )}
                            </CardFooter>
                        </form>
                    </FormProvider>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}

function BasicsStep() {
    const {
        register,
        formState: { errors },
    } = useFormContext<RoyalityFormType>();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                <p className="text-sm text-muted-foreground">
                    Enter the basic details about your royalty item
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Royalty Item Name
                    </Label>
                    <Input
                        id="name"
                        {...register("name")}
                        placeholder="Enter royalty item name"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                    </Label>
                    <Textarea
                        id="description"
                        {...register("description")}
                        placeholder="Write a short description about this royalty item"
                        className="min-h-24 resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.description && (
                        <p className="text-sm text-destructive">
                            {errors.description.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="percentage" className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Royalty Percentage
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        The percentage of revenue that will be shared with token
                                        holders
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                            className="pr-8 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            %
                        </span>
                    </div>
                    {errors.percentage && (
                        <p className="text-sm text-destructive">
                            {errors.percentage.message}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function MediaStep() {
    const {
        setValue,
        watch,
        formState: { errors },
    } = useFormContext<RoyalityFormType>();

    const [file, setFile] = useState<File>();
    const [ipfs, setIpfs] = useState<string>();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const inputFile = useRef<HTMLInputElement>(null);

    const coverImgUrl = watch("coverImgUrl");
    const sampleAudio = watch("sampleAudio");

    const uploadFile = async (fileToUpload: File) => {
        try {
            setUploading(true);
            setUploadProgress(10);

            const formData = new FormData();
            formData.append("file", fileToUpload, fileToUpload.name);

            setUploadProgress(30);

            const res = await fetch("/api/file", {
                method: "POST",
                body: formData,
            });

            setUploadProgress(70);

            const ipfsHash = await res.text();
            const thumbnail = ipfsHashToPinataGatewayUrl(ipfsHash);

            setUploadProgress(90);

            setValue("coverImgUrl", thumbnail);
            setIpfs(ipfsHash);

            setUploadProgress(100);
            setUploading(false);

            toast.success("Cover image uploaded successfully");
        } catch (e) {
            console.error(e);
            setUploading(false);
            setUploadProgress(0);
            toast.error("Trouble uploading file");
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file) {
                if (file.size > 1024 * 1024) {
                    toast.error("File size should be less than 1MB");
                    return;
                }
                setFile(file);
                await uploadFile(file);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">Media Files</h2>
                <p className="text-sm text-muted-foreground">
                    Upload your cover image and optional demo audio
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <Label htmlFor="coverImg" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Cover Image
                    </Label>
                    <AnimatePresence>
                        {!coverImgUrl ? (
                            <Button
                                type="button"
                                variant="outline"
                                id="coverImg"
                                onClick={() => inputFile.current?.click()}
                                className="relative flex h-32 w-full flex-col items-center justify-center gap-2 border-dashed"
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span className="text-sm">
                                            Uploading... {uploadProgress}%
                                        </span>
                                        <Progress value={uploadProgress} className="w-4/5" />
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Click to upload cover image
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            JPG, PNG (max 1MB)
                                        </span>
                                    </>
                                )}
                            </Button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="relative aspect-square overflow-hidden rounded-md border"
                            >
                                <Image
                                    fill
                                    alt="Cover preview"
                                    src={coverImgUrl || "/placeholder.svg"}
                                    className="object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1">
                                    <Badge
                                        variant="outline"
                                        className="bg-green-100 text-green-800"
                                    >
                                        <Check className="mr-1 h-3 w-3" /> Uploaded
                                    </Badge>
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute right-1 top-1 h-6 w-6"
                                    onClick={() => {
                                        setValue("coverImgUrl", "");
                                        setIpfs(undefined);
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Input
                        id="coverImg"
                        ref={inputFile}
                        type="file"
                        accept=".jpg, .png"
                        onChange={handleChange}
                        className="hidden"
                    />
                    {errors.coverImgUrl && (
                        <p className="text-sm text-destructive">
                            {errors.coverImgUrl.message}
                        </p>
                    )}
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label htmlFor="musicFile" className="flex items-center gap-2">
                        <FileMusic className="h-4 w-4" />
                        Demo Audio (Optional)
                    </Label>

                    <UploadS3Button
                        endpoint="musicUploader"
                        variant="button"
                        className="w-full"
                        label="Upload Demo Audio"
                        onClientUploadComplete={(res) => {
                            if (res?.url) {
                                setValue("sampleAudio", res.url);
                                toast.success("Demo audio uploaded successfully");
                            }
                        }}
                        onUploadError={(error: Error) => {
                            toast.error(`ERROR! ${error.message}`);
                        }}
                    />

                    <AnimatePresence>
                        {sampleAudio && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.3 }}
                                className="mt-2"
                            >
                                <Card className="overflow-hidden">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-primary/10 p-3">
                                                <FileMusic className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">
                                                    Demo audio uploaded
                                                </p>
                                                <audio controls className="mt-2 w-full">
                                                    <source src={sampleAudio} type="audio/mpeg" />
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

function DatesStep() {
    const {
        setValue,
        getValues,
        formState: { errors },
    } = useFormContext<RoyalityFormType>();

    // Format date to YYYY-MM-DD string for HTML date inputs
    const formatDateForInput = (date: Date | null) => {
        if (!date) return "";
        return date.toISOString().split("T")[0];
    };

    // Set minimum date for end date and release date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = formatDateForInput(tomorrow);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">Important Dates</h2>
                <p className="text-sm text-muted-foreground">
                    Set funding and release dates for your royalty item
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="endDate" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Funding End Date
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        The date when funding for this royalty item will end
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </Label>
                    <Input
                        id="endDate"
                        type="date"
                        min={minDate}
                        value={formatDateForInput(getValues("endDate"))}
                        onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            if (date) {
                                setValue("endDate", date, { shouldValidate: true });
                            }
                        }}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.endDate && (
                        <p className="text-sm text-destructive">{errors.endDate.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="releaseDate" className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        Content Release Date
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        The expected date when the content will be released
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </Label>
                    <Input
                        id="releaseDate"
                        type="date"
                        min={minDate}
                        value={formatDateForInput(getValues("releaseDate"))}
                        onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            if (date) {
                                setValue("releaseDate", date, { shouldValidate: true });
                            }
                        }}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.releaseDate && (
                        <p className="text-sm text-destructive">
                            {errors.releaseDate.message}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function PricingStep() {
    const {
        register,

        formState: { errors },
    } = useFormContext<RoyalityFormType>();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">Pricing & Asset Details</h2>
                <p className="text-sm text-muted-foreground">Set up your royalty item{"'"}s pricing and asset information</p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="code" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Asset Name
                        </Label>
                        <Input
                            id="code"
                            {...register("code")}
                            placeholder="Enter asset name (4-12 chars)"
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        {errors.code && (
                            <p className="text-sm text-destructive">{errors.code.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="limit" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Token Limit
                        </Label>
                        <Input
                            id="limit"
                            type="number"
                            {...register("limit", { valueAsNumber: true })}
                            placeholder="Enter token limit"
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        {errors.limit && (
                            <p className="text-sm text-destructive">{errors.limit.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Maximum number of royalty tokens
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="price" className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            Price in {PLATFORM_ASSET.code}
                        </Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.1"
                            {...register("price", { valueAsNumber: true })}
                            placeholder={`Enter price in ${PLATFORM_ASSET.code}`}
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        {errors.price && (
                            <p className="text-sm text-destructive">{errors.price.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priceUSD" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Price in USD
                        </Label>
                        <Input
                            id="priceUSD"
                            type="number"
                            step="0.1"
                            {...register("priceUSD", { valueAsNumber: true })}
                            placeholder="Enter price in USD"
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        {errors.priceUSD && (
                            <p className="text-sm text-destructive">
                                {errors.priceUSD.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function ReviewStep() {
    const { watch } = useFormContext<RoyalityFormType>();

    const name = watch("name");
    const description = watch("description");
    const coverImgUrl = watch("coverImgUrl");
    const sampleAudio = watch("sampleAudio");
    const code = watch("code");
    const limit = watch("limit");
    const price = watch("price");
    const priceUSD = watch("priceUSD");
    const percentage = watch("percentage");
    const endDate = watch("endDate");
    const releaseDate = watch("releaseDate");

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">Review Your Royalty Item</h2>
                <p className="text-sm text-muted-foreground">
                    Please review all information before submitting
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="relative aspect-square overflow-hidden rounded-md border">
                        <Image
                            fill
                            alt="Cover preview"
                            src={coverImgUrl || "/placeholder.svg"}
                            className="object-cover"
                        />
                    </div>

                    {sampleAudio && (
                        <audio controls className="w-full">
                            <source src={sampleAudio} type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">{name}</h3>
                        <p className="text-muted-foreground">{description}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-sm font-medium">Royalty Percentage</p>
                            <p className="text-sm text-muted-foreground">{percentage}%</p>
                        </div>

                        <div>
                            <p className="text-sm font-medium">Asset Name</p>
                            <p className="text-sm text-muted-foreground">{code}</p>
                        </div>

                        <div>
                            <p className="text-sm font-medium">Token Limit</p>
                            <p className="text-sm text-muted-foreground">{limit}</p>
                        </div>

                        <div>
                            <p className="text-sm font-medium">
                                Price ({PLATFORM_ASSET.code})
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {price} {PLATFORM_ASSET.code}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium">Price (USD)</p>
                            <p className="text-sm text-muted-foreground">${priceUSD}</p>
                        </div>

                        <div>
                            <p className="text-sm font-medium">Funding End</p>
                            <p className="text-sm text-muted-foreground">
                                {endDate?.toLocaleDateString()}
                            </p>
                        </div>

                        <div className="col-span-2">
                            <p className="text-sm font-medium">Release Date</p>
                            <p className="text-sm text-muted-foreground">
                                {releaseDate?.toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function SubmitButton({
    albumId,
    setIsOpen,
}: {
    albumId: number | undefined;
    setIsOpen: (isOpen: boolean) => void;
}) {
    const {
        reset,
        getValues,
        setValue,
        handleSubmit: formHandleSubmit,
    } = useFormContext<RoyalityFormType>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const session = useSession();
    const { platformAssetBalance } = useUserStellarAcc();
    const { needSign } = useNeedSign();
    const { paymentMethod, setIsOpen: setPaymentModalOpen } =
        usePaymentMethodStore();

    const requiredToken = api.fan.trx.getRequiredPlatformAsset.useQuery(
        {
            xlm: 2,
        },
        {
            enabled: !!albumId,
        },
    );

    const totalFeees = Number(TrxBaseFeeInPlatformAsset) + Number(PLATFORM_FEE);

    const addRoyality = api.fan.music.createRoyalityItem.useMutation({
        onSuccess: () => {
            toast.success("Royalty item created successfully!");
            setIsSubmitting(false);
            setIsOpen(false);
            setPaymentModalOpen(false);
            reset();

        },
        onError: (error) => {
            toast.error(error.message || "Failed to create royalty item");
            setIsSubmitting(false);
        },
    });

    const xdrMutation = api.fan.trx.createUniAssetTrx.useMutation({
        onSuccess(data, variables, context) {
            const { issuer, xdr } = data;
            setValue("issuer", issuer);

            setIsSubmitting(true);

            toast.promise(
                clientsign({
                    presignedxdr: xdr,
                    pubkey: session.data?.user.id,
                    walletType: session.data?.user.walletType,
                    test: clientSelect(),
                })
                    .then((res) => {
                        if (res) {
                            if (!albumId) {
                                toast.error("Please select an album");
                                setIsSubmitting(false);
                            } else {
                                const data = getValues();
                                addRoyality.mutate({ ...data, albumId: Number(albumId) });
                            }
                        } else {
                            toast.error("Transaction Failed");
                            setIsSubmitting(false);
                        }
                    })
                    .catch((e) => {
                        console.error(e);
                        setIsSubmitting(false);
                    }),
                {
                    loading: "Signing Transaction...",
                    success: "Transaction Signed",
                    error: "Signing Transaction Failed",
                },
            );
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create transaction");
            setIsSubmitting(false);
        },
    });

    // This is the function that will be called by PaymentChoose
    const onSubmit = (data: RoyalityFormType) => {
        const coverImg = data.coverImgUrl;
        if (!coverImg) {
            toast.error("Please upload a cover image");
            return;
        }

        setIsSubmitting(true);

        xdrMutation.mutate({
            code: data.code,
            limit: data.limit,
            signWith: needSign(),
            ipfsHash: coverImg,
            native: paymentMethod === "xlm",
        });
    };

    // Create the handleConfirm function that uses react-hook-form's handleSubmit
    const handleConfirm = () => {
        console.log("Submitting royalty item creation");
        onSubmit(getValues());
    };

    if (requiredToken.isLoading) {
        return (
            <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
            </Button>
        );
    }

    const requiredTokenAmount = requiredToken.data ?? 0;
    const insufficientBalance = requiredTokenAmount > platformAssetBalance;

    return (
        <PaymentChoose
            costBreakdown={[
                {
                    label: "Cost",
                    amount:
                        paymentMethod === "asset" ? requiredTokenAmount - totalFeees : 2,
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
            handleConfirm={handleConfirm}
            loading={isSubmitting}
            requiredToken={requiredTokenAmount}
            trigger={
                <Button
                    variant="sidebarAccent"
                    disabled={isSubmitting || insufficientBalance}
                    className="flex items-center gap-2 shadow-sm shadow-black transition-shadow duration-200 hover:shadow-xl"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating Royalty Item...
                        </>
                    ) : (
                        <>
                            <Coins className="h-4 w-4" />
                            Create Royalty Item
                        </>
                    )}
                </Button>
            }
        />
    );
}
