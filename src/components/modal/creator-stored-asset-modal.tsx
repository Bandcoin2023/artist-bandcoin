import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "~/components/shadcn/ui/button";
import { Dialog, DialogContent } from "~/components/shadcn/ui/dialog";
import { api } from "~/utils/api";

import { Badge } from "~/components/shadcn/ui/badge";
import { Input } from "~/components/shadcn/ui/input";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";

import { z } from "zod";
import { addrShort } from "~/utils/utils";

import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { useRouter } from "next/router";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import { MarketAssetType, useModal } from "~/lib/state/play/use-modal-store";
import { Label } from "../shadcn/ui/label";
import ShowThreeDModel from "../3d-model/model-show";
import { useCreatorStoredAssetModalStore } from "../store/creator-stored-asset-modal-store";

export const PaymentMethodEnum = z.enum(["asset", "xlm", "card"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export default function CreatorStoredAssetModal() {

    const [step, setStep] = useState(1);
    const { setIsOpen, isOpen, data } = useCreatorStoredAssetModalStore()
    const handleClose = () => {
        setStep(1);
        setIsOpen(false);
    };

    const handleNext = () => {
        setStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setStep((prev) => prev - 1);
    };

    const copy = api.marketplace.market.getMarketAssetAvailableCopy.useQuery({
        id: data?.id,

    },
        {
            enabled: !!data?.id
        }
    );

    if (data && data.asset)
        return (
            <>
                <Dialog open={isOpen} onOpenChange={handleClose}>
                    <DialogContent className="max-w-3xl overflow-hidden p-0 [&>button]:rounded-full [&>button]:border [&>button]:border-black [&>button]:bg-white [&>button]:text-black ">
                        {step === 1 && (
                            <div className="grid grid-cols-2 md:grid-cols-7">
                                {/* Left Column - Product Image */}
                                <Card className="  max-h-[800px]  overflow-y-auto   bg-[#1e1f22] md:col-span-3 ">
                                    <CardContent className="p-0">
                                        {/* Image Container */}
                                        <div className="relative aspect-square bg-[#1e1f22]">

                                            <Image
                                                src={data.asset.thumbnail}
                                                alt={data.asset.name}
                                                width={1000}
                                                height={1000}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="space-y-3 p-4">
                                            <h2 className="text-xl font-bold text-white">
                                                {data.asset.name}
                                            </h2>

                                            <p className="max-h-[100px] min-h-[100px]  overflow-y-auto text-sm text-gray-400">
                                                {data.asset.description}
                                            </p>

                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span className="h-auto p-0 text-xs text-[#00a8fc]">
                                                    {addrShort(data.asset.issuer, 5)}
                                                </span>
                                                <Badge variant="destructive" className=" rounded-lg">
                                                    #{data.asset.code}
                                                </Badge>
                                            </div>
                                            <p className="font-semibold text-white">
                                                <span className="">Available:</span>{" "}
                                                {copy.data === 0
                                                    ? "Sold out"
                                                    : copy.data === 1
                                                        ? "1 copy"
                                                        : copy.data !== undefined
                                                            ? `${copy.data} copies`
                                                            : "..."}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span className="h-auto p-0 text-xs text-[#00a8fc]">
                                                    Media Type:
                                                </span>
                                                <Badge variant="destructive" className=" rounded-lg">
                                                    {data.asset.mediaType === "THREE_D"
                                                        ? "3D Model"
                                                        : data.asset.mediaType}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-1 p-2">
                                        <Button
                                            className="w-full"
                                            variant="secondary"
                                            onClick={handleNext}
                                        >
                                            Edit
                                        </Button>
                                    </CardFooter>
                                </Card>

                                {/* Right Column - Bundle Info */}
                                <div className=" rounded-sm bg-gray-300 p-1   md:col-span-4">
                                    {data.asset.mediaType === "IMAGE" ? (
                                        <Image
                                            src={data.asset.mediaUrl}
                                            alt={data.asset.name}
                                            width={1000}
                                            height={1000}
                                            className={clsx(
                                                "h-full max-h-[800px] w-full overflow-y-auto object-cover ",
                                                data.asset.tierId ? " blur-md" : "",
                                            )}
                                        />
                                    ) : data.asset.mediaType === "VIDEO" ? (
                                        <Image
                                            src={data.asset.thumbnail}
                                            alt={data.asset.name}
                                            width={1000}
                                            height={1000}
                                            className={clsx(
                                                "h-full max-h-[800px] w-full overflow-y-auto object-cover ",
                                                data.asset.tierId ? " blur-md" : "",
                                                data.asset.tierId ? " blur-md" : "",
                                            )}
                                        />
                                    ) : data.asset.mediaType === "MUSIC" ? (
                                        <Image
                                            src={data.asset.thumbnail}
                                            alt={data.asset.name}
                                            width={1000}
                                            height={1000}
                                            className={clsx(
                                                "h-full max-h-[800px] w-full overflow-y-auto object-cover ",
                                                data.asset.tierId ? " blur-md" : "",
                                            )}
                                        />
                                    ) : (
                                        data.asset.mediaType === "THREE_D" && (
                                            <ShowThreeDModel url={data.asset.mediaUrl} />
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                        {step === 2 && (
                            <Card>
                                <CardContent className="p-0">
                                    <EditForm
                                        item={data}
                                        closeModal={handleClose}
                                    />
                                </CardContent>
                                <CardFooter className="p-2">
                                    {step === 2 && (
                                        <Button
                                            onClick={handleBack}
                                            variant="secondary"
                                            className=""
                                        >
                                            <ArrowLeft className="h-4 w-4" /> Back
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )}
                    </DialogContent>
                </Dialog>
            </>
        );
}

export const updateAssetFormShema = z.object({
    assetId: z.number(),
    price: z.number().nonnegative(),

    priceUSD: z.number().nonnegative(),
});

function EditForm({
    item,
    closeModal,
}: {
    item: MarketAssetType;
    closeModal: () => void;
}) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof updateAssetFormShema>>({
        resolver: zodResolver(updateAssetFormShema),
        defaultValues: {
            assetId: item.id,
            price: item.price,
            priceUSD: item.priceUSD,
        },
    });

    // mutation
    const update = api.fan.asset.updateAsset.useMutation({
        onSuccess: (data) => {
            if (data) {
                toast.success("Asset updated successfully");
                closeModal();
            }
        },
    });

    const onSubmit: SubmitHandler<z.infer<typeof updateAssetFormShema>> = (
        data,
    ) => {
        update.mutate(data);
    };

    return (
        <Card className=" w-full ">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                    Edit Asset
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium">
                            Price in {PLATFORM_ASSET.code}
                        </Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            {...register("price", { valueAsNumber: true })}
                            className={`w-full ${errors.price ? "border-red-500" : ""}`}
                        />
                        {errors.price && (
                            <p className="text-sm text-red-500">{errors.price.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priceUSD" className="text-sm font-medium">
                            Price in USD
                        </Label>
                        <Input
                            id="priceUSD"
                            type="number"
                            step="0.01"
                            {...register("priceUSD", { valueAsNumber: true })}
                            className={`w-full ${errors.priceUSD ? "border-red-500" : ""}`}
                        />
                        {errors.priceUSD && (
                            <p className="text-sm text-red-500">{errors.priceUSD.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full transform rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 font-semibold text-white transition-all duration-300 ease-in-out hover:scale-105 hover:from-blue-600 hover:to-purple-600"
                        disabled={update.isLoading}
                    >
                        {update.isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Asset"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
