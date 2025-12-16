"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { api } from "~/utils/api"
import { Button } from "../shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../shadcn/ui/card"
import { Input } from "../shadcn/ui/input"
import { Label } from "../shadcn/ui/label"
import { Checkbox } from "../shadcn/ui/checkbox"
import { Badge } from "../shadcn/ui/badge"
import { Pencil, Trash2, Plus, Check, X, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Textarea } from "../shadcn/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "../shadcn/ui/dialog"
import PricingAssistant from "./pricing-assistant"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"

type Package = {
    id: string
    name: string
    description: string
    credits: number
    bonus: number
    priceBand: number
    priceUSDC: number
    isPopular: boolean
    isActive: boolean
}



export function PackageManagement() {
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

    const { data, refetch } = api.credit.adminGetAllPackages.useQuery()
    const createPackage = api.credit.adminCreatePackage.useMutation({
        onSuccess: () => {
            setCreateDialogOpen(false)
            refetch()
        },
    })
    const updatePackage = api.credit.adminUpdatePackage.useMutation({
        onSuccess: () => {
            setEditDialogOpen(false)
            setSelectedPackage(null)
            refetch()
        },
    })
    const deletePackage = api.credit.adminDeletePackage.useMutation({
        onSuccess: () => {
            setDeleteDialogOpen(false)
            setSelectedPackage(null)
            refetch()
        },
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Credit Packages</h2>
                    <p className="text-muted-foreground">Manage credit packages for users to purchase</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Package
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data?.packages.map((pkg) => (
                    <PackageCard
                        key={pkg.id}
                        package={pkg}
                        onEdit={() => {
                            setSelectedPackage(pkg)
                            setEditDialogOpen(true)
                        }}
                        onDelete={() => {
                            setSelectedPackage(pkg)
                            setDeleteDialogOpen(true)
                        }}
                    />
                ))}
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create Package</DialogTitle>
                        <DialogDescription>Add a new credit package for users to purchase.</DialogDescription>
                    </DialogHeader>
                    <PackageForm
                        onSave={(data) => createPackage.mutate(data)}
                        onCancel={() => setCreateDialogOpen(false)}
                        isLoading={createPackage.isLoading}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Package</DialogTitle>
                        <DialogDescription>Update the details of this credit package.</DialogDescription>
                    </DialogHeader>
                    {selectedPackage && (
                        <PackageForm
                            initialData={selectedPackage}
                            onSave={(data) => updatePackage.mutate({ id: selectedPackage.id, ...data })}
                            onCancel={() => {
                                setEditDialogOpen(false)
                                setSelectedPackage(null)
                            }}
                            isLoading={updatePackage.isLoading}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Package</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedPackage?.name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false)
                                setSelectedPackage(null)
                            }}
                            disabled={deletePackage.isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (selectedPackage) {
                                    deletePackage.mutate({ id: selectedPackage.id })
                                }
                            }}
                            disabled={deletePackage.isLoading}
                        >
                            {deletePackage.isLoading ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function PackageCard({
    package: pkg,
    onEdit,
    onDelete,
}: {
    package: Package
    onEdit: () => void
    onDelete: () => void
}) {
    return (
        <Card className={!pkg.isActive ? "opacity-60" : ""}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            {pkg.name}
                            {pkg.isPopular && (
                                <Badge variant="secondary" className="text-xs">
                                    Popular
                                </Badge>
                            )}
                            {!pkg.isActive && (
                                <Badge variant="outline" className="text-xs">
                                    Inactive
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="mt-1">{pkg.description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{pkg.credits.toLocaleString()}</span>
                        <span className="text-muted-foreground">credits</span>
                    </div>
                    {pkg.bonus > 0 && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                            + {pkg.bonus.toLocaleString()} bonus credits
                        </div>
                    )}
                </div>

                <div className="space-y-1 border-t pt-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{PLATFORM_ASSET.code} Price:</span>
                        <span className="font-medium">{pkg.priceBand.toFixed(2)} BAND</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">USDC Price:</span>
                        <span className="font-medium">${pkg.priceUSDC.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 bg-transparent">
                        <Pencil className="mr-2 h-3 w-3" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive bg-transparent">
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function PackageForm({
    initialData,
    onSave,
    onCancel,
    isLoading,
}: {
    initialData?: Partial<Package>
    onSave: (data) => void
    onCancel: () => void
    isLoading: boolean
}) {
    const [formData, setFormData] = useState<{
        name: string
        description: string
        credits: string
        bonus: string
        priceBand: string
        priceUSDC: string
        isPopular: boolean
        isActive: boolean
    }>({
        name: initialData?.name ?? "",
        description: initialData?.description ?? "",
        credits: initialData?.credits?.toString() ?? "0",
        bonus: initialData?.bonus?.toString() ?? "0",
        priceBand: initialData?.priceBand?.toString() ?? "0",
        priceUSDC: initialData?.priceUSDC?.toString() ?? "0",
        isPopular: initialData?.isPopular ?? false,
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const data = {
            ...formData,
            credits: formData.credits === "0" ? 0 : Number(formData.credits),
            bonus: formData.bonus === "0" ? 0 : Number(formData.bonus),
            priceBand: formData.priceBand === "0" ? 0 : Number(formData.priceBand),
            priceUSDC: formData.priceUSDC === "0" ? 0 : Number(formData.priceUSDC),
        }
        onSave(data)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Starter Pack"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Perfect for getting started"
                    required
                    rows={2}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="credits">Credits</Label>
                    <Input
                        id="credits"
                        type="number"
                        value={formData.credits}
                        onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                        placeholder="1000"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bonus">Bonus Credits</Label>
                    <Input
                        id="bonus"
                        type="number"
                        value={formData.bonus}

                        onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                        placeholder="100"
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="priceBand">Price ({PLATFORM_ASSET.code})</Label>
                    <Input
                        id="priceBand"
                        type="number"
                        step="0.01"
                        value={formData.priceBand}
                        onChange={(e) => setFormData({ ...formData, priceBand: e.target.value })}
                        placeholder="9.99"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="priceUSDC">Price (USDC)</Label>
                    <Input
                        id="priceUSDC"
                        type="number"
                        step="0.01"
                        value={formData.priceUSDC}
                        onChange={(e) => setFormData({ ...formData, priceUSDC: e.target.value })}
                        placeholder="9.99"
                        required
                    />
                </div>
            </div>

            <PricingAssistant
                priceBand={formData.priceBand === "" ? 0 : Number(formData.priceBand)}
                priceUSDC={formData.priceUSDC === "" ? 0 : Number(formData.priceUSDC)}
                onPriceBandChange={(value) => setFormData({ ...formData, priceBand: value.toString() })}
                onPriceUSDCChange={(value) => setFormData({ ...formData, priceUSDC: value.toString() })}
            />

            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="isPopular"
                        checked={formData.isPopular}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked as boolean })}
                    />
                    <Label htmlFor="isPopular" className="cursor-pointer font-normal">
                        Mark as Popular
                    </Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer font-normal">
                        Active (visible to users)
                    </Label>
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 bg-transparent"
                >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                    <Check className="mr-2 h-4 w-4" />
                    {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    )
}
