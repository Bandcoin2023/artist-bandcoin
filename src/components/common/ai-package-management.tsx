"use client"

import type React from "react"

import { useState } from "react"
import { api } from "~/utils/api"
import { Button } from "../shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../shadcn/ui/card"
import { Input } from "../shadcn/ui/input"
import { Label } from "../shadcn/ui/label"
import { Checkbox } from "../shadcn/ui/checkbox"
import { Badge } from "../shadcn/ui/badge"
import { Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { Textarea } from "../shadcn/ui/textarea"

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
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const { data, refetch } = api.credit.adminGetAllPackages.useQuery()
    const createPackage = api.credit.adminCreatePackage.useMutation({
        onSuccess: () => {
            setIsCreating(false)
            refetch()
        },
    })
    const updatePackage = api.credit.adminUpdatePackage.useMutation({
        onSuccess: () => {
            setEditingId(null)
            refetch()
        },
    })
    const deletePackage = api.credit.adminDeletePackage.useMutation({
        onSuccess: () => refetch(),
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Credit Packages</h2>
                    <p className="text-muted-foreground">Manage credit packages for users to purchase</p>
                </div>
                <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Package
                </Button>
            </div>

            {isCreating && (
                <PackageForm
                    onSave={(data) => createPackage.mutate(data)}
                    onCancel={() => setIsCreating(false)}
                    isLoading={createPackage.isLoading}
                />
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data?.packages.map((pkg) => (
                    <div key={pkg.id}>
                        {editingId === pkg.id ? (
                            <PackageForm
                                initialData={pkg}
                                onSave={(data) => updatePackage.mutate({ id: pkg.id, ...data })}
                                onCancel={() => setEditingId(null)}
                                isLoading={updatePackage.isLoading}
                            />
                        ) : (
                            <PackageCard
                                package={pkg}
                                onEdit={() => setEditingId(pkg.id)}
                                onDelete={() => {
                                    if (confirm(`Delete "${pkg.name}"?`)) {
                                        deletePackage.mutate({ id: pkg.id })
                                    }
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
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
                        <span className="text-muted-foreground">BANDCOIN Price:</span>
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
    onSave: (data: any) => void
    onCancel: () => void
    isLoading: boolean
}) {
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        description: initialData?.description || "",
        credits: initialData?.credits || 0,
        bonus: initialData?.bonus || 0,
        priceBand: initialData?.priceBand || 0,
        priceUSDC: initialData?.priceUSDC || 0,
        isPopular: initialData?.isPopular || false,
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{initialData ? "Edit Package" : "Create Package"}</CardTitle>
            </CardHeader>
            <CardContent>
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
                                onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                                min="1"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bonus">Bonus Credits</Label>
                            <Input
                                id="bonus"
                                type="number"
                                value={formData.bonus}
                                onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="priceBand">Price (BANDCOIN)</Label>
                            <Input
                                id="priceBand"
                                type="number"
                                step="0.01"
                                value={formData.priceBand}
                                onChange={(e) => setFormData({ ...formData, priceBand: Number(e.target.value) })}
                                min="0"
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
                                onChange={(e) => setFormData({ ...formData, priceUSDC: Number(e.target.value) })}
                                min="0"
                                required
                            />
                        </div>
                    </div>

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
                        <Button type="submit" disabled={isLoading} className="flex-1">
                            <Check className="mr-2 h-4 w-4" />
                            {initialData ? "Update" : "Create"}
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
