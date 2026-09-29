/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps'
import { HugeiconsIcon } from '@hugeicons/react'
import { Location01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface LocationCoordinates {
  lat: number
  lng: number
}

interface LocationFieldProps {
  value: string
  onChange: (location: string) => void
  coordinates: LocationCoordinates | null
  onCoordinatesChange: (coordinates: LocationCoordinates | null) => void
  /** Address stored in the user's profile, used by the "Use my address" button. */
  userAddress?: string
}

const NO_ADDRESS_HINT = 'Update your user profile with an address to use this functionality.'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

function MapPreviewPlaceholder() {
  return (
    <div className="flex h-28 items-center justify-center rounded-card border border-dashed border-joyna-border-strong bg-joyna-border/40 text-joyna-ink-faint">
      Map preview
    </div>
  )
}

function LocationReadout({ location }: { location: string }) {
  if (!location) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-joyna-ink-soft">
      <HugeiconsIcon icon={Location01Icon} className="h-3.5 w-3.5" strokeWidth={2} />
      {location}
    </div>
  )
}

function LocationMap({ coordinates }: { coordinates: LocationCoordinates }) {
  return (
    <div className="h-28 overflow-hidden rounded-card border border-joyna-border">
      <Map
        mapId={MAP_ID}
        defaultCenter={coordinates}
        center={coordinates}
        defaultZoom={15}
        gestureHandling="none"
        disableDefaultUI
        className="h-full w-full"
      >
        <AdvancedMarker position={coordinates} />
      </Map>
    </div>
  )
}

/**
 * Wraps google.maps.places.PlaceAutocompleteElement — the current
 * recommended search widget (the older google.maps.places.Autocomplete has
 * been closed to new customers since March 2025). It's a self-contained web
 * component with its own text input, so it replaces a plain <Input> here
 * rather than sitting alongside one. @vis.gl/react-google-maps doesn't wrap
 * it, so it's instantiated directly via the places library loaded by
 * useMapsLibrary.
 */
function PlaceSearchInput({
  value,
  onChange,
  onCoordinatesChange,
}: {
  value: string
  onChange: (location: string) => void
  onCoordinatesChange: (coordinates: LocationCoordinates | null) => void
}) {
  const placesLib = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const justSelectedRef = useRef(false)
  const elementRef = useRef<HTMLElement | null>(null)

  // Push externally-set values (e.g. "Use my address") into the widget's
  // internal <input>. Typed values already match, so this is a no-op then.
  useEffect(() => {
    const internalInput = elementRef.current?.querySelector('input')
    if (internalInput && internalInput.value !== value) internalInput.value = value
  }, [value, placesLib])

  useEffect(() => {
    const container = containerRef.current
    if (!placesLib || !container) return

    const element = new placesLib.PlaceAutocompleteElement()
    element.className = 'w-full'
    container.appendChild(element)
    elementRef.current = element

    // PlaceAutocompleteElement has no documented API to set its initial
    // displayed text (see visgl/react-google-maps discussion #256) — reach
    // into its internal <input> as a best-effort hydration for
    // edit-event's pre-filled location. Free typing and selection both
    // still work even if this fails to find it.
    if (value && !hydratedRef.current) {
      const internalInput = element.querySelector('input')
      if (internalInput) internalInput.value = value
      hydratedRef.current = true
    }

    function handleInput(event: Event) {
      // Selecting a suggestion may itself dispatch a native `input` event
      // as the widget fills in the chosen text — skip clearing the
      // coordinates we just set in that one case.
      if (justSelectedRef.current) {
        justSelectedRef.current = false
        return
      }
      const target = event.target as HTMLInputElement
      onChange(target.value)
      onCoordinatesChange(null)
    }

    async function handleSelect(event: { placePrediction: google.maps.places.PlacePrediction | null }) {
      if (!event.placePrediction) return
      const place = event.placePrediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress', 'location'] })
      if (!place.location) return
      justSelectedRef.current = true
      onChange(place.formattedAddress ?? '')
      onCoordinatesChange({ lat: place.location.lat(), lng: place.location.lng() })
    }

    element.addEventListener('input', handleInput)
    element.addEventListener('gmp-select', handleSelect)

    return () => {
      element.removeEventListener('input', handleInput)
      element.removeEventListener('gmp-select', handleSelect)
      container.removeChild(element)
      elementRef.current = null
    }
    // Only re-run when the places library first loads — value/onChange/
    // onCoordinatesChange are intentionally read via closures captured once
    // per mount rather than re-creating (and tearing down) the native
    // element on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib])

  return <div ref={containerRef} />
}

interface UseMyAddressButtonProps {
  userAddress?: string
  onChange: (location: string) => void
  onCoordinatesChange: (coordinates: LocationCoordinates | null) => void
  geocode?: (address: string) => Promise<LocationCoordinates | null>
}

function UseMyAddressButton({ userAddress, onChange, onCoordinatesChange, geocode }: UseMyAddressButtonProps) {
  const [showHint, setShowHint] = useState(false)

  async function handleClick() {
    if (!userAddress) {
      setShowHint(true)
      return
    }
    setShowHint(false)
    onChange(userAddress)
    onCoordinatesChange(null)
    if (geocode) onCoordinatesChange(await geocode(userAddress))
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={handleClick}>
        Use my address
      </Button>
      {showHint && <p className="text-xs text-joyna-ink-faint">{NO_ADDRESS_HINT}</p>}
    </div>
  )
}

/** Geocodes the address so the map pin matches it; must render inside APIProvider. */
function GeocodingAddressButton(props: Omit<UseMyAddressButtonProps, 'geocode'>) {
  const geocodingLib = useMapsLibrary('geocoding')

  async function geocode(address: string) {
    if (!geocodingLib) return null
    try {
      const { results } = await new geocodingLib.Geocoder().geocode({ address })
      const loc = results[0]?.geometry.location
      return loc ? { lat: loc.lat(), lng: loc.lng() } : null
    } catch {
      return null
    }
  }

  return <UseMyAddressButton {...props} geocode={geocode} />
}

/**
 * Location field for the create/edit event forms: a free-text search box
 * backed by real address autocomplete, with a live map preview once a
 * suggestion is selected. Typing without selecting a suggestion behaves
 * exactly like a plain text field — informal locations ("Ada's place")
 * still work, they just don't get a map pin.
 *
 * Falls back to a plain text input with a static placeholder when no
 * VITE_GOOGLE_MAPS_API_KEY is configured, so local dev/tests without a key
 * (and CI) don't need one.
 */
export function LocationField({
  value,
  onChange,
  coordinates,
  onCoordinatesChange,
  userAddress,
}: LocationFieldProps) {
  if (!API_KEY) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-joyna-ink-soft">Location</span>
        <Input
          placeholder="Search for a place…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl bg-white"
        />
        <UseMyAddressButton userAddress={userAddress} onChange={onChange} onCoordinatesChange={onCoordinatesChange} />
        <MapPreviewPlaceholder />
        <LocationReadout location={value} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-joyna-ink-soft">Location</span>
      <APIProvider apiKey={API_KEY}>
        <PlaceSearchInput value={value} onChange={onChange} onCoordinatesChange={onCoordinatesChange} />
        <GeocodingAddressButton
          userAddress={userAddress}
          onChange={onChange}
          onCoordinatesChange={onCoordinatesChange}
        />
        {coordinates ? <LocationMap coordinates={coordinates} /> : <MapPreviewPlaceholder />}
      </APIProvider>
      <LocationReadout location={value} />
    </div>
  )
}
