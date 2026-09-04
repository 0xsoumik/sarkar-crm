"use client"

import type { Order } from "@/lib/types"
import { Package, Truck, CheckCircle2, AlertTriangle, Clock, Tag } from "lucide-react"
import { getISTDateString } from "@/lib/validation"

interface StatsBarProps {
  orders: Order[]
  dateFilter?: string // ISO date string "YYYY-MM-DD" - if provided, filters to that date only
}

export function StatsBar({ orders, dateFilter }: StatsBarProps) {
  const getDateKey = (iso: string) => (iso ? getISTDateString(iso) : "")
  const filtered = dateFilter
    ? orders.filter(o => getDateKey(o.createdAt) === dateFilter)
    : orders.filter(o => {
        const today = getISTDateString()
        return getDateKey(o.createdAt) === today
      })
  const activeOrders = filtered.filter((o) => !o.deleted)
  const total = activeOrders.length
  const pending = activeOrders.filter((o) => o.status === "pending").length
  const delivered = activeOrders.filter((o) => o.status === "delivered").length
  const noVan = activeOrders.filter((o) => (o.vanIds || []).length === 0 && o.status === "pending").length
  const issues = activeOrders.filter((o) => o.quality === "issue").length
  const unpriced = activeOrders.filter((o) => !o.rate || o.rate === 0 || o.isUnpriced).length

  const completionPct = total > 0 ? Math.round((delivered / total) * 100) : 0

  const stats = [
    {
      label: "Daily Dispatch",
      value: total,
      subtext: "Today's Volume",
      icon: Package,
      badgeColor: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: "Pending Dispatch",
      value: pending,
      subtext: `${total > 0 ? Math.round((pending / total) * 100) : 0}% in queue`,
      icon: Clock,
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Fulfilled",
      value: delivered,
      subtext: `${completionPct}% completed`,
      icon: CheckCircle2,
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Unpriced Bills",
      value: unpriced,
      subtext: unpriced > 0 ? "Price Pending" : "All Tagged",
      icon: Tag,
      badgeColor: unpriced > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground border-border",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-sans">
      {stats.map((s) => (
        <div
          key={s.label}
          className="relative overflow-hidden rounded-lg border bg-card p-2.5 shadow-xs transition-all duration-200 hover:border-primary/30"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
            <div className={`flex h-6 w-6 items-center justify-center rounded border ${s.badgeColor}`}>
              <s.icon className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold font-mono tracking-tight text-foreground">{s.value}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{s.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
