"use client"

import { useState, useMemo } from "react"
import type { CustomerProfile, Order, Payment } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { printHTML, generateCustomerLedgerHTML } from "@/lib/print-utils"
import {
  MapPin,
  Phone,
  Package,
  IndianRupee,
  Truck,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileText,
  Calendar,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  X,
} from "lucide-react"

interface CustomerProfileModalProps {
  profile: CustomerProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerProfileModal({ profile, open, onOpenChange }: CustomerProfileModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "orders" | "payments">("all")

  if (!profile) return null

  const { customer, totalOrders, totalAmount, totalDelivered, unpricedOrdersCount, lastOrderDate, orders, payments } = profile

  // Build unified chronological sequential ledger transactions
  const transactions = useMemo(() => {
    const orderTxs = (orders || []).map((order) => {
      let isUnpriced = false
      let amt = 0
      let desc = ""
      let unit = order.unit
      let qty = order.totalQty || 0
      if (order.items && order.items.length > 1) {
        isUnpriced = order.items.some(i => !i.rate || i.rate === 0)
        amt = order.items.reduce((s, i) => s + ((Number(i.rate) || 0) * (Number(i.qty) || 0)), 0)
        desc = order.items.map(i => `${i.product} (${i.qty} ${i.unit})`).join(", ")
        qty = order.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
        unit = "items"
      } else {
        isUnpriced = !order.rate || order.rate === 0 || Boolean(order.isUnpriced)
        amt = isUnpriced ? 0 : (Number(order.rate) || 0) * qty
        desc = `${order.product} (${qty} ${order.unit})`
      }
      return {
        id: `ord_${order.id}`,
        type: "order" as const,
        date: order.createdAt || new Date().toISOString(),
        ref: `Order #${order.orderNo}`,
        description: desc,
        billNo: order.billNo,
        rate: order.rate,
        unit: unit,
        qty: qty,
        amount: amt,
        isUnpriced,
        isDebit: true,
        deleted: false,
        deleteReason: undefined,
      }
    })

    const paymentTxs = (payments || []).map((payment) => {
      const isDel = !!payment.deleted
      return {
        id: `pmt_${payment.id}`,
        type: "payment" as const,
        date: payment.createdAt || new Date().toISOString(),
        ref: `Receipt #${payment.receiptNo}${isDel ? " [DELETED]" : ""}`,
        description: isDel
          ? `Payment Received (${payment.mode || "CASH"}) [DELETED${payment.deleteReason ? `: ${payment.deleteReason}` : ""}]`
          : `Payment Received (${payment.mode || "CASH"})${payment.note ? ` - ${payment.note}` : ""}`,
        billNo: "",
        rate: undefined,
        unit: "",
        qty: 0,
        amount: payment.amount || 0,
        isUnpriced: false,
        isDebit: false,
        deleted: isDel,
        deleteReason: payment.deleteReason,
      }
    })

    // Sort chronologically ascending
    const sorted = [...orderTxs, ...paymentTxs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Compute running balance (DELETED payments are NOT in account of calculation)
    let balance = 0
    return sorted.map((tx) => {
      if (!tx.deleted) {
        if (tx.isDebit) {
          balance += tx.amount
        } else {
          balance -= tx.amount
        }
      }
      return { ...tx, balance }
    })
  }, [orders, payments])

  // Total billed and pending calculations (only sum non-deleted payments)
  const totalBilled = (orders || []).reduce((sum, o) => {
    if (o.items && o.items.length > 1) {
      return sum + o.items.reduce((s, i) => s + ((i.rate || 0) * (i.qty || 0)), 0)
    }
    const isUnpriced = !o.rate || o.rate === 0 || Boolean(o.isUnpriced)
    return sum + (isUnpriced ? 0 : (Number(o.rate) || 0) * (Number(o.totalQty) || 0))
  }, 0)
  const activePayments = (payments || []).filter((p) => !p.deleted)
  const totalPaid = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const netDue = totalBilled - totalPaid

  // Filtered transactions
  const displayedTransactions = transactions.filter((tx) => {
    if (filterType === "orders") return tx.type === "order"
    if (filterType === "payments") return tx.type === "payment"
    return true
  })

  const handlePrint = () => {
    const html = generateCustomerLedgerHTML(
      { name: customer.name, phone: customer.phone, address: customer.address },
      transactions.map((t) => ({
        date: t.date,
        reference: t.ref,
        description: t.description,
        amount: t.amount,
        isCredit: !t.isDebit,
        isUnpriced: t.isUnpriced,
        deleted: t.deleted,
        deleteReason: t.deleteReason,
        balance: t.balance,
      })),
      { totalBilled, totalPaid, pendingBalance: netDue }
    )
    printHTML(html)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`transition-all duration-200 shadow-2xl border bg-background overflow-y-auto flex flex-col gap-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
          isFullscreen
            ? "!w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] !h-[95vh] !max-h-[95vh] p-6 rounded-2xl"
            : "!w-[94vw] !max-w-5xl sm:!max-w-5xl !max-h-[88vh] p-5 rounded-xl"
        }`}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              {(customer.name || "C").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-extrabold text-foreground truncate flex items-center gap-2">
                <span>{customer.name}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {totalOrders} Order(s)
                </span>
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-primary" />
                  {customer.phone || "No phone"}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1 font-sans truncate">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 text-xs font-semibold gap-1.5"
              title={isFullscreen ? "Restore standard size" : "Expand to full screen popup"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs font-semibold gap-1.5">
              <Printer className="h-3.5 w-3.5 text-primary" />
              Print Ledger
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Financial KPIs Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="rounded-xl border p-3 bg-muted/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Orders</div>
            <div className="text-xl font-black font-mono text-foreground mt-0.5">{totalOrders}</div>
            <div className="text-[10px] text-muted-foreground">{totalDelivered} units delivered</div>
          </div>
          <div className="rounded-xl border p-3 bg-muted/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Billed</div>
            <div className="text-xl font-black font-mono text-foreground mt-0.5">₹{totalBilled.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-muted-foreground">Cumulative ledger</div>
          </div>
          <div className="rounded-xl border p-3 bg-emerald-500/8 border-emerald-500/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Collected</div>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">₹{totalPaid.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-muted-foreground">{activePayments.length} active payment(s)</div>
          </div>
          <div className={`rounded-xl border p-3 ${netDue > 0 ? "bg-rose-500/8 border-rose-500/20" : "bg-muted/20"}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${netDue > 0 ? "text-rose-500" : "text-muted-foreground"}`}>Net Outstanding</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${netDue > 0 ? "text-rose-500" : "text-foreground"}`}>
              ₹{Math.max(0, netDue).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-muted-foreground">{netDue > 0 ? "Pending collection" : "All cleared ✓"}</div>
          </div>
        </div>

        {/* Unpriced Notice */}
        {unpricedOrdersCount !== undefined && unpricedOrdersCount > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>{unpricedOrdersCount} order(s)</strong> are unpriced (Price Pending). Revenue recognition pending.
            </span>
          </div>
        )}

        {/* Unified Sequential Ledger Section */}
        <div className="flex flex-col gap-2.5 flex-1 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Sequential Account Ledger
              </h3>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  filterType === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Sequential ({transactions.length})
              </button>
              <button
                onClick={() => setFilterType("orders")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  filterType === "orders"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Orders / Bills ({orders.length})
              </button>
              <button
                onClick={() => setFilterType("payments")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  filterType === "payments"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Receipts / Payments ({payments.length})
              </button>
            </div>
          </div>

          {/* Sequential Table */}
          <div className="border rounded-xl bg-card overflow-x-auto flex-1">
            <table className="w-full text-xs font-sans">
              <thead className="bg-muted/60 border-b text-[11px]">
                <tr>
                  <th className="text-left px-3.5 py-2.5 font-bold uppercase">Date</th>
                  <th className="text-left px-3.5 py-2.5 font-bold uppercase">Reference</th>
                  <th className="text-left px-3.5 py-2.5 font-bold uppercase">Description</th>
                  <th className="text-right px-3.5 py-2.5 font-bold uppercase">Billed (Debit)</th>
                  <th className="text-right px-3.5 py-2.5 font-bold uppercase">Paid (Credit)</th>
                  <th className="text-right px-3.5 py-2.5 font-bold uppercase">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]">
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs font-sans">
                      No transactions found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  displayedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        tx.deleted ? "bg-rose-500/8 opacity-80" : tx.isUnpriced ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                        {(() => {
                          try {
                            const d = new Date(tx.date)
                            return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          } catch {
                            return "—"
                          }
                        })()}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                            tx.deleted
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold"
                              : tx.type === "order"
                              ? "bg-secondary text-foreground border-border"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {tx.type === "order" ? <Truck className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          {tx.ref}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-sans">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${tx.deleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {tx.description}
                          </span>
                          {tx.deleted && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/30">
                              ⚠️ Excluded from balance
                            </span>
                          )}
                          {tx.billNo && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                              Bill: {tx.billNo}
                            </span>
                          )}
                          {tx.isUnpriced && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              ⚠️ Price Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-foreground">
                        {tx.isDebit ? (
                          tx.isUnpriced ? (
                            <span className="text-amber-500 font-sans text-[10px]">Unpriced</span>
                          ) : (
                            `₹${tx.amount.toLocaleString("en-IN")}`
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold">
                        {tx.isDebit ? (
                          "—"
                        ) : tx.deleted ? (
                          <div>
                            <del className="text-muted-foreground/60 font-mono">₹{tx.amount.toLocaleString("en-IN")}</del>
                            <span className="text-[9px] text-rose-500 font-bold block font-sans">(Voided)</span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹{tx.amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-extrabold text-foreground font-mono">
                        ₹{tx.balance.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
