"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { MediaType } from "@prisma/client";
import clsx from "clsx";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { clientsign } from "package/connect_wallet";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "~/components/shadcn/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog";
import useNeedSign from "~/lib/hook";
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import {
    PLATFORM_ASSET,
    PLATFORM_FEE,
    TrxBaseFeeInPlatformAsset,
} from "~/lib/stellar/constant";
import { clientSelect } from "~/lib/stellar/fan/utils";
import { api } from "~/utils/api";
import { PaymentChoose, usePaymentMethodStore } from "../common/payment-options";
import { Alert, AlertDescription } from "../shadcn/ui/alert";
import { UploadS3Button } from "../common/upload-button";
import { Editor } from "../common/quill-editor";
import { useCreateBountyStore } from "../store/create-bounty-store";
import { Input } from "../shadcn/ui/input";


export const MediaInfo = z.object({
    url: z.string(),
    type: z.string().default(MediaType.IMAGE),
});



type MediaInfoType = z.TypeOf<typeof MediaInfo>;
export const BountySchema = z.object({
    title: z.string().max(65, {
        message: "Title can't be more than 65 characters"
    }).min(1, { message: "Title can't be empty" }),
    totalWinner: z
        .number({
            required_error: "Total Winner must be a number",
            invalid_type_error: "Total Winner must be a number",
        })
        .min(1, { message: "Please select at least 1 winner" }),
    prizeInUSD: z
        .number({
            required_error: "Prize  must be a number",
            invalid_type_error: "Prize must be a number",
        })
        .min(0.00001, { message: "Prize can't less than 0.00001" }),
    prize: z.number({
        required_error: "Prize  must be a number",
        invalid_type_error: "Prize must be a number",
    }).min(0.00001, { message: "Prize can't less than 0.00001" }),
    requiredBalance: z
        .number({
            required_error: "Required Balance  must be a number",
            invalid_type_error: "Required Balance must be a number",
        })
        .nonnegative({ message: "Required Balance can't be less than 0" })
        .optional(),

    content: z.string().min(2, { message: "Description can't be empty" }),
    medias: z.array(MediaInfo).optional(),
});
const CreateBountyModal = () => {
    const [media, setMedia] = useState<MediaInfoType[]>([]);
    const [wantMediaType, setWantMedia] = useState<MediaType>();
    const [loading, setLoading] = useState(false);
    const { needSign } = useNeedSign();
    const session = useSession();
    const [prizeInAsset, setPrizeInAsset] = useState<number>(0);
    const { platformAssetBalance } = useUserStellarAcc();

    const { isOpen, setIsOpen, paymentMethod } = usePaymentMethodStore();
    const { isOpen: isDialogOpen, setIsOpen: setIsDialogOpen } = useCreateBountyStore()
    const totalFeees =
        2 * Number(TrxBaseFeeInPlatformAsset) + Number(PLATFORM_FEE);

    // console.log("platformAssetBalance", platformAssetBalance);
    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        reset,
        trigger,

        formState: { errors, isValid },
    } = useForm<z.infer<typeof BountySchema>>({
        resolver: zodResolver(BountySchema),
        mode: "onChange",
        defaultValues: {
            content: "",
            title: "",

        },
    });

    const utils = api.useUtils();
    const CreateBountyMutation = api.bounty.Bounty.createBounty.useMutation({
        onSuccess: async (data) => {
            toast.success("Bounty Created");
            handleClose();
            setPrizeInAsset(0);
            utils.bounty.Bounty.getAllBounties.refetch().catch((error) => {
                console.error("Error refetching bounties", error);
            });
        },
    });

    const SendBalanceToBountyMother =
        api.bounty.Bounty.sendBountyBalanceToMotherAcc.useMutation({
            onSuccess: async (data, { method }) => {
                if (data) {
                    try {
                        setLoading(true);
                        const clientResponse = await clientsign({
                            presignedxdr: data.xdr,
                            walletType: session.data?.user?.walletType,
                            pubkey: data.pubKey,
                            test: clientSelect(),
                        });
                        if (clientResponse) {
                            setLoading(true);
                            CreateBountyMutation.mutate({
                                title: getValues("title"),
                                prizeInUSD: getValues("prizeInUSD"),
                                totalWinner: getValues("totalWinner"),
                                prize: getValues("prize"),
                                requiredBalance: getValues("requiredBalance") ?? 0,
                                priceInXLM:
                                    method == "xlm" ? getValues("prize") * 0.7 : undefined,
                                content: getValues("content"),
                                medias: media.map((item) => ({ ...item, type: item.type as MediaType })),
                            });
                            setLoading(false);
                            reset();
                            setMedia([]);
                        } else {
                            setLoading(false);
                            reset();
                            toast.error("Error in signing transaction");
                            setMedia([]);
                        }
                        setIsOpen(false);
                    } catch (error) {
                        setLoading(false);
                        console.error("Error sending balance to bounty mother", error);
                        reset();
                        setMedia([]);
                    }
                }
            },
            onError: (error) => {
                console.error("Error creating bounty", error);
                toast.error(error.message);
                reset();
                setMedia([]);
                setLoading(false);
                setIsOpen(false);
            },
        });
    const onSubmit: SubmitHandler<z.infer<typeof BountySchema>> = (data) => {

        data.medias = media;
        setLoading(true);
        SendBalanceToBountyMother.mutate({
            signWith: needSign(),
            prize: data.prize,
            method: paymentMethod,
        });
        setLoading(false);
    };

    const addMediaItem = (url: string, type: MediaType) => {
        setMedia((prevMedia) => [...prevMedia, { url, type }]);
    };
    function handleEditorChange(value: string): void {
        setValue("content", value);
    }

    const RequiredBalance = 5000;
    const removeMediaItem = (index: number) => {
        setMedia((prevMedia) => prevMedia.filter((_, i) => i !== index));
    };

    //OnlyForWadzzo
    const { data: prize } = api.bounty.Bounty.getCurrentUSDFromAsset.useQuery();
    const handleClose = () => {
        setIsDialogOpen(false);
        reset();
        setMedia([]);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={handleClose}>
            <DialogContent>
                <div className="flex  w-full  justify-center">

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex w-full flex-col gap-4 rounded-3xl bg-base-200 p-5"
                    >
                        <label className="form-control w-full ">

                            <Input
                                maxLength={65}
                                readOnly={loading}
                                type="text"
                                placeholder="Add a Title..."
                                {...register("title")}
                                className=" "
                            />
                            <div className="flex text-sm justify-between text-gray-500">
                                <span>{getValues("title").length >= 65 && (
                                    <div className="text-left text-sm text-red-500">
                                        You have reached the maximum character limit.
                                    </div>
                                )}</span>
                                {/* <span className=""> {getValues("title").length}/65 characters</span> */}
                            </div>


                            {errors.title && (
                                <div className="label">
                                    <span className="label-text-alt text-warning">
                                        {errors.title.message}
                                    </span>
                                </div>
                            )}
                        </label>
                        <label className="h-[240px]">

                            <Editor

                                value={getValues("content")}
                                onChange={handleEditorChange}
                                placeholder="Add a Description..."
                                className="h-[180px] w-full"
                            />

                            {errors.content && (
                                <div className="label">
                                    <span className="label-text-alt text-warning">
                                        {errors.content.message}
                                    </span>
                                </div>
                            )}
                        </label>
                        <div>
                            <div className="flex flex-col items-center gap-2">


                                <div className=" mt-2 flex w-full flex-col  gap-2 sm:flex-row">
                                    <label className="mb-1 w-full text-xs tracking-wide text-gray-600 sm:text-sm">

                                        <Input
                                            step={0.00001}
                                            readOnly={loading}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const prizeUSD = Number(value);

                                                setValue("prizeInUSD", Number(value));
                                                setValue("prize", Number(value) / Number(prize));
                                                setPrizeInAsset(Number(value) / Number(prize));
                                                // Make sure prize is a valid number before dividing
                                                if (prize && Number(prize) > 0) {
                                                    const prizeValue = prizeUSD / Number(prize);
                                                    setValue("prize", prizeValue);
                                                    setPrizeInAsset(prizeValue);
                                                } else {
                                                    // Handle the case where prize is invalid
                                                    setValue("prize", 0);
                                                    setPrizeInAsset(0);
                                                }
                                            }}
                                            className="input input-bordered   w-full"
                                            type="number"
                                            placeholder=" Prize in $USD*"
                                        />
                                        {errors.prizeInUSD && (
                                            <div className="label">
                                                <span className="label-text-alt text-warning">
                                                    {errors.prizeInUSD.message}
                                                </span>
                                            </div>
                                        )}
                                    </label>
                                    <label className="mb-1 w-full text-xs tracking-wide text-gray-600 sm:text-sm">

                                        <Input
                                            readOnly
                                            type="number"
                                            {...register("prize")}
                                            className="input input-bordered   w-full"
                                            placeholder={`Prize in ${PLATFORM_ASSET.code}*`}
                                        />
                                        {errors.prize && (
                                            <div className="label">
                                                <span className="label-text-alt text-warning">
                                                    {errors.prize.message}
                                                </span>
                                            </div>
                                        )}
                                    </label>
                                </div>


                                <Input
                                    readOnly={loading}
                                    type="number"
                                    step={0.00001}
                                    {...register("requiredBalance", {
                                        valueAsNumber: true,
                                    })}
                                    className="input input-bordered   w-full"
                                    placeholder={`Required Balance to Join this Bounty in ${PLATFORM_ASSET.code}`}
                                />
                                {errors.requiredBalance && (
                                    <div className="label">
                                        <span className="label-text-alt text-warning">
                                            {errors.requiredBalance.message}
                                        </span>
                                    </div>
                                )}


                                <Input
                                    readOnly={loading}
                                    type="number"
                                    step={1}
                                    {...register("totalWinner", {
                                        valueAsNumber: true,
                                    })}
                                    className="input input-bordered   w-full"
                                    placeholder=" How many winners will be selected?*"
                                />
                                {errors.totalWinner && (
                                    <div className="label">
                                        <span className="label-text-alt text-warning">
                                            {errors.totalWinner.message}
                                        </span>
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {media.map((item, index) => (
                                            <div key={index} className="relative">
                                                <Image
                                                    src={item.url}
                                                    alt={`Uploaded media ${index + 1}`}
                                                    width={100}
                                                    height={100}
                                                    className="rounded-md object-cover"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute -top-2 -right-2 h-6 w-6"
                                                    onClick={() => removeMediaItem(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {media.length >= 4 && (
                                        <p className="text-sm text-red-500">Maximum number of uploads reached.</p>
                                    )}
                                </div>

                                <div>
                                    <UploadS3Button
                                        varient="button"
                                        label="Choose Bounty Thumbnail"
                                        disabled={media.length >= 4 || loading}
                                        endpoint="imageUploader"

                                        onClientUploadComplete={(res) => {

                                            const data = res;

                                            if (data?.url) {
                                                addMediaItem(data.url, wantMediaType!);
                                                trigger().catch((e) => console.log(e));
                                                setWantMedia(undefined);
                                            }
                                        }}
                                        onUploadError={(error: Error) => {
                                            // Do something with the error.
                                            toast.error(`ERROR! ${error.message}`);

                                        }}
                                    />
                                </div>


                            </div>
                        </div>{" "}

                    </form>

                </div>
                <DialogFooter>
                    {platformAssetBalance < prizeInAsset + totalFeees ? (
                        <Alert
                            variant="destructive"
                        >
                            <AlertDescription className="text-center">
                                {`You don't have Sufficient Balance ,To  create this bounty, you need minimum ${prizeInAsset + totalFeees} ${PLATFORM_ASSET.code}`}                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex w-full flex-col gap-2">
                            <PaymentChoose
                                costBreakdown={[
                                    {
                                        label: "Cost",
                                        amount: paymentMethod === "asset" ? prizeInAsset : prizeInAsset * 0.7,
                                        highlighted: true,
                                        type: "cost",
                                    },
                                    {
                                        label: "Platform Fee",
                                        amount: paymentMethod === "asset" ? totalFeees : 2 + 1,
                                        highlighted: false,
                                        type: "fee",
                                    },
                                    {
                                        label: "Total Cost",
                                        amount: paymentMethod === "asset" ? prizeInAsset + totalFeees : prizeInAsset * 0.7 + 2 + 1,
                                        highlighted: false,
                                        type: "total",
                                    },
                                ]}

                                XLM_EQUIVALENT={prizeInAsset * 0.7 + 2 + 1}
                                handleConfirm={handleSubmit(onSubmit)}
                                loading={loading}
                                requiredToken={prizeInAsset + totalFeees}
                                trigger={
                                    <Button
                                        disabled={loading || !isValid}
                                        className="w-full shadow-sm shadow-foreground "
                                    >
                                        Create
                                    </Button>
                                }
                            />

                            <Alert
                                variant='destructive'
                            >
                                <AlertDescription className="text-center">
                                    {`Note: You will be charged ${prizeInAsset + totalFeees} ${PLATFORM_ASSET.code} to create this bounty`}
                                </AlertDescription>

                            </Alert>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>

        </Dialog>
    );
};
export default CreateBountyModal;
