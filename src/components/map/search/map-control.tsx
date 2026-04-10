"use client"

import React, { useState, useRef, useEffect } from "react"
import type { Input } from "~/components/shadcn/ui/input"
import mapboxgl from "mapbox-gl"

interface CustomMapControlProps {
    children: React.ReactNode // The Input component from shadcn/ui
    onPlaceSelect: (place: { lat: number; lng: number }) => void
    onCenterChange: (center: { lat: number; lng: number }) => void
    setIsCordsSearch: (value: boolean) => void
    setSearchCoordinates: (coords: { lat: number; lng: number } | undefined) => void
    setCordSearchLocation: (coords: { lat: number; lng: number } | undefined) => void
    setZoom: (zoom: number) => void
    mapInstance?: mapboxgl.Map | null
}

export function CustomMapControl({
    children,
    onPlaceSelect,
    onCenterChange,
    setIsCordsSearch,
    setSearchCoordinates,
    setCordSearchLocation,
    setZoom,
    mapInstance,
}: CustomMapControlProps) {
    const [inputValue, setInputValue] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault()
            handleCoordinatesInput()
        }
    }

    const handleBlur = () => {
        // Trigger coordinate input parsing if the user types coordinates and blurs
        handleCoordinatesInput()
    }

    const handleCoordinatesInput = () => {
        const value = inputValue.trim()
        const parts = value.split(",").map((str) => str.trim())

        if (parts.length === 2) {
            const lat = Number(parts[0])
            const lng = Number(parts[1])

            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                const latLng = { lat, lng }
                onCenterChange(latLng)
                setIsCordsSearch(true)
                setCordSearchLocation(latLng)
                setSearchCoordinates(latLng)
                setZoom(16)
                onPlaceSelect(latLng)
                return
            }
        }
    }

    // Clone the children (Input) to inject ref, onChange, onKeyDown, and onBlur
    const inputElement = React.Children.only(children) as React.ReactElement<React.ComponentProps<typeof Input>>

    return React.cloneElement(inputElement, {
        ref: inputRef,
        value: inputValue,
        onChange: handleInputChange,
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        placeholder: "Search or enter coordinates (lat, lng)",
    })
}
