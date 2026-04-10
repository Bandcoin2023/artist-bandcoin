"use client"

import { useState } from "react"

export function useMapState() {
    const [mapZoom, setMapZoom] = useState<number>(15.3)
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
        lat: 22.54992,
        lng: 0,
    })
    const [centerChanged, setCenterChanged] = useState<{ lat: number; lng: number } | null>(null)
    const [isCordsSearch, setIsCordsSearch] = useState<boolean>(false)
    const [searchCoordinates, setSearchCoordinates] = useState<{ lat: number; lng: number } | undefined>()
    const [cordSearchCords, setCordSearchCords] = useState<{ lat: number; lng: number } | undefined>()

    return {
        mapZoom,
        setMapZoom,
        mapCenter,
        setMapCenter,
        centerChanged,
        setCenterChanged,
        isCordsSearch,
        setIsCordsSearch,
        searchCoordinates,
        setSearchCoordinates,
        cordSearchCords,
        setCordSearchCords,
    }
}
