"use client"

import type React from "react"
import { useState } from "react"
import { Download, Upload, Music, X, Loader2 } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { motion } from "framer-motion"

interface ExportOptionsModalProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    onDownload: () => Promise<void>
    onExportToBandcoin: () => Promise<void>
    isExporting: boolean
    trackCount: number
    isDark: boolean
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
    isOpen,
    setIsOpen,
    onDownload,
    onExportToBandcoin,
    isExporting,
    trackCount,
    isDark,
}) => {
    const [selectedOption, setSelectedOption] = useState<"download" | "bandcoin" | null>(null)

    const handleDownload = async () => {
        setSelectedOption("download")
        try {
            await onDownload()
            setIsOpen(false)
        } catch (error) {
            console.error("Download failed:", error)
        } finally {
            setSelectedOption(null)
        }
    }

    const handleExportToBandcoin = async () => {
        setSelectedOption("bandcoin")
        try {
            await onExportToBandcoin()
            // Don't close modal here as the BANDCOIN export modal will open
        } catch (error) {
            console.error("Export to BANDCOIN failed:", error)
            setSelectedOption(null)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setSelectedOption(null)
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent
                className="max-w-md w-full"
                onInteractOutside={(e) => {
                    if (isExporting || selectedOption) {
                        e.preventDefault()
                    }
                }}
            >
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Music className="h-5 w-5" />
                            <DialogTitle>Export Your Project</DialogTitle>
                        </div>
                        {!isExporting && !selectedOption && (
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <DialogDescription>
                        Choose how you{"'"}d like to export your {trackCount} track{trackCount !== 1 ? "s" : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Download Option */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedOption === "download" ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20" : ""
                                }`}
                            onClick={handleDownload}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                                        {selectedOption === "download" ? (
                                            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                        ) : (
                                            <Download className="h-6 w-6 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">Download Audio File</h3>
                                        <p className="text-sm text-muted-foreground">Export as WAV file to your computer</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="text-xs">
                                                High Quality
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                                WAV Format
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                {selectedOption === "download" && (
                                    <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">Preparing download...</div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Export to BANDCOIN Option */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedOption === "bandcoin" ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/20" : ""
                                }`}
                            onClick={handleExportToBandcoin}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-3 rounded-full">
                                        {selectedOption === "bandcoin" ? (
                                            <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                                        ) : (
                                            <Upload className="h-6 w-6 text-purple-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">Export to BANDCOIN</h3>
                                        <p className="text-sm text-muted-foreground">Publish your track to the BANDCOIN platform</p>
                                        <div className="flex items-center gap-2 mt-2">

                                            <Badge
                                                variant="secondary"
                                                className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30"
                                            >
                                                NFT Ready
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30"
                                            >
                                                Blockchain
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                {selectedOption === "bandcoin" && (
                                    <div className="mt-4 text-sm text-purple-600 dark:text-purple-400">
                                        Preparing for BANDCOIN export...
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Info Section */}
                    <div className={`text-center text-xs ${isDark ? "text-gray-400" : "text-gray-500"} pt-2`}>
                        <p>
                            Both options will process your {trackCount} track{trackCount !== 1 ? "s" : ""} into a single audio file
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
