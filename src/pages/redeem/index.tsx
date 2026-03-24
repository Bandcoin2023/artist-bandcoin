"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/router"
import {
    QrCode, Hash, User, CheckCircle2, XCircle, AlertCircle,
    Loader2, ScanLine, KeyboardIcon, ArrowLeft, ShieldCheck, RefreshCw,
} from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Input } from "~/components/shadcn/ui/input"
import { Card, CardContent, CardHeader } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { api } from "~/utils/api"  // adjust to your tRPC client import path
import jsQR from "jsqr"

// ─── Types ─────────────────────────────────────────────────────────────────────

type RedeemStatus = "idle" | "loading" | "success" | "already_redeemed" | "not_found" | "not_consumed" | "error"

type RedeemResult = Awaited<ReturnType<typeof api.maps.pin.redeemCollection.useMutation>>["data"] & {
    message?: string
}

// ─── Status Config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    success: {
        icon: <CheckCircle2 className="w-14 h-14" style={{ color: "hsl(var(--success))" }} />,
        color: "font-semibold",
        colorStyle: { color: "hsl(var(--success))" },
        bgStyle: { backgroundImage: "linear-gradient(135deg, hsl(var(--success) / 0.1), hsl(var(--success) / 0.05))" },
        title: "Redeemed Successfully!",
        desc: (_r: RedeemResult) => "The reward has been marked as redeemed.",
    },
    already_redeemed: {
        icon: <AlertCircle className="w-14 h-14" style={{ color: "hsl(var(--warning))" }} />,
        color: "font-semibold",
        colorStyle: { color: "hsl(var(--warning))" },
        bgStyle: { backgroundImage: "linear-gradient(135deg, hsl(var(--warning) / 0.1), hsl(var(--warning) / 0.05))" },
        title: "Already Redeemed",
        desc: (r: RedeemResult) =>
            r?.consumer?.redeemedAt
                ? `Already redeemed on ${new Date(r.consumer.redeemedAt).toLocaleString()}.`
                : "This reward was already redeemed.",
    },
    not_found: {
        icon: <XCircle className="w-14 h-14" style={{ color: "hsl(var(--destructive))" }} />,
        color: "font-semibold",
        colorStyle: { color: "hsl(var(--destructive))" },
        bgStyle: { backgroundImage: "linear-gradient(135deg, hsl(var(--destructive) / 0.1), hsl(var(--destructive) / 0.05))" },
        title: "Not Found",
        desc: (_r: RedeemResult) => "No location found with this Collection ID.",
    },
    not_consumed: {
        icon: <XCircle className="w-14 h-14" style={{ color: "hsl(var(--muted-foreground))" }} />,
        color: "font-semibold",
        colorStyle: { color: "hsl(var(--muted-foreground))" },
        bgStyle: { backgroundImage: "linear-gradient(135deg, hsl(var(--muted) / 0.2), hsl(var(--muted) / 0.1))" },
        title: "Not Yet Collected",
        desc: (_r: RedeemResult) => "This user has not collected this location yet.",
    },
    error: {
        icon: <XCircle className="w-14 h-14" style={{ color: "hsl(var(--destructive))" }} />,
        color: "font-semibold",
        colorStyle: { color: "hsl(var(--destructive))" },
        bgStyle: { backgroundImage: "linear-gradient(135deg, hsl(var(--destructive) / 0.1), hsl(var(--destructive) / 0.05))" },
        title: "Error",
        desc: (r: RedeemResult) => r?.message ?? "Something went wrong. Please try again.",
    },
} as const

// ─── Page ───────────────────────────────────────────────────────────────────────

