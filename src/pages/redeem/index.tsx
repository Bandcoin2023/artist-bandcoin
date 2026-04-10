"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2, XCircle, AlertCircle,
    ShieldCheck, RefreshCw, Ticket, Clock, Users, Search,
} from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Input } from "~/components/shadcn/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/shadcn/ui/avatar"
import { api } from "~/utils/api"

// ─── Types ─────────────────────────────────────────────────────────────────────

type RedeemStatus = "success" | "already_redeemed" | "not_found"

const STATUS_UI: Record<RedeemStatus, {
    icon: React.ReactNode
    title: string
    desc: string
    accent: string
    bg: string
    border: string
}> = {
    success: {
        icon: <CheckCircle2 className="w-10 h-10 [color:hsl(var(--success))]" strokeWidth={1.5} />,
        title: "Redeemed!",
        desc: "Reward successfully claimed.",
        accent: "[color:hsl(var(--success))]",
        bg: "[background-color:hsl(var(--success)/0.08)]",
        border: "[border-color:hsl(var(--success)/0.2)]",
    },
    already_redeemed: {
        icon: <AlertCircle className="w-10 h-10 [color:hsl(var(--warning))]" strokeWidth={1.5} />,
        title: "Already Used",
        desc: "This code was already redeemed.",
        accent: "[color:hsl(var(--warning))]",
        bg: "[background-color:hsl(var(--warning)/0.08)]",
        border: "[border-color:hsl(var(--warning)/0.2)]",
    },
    not_found: {
        icon: <XCircle className="w-10 h-10 [color:hsl(var(--destructive))]" strokeWidth={1.5} />,
        title: "Invalid Code",
        desc: "No reward found for this code.",
        accent: "[color:hsl(var(--destructive))]",
        bg: "[background-color:hsl(var(--destructive)/0.08)]",
        border: "[border-color:hsl(var(--destructive)/0.2)]",
    },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function UserLocationCard({
    user,
    location,
    extra,
}: {
    user: { name?: string | null; image?: string | null; email?: string | null }
    location: { title?: string | null; brand_name?: string | null; image_url?: string | null }
    extra?: React.ReactNode
}) {
    return (
        <div className="flex items-center gap-3 w-full [background-color:hsl(var(--card)/0.5)] rounded-2xl px-4 py-3 border [border-color:hsl(var(--border)/0.5)]">
            <Avatar className="h-10 w-10 border [border-color:hsl(var(--border)/0.6)] flex-shrink-0">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="bg-slate-700 text-white text-sm font-bold">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold [color:hsl(var(--foreground))] truncate">{user.name ?? "Unknown"}</p>
                <p className="text-xs [color:hsl(var(--muted-foreground))] truncate">{location.title ?? location.brand_name ?? "—"}</p>
            </div>
            {extra}
        </div>
    )
}

// ─── Tab: Redeem ───────────────────────────────────────────────────────────────

function RedeemTab() {
    const OTP_LENGTH = 6
    const [codeChars, setCodeChars] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""))
    const [failedStatus, setFailedStatus] = useState<Exclude<RedeemStatus, "success"> | null>(null)
    const [shakeNonce, setShakeNonce] = useState(0)
    const [successResult, setSuccessResult] = useState<{
        status: RedeemStatus
        user?: { name?: string | null; image?: string | null; email?: string | null }
        location?: { title?: string | null; brand_name?: string | null; image_url?: string | null }
        redeemedAt?: string | Date | null
    } | null>(null)
    const inputRefs = useRef<Array<HTMLInputElement | null>>([])
    const redeemMutation = api.maps.pin.redeemByCode.useMutation()

    const code = codeChars.join("")
    const status: RedeemStatus | null = successResult?.status ?? null
    const cfg = status ? STATUS_UI[status] : null

    const sanitize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    const isReady = codeChars.every((char) => char.length === 1)

    const focusInput = (index: number) => {
        const target = inputRefs.current[index]
        if (!target) return
        target.focus()
        target.select()
    }

    const applyValueFrom = (startIndex: number, rawValue: string) => {
        const clean = sanitize(rawValue)
        if (!clean.length) return
        setCodeChars((prev) => {
            const next = [...prev]
            for (let i = 0; i < clean.length && startIndex + i < OTP_LENGTH; i += 1) {
                next[startIndex + i] = clean[i] ?? ""
            }
            return next
        })
        const focusIndex = Math.min(startIndex + clean.length, OTP_LENGTH - 1)
        requestAnimationFrame(() => focusInput(focusIndex))
    }

    const handleInputChange = (index: number, rawValue: string) => {
        if (redeemMutation.isLoading) return
        setFailedStatus(null)

        const clean = sanitize(rawValue)
        if (!clean.length) {
            setCodeChars((prev) => {
                const next = [...prev]
                next[index] = ""
                return next
            })
            return
        }

        if (clean.length > 1) {
            applyValueFrom(index, clean)
            return
        }

        setCodeChars((prev) => {
            const next = [...prev]
            next[index] = clean
            return next
        })

        if (index < OTP_LENGTH - 1) {
            requestAnimationFrame(() => focusInput(index + 1))
        }
    }

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (redeemMutation.isLoading) return

        if (event.key === "Backspace") {
            event.preventDefault()
            setFailedStatus(null)
            setCodeChars((prev) => {
                const next = [...prev]
                if (next[index]) {
                    next[index] = ""
                    return next
                }
                if (index > 0) {
                    next[index - 1] = ""
                    requestAnimationFrame(() => focusInput(index - 1))
                }
                return next
            })
            return
        }

        if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault()
            focusInput(index - 1)
            return
        }

        if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
            event.preventDefault()
            focusInput(index + 1)
            return
        }

        if (event.key === "Enter" && isReady) {
            event.preventDefault()
            void handleSubmit()
        }
    }

    const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault()
        if (redeemMutation.isLoading) return
        setFailedStatus(null)
        applyValueFrom(index, event.clipboardData.getData("text"))
    }

    const handleSubmit = async () => {
        const clean = code.trim().toUpperCase()
        if (clean.length !== OTP_LENGTH || redeemMutation.isLoading) return

        setFailedStatus(null)

        try {
            const result = await redeemMutation.mutateAsync({ code: clean })
            if (result.status === "success") {
                setSuccessResult(result)
                return
            }

            setFailedStatus(result.status as Exclude<RedeemStatus, "success">)
            setShakeNonce((prev) => prev + 1)
        } catch {
            setFailedStatus("not_found")
            setShakeNonce((prev) => prev + 1)
        }
    }

    const handleReset = () => {
        setCodeChars(Array.from({ length: OTP_LENGTH }, () => ""))
        setFailedStatus(null)
        setShakeNonce(0)
        setSuccessResult(null)
        redeemMutation.reset()
        requestAnimationFrame(() => focusInput(0))
    }

    useEffect(() => {
        if (successResult) return
        focusInput(0)
    }, [successResult])

    return (
        <div className="space-y-5">
            <AnimatePresence mode="wait">
                {!status && (
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-5"
                    >
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className="w-16 h-16 rounded-full [background-color:hsl(var(--primary)/0.06)] border [border-color:hsl(var(--border)/0.2)] flex items-center justify-center">
                                <ShieldCheck className="w-7 h-7 [color:hsl(var(--muted-foreground))]" />
                            </div>
                            <h2 className="text-[30px] font-black leading-tight [color:hsl(var(--foreground))]">
                                Verify your reward code
                            </h2>
                            <p className="text-sm [color:hsl(var(--muted-foreground))]">
                                Enter the 6-character code to redeem.
                            </p>
                        </div>

                        <motion.div
                            key={shakeNonce}
                            animate={
                                failedStatus
                                    ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                                    : { x: 0 }
                            }
                            transition={{ duration: 0.42, ease: "easeInOut" }}
                            className="flex items-center justify-center gap-2 sm:gap-3"
                        >
                            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                                <div key={index} className="contents">
                                    <motion.input
                                        ref={(node) => {
                                            inputRefs.current[index] = node
                                        }}
                                        inputMode="text"
                                        autoComplete={index === 0 ? "one-time-code" : "off"}
                                        maxLength={1}
                                        value={codeChars[index] ?? ""}
                                        onChange={(event) => handleInputChange(index, event.target.value)}
                                        onKeyDown={(event) => handleKeyDown(index, event)}
                                        onPaste={(event) => handlePaste(index, event)}
                                        disabled={redeemMutation.isLoading}
                                        animate={
                                            redeemMutation.isLoading
                                                ? { opacity: [0.5, 1, 0.5] }
                                                : { opacity: 1 }
                                        }
                                        transition={
                                            redeemMutation.isLoading
                                                ? {
                                                    duration: 1.4,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: index * 0.12,
                                                }
                                                : { duration: 0.15 }
                                        }
                                        className={`
                      h-16 w-12 sm:w-14 rounded-xl border-2 text-center text-3xl font-black font-mono uppercase
                      [color:hsl(var(--foreground))]
                      transition-all duration-200 outline-none
                      ${failedStatus
                                                ? "[border-color:hsl(var(--destructive)/0.45)] [background-color:hsl(var(--destructive)/0.09)]"
                                                : "[border-color:hsl(var(--border)/0.45)] [background-color:hsl(var(--card)/0.6)] focus:[border-color:hsl(var(--success)/0.45)]"}
                    `}
                                    />
                                    {index === 2 ? (
                                        <div className="mx-0.5 w-6 flex items-center justify-center">
                                            <span className="text-2xl [color:hsl(var(--muted-foreground))]">-</span>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </motion.div>

                        {failedStatus ? (
                            <p className="text-center text-sm font-semibold [color:hsl(var(--destructive))]">
                                {STATUS_UI[failedStatus].desc}
                            </p>
                        ) : null}

                        <AnimatePresence initial={false}>
                            {isReady ? (
                                <motion.div
                                    key="inline-verify"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ type: "spring", stiffness: 240, damping: 22 }}
                                >
                                    <Button
                                        onClick={() => void handleSubmit()}
                                        disabled={redeemMutation.isLoading}
                                        className="w-full h-12 rounded-2xl font-bold text-sm transition-all duration-200 bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85 shadow-[0_12px_32px_rgba(0,0,0,0.22)] dark:shadow-[0_12px_32px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {redeemMutation.isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full border-2 [border-color:hsl(var(--foreground)/0.3)] [border-top-color:hsl(var(--foreground))] animate-spin" />
                                                Verifying...
                                            </div>
                                        ) : (
                                            <>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Verify & Redeem
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </motion.div>
                )}

                {cfg && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        className={`rounded-3xl border ${cfg.bg} ${cfg.border} p-6 space-y-4`}
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.06 }}
                            >
                                {cfg.icon}
                            </motion.div>
                            <div>
                                <h3 className={`text-xl font-black ${cfg.accent}`}>{cfg.title}</h3>
                                <p className="text-sm [color:hsl(var(--muted-foreground))]">{cfg.desc}</p>
                            </div>
                        </div>

                        {successResult?.user && successResult.location && (
                            <UserLocationCard
                                user={successResult.user}
                                location={successResult.location}
                                extra={
                                    status === "already_redeemed" && successResult.redeemedAt ? (
                                        <span className="text-xs text-amber-400/70 flex-shrink-0">
                                            {new Date(successResult.redeemedAt).toLocaleDateString()}
                                        </span>
                                    ) : undefined
                                }
                            />
                        )}

                        <div className="flex items-center justify-between px-4 py-2.5 [background-color:hsl(var(--card)/0.4)] rounded-xl">
                            <span className="text-xs [color:hsl(var(--muted-foreground))]">Code used</span>
                            <span className="text-sm font-mono font-bold [color:hsl(var(--foreground)/0.8)] tracking-widest">{code}</span>
                        </div>

                        <Button
                            onClick={handleReset}
                            variant="ghost"
                            className="w-full h-10 rounded-xl [color:hsl(var(--muted-foreground))] hover:[color:hsl(var(--foreground))] hover:[background-color:hsl(var(--card)/0.8)] text-sm"
                        >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Redeem another
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
// ─── Tab: History ──────────────────────────────────────────────────────────────

function HistoryTab() {
    const [search, setSearch] = useState("")
    const { data, isLoading } = api.maps.pin.getRedeemedByCreator.useQuery()
    type RedeemHistoryEntry = {
        id: string
        user?: { name?: string | null; image?: string | null } | null
        location?: { title?: string | null } | null
        redeemCode?: string | null
        redeemedAt?: string | Date | null
    }
    const historyItems: RedeemHistoryEntry[] = Array.isArray(data) ? (data as RedeemHistoryEntry[]) : []

    const filtered = historyItems.filter((item) => {
        const q = search.toLowerCase()
        const safeName = typeof item.user?.name === "string" ? item.user.name : ""
        const safeLocationTitle = typeof item.location?.title === "string" ? item.location.title : ""
        const safeCode = typeof item.redeemCode === "string" ? item.redeemCode : ""
        const nameMatch = safeName.toLowerCase().includes(q)
        const locationMatch = safeLocationTitle.toLowerCase().includes(q)
        const codeMatch = safeCode.toLowerCase().includes(q)
        return (
            nameMatch ||
            locationMatch ||
            codeMatch
        )
    })

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 [border-color:hsl(var(--border)/0.15)] [border-top-color:hsl(var(--foreground)/0.6)] rounded-full animate-spin" />
                <p className="[color:hsl(var(--muted-foreground))] text-sm">Loading history…</p>
            </div>
        )
    }

    if (!data?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl [background-color:hsl(var(--card)/0.5)] border [border-color:hsl(var(--border)/0.6)] flex items-center justify-center">
                    <Users className="w-6 h-6 [color:hsl(var(--muted-foreground))]" />
                </div>
                <p className="[color:hsl(var(--foreground))] text-sm font-medium">No redemptions yet</p>
                <p className="[color:hsl(var(--muted-foreground))] text-xs max-w-[200px]">
                    Redeemed rewards from your pins will appear here.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 [color:hsl(var(--muted-foreground))]" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, pin or code…"
                    className="pl-10 h-10 [background-color:hsl(var(--card)/0.5)] [border-color:hsl(var(--border)/0.15)] [color:hsl(var(--foreground))] placeholder:[color:hsl(var(--muted-foreground))] rounded-xl text-sm focus-visible:ring-0 focus-visible:[border-color:hsl(var(--border)/0.2)]"
                />
            </div>

            {/* Count */}
            <div className="flex items-center justify-between">
                <p className="text-xs [color:hsl(var(--muted-foreground))]">{filtered.length} redemption{filtered.length !== 1 ? "s" : ""}</p>
            </div>

            {/* List */}
            <div className="space-y-2">
                {filtered.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 [background-color:hsl(var(--card)/0.4)] hover:[background-color:hsl(var(--card)/0.7)] border [border-color:hsl(var(--border)/0.15)] rounded-2xl px-4 py-3 transition-colors"
                    >
                        <Avatar className="h-9 w-9 border [border-color:hsl(var(--border)/0.6)] flex-shrink-0">
                            <AvatarImage src={item.user?.image ?? ""} />
                            <AvatarFallback className="[background-color:hsl(var(--card))] [color:hsl(var(--foreground))] text-xs font-bold">
                                {item.user?.name?.[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold [color:hsl(var(--foreground))] truncate">
                                {item.user?.name ?? "Unknown user"}
                            </p>
                            <p className="text-xs [color:hsl(var(--muted-foreground))] truncate">
                                {item.location?.title ?? "—"}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-mono font-bold [color:hsl(var(--foreground)/0.8)] tracking-widest">
                                {item.redeemCode}
                            </span>
                            <span className="text-xs [color:hsl(var(--muted-foreground))] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.redeemedAt
                                    ? new Date(item.redeemedAt).toLocaleDateString("en-US", {
                                        month: "short", day: "numeric",
                                    })
                                    : "—"}
                            </span>
                        </div>
                    </motion.div>
                ))}

                {filtered.length === 0 && search && (
                    <p className="text-center [color:hsl(var(--muted-foreground))] text-sm py-8">No results for {search}</p>
                )}
            </div>
        </div>
    )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

