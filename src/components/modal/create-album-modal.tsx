"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog"
import { Button } from "~/components/shadcn/ui/button"
import { Input } from "~/components/shadcn/ui/input"
import { Label } from "~/components/shadcn/ui/label"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { type SubmitHandler, useForm } from "react-hook-form"
import { Music, PlusCircle, Upload, X, Loader2 } from "lucide-react"
import Image from "next/image"
import toast from "react-hot-toast"
import { z } from "zod"
import { api } from "~/utils/api"
import { UploadS3Button } from "../common/upload-button"
import { useCreateAlbumStore } from "../store/album-create-store"
import { Glass } from "~/components/glass/glass"


export const AlbumCreateFormShema = z.object({
    name: z
        .string()
        .max(20, { message: "Album name must be between 3 to 20 characters" })
        .min(3, { message: "Album name must be between 3 to 20 characters" }),
    description: z.string(),
    coverImgUrl: z.string({
        required_error: "Cover image is required",
        message: "Cover image is required",
    }),
})

type AlbumFormType = z.TypeOf<typeof AlbumCreateFormShema>

const CreateAlbumModal = () => {
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AlbumFormType>()
    const { setIsOpen, isOpen } = useCreateAlbumStore()
    const [coverUrl, setCoverUrl] = useState<string>()
    const [isUploading, setIsUploading] = useState(false)

    const CreateAlbumMutation = api.fan.music.createAlbum.useMutation({
        onSuccess: () => {
            setIsOpen(false)
            toast.success("Album created successfully")
            handleOpenChange(false)
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })

    const onSubmit: SubmitHandler<z.infer<typeof AlbumCreateFormShema>> = (data) => {
        console.log(data)
        if (data.coverImgUrl === undefined) {
            toast.error("Cover image is required")
            return
        }

        CreateAlbumMutation.mutate(data)
    }

    const handleOpenChange = (openState: boolean) => {
        if (!openState) {
            reset()
            setCoverUrl(undefined)
        }
        setIsOpen(openState)
    }

    const removeCoverImage = () => {
        setCoverUrl(undefined)
        setValue("coverImgUrl", "")
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="flex max-h-[90vh] w-full max-w-[450px] flex-col overflow-hidden rounded-[0.9rem] border border-black/20 p-0">
                <div className="relative z-0 flex-1 overflow-hidden">
                <Glass
                    className={{
                        root: "pointer-events-none absolute inset-0 z-0 rounded-[0.9rem] *:rounded-[0.9rem]",
                        tint: "bg-[#f3f1ea]/60 transition-colors",
                        effect:
                            "backdrop-blur-[8px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,251,242,0.24),rgba(248,243,232,0.08)_55%,rgba(245,240,230,0.03)_100%)] transition-all",
                        shine:
                            "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                    }}
                />
                <div className="relative z-10 flex h-full flex-col">
                    <DialogHeader className="px-6 pt-5 pb-3">
                        <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                            <Music className="h-5 w-5" />
                            Create New Album
                        </DialogTitle>
                    </DialogHeader>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 overflow-y-auto px-6"
                    >
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Album Name
                                </Label>
                                <Input
                                    {...register("name")}
                                    id="name"
                                    type="text"
                                    required
                                    placeholder="Enter album name"
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium">
                                    Description
                                </Label>
                                <Textarea
                                    {...register("description")}
                                    id="description"
                                    required
                                    placeholder="Describe your album"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Cover Image</Label>

                                <AnimatePresence>
                                    {!coverUrl ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/10 bg-white/40 p-6"
                                        >
                                            <div className="relative w-full">
                                                <UploadS3Button
                                                    variant="button"
                                                    endpoint="imageUploader"
                                                    className="w-full"
                                                    onClientUploadComplete={(res) => {
                                                        const data = res
                                                        if (data?.url) {
                                                            setCoverUrl(data.url)
                                                            setValue("coverImgUrl", data.url)
                                                            setIsUploading(false)
                                                        }
                                                    }}
                                                    onUploadError={(error: Error) => {
                                                        toast.error(`ERROR! ${error.message}`)
                                                        setIsUploading(false)
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="relative overflow-hidden rounded-xl border border-black/10 group"
                                        >
                                            <Image
                                                alt="Album cover preview"
                                                src={coverUrl || "/placeholder.svg"}
                                                width={400}
                                                height={400}
                                                className="w-full h-48 object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={removeCoverImage}
                                                className="absolute top-2 right-2 grid size-7 place-items-center rounded-full border border-red-200/60 bg-red-50/70 text-red-600 hover:bg-red-100/80"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {errors.coverImgUrl && (
                                    <p className="text-red-500 text-xs mt-1">{errors.coverImgUrl.message}</p>
                                )}
                            </div>
                        </form>
                    </motion.div>
                    <div className="flex justify-end border-t border-black/10 p-6">
                        <Button
                            type="submit"
                            onClick={handleSubmit(onSubmit)}
                            disabled={CreateAlbumMutation.isLoading || isUploading}
                            className="flex items-center gap-2"
                        >
                            {CreateAlbumMutation.isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <PlusCircle className="h-4 w-4" />
                            )}
                            {CreateAlbumMutation.isLoading ? "Creating Album..." : "Create Album"}
                        </Button>
                    </div>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default CreateAlbumModal

