"use client"

import { useState } from "react"
import type { Order, Payment, PaymentOut } from "@/lib/types"
import { Package, IndianRupee, CheckCircle2, Clock, Tag, Truck, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DailySheetViewerProps {
  dateKey: string          // "YYYY-MM-DD"
  orders: Order[]
  payments: Payment[]
  paymentsOut: PaymentOut[]
  isAdmin?: boolean
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
}

export function DailySheetViewer({ dateKey, orders, payments, paymentsOut, isAdmin }: DailySheetViewerProps) {
  const getKey = (iso: string) => iso?.split("T")[0] ?? ""

  const dayOrders  = orders.filter(o  => getKey(o.createdAt) === dateKey && !o.deleted)
  const dayPayments = payments.filter(p => getKey(p.createdAt) === dateKey)
  const dayPayOut  = paymentsOut.filter(po => getKey(po.createdAt) === dateKey)

  const totalReceived = dayPayments.reduce((s, p) => s + p.amount, 0)
  const totalPaid     = dayPayOut.reduce((s, p) => s + p.amount, 0)
  const pending       = dayOrders.filter(o => o.status === "pending").length
  const delivered     = dayOrders.filter(o => o.status === "delivered").length
  const unpriced      = dayOrders.filter(o => !o.rate || o.isUnpriced).length

  const modeColor: Record<string, string> = {
    CASH: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    NEFT: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    UPI:  "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    CHEQUE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  }

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Admin mode active — you can add orders &amp; payments to this past date
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Orders", value: dayOrders.length, icon: Package, color: "text-primary" },
          { label: "Pending", value: pending, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
          { label: "Delivered", value: delivered, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Unpriced", value: unpriced, icon: Tag, color: "text-rose-600 dark:text-rose-400" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
            <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
            <div>
              <div className="text-xs font-bold font-mono">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Package className="h-3.5 w-3.5" /> Orders ({dayOrders.length})
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/60">Read-only{isAdmin ? " (Admin: editable)" : ""}</span>
        </h3>
        {dayOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No orders for this date</div>
        ) : (
          <div className="space-y-1.5">
            {dayOrders.map(order => (
              <div key={order.id} className="rounded-lg border bg-card px-3 py-2.5 text-xs flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold font-mono text-primary">#{order.orderNo}</span>
                    <span className="font-semibold">{order.name}</span>
                    {order.status === "delivered" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 h-4">Delivered</Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[9px] px-1.5 h-4">Pending</Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-[10px]">{order.product} · {order.address}</div>
                  {order.billNo && <div className="text-[10px] text-muted-foreground font-mono">Bill: {order.billNo}</div>}
                </div>
                <div className="text-right shrink-0">
                  {order.rate ? (
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{order.rate}/{order.unit}</div>
                  ) : (
                    <div className="text-amber-600 text-[10px]">Unpriced</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(order.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment Receives */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
          Payment Received
          <span className="ml-auto font-mono font-bold text-emerald-600">₹{totalReceived.toLocaleString("en-IN")}</span>
        </h3>
        {dayPayments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No payments received</div>
        ) : (
          <div className="space-y-1">
            {[...dayPayments].reverse().map(p => (
              <div key={p.id} className="rounded-lg border bg-card px-3 py-2 text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{p.amount.toLocaleString("en-IN")}</span>
                  <span className="ml-2 text-muted-foreground">{p.name}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold ${modeColor[p.mode] || ""}`}>{p.mode}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono shrink-0">#{p.receiptNo} · {fmt(p.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payments Out */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-rose-500" />
          Payments Out
          <span className="ml-auto font-mono font-bold text-rose-600">₹{totalPaid.toLocaleString("en-IN")}</span>
        </h3>
        {dayPayOut.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No outgoing payments</div>
        ) : (
          <div className="space-y-1">
            {[...dayPayOut].reverse().map(p => (
              <div key={p.id} className="rounded-lg border bg-card px-3 py-2 text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-rose-600 dark:text-rose-400">₹{p.amount.toLocaleString("en-IN")}</span>
                  <span className="ml-2 text-muted-foreground">{p.truckNo}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold ${modeColor[p.mode] || ""}`}>{p.mode}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono shrink-0">#{p.voucherNo} · {fmt(p.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
