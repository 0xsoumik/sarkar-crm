"use client"

import type { Order } from "@/lib/types"
import { CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface QualityPanelProps {
  orders: Order[]
  onUpdate: (id: string, updates: Partial<Order>) => void
}

export function QualityPanel({ orders, onUpdate }: QualityPanelProps) {
  const activeOrders = orders.filter((o) => o.status === "pending")

  if (activeOrders.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
        No active orders for quality check
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Quality Check</h2>
        <p className="text-xs text-muted-foreground">Quick status for all active orders</p>
      </div>
      <div className="divide-y">
        {activeOrders.map((order) => (
          <div key={order.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">{order.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{order.product}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={order.quality === "ok" ? "default" : "outline"}
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onUpdate(order.id, { quality: "ok", qualityNote: "" })}
                >
                  <CheckCircle className="h-3 w-3" />
                  OK
                </Button>
                <Button
                  size="sm"
                  variant={order.quality === "issue" ? "destructive" : "outline"}
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onUpdate(order.id, { quality: "issue" })}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Issue
                </Button>
                <Button
                  size="sm"
                  variant={order.quality === "pending" ? "secondary" : "outline"}
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onUpdate(order.id, { quality: "pending", qualityNote: "" })}
                >
                  <Clock className="h-3 w-3" />
                  Pending
                </Button>
              </div>
            </div>
            {order.quality === "issue" && (
              <Input
                placeholder="Describe the issue..."
                value={order.qualityNote}
                onChange={(e) => onUpdate(order.id, { qualityNote: e.target.value })}
                className="h-8 text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