const RedeemPage = () => {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [mode, setMode] = useState<"manual" | "scan">("manual")
    const [collectionId, setCollectionId] = useState("")
    const [userId, setUserId] = useState("")
    const [scanActive, setScanActive] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [clientError, setClientError] = useState<string | null>(null)

    // ── tRPC mutation ──────────────────────────────────────────────────────────
    const redeemMutation = api.maps.pin.redeemCollection.useMutation()

    const mutationStatus: RedeemStatus = redeemMutation.isLoading
        ? "loading"
        : redeemMutation.isError
            ? "error"
            : redeemMutation.isSuccess
                ? (redeemMutation.data?.status ?? "error")
                : "idle"

    const mutationResult = redeemMutation.isError
        ? { status: "error" as const, message: redeemMutation.error?.message }
        : redeemMutation.data

    // ── QR Scanner ─────────────────────────────────────────────────────────────
    const startScan = async () => {
        setScanError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                void videoRef.current.play()
                setScanActive(true)
            }
            scanIntervalRef.current = setInterval(() => {
                if (!videoRef.current || !canvasRef.current) return
                const video = videoRef.current
                const canvas = canvasRef.current
                if (video.readyState !== video.HAVE_ENOUGH_DATA) return
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                const ctx = canvas.getContext("2d")
                if (!ctx) return
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const code = jsQR(imageData.data, canvas.width, canvas.height)
                if (code?.data) {
                    try {
                        const parsed = JSON.parse(code.data) as { collectionId?: string; userId?: string }
                        if (parsed.collectionId && parsed.userId) {
                            stopScan(stream)
                            setCollectionId(parsed.collectionId)
                            setUserId(parsed.userId)
                            setMode("manual")
                        }
                    } catch {
                        // not our QR format, keep scanning
                    }
                }
            }, 300)
        } catch {
            setScanError("Camera access denied. Please allow camera permissions.")
        }
    }

    const stopScan = (stream?: MediaStream) => {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
        const s = stream ?? (videoRef.current?.srcObject as MediaStream | null)
        s?.getTracks().forEach((t) => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
        setScanActive(false)
    }

    useEffect(() => () => stopScan(), [])

    const handleModeSwitch = (m: "manual" | "scan") => {
        if (m === "scan") void startScan()
        else stopScan()
        setMode(m)
        redeemMutation.reset()
    }

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleRedeem = () => {
        if (!collectionId.trim() || !userId.trim()) return
        setClientError(null)
        redeemMutation.mutate({ collectionId: collectionId.trim(), userId: userId.trim() })
    }

    const handleReset = () => {
        setCollectionId("")
        setUserId("")
        redeemMutation.reset()
        setClientError(null)
    }

    const cfg =
        mutationStatus !== "idle" && mutationStatus !== "loading"
            ? STATUS_CONFIG[mutationStatus]
            : null

    return (
        <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>


            <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
                {/* ── Mode Toggle ── */}
                <motion.div
                    className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl"
                    style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {(["manual", "scan"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => handleModeSwitch(m)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                            style={{
                                backgroundColor: mode === m ? "hsl(var(--primary))" : "transparent",
                                color: mode === m ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                                boxShadow: mode === m ? "0 10px 15px -3px hsl(var(--primary) / 0.3)" : "none"
                            }}
                        >
                            {m === "manual" ? <KeyboardIcon className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
                            {m === "manual" ? "Enter Manually" : "Scan QR"}
                        </button>
                    ))}
                </motion.div>

                {/* ── QR Scanner ── */}
                <AnimatePresence>
                    {mode === "scan" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative overflow-hidden rounded-3xl aspect-square"
                            style={{ backgroundColor: "hsl(0, 0%, 0%)", border: "1px solid hsl(var(--border))" }}
                        >
                            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Scan overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative w-52 h-52">
                                    <div className="absolute inset-0 border-2 rounded-2xl opacity-60" style={{ borderColor: "hsl(var(--accent))" }} />
                                    {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                                        <div
                                            key={pos}
                                            className={`absolute w-6 h-6 border-[3px]
                        ${pos === "tl" ? "top-0 left-0 border-r-0 border-b-0 rounded-tl-xl" : ""}
                        ${pos === "tr" ? "top-0 right-0 border-l-0 border-b-0 rounded-tr-xl" : ""}
                        ${pos === "bl" ? "bottom-0 left-0 border-r-0 border-t-0 rounded-bl-xl" : ""}
                        ${pos === "br" ? "bottom-0 right-0 border-l-0 border-t-0 rounded-br-xl" : ""}
                      `}
                                            style={{ borderColor: "hsl(var(--accent))" }}
                                        />
                                    ))}
                                    <motion.div
                                        className="absolute left-2 right-2 h-0.5 rounded-full opacity-80"
                                        style={{ backgroundColor: "hsl(var(--accent))" }}
                                        animate={{ top: ["10%", "90%", "10%"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                            </div>

                            {!scanActive && !scanError && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "hsl(0, 0%, 0% / 0.6)" }}>
                                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--accent))" }} />
                                </div>
                            )}
                            {scanError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: "hsl(0, 0%, 0% / 0.8)" }}>
                                    <XCircle className="w-10 h-10 mb-3" style={{ color: "hsl(var(--destructive))" }} />
                                    <p className="text-sm" style={{ color: "hsl(var(--destructive) / 0.8)" }}>{scanError}</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Manual Input ── */}
                <AnimatePresence>
                    {mode === "manual" && mutationStatus === "idle" && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <Card className="rounded-3xl backdrop-blur-xl" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                                <CardContent className="p-6 space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                                            <Hash className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                                            Collection / Pin ID
                                        </label>
                                        <Input
                                            value={collectionId}
                                            onChange={(e) => setCollectionId(e.target.value)}
                                            placeholder="e.g. clxk2abc..."
                                            className="rounded-2xl h-12 font-mono text-sm focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: "hsl(var(--background))",
                                                color: "hsl(var(--foreground))",
                                                borderColor: "hsl(var(--border))",

                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                                            <User className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                                            User ID
                                        </label>
                                        <Input
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            placeholder="e.g. clxk3xyz..."
                                            className="rounded-2xl h-12 font-mono text-sm focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: "hsl(var(--background))",
                                                color: "hsl(var(--foreground))",
                                                borderColor: "hsl(var(--border))",

                                            }}
                                        />
                                    </div>

                                    {clientError && (
                                        <p className="text-sm text-center" style={{ color: "hsl(var(--destructive))" }}>{clientError}</p>
                                    )}

                                    <Button
                                        onClick={handleRedeem}
                                        disabled={!collectionId.trim() || !userId.trim()}
                                        className="w-full h-12 rounded-2xl font-semibold text-base disabled:opacity-40 transition-all"
                                        style={{
                                            backgroundImage: `linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))`,
                                            color: "hsl(var(--primary-foreground))",
                                            boxShadow: "0 10px 15px -3px hsl(var(--primary) / 0.3)"
                                        }}
                                    >
                                        <ShieldCheck className="mr-2 h-5 w-5" />
                                        Verify & Redeem
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Loading ── */}
                <AnimatePresence>
                    {mutationStatus === "loading" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 gap-5"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 animate-spin" style={{ borderColor: "hsl(var(--primary) / 0.2)", borderTopColor: "hsl(var(--primary))" }} />
                                <ShieldCheck className="absolute inset-0 m-auto w-6 h-6" style={{ color: "hsl(var(--accent))" }} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Verifying redemption…</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Result ── */}
                <AnimatePresence>
                    {cfg && mutationResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        >
                            <Card className="border-0 rounded-3xl shadow-2xl overflow-hidden" style={cfg.bgStyle}>
                                <CardContent className="p-8 flex flex-col items-center text-center gap-5">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                                    >
                                        {cfg.icon}
                                    </motion.div>

                                    <div>
                                        <h3 className={`text-2xl font-bold mb-2 ${cfg.color}`} style={cfg.colorStyle}>{cfg.title}</h3>
                                        <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "hsl(var(--muted-foreground))" }}>
                                            {cfg.desc(mutationResult as RedeemResult)}
                                        </p>
                                    </div>

                                    {/* ID summary */}
                                    <div className="w-full space-y-2 text-left">
                                        <div className="flex justify-between items-center p-3 rounded-2xl" style={{ backgroundColor: "hsl(var(--background))" }}>
                                            <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Collection ID</span>
                                            <span className="text-xs font-mono truncate max-w-[180px]" style={{ color: "hsl(var(--foreground))" }}>
                                                {collectionId}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 rounded-2xl" style={{ backgroundColor: "hsl(var(--background))" }}>
                                            <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>User ID</span>
                                            <span className="text-xs font-mono truncate max-w-[180px]" style={{ color: "hsl(var(--foreground))" }}>
                                                {userId}
                                            </span>
                                        </div>
                                        {"consumer" in mutationResult && mutationResult.consumer?.redeemedAt && (
                                            <div className="flex justify-between items-center p-3 rounded-2xl" style={{ backgroundColor: "hsl(var(--background))" }}>
                                                <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Redeemed At</span>
                                                <span className="text-xs font-mono" style={{ color: "hsl(var(--foreground))" }}>
                                                    {new Date(mutationResult.consumer.redeemedAt).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleReset}
                                        variant="outline"
                                        className="w-full rounded-2xl transition-colors"
                                        style={{
                                            borderColor: "hsl(var(--border))",
                                            color: "hsl(var(--foreground))",
                                            backgroundColor: "hsl(var(--card))"
                                        }}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Redeem Another
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default RedeemPage