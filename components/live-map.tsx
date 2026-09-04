"use client"

import { useEffect, useState } from "react"
import type { Order } from "@/lib/types"

// Mock location data for Kolkata area
const locationMap: Record<string, [number, number]> = {
  "Parbatipur": [22.5726, 88.3639],
  "Old Gopalpur": [22.4883, 88.3710],
  "Baninagar": [22.5134, 88.3567],
  "2no. Pritinagar": [22.5667, 88.4167],
  "Dashara": [22.5501, 88.3751],
  "Kolkata": [22.5726, 88.3639],
}

interface LiveMapProps {
  orders: Order[]
}

export function LiveMap({ orders }: LiveMapProps) {
  const [mounted, setMounted] = useState(false)
  const [mapUrl, setMapUrl] = useState("")

  useEffect(() => {
    setMounted(true)
    // Dynamically set the map URL after mount to avoid SSR issues
    const center = [22.5726, 88.3639]
    const zoom = 13
    setMapUrl(`https://tile.openstreetmap.org/html?center=${center[0]},${center[1]}&zoom=${zoom}`)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  // Filter orders with valid addresses
  const validOrders = orders.filter(o => !o.deleted && o.address && locationMap[o.address])

  // Create markers list
  const markersList = validOrders.map(order => {
    const coords = locationMap[order.address]
    return { name: order.name, product: order.product, address: order.address, orderNo: order.orderNo, status: order.status, coords }
  })

  return (
    <div className="w-full h-[300px] rounded-lg overflow-hidden border bg-card flex flex-col">
      {/* Simple map using OpenStreetMap via iFrame */}
      <iframe
        title="Delivery Locations Map"
        src="https://www.openstreetmap.org/export/embed.html?bbox=88.3000,22.5000,88.4500,22.6500&layer=mapnik"
        style={{ width: "100%", height: "100%" }}
        className="border-0"
      />
      
      {/* Markers list below map */}
      {markersList.length > 0 && (
        <div className="text-[10px] p-2 border-t bg-muted/50 max-h-20 overflow-y-auto">
          <div className="font-semibold text-muted-foreground mb-1">{markersList.length} deliveries on map</div>
          <div className="space-y-0.5">
            {markersList.slice(0, 3).map((m, i) => (
              <div key={i} className="text-muted-foreground">
                • {m.name} ({m.product}) - {m.address}
              </div>
            ))}
            {markersList.length > 3 && (
              <div className="text-muted-foreground text-[9px] italic">+{markersList.length - 3} more...</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