const RedeemPage = () => {
    const [tab, setTab] = useState<"redeem" | "history">("redeem")

    return (
        <div className="min-h-screen [background-color:hsl(var(--background))] [color:hsl(var(--foreground))]">
            {/* Subtle background texture */}
            <div className="fixed inset-0 [background-image:radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--success)/0.06),transparent)] pointer-events-none" />

            {/* Header */}

            <div className="px-5 pb-12 max-w-md mx-auto">
                {/* Tabs */}
                <motion.div
                    className="flex gap-1 [background-color:hsl(var(--primary)/0.4)] border [border-color:hsl(var(--border)/0.15)] rounded-2xl p-1 my-6"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    {(["redeem", "history"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`
                flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === t
                                    ? "[background-color:hsl(var(--card)/0.6)] [color:hsl(var(--foreground))] shadow-sm "
                                    : "[color:hsl(var(--muted-foreground))] hover:[color:hsl(var(--foreground)/0.8)]"
                                }
              `}
                        >
                            {t === "redeem"
                                ? <><Ticket className="w-4 h-4" />Redeem</>
                                : <><Users className="w-4 h-4" />History</>
                            }
                        </button>
                    ))}
                </motion.div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                    >
                        {tab === "redeem" ? <RedeemTab /> : <HistoryTab />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

export default RedeemPage
