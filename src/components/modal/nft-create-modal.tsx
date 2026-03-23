"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MediaType } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  Upload,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Music,
  Video,
  ImageIcon,
  CuboidIcon as Cube,
  ArrowRight,
  DollarSign,
  Coins,
  PlusCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { clientsign } from "package/connect_wallet";
import { WalletType } from "package/connect_wallet/src/lib/enums";
import { type ChangeEvent, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "~/components/shadcn/ui/dialog";
import useNeedSign from "~/lib/hook";
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import {
  PLATFORM_ASSET,
  PLATFORM_FEE,
  PLATFORM_FEE_IN_XLM,
  SIMPLIFIED_FEE_IN_XLM,
  TrxBaseFeeInPlatformAsset,
  trxBaseFeeInXLM,
} from "~/lib/stellar/constant";
import { AccountSchema, clientSelect } from "~/lib/stellar/fan/utils";
import { api } from "~/utils/api";
import { BADWORDS } from "~/utils/banned-word";

import * as React from "react";

import { Button } from "../shadcn/ui/button";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/shadcn/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/shadcn/ui/tooltip";
import { ipfsHashToPinataGatewayUrl } from "~/utils/ipfs";

import { Label } from "../shadcn/ui/label";
import { Input } from "../shadcn/ui/input";
import { Textarea } from "../shadcn/ui/textarea";
import { Card, CardContent } from "../shadcn/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/ui/tabs";
import { Badge } from "../shadcn/ui/badge";
import { Separator } from "../shadcn/ui/separator";
import {
  PaymentChoose,
  usePaymentMethodStore,
} from "../common/payment-options";
import { UploadS3Button } from "../common/upload-button";
import { Alert, AlertDescription } from "../shadcn/ui/alert";
import RechargeLink from "../payment/recharge-link";
import { useNFTCreateModalStore } from "../store/nft-create-modal-store";
import { cn } from "~/lib/utils";
import { Progress } from "../shadcn/ui/progress";
import { calculatePlatformAssetNFTRequirements, calculateXLMNFTRequirements } from "~/lib/stellar/nft/nft-payment-handler";

export const ExtraSongInfo = z.object({
  artist: z.string(),
  albumId: z.number(),
});

const FORM_STEPS = ["details", "media", "pricing"];
export const NftFormSchema = z.object({
  name: z.string().refine(
    (value) => {
      return !BADWORDS.some((word) => value.includes(word));
    },
    {
      message: "Input contains banned words.",
    },
  ),
  description: z.string(),
  mediaUrl: z.string({
    message: "Media is required",
    required_error: "Media is required",
  }),
  coverImgUrl: z.string().min(1, { message: "Thumbnail is required" }),
  mediaType: z.nativeEnum(MediaType),
  price: z
    .number({
      required_error: "Price must be entered as a number",
      invalid_type_error: "Price must be entered as a number",
    })
    .nonnegative()
    .default(2),
  priceUSD: z
    .number({
      required_error: "Limit must be entered as a number",
      invalid_type_error: "Limit must be entered as a number",
    })
    .nonnegative()
    .default(1),
  limit: z
    .number({
      required_error: "Limit must be entered as a number",
      invalid_type_error: "Limit must be entered as a number",
    })
    .nonnegative(),
  code: z
    .string()
    .min(4, { message: "Asset code must be at least 4 characters long" })
    .regex(/^[a-zA-Z0-9]{1,12}$/, {
      message: "Asset code must be 4-12 alphanumeric characters",
    }),
  issuer: AccountSchema.optional(),
  songInfo: ExtraSongInfo.optional(),
  isAdmin: z.boolean().optional(),
  tier: z.string().optional(),
});

export default function NftCreateModal() {
  // cost in xlm
  const requiredXlm = 2;
  const feeInXLM = SIMPLIFIED_FEE_IN_XLM; //Number(trxBaseFeeInXLM) + Number(PLATFORM_FEE_IN_XLM);
  const totalXlmCost = requiredXlm + feeInXLM;

  const { isOpen: isNFTModalOpen, setIsOpen: setNFTModalOpen } =
    useNFTCreateModalStore();

  const requiredToken = api.fan.trx.getRequiredPlatformAsset.useQuery({
    xlm: requiredXlm,
  });

  const session = useSession();
  const { platformAssetBalance } = useUserStellarAcc();
  const [isOpen, setIsOpen] = useState(false);
  const [parentIsOpen, setParentIsOpen] = useState(false);
  // pinta upload
  const [file, setFile] = useState<File>();
  const [ipfs, setCid] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [mediaUpload, setMediaUpload] = useState(false);
  const inputFile = useRef(null);

  // tier options
  const [tier, setTier] = useState<string>();

  // other
  const modalRef = useRef<HTMLDialogElement>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [mediaUploadSuccess, setMediaUploadSuccess] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.IMAGE);
  const [activeStep, setActiveStep] = useState<string>("details");
  const [formProgress, setFormProgress] = useState(25);
  const [assetCodeError, setAssetCodeError] = useState<string>("");
  const [isAvailableCode, setIsAvailableCode] = useState<boolean>(false)
  const [mediaUrl, setMediaUrl] = useState<string>();
  const [coverUrl, setCover] = useState<string>();
  const { needSign } = useNeedSign();

  // Payment validation states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [validationInProgress, setValidationInProgress] = useState(false);
  const [paymentValidationResult, setPaymentValidationResult] = useState<{
    canProceed: boolean;
    message: string;
    requiresConversion?: boolean;
  } | null>(null);
  const [conversionInfo, setConversionInfo] = useState<{
    isConverting: boolean;
    fromAsset: string;
    toAsset: string;
    fromAmount: number;
    toAmount: number;
    trustlineCost?: number;
    canProceed: boolean;
    message: string;
  } | undefined>(undefined);

  const walletType = session.data?.user.walletType ?? WalletType.none;

  // Wait for the required token data to be loaded
  const requiredTokenAmount = requiredToken.data ?? 0;
  const totalFees = Number(TrxBaseFeeInPlatformAsset) + Number(PLATFORM_FEE);

  const totalCostInPlatform = requiredTokenAmount + totalFees;
  const { paymentMethod, setIsOpen: setPaymentModalOpen } =
    usePaymentMethodStore();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isValid },
    control,
    trigger,
    watch,

  } = useForm<z.infer<typeof NftFormSchema>>({
    resolver: zodResolver(NftFormSchema),
    mode: "onChange",
    defaultValues: {
      limit: 1,
      mediaType: MediaType.IMAGE,
      price: 2,
      priceUSD: 1,
    },
  });

  const tiers = api.fan.member.getAllMembership.useQuery({});
  const assetCodeValue = watch("code");

  const checkAssetCode = api.fan.trx.checkAssetCodeAvailability.useMutation({
    onSuccess: (data) => {
      if (!data.available) {
        setIsAvailableCode(false);
        setAssetCodeError("Asset code already exists, please choose another one");

      }
      else {
        setIsAvailableCode(true);
        setAssetCodeError("");
      }

    }
  },
  );

  const addAsset = api.fan.asset.createAsset.useMutation({
    onSuccess: () => {
      toast.success("NFT Created", {
        position: "top-center",
        duration: 4000,
      });
      setParentIsOpen(false);
      setPaymentModalOpen(false);
      setIsOpen(false);
      setMediaUploadSuccess(false);
      setMediaUrl(undefined);
      setCover(undefined);
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const xdrMutation = api.fan.trx.createUniAssetTrx.useMutation({
    onSuccess(data, variables, context) {
      const { issuer, xdr } = data;
      setValue("issuer", issuer);

      setSubmitLoading(true);

      toast.promise(
        clientsign({
          presignedxdr: xdr,
          pubkey: session.data?.user.id,
          walletType,
          test: clientSelect(),
        })
          .then((res) => {
            if (res) {
              setValue("tier", tier);
              const data = getValues();

              addAsset.mutate({ ...data });
            } else {
              toast.error("Transaction Failed");
            }
          })
          .catch((e) => console.log(e))
          .finally(() => setSubmitLoading(false)),
        {
          loading: "Signing Transaction",
          success: "",
          error: "Signing Transaction Failed",
        },
      );
    },
  });

  /**
   * Validate payment method and balances before creating NFT
   */
  const validatePaymentMethod = async (): Promise<boolean> => {
    try {
      setValidationInProgress(true);
      setShowAlert(false);
      setConversionInfo(undefined);

      const userPubKey = session.data?.user.id;

      if (!userPubKey) {
        setAlertMessage("User not authenticated");
        setShowAlert(true);
        setValidationInProgress(false);
        return false;
      }

      let requirementResult:
        | Awaited<ReturnType<typeof calculatePlatformAssetNFTRequirements>>
        | Awaited<ReturnType<typeof calculateXLMNFTRequirements>>
        | null = null;

      if (paymentMethod === "asset") {
        // PLATFORM asset payment validation
        requirementResult = await calculatePlatformAssetNFTRequirements(
          userPubKey,
          totalCostInPlatform
        );
      } else if (paymentMethod === "xlm") {
        // XLM payment validation
        requirementResult = await calculateXLMNFTRequirements(
          userPubKey,
          totalXlmCost
        );
      }

      setValidationInProgress(false);

      // Check if payment can proceed based on requirements
      if (!requirementResult || !requirementResult.canProceed) {
        setShowAlert(true);
        setAlertMessage(requirementResult?.message ?? "Validation failed");
        return false;
      }

      // If conversion is required, extract and set conversion details
      if (requirementResult && requirementResult.requiresConversion) {
        let conversionDetails;

        if (
          paymentMethod === "asset" &&
          "xlmForConversion" in requirementResult
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assetResult = requirementResult;
          conversionDetails = {
            isConverting: true,
            fromAsset: "XLM",
            toAsset: PLATFORM_ASSET.code,
            fromAmount: assetResult.xlmForConversion || 0,
            toAmount: requiredTokenAmount,
            trustlineCost: assetResult.platformTrustReserve || 0,
            canProceed: requirementResult.canProceed,
            message: requirementResult.message,
          };
        } else if (paymentMethod === "xlm" && "platformForConversion" in requirementResult) {
          // XLM payment - conversion is PLATFORM to XLM
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const xlmResult = requirementResult;
          conversionDetails = {
            isConverting: true,
            fromAsset: PLATFORM_ASSET.code,
            toAsset: "XLM",
            fromAmount: xlmResult.platformForConversion || 0,
            toAmount: totalXlmCost,
            canProceed: requirementResult.canProceed,
            message: requirementResult.message,
          };
        }

        if (conversionDetails) {
          setConversionInfo(conversionDetails);
        }
      }

      // All checks passed - allow to proceed
      return true;
    } catch (error) {
      console.error("Payment validation error:", error);
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Error validating payment method"
      );
      setShowAlert(true);
      setValidationInProgress(false);
      return false;
    }
  };

  const onSubmit = () => {
    console.log("vlaues", getValues());
    if (ipfs) {
      xdrMutation.mutate({
        code: getValues("code"),
        limit: getValues("limit"),
        signWith: needSign(),
        ipfsHash: ipfs,
        native: paymentMethod === "xlm",
      });
    } else {
      toast.error("Please upload a thumbnail image.");
    }
  };

  function getEndpoint(mediaType: MediaType) {
    switch (mediaType) {
      case MediaType.IMAGE:
        return "imageUploader";
      case MediaType.MUSIC:
        return "musicUploader";
      case MediaType.VIDEO:
        return "videoUploader";
      case MediaType.THREE_D:
        return "modelUploader";
      default:
        return "imageUploader";
    }
  }

  function handleMediaChange(media: MediaType) {
    setMediaType(media);
    setValue("mediaType", media);
    setMediaUrl(undefined);
  }

  const uploadFile = async (fileToUpload: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", fileToUpload, fileToUpload.name);
      const res = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });
      const ipfsHash = await res.text();
      const thumbnail = ipfsHashToPinataGatewayUrl(ipfsHash);
      setCover(thumbnail);
      setValue("coverImgUrl", thumbnail);
      setCid(ipfsHash);
      toast.success("Thumbnail uploaded successfully");
      await trigger();

      setUploading(false);
    } catch (e) {
      setUploading(false);
      toast.error("Failed to upload file");
    }
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files) {
      if (files.length > 0) {
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
    }
  };

  const loading =
    xdrMutation.isLoading ??
    addAsset.isLoading ??
    submitLoading ??
    requiredToken.isLoading;

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case MediaType.IMAGE:
        return <ImageIcon className="h-4 w-4" />;
      case MediaType.MUSIC:
        return <Music className="h-4 w-4" />;
      case MediaType.VIDEO:
        return <Video className="h-4 w-4" />;
      case MediaType.THREE_D:
        return <Cube className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const nextStep = () => {
    const currentIndex = FORM_STEPS.indexOf(activeStep);
    if (currentIndex < FORM_STEPS.length - 1) {
      if (activeStep === "details") {
        console.log("isabailable", isAvailableCode);
        if (errors.code ?? (assetCodeError || isAvailableCode === false)) {
          toast.error(errors.code?.message ?? (assetCodeError || "Asset code is not available"));
          return;
        }
      }
      const nextStep = FORM_STEPS[currentIndex + 1];
      if (nextStep) {
        setActiveStep(nextStep);
      }
    }
  };

  const prevStep = () => {
    const currentIndex = FORM_STEPS.indexOf(activeStep);
    if (currentIndex > 0) {
      const previousStep = FORM_STEPS[currentIndex - 1];
      if (previousStep) {
        setActiveStep(previousStep);
      }
    }
  };

  // Update progress based on active step
  React.useEffect(() => {
    const stepIndex = FORM_STEPS.indexOf(activeStep);
    setFormProgress((stepIndex + 1) * (100 / FORM_STEPS.length));
  }, [activeStep]);
  // Check asset code availability
  React.useEffect(() => {
    const codeRegex = /^[a-zA-Z0-9]{1,12}$/;

    const timer = setTimeout(() => {
      if (assetCodeValue && codeRegex.test(assetCodeValue)) {
        checkAssetCode.mutate({ code: assetCodeValue });
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [assetCodeValue]);

  const handleClose = () => {
    setActiveStep("details");
    setNFTModalOpen(false);
    setMediaUploadSuccess(false);
    setMediaUrl(undefined);
    setCover(undefined);
    reset();
  };

  return (
    <Dialog open={isNFTModalOpen} onOpenChange={handleClose}>

      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        showCloseButton
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl p-0"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="flex h-full flex-col"
        >
          <DialogHeader className=" px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              Create Store Item
            </DialogTitle>
            <DialogDescription>
              Create you nft and place it to marketplace.
            </DialogDescription>
            <Progress value={formProgress} className="mt-2 h-2" />

            <div className="w-full px-6 ">
              <div className="flex items-center justify-between">
                {FORM_STEPS.map((step, index) => (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ",
                        activeStep === step
                          ? "bg-primary  shadow-sm shadow-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        activeStep === step
                          ? " font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {step === "media"
                        ? "Media Info"
                        : step === "details"
                          ? "Asset Info"
                          : "Price & Payment"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-4">
            <form
              id="nft-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >

              {activeStep === "details" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Item name</Label>
                        <Input
                          id="name"
                          {...register("name")}
                          placeholder="Enter a name for your item"
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          {...register("description")}
                          placeholder="Describe your NFT"
                          className="min-h-24 resize-none"
                        />
                        {errors.description && (
                          <p className="text-sm text-destructive">
                            {errors.description.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="code">Asset Code</Label>
                        <Input
                          id="code"
                          {...register("code")}
                          placeholder="Enter asset code (4-12 characters)"
                        />
                        {errors.code && (
                          <p className="text-sm text-destructive">
                            {errors.code.message}
                          </p>
                        )}
                        {assetCodeValue?.length > 0 && (
                          <span className={`text-xs mt-1 ${isAvailableCode ? "text-green-600" : "text-red-600"}`}>
                            {isAvailableCode ? "✓ Available" : "✗ Not Available"}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="limit">Supply Limit</Label>
                        <Input
                          id="limit"
                          type="number"
                          {...register("limit", { valueAsNumber: true })}
                          placeholder="Enter supply limit (default: 1)"
                        />
                        {errors.limit && (
                          <p className="text-sm text-destructive">
                            {errors.limit.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          This determines how many copies of this Item can exist
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              {activeStep === "media" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm font-medium">
                            Media Type
                          </Label>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.values(MediaType).map((media, i) => (
                              <Button
                                key={i}
                                type="button"
                                variant={
                                  media === mediaType ? "destructive" : "muted"
                                }
                                onClick={() => handleMediaChange(media)}
                                className={`flex items-center gap-2 ${media === mediaType ? "shadow-sm shadow-foreground" : ""} `}
                              >
                                {getMediaIcon(media)}
                                <span>
                                  {media === MediaType.THREE_D ? "3D" : media}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {tiers.data && (
                          <div>
                            <Label className="mb-2 block text-sm font-medium">
                              Access Tier
                            </Label>
                            <TiersOptions
                              handleTierChange={(value: string) => {
                                setTier(value);
                              }}
                              tiers={tiers.data}
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            Thumbnail Image
                            <span className="text-xs text-muted-foreground">
                              (This will be your NFT image and item Thumbnail)
                            </span>
                          </Label>
                          <AnimatePresence>
                            {!coverUrl ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  document.getElementById("coverImg")?.click()
                                }
                                className="relative flex h-36 w-full  flex-col items-center justify-center gap-2 border-dashed"
                              >
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Upload Thumbnail
                                </span>
                                {uploading && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                    <Loader2 className="h-6 w-6 animate-spin " />
                                  </div>
                                )}
                              </Button>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative h-36 overflow-hidden rounded-md"
                              >
                                <Image
                                  fill
                                  alt="preview image"
                                  src={coverUrl ?? "/placeholder.svg"}
                                  className="object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute right-1 top-1 h-6 w-6"
                                  onClick={() => {
                                    setCover(undefined);
                                    setValue("coverImgUrl", "");
                                    setCid(undefined);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1">
                                  <Badge
                                    variant="outline"
                                    className="bg-green-100 text-green-800"
                                  >
                                    <Check className="mr-1 h-3 w-3" /> Uploaded
                                  </Badge>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <Input
                            id="coverImg"
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

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Locked Content
                          </Label>
                          <div className="flex flex-col gap-2">
                            <UploadS3Button
                              endpoint={getEndpoint(mediaType)}
                              variant="button"
                              label={`UPLOAD ${mediaType !== "THREE_D" ? mediaType : "3D"} CONTENT`}
                              className="w-full"
                              onClientUploadComplete={(res) => {
                                const data = res;
                                if (data?.url) {
                                  setMediaUrl(data.url);
                                  setValue("mediaUrl", data.url);
                                  setMediaUpload(false);
                                  setMediaUploadSuccess(true);
                                  trigger("mediaUrl")
                                }
                              }}
                              onUploadError={(error: Error) => {
                                toast.error(`ERROR! ${error.message}`);
                              }}
                            />

                            {mediaType === "THREE_D" && (
                              <Alert variant="info">
                                <AlertDescription>
                                  <p className="text-center text-xs text-muted-foreground">
                                    Only .obj files are accepted
                                  </p>
                                </AlertDescription>
                              </Alert>
                            )}

                            <AnimatePresence>
                              {mediaUrl && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-2"
                                >
                                  <Card className="overflow-hidden">
                                    <CardContent className="p-3">
                                      <PlayableMedia
                                        mediaType={mediaType}
                                        mediaUrl={mediaUrl}
                                      />
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {errors.mediaUrl && (
                              <p className="text-sm text-destructive">
                                {errors.mediaUrl.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeStep === "pricing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="priceUSD"
                          className="flex items-center gap-2"
                        >
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Price in USD
                        </Label>
                        <Input
                          id="priceUSD"
                          type="number"
                          {...register("priceUSD", { valueAsNumber: true })}
                          placeholder="Enter price in USD"
                        />
                        {errors.priceUSD && (
                          <p className="text-sm text-destructive">
                            {errors.priceUSD.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="price"
                          className="flex items-center gap-2"
                        >
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          Price in {PLATFORM_ASSET.code}
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          {...register("price", { valueAsNumber: true })}
                          placeholder={`Enter price in ${PLATFORM_ASSET.code}`}
                        />
                        {errors.price && (
                          <p className="text-sm text-destructive">
                            {errors.price.message}
                          </p>
                        )}
                      </div>



                      {showAlert && (
                        <Alert variant={paymentValidationResult?.canProceed === false ? "destructive" : "default"}>
                          <AlertDescription>
                            {alertMessage}
                          </AlertDescription>
                        </Alert>
                      )}


                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </form>
          </div>

          <DialogFooter className="border-t px-6 py-4 ">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={activeStep === "details"}
                className="flex items-center gap-1"
              >
                Previous
              </Button>

              {activeStep !== "pricing" ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    (activeStep === "details" && (!!errors.code || !!assetCodeError || isAvailableCode === false)) ||
                    (activeStep === "media" && (!!errors.mediaUrl || !!errors.coverImgUrl))
                  }
                  className="flex items-center gap-1 shadow-sm shadow-foreground"
                >
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <PaymentChoose
                  costBreakdown={[
                    {
                      label: "Stellar Fee",
                      amount:
                        paymentMethod === "asset"
                          ? requiredTokenAmount
                          : requiredXlm,
                      type: "cost",
                      highlighted: true,
                    },
                    {
                      label: "Platform Fee",
                      amount: paymentMethod === "asset" ? totalFees : feeInXLM,
                      highlighted: false,
                      type: "fee",
                    },
                    {
                      label: "Total Cost",
                      amount:
                        paymentMethod === "asset"
                          ? totalCostInPlatform
                          : totalXlmCost,
                      highlighted: false,
                      type: "total",
                    },
                  ]}
                  XLM_EQUIVALENT={totalXlmCost}
                  handleConfirm={handleSubmit(onSubmit)}
                  beforeTrigger={validatePaymentMethod}
                  loading={loading || validationInProgress}
                  requiredToken={totalCostInPlatform}
                  conversionInfo={conversionInfo}
                  showAlert={showAlert}
                  alertMessage={alertMessage}
                  trigger={
                    <Button
                      variant="default"
                      disabled={
                        loading ||
                        validationInProgress || !isValid
                      }
                      className="flex items-center gap-1 shadow-sm shadow-foreground"
                    >
                      {loading || validationInProgress ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating NFT...
                        </>
                      ) : (
                        "Create NFT"
                      )}
                    </Button>
                  }
                />
              )}
            </div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function TiersOptions({
  tiers,
  handleTierChange,
}: {
  tiers: { id: number; name: string; price: number }[];
  handleTierChange: (value: string) => void;
}) {
  return (
    <Select onValueChange={handleTierChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a tier" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Choose Tier</SelectLabel>
          <SelectItem value="public">Public</SelectItem>
          <SelectItem value="private">Only Members</SelectItem>
          {tiers.map((model) => (
            <SelectItem key={model.id} value={model.id.toString()}>
              <div className="flex w-full items-center justify-between">
                <span>{model.name}</span>
                <Badge variant="outline">{model.price}</Badge>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function PlayableMedia({
  mediaUrl,
  mediaType,
}: {
  mediaUrl?: string;
  mediaType: MediaType;
}) {
  return (
    mediaUrl && <MediaComponent mediaType={mediaType} mediaUrl={mediaUrl} />
  );

  function MediaComponent({
    mediaType,
    mediaUrl,
  }: {
    mediaType: MediaType;
    mediaUrl: string;
  }) {
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
      // Simulate loading
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin " />
        </div>
      );
    }

    switch (mediaType) {
      case MediaType.IMAGE:
        return (
          <div className="relative aspect-square w-full overflow-hidden rounded-md">
            <Image
              alt="NFT preview"
              src={mediaUrl ?? "/placeholder.svg"}
              fill
              className="object-cover"
            />
          </div>
        );
      case MediaType.MUSIC:
        return (
          <div className="w-full">
            <audio controls className="w-full">
              <source src={mediaUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      case MediaType.VIDEO:
        return (
          <div className="aspect-video w-full overflow-hidden rounded-md">
            <video controls className="h-full w-full">
              <source src={mediaUrl} type="video/mp4" />
              Your browser does not support the video element.
            </video>
          </div>
        );
      case MediaType.THREE_D:
        return (
          <div className="flex items-center justify-center rounded-md bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-medium">
                3D Model Uploaded Successfully
              </span>
            </div>
          </div>
        );
      default:
        return null;
    }
  }
}

interface VisibilityToggleProps {
  isVisible: boolean;
  toggleVisibility: () => void;
}

export function VisibilityToggle({
  isVisible,
  toggleVisibility,
}: VisibilityToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleVisibility}
            aria-label={isVisible ? "Set to private" : "Set to visible"}
          >
            {isVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isVisible ? "Visible to all" : "Private"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
