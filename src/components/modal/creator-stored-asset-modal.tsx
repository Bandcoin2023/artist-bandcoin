import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, DollarSign, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "~/components/shadcn/ui/button";
import { Dialog, DialogContent } from "~/components/shadcn/ui/dialog";
import { api } from "~/utils/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"

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
import { Separator } from "@radix-ui/react-select";
import { Textarea } from "../shadcn/ui/textarea";

export const PaymentMethodEnum = z.enum(["asset", "xlm", "card"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export default function CreatorStoredAssetModal() {

    const [step, setStep] = useState(1);
    const { setIsOpen, isOpen, data } = useCreatorStoredAssetModalStore()
    const handleClose = () => {
        setStep(1);
        setIsOpen(false);
    };

    const handleNext = (value: number) => {
        setStep(value);
    };

    const handleBack = () => {
        setStep(1);
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
                                            onClick={() => handleNext(2)}
                                        >
                                            Edit
                                        </Button>
                                        {
                                            data.asset.mediaType === "MUSIC" && (
                                                <Button
                                                    className="w-full"
                                                    variant="secondary"
                                                    onClick={() => handleNext(3)}
                                                >
                                                    Add To Album
                                                </Button>
                                            )
                                        }
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
                        {step === 2 ? (
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
                        )
                            :
                            step === 3 ? (
                                <Card>
                                    <CardContent className="">
                                        {data.asset.mediaType === "MUSIC" && (
                                            <>
                                                <Separator className="my-4" />
                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-semibold">Add to Song Collection</h3>
                                                    <p className="text-sm text-muted-foreground">Associate this music asset with a song in your album</p>
                                                    <AddToSongForm marketAssetId={data.asset.id} closeModal={handleClose} />
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-2">
                                        {step === 3 && (
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
                            ) : null
                        }
                    </DialogContent>
                </Dialog>
            </>
        );
}


export const updateAssetFormShema = z.object({
    assetId: z.number(),
    price: z.number().nonnegative(),
    priceUSD: z.number().nonnegative(),
})

export function EditForm({
    item,
    closeModal,
}: {
    item: MarketAssetType
    closeModal: () => void
}) {
    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
    } = useForm<z.infer<typeof updateAssetFormShema>>({
        resolver: zodResolver(updateAssetFormShema),
        defaultValues: {
            assetId: item.id,
            price: item.price,
            priceUSD: item.priceUSD,
        },
    })

    // mutation
    const update = api.fan.asset.updateAsset.useMutation({
        onSuccess: (data) => {
            if (data) {
                toast.success("Asset updated successfully")
                closeModal()
            }
        },
    })

    const onSubmit: SubmitHandler<z.infer<typeof updateAssetFormShema>> = (data) => {
        update.mutate(data)
    }

    return (
        <Card className="w-full border-0 shadow-lg">
            <CardHeader className="bg-primary pb-4">
                <div className="flex items-center justify-center space-x-2">



                    <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Asset</h2>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Update the pricing information for this asset
                </p>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
                <form id="edit-asset-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium">
                            Price in {PLATFORM_ASSET.code}
                        </Label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                {PLATFORM_ASSET.code.toLocaleLowerCase() === "wadzzo" ?

                                    (<CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />) : PLATFORM_ASSET.code.toLocaleLowerCase() === "bandcoin" ? (
                                        <Image
                                            src={"https://bandcoin.io/images/logo.png"}
                                            alt={PLATFORM_ASSET.code}
                                            width={24}
                                            height={24}
                                            className="h-4 w-4"
                                        />

                                    ) : (
                                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    )

                                }
                            </div>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                placeholder={`Enter amount in ${PLATFORM_ASSET.code}`}
                                {...register("price", { valueAsNumber: true })}
                                className={`pl-10 ${errors.price ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                        </div>
                        {errors.price && <p className="text-sm font-medium text-red-500">{errors.price.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priceUSD" className="text-sm font-medium">
                            Price in USD
                        </Label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <DollarSign className="h-4 w-4 " />
                            </div>
                            <Input
                                id="priceUSD"
                                type="number"
                                step="0.01"
                                placeholder="Enter amount in USD"
                                {...register("priceUSD", { valueAsNumber: true })}
                                className={`pl-10 ${errors.priceUSD ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                        </div>
                        {errors.priceUSD && <p className="text-sm font-medium text-red-500">{errors.priceUSD.message}</p>}
                    </div>

                </form>
            </CardContent>

            <CardFooter className="flex gap-2 pt-2">


                <Button type="button" variant="outline" onClick={closeModal} className="w-full">
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant='accent'
                    form="edit-asset-form"
                    className="w-full  shadow-foreground"
                    disabled={update.isLoading || !isDirty}
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
            </CardFooter>
        </Card>
    )
}

const addToSongFormSchema = z.object({
    albumId: z.number({
        required_error: "Album is required",
    }),
    artist: z.string().min(2, "Artist name must be at least 2 characters"),
    price: z.number().nonnegative("Price must be positive"),
    priceUSD: z.number().nonnegative("Price must be positive"),
})

function AddToSongForm({
    marketAssetId,
    closeModal,
}: {
    marketAssetId: number
    closeModal: () => void
}) {
    const { data: session } = useSession()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
    } = useForm<z.infer<typeof addToSongFormSchema>>({
        resolver: zodResolver(addToSongFormSchema),
        defaultValues: {
            price: 2,
            priceUSD: 2,
            artist: "",
        },
    })

    // Get creator's albums
    const { data: albums, isLoading: albumsLoading } = api.fan.music.getCreatorAlbums.useQuery({
        limit: 100,
    }, {
        enabled: !!session?.user.id,
    })

    // Get market asset details
    const { data: marketAsset } = api.marketplace.market.getMarketAssetById.useQuery({
        id: marketAssetId,
    })
    const { data: existingSong } = api.music.song.getSongByAssetId.useQuery(
        {
            assetId: marketAsset?.assetId ?? 0,
        },
        {
            enabled: !!marketAsset?.assetId,
        },
    )

    // Create song mutation
    const createSong = api.fan.music.createSongFromMarketAsset.useMutation({
        onSuccess: () => {
            toast.success("Song created successfully!")
            closeModal()
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create song")
        },
    })

    const selectedAlbumId = watch("albumId")

    const onSubmit: SubmitHandler<z.infer<typeof addToSongFormSchema>> = (data) => {
        if (!marketAsset) return

        createSong.mutate({
            ...data,
            marketAssetId,
            assetId: marketAsset.assetId,
        })
    }

    if (albumsLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading albums...</span>
            </div>
        )
    }
    if (existingSong) {
        return (
            <div className="space-y-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">Already Added</Badge>
                </div>
                <div>
                    <h4 className="font-medium">This asset is already associated with a song:</h4>

                    <p className="text-sm text-muted-foreground">
                        <strong>Artist:</strong> {existingSong.artist}
                    </p>
                    {existingSong.album && (
                        <p className="text-sm text-muted-foreground">
                            <strong>Album:</strong> {existingSong.album.name}
                        </p>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Each music asset can only be associated with one song. To create a new song, you{"'"}ll need to use a different
                    music asset.
                </p>
            </div>
        )
    }
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Album Selection */}
            <div className="space-y-2">
                <Label htmlFor="album">Select Album</Label>
                <Select
                    onValueChange={(value) => setValue("albumId", Number.parseInt(value))}
                    disabled={!albums || albums.albums.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Choose an album" />
                    </SelectTrigger>
                    <SelectContent>
                        {albums?.albums?.map((album) => (
                            <SelectItem key={album.id} value={album.id.toString()}>
                                <div className="flex items-center gap-2">
                                    <Image
                                        src={album.coverImgUrl || "/placeholder.svg"}
                                        alt={album.name}
                                        width={24}
                                        height={24}
                                        className="rounded h-8 w-8"
                                    />
                                    {album.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.albumId && <p className="text-sm text-destructive">{errors.albumId.message}</p>}
                {albums && albums.albums.length === 0 && (
                    <p className="text-sm text-muted-foreground">No albums found. Create an album first to add songs.</p>
                )}
            </div>

            {selectedAlbumId && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                >


                    {/* Artist */}
                    <div className="space-y-2">
                        <Label htmlFor="artist">Artist</Label>
                        <Input id="artist" {...register("artist")} placeholder="Enter artist name" />
                        {errors.artist && <p className="text-sm text-destructive">{errors.artist.message}</p>}
                    </div>



                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price ({PLATFORM_ASSET.code})</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.1"
                                {...register("price", { valueAsNumber: true })}
                                placeholder="Enter price"
                            />
                            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priceUSD">Price (USD)</Label>
                            <Input
                                id="priceUSD"
                                type="number"
                                step="0.1"
                                {...register("priceUSD", { valueAsNumber: true })}
                                placeholder="Enter USD price"
                            />
                            {errors.priceUSD && <p className="text-sm text-destructive">{errors.priceUSD.message}</p>}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" disabled={isSubmitting || createSong.isLoading} className="w-full shadow-sm shadow-foreground">
                        {isSubmitting || createSong.isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Song...
                            </>
                        ) : (
                            "Create Song"
                        )}
                    </Button>
                </motion.div>
            )}
        </form>
    )
}
