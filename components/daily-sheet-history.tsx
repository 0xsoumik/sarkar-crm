"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronDown, Package, IndianRupee, Download } from "lucide-react"
import type { Order, Payment, PaymentOut } from "@/lib/types"
import { getISTDateString } from "@/lib/validation"

interface DailySheetHistoryProps {
  orders: Order[]
  payments: Payment[]
  paymentsOut: PaymentOut[]
}

export function DailySheetHistory({ orders, payments, paymentsOut }: DailySheetHistoryProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set([selectedDate]))

  // Group all items by IST date
  const getDateKey = (isoString: string) => (isoString ? getISTDateString(isoString) : "")

  const allDates = new Set<string>()
  orders.forEach((o) => { const k = getDateKey(o.createdAt); if (k) allDates.add(k) })
  payments.forEach((p) => { const k = getDateKey(p.createdAt); if (k) allDates.add(k) })
  paymentsOut.forEach((po) => { const k = getDateKey(po.createdAt); if (k) allDates.add(k) })

  const sortedDates = Array.from(allDates).sort().reverse()

  const getItemsForDate = (dateKey: string) => {
    const dateOrders = orders.filter((o) => getDateKey(o.createdAt) === dateKey && !o.deleted)
    const datePayments = payments.filter((p) => getDateKey(p.createdAt) === dateKey)
    const datePaymentsOut = paymentsOut.filter((po) => getDateKey(po.createdAt) === dateKey)
    return { dateOrders, datePayments, datePaymentsOut }
  }

  const formatDateDisplay = (dateKey: string) => {
    try {
      const today = getISTDateString()
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = getISTDateString(yesterdayDate)

      if (dateKey === today) return "Today"
      if (dateKey === yesterday) return "Yesterday"
      const date = new Date(dateKey + "T00:00:00Z")
      if (isNaN(date.getTime())) return dateKey
      return date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateKey
    }
  }

  const toggleDate = (dateKey: string) => {
    const newSet = new Set(expandedDates)
    if (newSet.has(dateKey)) {
      newSet.delete(dateKey)
    } else {
      newSet.add(dateKey)
    }
    setExpandedDates(newSet)
  }

  const exportDateData = (dateKey: string) => {
    const { dateOrders, datePayments, datePaymentsOut } = getItemsForDate(dateKey)
    const data = {
      date: dateKey,
      summary: {
        totalOrders: dateOrders.length,
        totalPayments: datePayments.reduce((sum, p) => sum + p.amount, 0),
        totalPaymentsOut: datePaymentsOut.reduce((sum, p) => sum + p.amount, 0),
      },
      orders: dateOrders,
      payments: datePayments,
      paymentsOut: datePaymentsOut,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `daily-sheet-${dateKey}.json`
    a.click()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Daily Sheet Archive</h3>
        <span className="text-xs text-muted-foreground ml-auto">{sortedDates.length} days of records</span>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {sortedDates.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">No historical data available</p>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const { dateOrders, datePayments, datePaymentsOut } = getItemsForDate(dateKey)
            const isExpanded = expandedDates.has(dateKey)
            const totalAmount = datePayments.reduce((sum, p) => sum + p.amount, 0)

            return (
              <div key={dateKey} className="border rounded-lg overflow-hidden bg-card">
                <button
                  onClick={() => toggleDate(dateKey)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                    />
                    <div className="text-left">
                      <div className="text-sm font-semibold text-foreground">{formatDateDisplay(dateKey)}</div>
                      <div className="text-xs text-muted-foreground">
                        {dateOrders.length} orders • {datePayments.length} payments
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        exportDateData(dateKey)
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/30 p-3 space-y-3">
                    {dateOrders.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Orders ({dateOrders.length})
                        </h4>
                        <div className="space-y-1.5">
                          {dateOrders.map((order) => (
                            <div key={order.id} className="text-xs rounded bg-card p-2">
                              <div className="font-medium text-foreground">
                                #{order.orderNo} • {order.name}
                              </div>
                              <div className="text-muted-foreground">
                                {order.product} • {order.totalQty} {order.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {order.address} • Status: {order.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {datePayments.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          Payments Received ({datePayments.length})
                        </h4>
                        <div className="space-y-1.5">
                          {datePayments.map((payment) => (
                            <div key={payment.id} className="text-xs rounded bg-card p-2">
                              <div className="font-medium text-foreground">
                                #{payment.receiptNo} • {payment.name}
                              </div>
                              <div className="text-green-600 font-medium">₹{payment.amount.toLocaleString("en-IN")}</div>
                              <div className="text-muted-foreground text-[10px] mt-1">
                                {payment.mode} {payment.note && `• ${payment.note}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {datePaymentsOut.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          Payments Sent ({datePaymentsOut.length})
                        </h4>
                        <div className="space-y-1.5">
                          {datePaymentsOut.map((paymentOut) => (
                            <div key={paymentOut.id} className="text-xs rounded bg-card p-2">
                              <div className="font-medium text-foreground">
                                #{paymentOut.voucherNo} • {paymentOut.truckNo}
                              </div>
                              <div className="text-red-600 font-medium">₹{paymentOut.amount.toLocaleString("en-IN")}</div>
                              <div className="text-muted-foreground text-[10px] mt-1">
                                {paymentOut.mode} {paymentOut.note && `• ${paymentOut.note}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
