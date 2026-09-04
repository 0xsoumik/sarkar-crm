"use client"

import type { Order, Van } from "@/lib/types"

interface DeliveryProgressProps {
  order: Order
  vans: Van[]
}

export function DeliveryProgress({ order, vans }: DeliveryProgressProps) {
  if (order.totalQty <= 0) return null

  const delivered = order.trips.reduce((s, t) => s + t.quantity, 0)
  const pct = Math.min(100, Math.round((delivered / order.totalQty) * 100))

  // Group trips by van for colored segments
  const vanDeliveries = new Map<string, number>()
  for (const trip of order.trips) {
    vanDeliveries.set(trip.vanId, (vanDeliveries.get(trip.vanId) || 0) + trip.quantity)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          {delivered}/{order.totalQty} {order.unit}
        </span>
        <span className="font-semibold" style={{ color: pct === 100 ? "var(--accent)" : "var(--primary)" }}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="flex h-full">
          {Array.from(vanDeliveries.entries()).map(([vanId, qty]) => {
            const van = vans.find((v) => v.id === vanId)
            const segPct = (qty / order.totalQty) * 100
            return (
              <div
                key={vanId}
                className="h-full transition-all"
                style={{
                  width: `${Math.min(segPct, 100)}%`,
                  backgroundColor: van?.color || "var(--primary)",
                }}
                title={`${van?.name || "Unknown"}: ${qty} ${order.unit}`}
              />
            )
          })}
        </div>
      </div>
      {vanDeliveries.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(vanDeliveries.entries()).map(([vanId, qty]) => {
            const van = vans.find((v) => v.id === vanId)
            return (
              <span key={vanId} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: van?.color || "#999" }} />
                {van?.name}: {qty}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
