import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

// Fix for default marker icons in Leaflet with bundlers
// The default icon paths don't work when bundled
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

export interface MapProps {
  lat: number
  lon: number
  zoom?: number
  markerLabel?: string
  height?: string
  className?: string
}

// Component to handle map center updates when coordinates change
function MapUpdater({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  const prevCoords = useRef({ lat, lon })

  useEffect(() => {
    if (prevCoords.current.lat !== lat || prevCoords.current.lon !== lon) {
      map.setView([lat, lon], map.getZoom())
      prevCoords.current = { lat, lon }
    }
  }, [map, lat, lon])

  return null
}

export function Map({
  lat,
  lon,
  zoom = 15,
  markerLabel,
  height = '300px',
  className,
}: MapProps) {
  // Validate coordinates
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
          className
        )}
        style={{ height }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No location coordinates available
        </p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700', className)}>
      <MapContainer
        center={[lat, lon]}
        zoom={zoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]}>
          {markerLabel && (
            <Popup>
              <div className="text-sm font-medium text-gray-900">{markerLabel}</div>
            </Popup>
          )}
        </Marker>
        <MapUpdater lat={lat} lon={lon} />
      </MapContainer>
    </div>
  )
}

export default Map
