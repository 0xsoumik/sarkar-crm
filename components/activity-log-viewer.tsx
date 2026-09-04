"use client"

import { useState } from "react"
import type { ActivityLog, Payment, PaymentOut, Order } from "@/lib/types"
import { ChevronDown, Clock, Trash2, Plus, TrendingUp, AlertCircle } from "lucide-react"

interface ActivityLogViewerProps {
  logs: ActivityLog[]
  payments: Payment[]
  paymentsOut: PaymentOut[]
  orders: Order[]
  onNavigate?: (type: string, id: string) => void
}

const ACTION_ICONS: Record<ActivityLog["action"], React.ReactNode> = {
  create_order: <Plus className="h-3.5 w-3.5 text-green-600" />,
  update_order: <TrendingUp className="h-3.5 w-3.5 text-blue-600" />,
  delete_order: <Trash2 className="h-3.5 w-3.5 text-red-600" />,
  add_trip: <Plus className="h-3.5 w-3.5 text-green-600" />,
  delete_trip: <Trash2 className="h-3.5 w-3.5 text-red-600" />,
  add_payment: <Plus className="h-3.5 w-3.5 text-emerald-600" />,
  delete_payment: <Trash2 className="h-3.5 w-3.5 text-red-600" />,
  add_payment_out: <Plus className="h-3.5 w-3.5 text-orange-600" />,
  delete_payment_out: <Trash2 className="h-3.5 w-3.5 text-red-600" />,
  reorder_priority: <TrendingUp className="h-3.5 w-3.5 text-purple-600" />,
  quality_update: <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />,
  status_update: <TrendingUp className="h-3.5 w-3.5 text-blue-600" />,
}

export function ActivityLogViewer({ logs, payments, paymentsOut, orders, onNavigate }: ActivityLogViewerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const getNavigableItems = (log: ActivityLog) => {
    const items: Array<{ label: string; type: string; id: string }> = []
    
    if (log.orderId) {
      const order = orders.find(o => o.id === log.orderId)
      if (order) items.push({ label: `Order #${order.orderNo}`, type: "order", id: log.orderId })
    }
    
    if (log.details?.paymentId) {
      const paymentId = log.details.paymentId
      const payment = payments.find(p => p.id === paymentId)
      if (payment) items.push({ label: `Receipt #${payment.receiptNo}`, type: "payment", id: paymentId })
    }
    
    if (log.details?.paymentOutId) {
      const paymentOutId = log.details.paymentOutId
      const paymentOut = paymentsOut.find(p => p.id === paymentOutId)
      if (paymentOut) items.push({ label: `Voucher #${paymentOut.voucherNo}`, type: "payment_out", id: paymentOutId })
    }

    return items
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
      {logs.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        logs.map((log) => {
          const navigableItems = getNavigableItems(log)
          const isExpanded = expanded === log.id

          return (
            <div key={log.id} className="border-l-2 border-muted-foreground/20 pl-2 py-1">
              <button
                onClick={() => setExpanded(isExpanded ? null : log.id)}
                className="w-full text-left flex items-start gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
              >
                <div className="mt-1 flex-shrink-0">
                  {ACTION_ICONS[log.action]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground line-clamp-2">{log.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                  </p>
                </div>
                {navigableItems.length > 0 && (
                  <ChevronDown className={`h-3 w-3 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                )}
              </button>

              {isExpanded && navigableItems.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 pl-2 border-l border-muted-foreground/10">
                  {navigableItems.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => onNavigate?.(item.type, item.id)}
                      className="w-full text-left text-[10px] text-primary hover:underline py-0.5 px-1 hover:bg-primary/5 rounded transition-colors"
                    >
                      → {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
