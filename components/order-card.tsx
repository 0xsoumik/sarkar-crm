"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { Order, Van, Trip, BillMode } from "@/lib/types"
import { DeliveryProgress } from "./delivery-progress"
import { generateBillHTML, generateTripSlipHTML, printHTML } from "@/lib/print-utils"
import {
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  FileText,
  Trash2,
  Check,
  RotateCcw,
  Printer,
  Plus,
  Truck,
  Package,
  Lock,
  Clock,
  IndianRupee,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface OrderCardProps {
  order: Order
  vans: Van[]
  onUpdate: (id: string, updates: Partial<Order>) => void
  onSoftDelete: (id: string, reason: string) => void
  onAddTrip: (orderId: string, trip: Omit<Trip, "id" | "slipNo">) => Trip
  onDeleteTrip: (orderId: string, tripId: string, reason: string) => void
  onCustomerClick?: (phone: string) => void
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
}

export function OrderCard({ order, vans, onUpdate, onSoftDelete, onAddTrip, onDeleteTrip, onCustomerClick }: OrderCardProps) {
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [tripModal, setTripModal] = useState(false)
  const [billModal, setBillModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteTripModal, setDeleteTripModal] = useState<string | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [tripForm, setTripForm] = useState({ vanId: "", quantity: "", note: "" })
  const [rateInput, setRateInput] = useState<string>(order.rate ? String(order.rate) : "")
  const [editRateModal, setEditRateModal] = useState(false)
  const [editRateValue, setEditRateValue] = useState<string>(order.rate ? String(order.rate) : "")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Right-click context menu handler with viewport clamping
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const menuWidth = 200
    const menuHeight = 220
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10)
    setContextMenu({ x: Math.max(10, x), y: Math.max(10, y) })
  }, [])

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [contextMenu])

  useEffect(() => {
    setRateInput(order.rate ? String(order.rate) : "")
    setEditRateValue(order.rate ? String(order.rate) : "")
  }, [order.rate])

  const handleSaveRate = () => {
    const parsed = rateInput.trim() !== "" ? Number(rateInput) : undefined
    const validRate = parsed && !isNaN(parsed) && parsed > 0 ? parsed : undefined
    onUpdate(order.id, { rate: validRate })
  }

  const handleSaveInlineModalRate = () => {
    const parsed = editRateValue.trim() !== "" ? Number(editRateValue) : undefined
    const validRate = parsed && !isNaN(parsed) && parsed > 0 ? parsed : undefined
    onUpdate(order.id, { rate: validRate })
    setEditRateModal(false)
  }

  const isDone = order.status === "delivered"
  const isDeleted = order.deleted
  const assignedVans = vans.filter((v) => (order.vanIds || []).includes(v.id))
  const delivered = (order.trips || []).reduce((s, t) => s + (t.quantity || 0), 0)
  const remaining = order.originalTotalQty > 0 ? order.originalTotalQty - delivered : Infinity
  const totalPayments = (order.payments || []).reduce((s, p) => s + (p.amount || 0), 0)

  // Multi-product calculations
  const hasMultipleItems = Boolean(order.items && order.items.length > 1)
  const allItems = order.items && order.items.length > 0 ? order.items : [
    { product: order.product, unit: order.unit, qty: order.totalQty, rate: order.rate, billNo: order.billNo }
  ]

  const isUnpriced = hasMultipleItems
    ? allItems.some(i => !i.rate || i.rate === 0)
    : (!order.rate || order.rate === 0 || order.isUnpriced)

  const estimatedTotal = hasMultipleItems
    ? allItems.reduce((sum, i) => sum + ((i.rate || 0) * (i.qty || 0)), 0)
    : (order.rate && order.rate > 0 ? order.rate * (order.totalQty || delivered || 0) : 0)

  const handleFieldUpdate = useCallback(
    (field: keyof Order, value: string | number) => {
      onUpdate(order.id, { [field]: value })
    },
    [order.id, onUpdate]
  )

  const handleLogTrip = useCallback(() => {
    if (!tripForm.vanId || !tripForm.quantity) return
    const qty = Number(tripForm.quantity)
    if (qty <= 0) return
    if (remaining !== Infinity && qty > remaining) return
    const newTrip = onAddTrip(order.id, {
      vanId: tripForm.vanId,
      quantity: qty,
      date: new Date().toISOString(),
      note: tripForm.note,
    })
    const updatedOrder = { ...order, trips: [...order.trips, { ...newTrip }] }
    printHTML(generateTripSlipHTML(updatedOrder, newTrip, vans))
    setTripForm({ vanId: "", quantity: "", note: "" })
    setTripModal(false)
  }, [tripForm, order, vans, onAddTrip])

  const handlePrintBill = useCallback(
    (mode: BillMode) => {
      printHTML(generateBillHTML(order, vans, mode === "full"))
      setBillModal(false)
    },
    [order, vans]
  )

  const handleSoftDelete = useCallback(() => {
    if (!deleteReason.trim()) return
    onSoftDelete(order.id, deleteReason.trim())
    setDeleteReason("")
    setDeleteModal(false)
  }, [order.id, deleteReason, onSoftDelete])

  const handleDeleteTrip = useCallback(() => {
    if (!deleteTripModal || !deleteReason.trim()) return
    onDeleteTrip(order.id, deleteTripModal, deleteReason.trim())
    setDeleteReason("")
    setDeleteTripModal(null)
  }, [order.id, deleteTripModal, deleteReason, onDeleteTrip])

  const toggleVan = useCallback(
    (vanId: string) => {
      const current = order.vanIds
      const next = current.includes(vanId) ? current.filter((id) => id !== vanId) : [...current, vanId]
      onUpdate(order.id, { vanIds: next })
    },
    [order.id, order.vanIds, onUpdate]
  )

  if (isDeleted) {
    // Crossed-out deleted order -- like a written register with red line
    return (
      <div className="relative rounded-xl border border-destructive/30 bg-card p-4 opacity-60">
        {/* Red cross-out line */}
        <div className="pointer-events-none absolute inset-0 flex items-center px-4">
          <div className="h-[2px] w-full bg-destructive/60" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-foreground line-through">{order.name}</span>
            <span className="ml-2 text-xs text-muted-foreground line-through">{order.product}</span>
            {order.billNo && <span className="ml-2 text-xs text-muted-foreground line-through">{order.billNo}</span>}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">DELETED</span>
            <span className="text-[9px] text-muted-foreground">{mounted && order.deletedAt ? formatDateTime(order.deletedAt) : ""}</span>
            {order.deleteReason && <span className="text-[9px] text-destructive">Reason: {order.deleteReason}</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={`rounded-lg border bg-card transition-all duration-200 ${
          isDone ? "opacity-60 border-border/60 bg-muted/20" : "border-border hover:border-primary/40 shadow-xs hover:shadow-sm"
        } ${order.quality === "issue" ? "border-destructive/60 bg-destructive/5" : ""}`}
      >
        {/* Collapsed header with delivery progress UP TOP */}
        <div
          className="flex cursor-pointer items-start gap-3 px-3.5 py-2.5"
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* Top row: Customer ID (Phone Number) & Order # & Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {order.phone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCustomerClick?.(order.phone)
                  }}
                  className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-bold text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  title="View customer profile"
                >
                  <Phone className="h-3 w-3" />
                  ID: {order.phone}
                </button>
              )}
              <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-secondary-foreground border border-border/50">
                #{order.orderNo}
              </span>

              {/* Price / Unpriced Tag */}
              {isUnpriced ? (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  ⚠️ Unpriced (Price Pending)
                </span>
              ) : (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {hasMultipleItems
                    ? `₹${estimatedTotal.toLocaleString("en-IN")} (${allItems.length} products)`
                    : `₹${order.rate}/${order.unit} ${estimatedTotal > 0 ? `(Est: ₹${estimatedTotal.toLocaleString("en-IN")})` : ""}`}
                </span>
              )}

              {/* Requested tiny inline edit rate button */}
              {!hasMultipleItems && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditRateValue(order.rate ? String(order.rate) : "")
                    setEditRateModal(true)
                  }}
                  className="text-[9px] font-bold text-primary/80 hover:text-primary underline px-1 py-0.5 rounded hover:bg-primary/10 transition-colors"
                  title="Edit Rate per unit for this order"
                >
                  (edit rate)
                </button>
              )}

              {hasMultipleItems && (
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {allItems.length} Products
                </span>
              )}

              {order.quality === "issue" && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive border border-destructive/20">Quality Issue</span>
              )}
              {order.vanIds.length === 0 && order.status === "pending" && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">Unassigned</span>
              )}
              {isDone && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Delivered</span>
              )}
            </div>

            {/* Second row: Customer Name directly below Customer ID */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCustomerClick?.(order.phone)
                }}
                className="text-xs font-extrabold tracking-tight text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                title="View customer profile"
              >
                {order.name}
              </button>
              <span className="text-muted-foreground">•</span>
              
              {hasMultipleItems ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {allItems.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/60">
                      <Package className="h-3 w-3 text-primary" />
                      <span>{item.product}</span>
                      <span className="text-muted-foreground font-mono">({item.qty} {item.unit}{item.rate ? ` @ ₹${item.rate}` : ""})</span>
                      {item.billNo && <span className="text-[10px] text-muted-foreground font-mono">[{item.billNo}]</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-1 font-medium text-foreground/90">
                    <Package className="h-3 w-3 text-primary" />
                    {order.product}
                  </span>
                  {order.billNo && (
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {order.billNo}
                    </span>
                  )}
                </>
              )}

              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3 text-muted-foreground/80" />
                {order.address}
              </span>
              
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3 text-muted-foreground/70" />
                {mounted ? formatTime(order.createdAt) : "--:--"}
              </span>
            </div>

            {/* Delivery progress bar visible WITHOUT expanding */}
            {order.totalQty > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="flex h-full">
                    {(() => {
                      const vanDeliveries = new Map<string, number>()
                      for (const trip of order.trips) {
                        vanDeliveries.set(trip.vanId, (vanDeliveries.get(trip.vanId) || 0) + trip.quantity)
                      }
                      return Array.from(vanDeliveries.entries()).map(([vanId, qty]) => {
                        const van = vans.find((v) => v.id === vanId)
                        return (
                          <div
                            key={vanId}
                            className="h-full"
                            style={{ width: `${(qty / order.totalQty) * 100}%`, backgroundColor: van?.color || "var(--primary)" }}
                          />
                        )
                      })
                    })()}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {delivered}/{order.totalQty} {order.unit}
                </span>
                                {order.trips.length > 0 && mounted && (
                                  <span className="text-[9px] text-muted-foreground">
                                    last: {formatTime(order.trips[order.trips.length - 1].date)}
                                  </span>
                                )}
              </div>
            )}

            {/* Payment co-sync indicator */}
            {totalPayments > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-accent">
                <IndianRupee className="h-3 w-3" />
                Paid today: {totalPayments.toLocaleString("en-IN")}
              </div>
            )}

            {/* Assigned van dots */}
            {assignedVans.length > 0 && (
              <div className="mt-1 flex gap-1">
                {assignedVans.map((v) => (
                  <span
                    key={v.id}
                    className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                    style={{ backgroundColor: `${v.color}20`, color: v.color }}
                  >
                    {v.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center pt-1">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="flex flex-col gap-3 border-t px-3.5 py-3">
            {/* Quick Price / Rate Update Control */}
            <div className="rounded-lg border bg-secondary/30 p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <IndianRupee className="h-3.5 w-3.5 text-primary" />
                  Bill Pricing & Rate Tagging
                </span>
                {isUnpriced ? (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    ⚠️ Price Tag Pending
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Est Total: ₹{estimatedTotal.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="any"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="Enter rate per unit (e.g. 200)"
                    className="h-7 text-xs font-mono font-bold"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveRate()}
                  />
                </div>
                <Button size="sm" onClick={handleSaveRate} className="h-7 text-xs font-bold px-3 shadow-xs">
                  {isUnpriced ? "Tag Price" : "Update Rate"}
                </Button>
                {order.rate && order.rate > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => { setRateInput(""); onUpdate(order.id, { rate: undefined }) }} className="h-7 text-[10px] text-muted-foreground hover:text-destructive">
                    Untag Price
                  </Button>
                )}
              </div>
            </div>

            {/* Editable fields (non-locked) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Phone (Customer ID)</Label>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="tel" value={order.phone} onChange={(e) => handleFieldUpdate("phone", e.target.value)} placeholder="Enter phone number" className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Name</Label>
                <Input value={order.name} onChange={(e) => handleFieldUpdate("name", e.target.value)} placeholder="Customer name" className="h-7 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Address</Label>
                <Input value={order.address} onChange={(e) => handleFieldUpdate("address", e.target.value)} placeholder="Delivery address" className="h-7 text-xs" />
              </div>
            </div>

            {/* Locked bill fields - tamper proof */}
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  ORIGINAL BILL INFO (Locked - Cannot be changed)
                </span>
                {hasMultipleItems && (
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {allItems.length} Items in Order
                  </span>
                )}
              </div>

              {hasMultipleItems ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-[10px] text-muted-foreground">
                        <th className="py-1 font-semibold">#</th>
                        <th className="py-1 font-semibold">Product</th>
                        <th className="py-1 font-semibold">Bill No</th>
                        <th className="py-1 font-semibold text-right">Quantity</th>
                        <th className="py-1 font-semibold text-right">Rate</th>
                        <th className="py-1 font-semibold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allItems.map((it, idx) => {
                        const sub = (it.rate || 0) * (it.qty || 0)
                        return (
                          <tr key={idx} className="hover:bg-muted/40 font-mono text-[11px]">
                            <td className="py-1.5 text-muted-foreground">{idx + 1}</td>
                            <td className="py-1.5 font-sans font-semibold text-foreground">{it.product}</td>
                            <td className="py-1.5 text-muted-foreground">{it.billNo || "-"}</td>
                            <td className="py-1.5 text-right font-semibold">{it.qty} {it.unit}</td>
                            <td className="py-1.5 text-right">{it.rate ? `₹${it.rate}` : <span className="text-amber-500 font-sans text-[10px]">Unpriced</span>}</td>
                            <td className="py-1.5 text-right font-bold">{sub > 0 ? `₹${sub.toLocaleString("en-IN")}` : "-"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-bold text-xs">
                        <td colSpan={3} className="py-1.5 text-foreground font-sans">Total Estimated Amount</td>
                        <td className="py-1.5 text-right font-mono">{allItems.reduce((s, i) => s + (i.qty || 0), 0)} items</td>
                        <td></td>
                        <td className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{estimatedTotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Product</span>
                    <p className="font-semibold text-foreground">{order.originalProduct || "-"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Bill No</span>
                    <p className="font-semibold text-foreground">{order.originalBillNo || "-"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Total Qty</span>
                    <p className="font-semibold text-foreground">{order.originalTotalQty || "-"} {order.originalUnit}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Unit</span>
                    <p className="font-semibold text-foreground">{order.originalUnit || "-"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Full delivery progress */}
            <DeliveryProgress order={order} vans={vans} />

            {/* Van assignment */}
            <div>
              <Label className="text-[10px] text-muted-foreground">Assign Vans</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {vans
                  .filter((v) => v.enabled)
                  .map((van) => {
                    const isAssigned = order.vanIds.includes(van.id)
                    return (
                      <button
                        key={van.id}
                        type="button"
                        onClick={() => toggleVan(van.id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                          isAssigned ? "border-current font-semibold" : "border-border text-muted-foreground"
                        }`}
                        style={isAssigned ? { color: van.color, borderColor: van.color } : {}}
                      >
                        <Truck className="h-3 w-3" />
                        {van.name}
                      </button>
                    )
                  })}
              </div>
            </div>

            {/* Trip history with Slip IDs and exact timestamps */}
            {order.trips.length > 0 && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Trip Slips</Label>
                <div className="mt-1 flex flex-col gap-1">
                  {order.trips.map((trip) => {
                    const tripVan = vans.find((v) => v.id === trip.vanId)
                    return (
                      <div key={trip.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            #{trip.slipNo}
                          </span>
                          {order.billNo && (
                            <span className="text-[10px] text-muted-foreground">| {order.billNo}</span>
                          )}
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tripVan?.color || "#999" }} />
                          <span className="font-medium">{trip.quantity} {order.unit}</span>
                          <span className="text-muted-foreground">by {tripVan?.name || "?"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{mounted ? formatDateTime(trip.date) : ""}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => printHTML(generateTripSlipHTML(order, trip, vans))}
                            title="Reprint slip"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-destructive"
                            onClick={() => { setDeleteTripModal(trip.id); setDeleteReason("") }}
                            title="Delete trip"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Payment info on this order */}
            {order.payments.length > 0 && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Payments Received Today</Label>
                <div className="mt-1 flex flex-col gap-1">
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-3 w-3 text-accent" />
                        <span className="font-semibold text-accent">Rs. {p.amount.toLocaleString("en-IN")}</span>
                        <span className="text-muted-foreground">via {p.mode}</span>
                        <span className="text-[10px] text-muted-foreground">Receipt #{p.receiptNo}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{mounted ? formatTime(p.createdAt) : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setTripModal(true)}>
                <Plus className="h-3 w-3" />
                Log Trip
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setBillModal(true)}>
                <Printer className="h-3 w-3" />
                Bill
              </Button>
              {isDone ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => onUpdate(order.id, { status: "pending" })}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reopen
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs text-accent"
                  onClick={() => onUpdate(order.id, { status: "delivered" })}
                >
                  <Check className="h-3 w-3" />
                  Done
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs text-destructive"
                onClick={() => { setDeleteModal(true); setDeleteReason("") }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Trip Modal */}
      <Dialog open={tripModal} onOpenChange={setTripModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Delivery Trip</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Select Van</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {vans
                  .filter((v) => v.enabled)
                  .map((van) => (
                    <button
                      key={van.id}
                      type="button"
                      onClick={() => {
                        let newQty = tripForm.quantity
                        if (van.capacity && van.capacity > 0) {
                          if (remaining !== Infinity) {
                            newQty = String(Math.min(van.capacity, Math.max(0, remaining)))
                          } else {
                            newQty = String(van.capacity)
                          }
                        }
                        setTripForm((f) => ({ ...f, vanId: van.id, quantity: newQty }))
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                        tripForm.vanId === van.id ? "font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={
                        tripForm.vanId === van.id
                          ? { color: van.color, borderColor: van.color, backgroundColor: `${van.color}15` }
                          : {}
                      }
                    >
                      <Truck className="h-3 w-3" />
                      <span>{van.name}</span>
                      {van.capacity ? (
                        <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium border border-border/50 bg-muted/40">
                          {van.capacity} {van.capacityUnit || order.unit || "bags"}
                        </span>
                      ) : null}
                    </button>
                  ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Quantity ({order.unit})</Label>
                {remaining !== Infinity && (
                  <span className={`text-[11px] font-semibold ${remaining <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    Remaining: {remaining} {order.unit}
                  </span>
                )}
              </div>
              <Input
                type="number"
                min={1}
                max={remaining !== Infinity ? remaining : undefined}
                value={tripForm.quantity}
                onChange={(e) => setTripForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder={remaining !== Infinity ? `Max ${remaining} ${order.unit}` : `How many ${order.unit}?`}
              />
              {/* Capacity subtraction feedback */}
              {(() => {
                const selectedVan = vans.find((v) => v.id === tripForm.vanId)
                const currentTripQty = Number(tripForm.quantity) || 0
                if (remaining !== Infinity && currentTripQty > 0) {
                  const remainingAfterThisTrip = remaining - currentTripQty
                  return (
                    <div className="mt-1.5 flex items-center justify-between rounded bg-muted/50 px-2.5 py-1 text-[11px]">
                      <span className="text-muted-foreground">
                        {selectedVan?.capacity ? `Capacity ${selectedVan.capacity} fetched from ${selectedVan.name}` : `Logging ${currentTripQty} ${order.unit}`}
                      </span>
                      <span className={`font-mono font-semibold ${remainingAfterThisTrip < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                        Remaining after trip: {remainingAfterThisTrip} {order.unit}
                      </span>
                    </div>
                  )
                }
                return null
              })()}
              {remaining !== Infinity && Number(tripForm.quantity) > remaining && (
                <p className="mt-1 text-[11px] font-medium text-destructive">
                  Cannot exceed remaining {remaining} {order.unit} from original bill of {order.originalTotalQty} {order.originalUnit}
                </p>
              )}
              {remaining <= 0 && (
                <p className="mt-1 text-[11px] font-medium text-destructive">
                  All {order.originalTotalQty} {order.originalUnit} have already been delivered. No more trips allowed.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input
                value={tripForm.note}
                onChange={(e) => setTripForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Morning delivery"
              />
            </div>
            <Button
              onClick={handleLogTrip}
              disabled={
                !tripForm.vanId ||
                !tripForm.quantity ||
                Number(tripForm.quantity) <= 0 ||
                remaining <= 0 ||
                (remaining !== Infinity && Number(tripForm.quantity) > remaining)
              }
            >
              Log Trip & Print Slip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Modal */}
      <Dialog open={billModal} onOpenChange={setBillModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Bill</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <div className="font-semibold text-foreground">{order.name}</div>
              <div className="text-xs text-muted-foreground">
                {order.address} | {order.phone || "No phone"} | {order.originalBillNo || "No bill#"}
              </div>
              {hasMultipleItems ? (
                <div className="mt-2 space-y-1">
                  {allItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-border/30 font-mono">
                      <span className="font-sans font-medium text-foreground">{item.product}</span>
                      <span className="text-muted-foreground">{item.qty} {item.unit}{item.rate ? ` @ ₹${item.rate}` : ""}</span>
                    </div>
                  ))}
                  <div className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono pt-1">
                    Est: ₹{estimatedTotal.toLocaleString("en-IN")}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">
                  {order.originalProduct} {order.originalTotalQty > 0 ? `- ${delivered}/${order.originalTotalQty} ${order.originalUnit}` : ""}
                </div>
              )}
              {assignedVans.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {assignedVans.map((v) => (
                    <span key={v.id} className="rounded px-1.5 py-0.5 text-[10px] font-medium text-card" style={{ backgroundColor: v.color }}>{v.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handlePrintBill("summary")} className="flex-col gap-1 py-4">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Summary Only</span>
              </Button>
              <Button onClick={() => handlePrintBill("full")} className="flex-col gap-1 py-4">
                <Printer className="h-5 w-5" />
                <span className="text-xs">Full Trip Breakdown</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Order Modal */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Order</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              This will cross out the order with a red line (like a written register). The order stays visible but cannot be edited. A timestamp and reason will be logged.
            </p>
            <div>
              <Label className="text-xs">Reason for deletion (required)</Label>
              <Input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate entry, Customer cancelled"
              />
            </div>
            <Button variant="destructive" onClick={handleSoftDelete} disabled={!deleteReason.trim()}>
              Delete & Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Trip Modal */}
      <Dialog open={!!deleteTripModal} onOpenChange={() => setDeleteTripModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Trip Slip</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              This trip slip will be removed and logged with a timestamp.
            </p>
            <div>
              <Label className="text-xs">Reason for deletion (required)</Label>
              <Input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Wrong quantity, Data entry error"
              />
            </div>
            <Button variant="destructive" onClick={handleDeleteTrip} disabled={!deleteReason.trim()}>
              Delete & Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Rate Modal */}
      <Dialog open={editRateModal} onOpenChange={setEditRateModal}>
        <DialogContent className="max-w-xs p-5 gap-3">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
              <IndianRupee className="h-3.5 w-3.5 text-primary" />
              Edit Order Rate
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 text-xs">
            <div>
              <div className="text-[11px] font-semibold text-foreground">{order.name}</div>
              <div className="text-[10px] text-muted-foreground">{order.product} (Order #{order.orderNo})</div>
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">New Rate / Unit (₹)</Label>
              <Input
                type="number"
                step="any"
                className="h-8 text-xs font-mono font-bold"
                value={editRateValue}
                onChange={(e) => setEditRateValue(e.target.value)}
                placeholder="Leave blank for unpriced"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditRateModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs font-bold uppercase" onClick={handleSaveInlineModalRate}>
                Update Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order Right-Click Context Menu ── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[200px] rounded-lg border border-border bg-card shadow-xl py-1 text-xs animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b mb-1">
            <div className="font-bold text-foreground text-[11px] truncate">
              Order #{order.orderNo} · {order.name}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {order.product} · {order.totalQty} {order.unit}
            </div>
          </div>

          {/* Log Trip */}
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
            onClick={() => {
              setTripModal(true)
              setContextMenu(null)
            }}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            Log Trip
          </button>

          {/* Bill */}
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
            onClick={() => {
              setBillModal(true)
              setContextMenu(null)
            }}
          >
            <Printer className="h-3.5 w-3.5 text-foreground" />
            Bill
          </button>

          {/* Done / Reopen */}
          {isDone ? (
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
              onClick={() => {
                onUpdate(order.id, { status: "pending" })
                setContextMenu(null)
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
              Reopen Order
            </button>
          ) : (
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
              onClick={() => {
                onUpdate(order.id, { status: "delivered" })
                setContextMenu(null)
              }}
            >
              <Check className="h-3.5 w-3.5 text-accent" />
              Mark as Done
            </button>
          )}

          {/* Separator */}
          <div className="border-t my-1" />

          {/* Delete */}
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left"
            onClick={() => {
              setDeleteModal(true)
              setDeleteReason("")
              setContextMenu(null)
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
            Delete Order
          </button>
        </div>
      )}
    </>
  )
}
