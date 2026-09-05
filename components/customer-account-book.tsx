import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { printHTML, generateCustomerLedgerHTML } from "@/lib/print-utils"
import {
  FileText,
  FileJson2,
  Table2,
  Download,
  AlertCircle,
  Phone,
  MapPin,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Maximize2,
  Minimize2,
  History,
  Printer,
  Trash2,
  Lock,
  X,
} from "lucide-react"
import type { Order, Payment } from "@/lib/types"
import { useStore } from "@/hooks/use-store"

interface CustomerAccountBookProps {
  customerName: string
  customerPhone: string
  customerAddress: string
  orders: Order[]
  payments: Payment[]
  onClose: () => void
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void
}

export function CustomerAccountBook({
  customerName,
  customerPhone,
  customerAddress,
  orders,
  payments,
  onClose,
  onUpdateOrder,
}: CustomerAccountBookProps) {
  const store = useStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [editingRateOrderId, setEditingRateOrderId] = useState<string | null>(null)
  const [tempRateInput, setTempRateInput] = useState<string>("")
  const [filterType, setFilterType] = useState<"all" | "orders" | "payments">("all")
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  // Admin PIN verification modal state for permanent deletion
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false)
  const [adminPinInput, setAdminPinInput] = useState("")
  const [adminPinError, setAdminPinError] = useState("")
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<string | null>(null)

  // Filter rate edit history logs for this customer
  const customerRateLogs = (store.rateEditLogs || []).filter(
    (log) => log.customerPhone === customerPhone
  )

  // Calculate totals and unpriced count
  let unpricedCount = 0
  const totalBilled = (orders || []).reduce((sum, o) => {
    const isUnpriced = !o.rate || o.rate === 0 || Boolean(o.isUnpriced)
    if (isUnpriced) {
      unpricedCount++
      return sum
    }
    if (o.items && o.items.length > 1) {
      return sum + o.items.reduce((s, i) => s + ((Number(i.rate) || 0) * (Number(i.qty) || 0)), 0)
    }
    const orderAmount = (Number(o.rate) || 0) * (Number(o.totalQty) || 0)
    return sum + orderAmount
  }, 0)

  // Only sum NON-DELETED payments in totalPaid
  const activePayments = (payments || []).filter((p) => !p.deleted)
  const totalPaid = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const pendingBalance = totalBilled - totalPaid

  // Get all transactions in chronological order (ascending)
  const transactions = [
    ...(orders || []).map((order) => {
      let isUnpriced = false
      let amt = 0
      let desc = ""
      if (order.items && order.items.length > 1) {
        isUnpriced = order.items.some(i => !i.rate || i.rate === 0)
        amt = order.items.reduce((s, i) => s + ((Number(i.rate) || 0) * (Number(i.qty) || 0)), 0)
        desc = order.items.map(i => `${i.product} (${i.qty} ${i.unit})`).join(", ")
      } else {
        isUnpriced = !order.rate || order.rate === 0 || Boolean(order.isUnpriced)
        const qty = order.totalQty || 0
        amt = isUnpriced ? 0 : (Number(order.rate) || 0) * qty
        desc = `${order.product} - ${qty} ${order.unit}`
      }
      return {
        id: order.id,
        orderId: order.id,
        type: "order" as const,
        date: order.createdAt || new Date().toISOString(),
        description: desc,
        amount: amt,
        isCredit: true,
        reference: `Order #${order.orderNo}`,
        isUnpriced,
        rate: order.rate,
        order,
        deleted: false,
        deleteReason: undefined,
      }
    }),
    ...payments.map((payment) => {
      const isDel = !!payment.deleted
      return {
        id: payment.id,
        orderId: undefined,
        type: "payment" as const,
        date: payment.createdAt || new Date().toISOString(),
        description: isDel
          ? `Payment Received (${payment.mode || "CASH"}) [DELETED${payment.deleteReason ? `: ${payment.deleteReason}` : ""}]`
          : `Payment Received (${payment.mode || "CASH"})${payment.note ? ` - ${payment.note}` : ""}`,
        amount: payment.amount || 0,
        isCredit: false,
        reference: `Receipt #${payment.receiptNo}${isDel ? " [DELETED]" : ""}`,
        isUnpriced: false,
        rate: undefined,
        order: undefined,
        deleted: isDel,
        deleteReason: payment.deleteReason,
      }
    }),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate running balance sequentially (DELETED payments are NOT in account of calculation)
  let runningBalance = 0
  const transactionsWithBalance = transactions.map((tx) => {
    if (!tx.deleted) {
      if (tx.isCredit) {
        runningBalance += tx.amount
      } else {
        runningBalance -= tx.amount
      }
    }
    return { ...tx, balance: runningBalance }
  })

  // Filter transactions according to selected filter
  const displayedTransactions = transactionsWithBalance.filter((tx) => {
    if (filterType === "orders") return tx.type === "order"
    if (filterType === "payments") return tx.type === "payment"
    return true
  })

  const handleSaveInlineRate = (order: Order, newRateVal: number) => {
    if (newRateVal > 0 && onUpdateOrder) {
      const oldRate = order.rate || 0
      onUpdateOrder(order.id, { rate: newRateVal })
      store.logRateEdit(customerPhone, order.id, order.product, oldRate, newRateVal, "Updated via Account Book inline rate edit")
      store.updateSKURate(order.product, newRateVal)
    }
    setEditingRateOrderId(null)
    setTempRateInput("")
  }

  const handleRequestPermanentDelete = (paymentId: string) => {
    if (store.isAdminUnlocked) {
      if (confirm("Permanently delete this payment record from the system? This cannot be undone.")) {
        store.permanentDeletePayment(paymentId)
      }
    } else {
      setPendingPermanentDeleteId(paymentId)
      setAdminPinInput("")
      setAdminPinError("")
      setAdminPinModalOpen(true)
    }
  }

  const handleConfirmAdminPermanentDelete = () => {
    if (store.unlockAdmin(adminPinInput.trim())) {
      if (pendingPermanentDeleteId) {
        store.permanentDeletePayment(pendingPermanentDeleteId)
        setPendingPermanentDeleteId(null)
      }
      setAdminPinModalOpen(false)
      setAdminPinInput("")
    } else {
      setAdminPinError("Invalid Admin PIN. (Default: 1234)")
    }
  }

  const handlePrint = () => {
    const html = generateCustomerLedgerHTML(
      { name: customerName, phone: customerPhone, address: customerAddress },
      transactionsWithBalance.map((t) => ({
        date: t.date,
        reference: t.reference,
        description: t.description,
        amount: t.amount,
        isCredit: t.isCredit,
        isUnpriced: t.isUnpriced,
        deleted: t.deleted,
        deleteReason: t.deleteReason,
        balance: t.balance,
      })),
      { totalBilled, totalPaid, pendingBalance }
    )
    printHTML(html)
  }

  const buildBookData = () => ({
    customer: { name: customerName, phone: customerPhone, address: customerAddress },
    summary: {
      totalBilled,
      totalPaid,
      pendingBalance,
      totalOrders: orders.length,
      unpricedOrdersCount: unpricedCount,
      totalPayments: activePayments.length,
      deletedPaymentsCount: payments.filter((p) => p.deleted).length,
    },
    transactions: transactionsWithBalance.map((tx) => ({
      date: tx.date,
      reference: tx.reference,
      type: tx.type,
      description: tx.description,
      amount: tx.amount,
      isDebit: tx.isCredit,
      isCredit: !tx.isCredit,
      deleted: !!tx.deleted,
      deleteReason: tx.deleteReason || null,
      balance: tx.balance,
    })),
  })

  const slug = customerName.toLowerCase().replace(/\s+/g, "-")

  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(buildBookData(), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `account-book-${slug}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  const exportAsCSV = () => {
    const data = buildBookData()
    const rows: string[] = []

    // --- Customer info header ---
    rows.push(`Customer,${JSON.stringify(data.customer.name)}`)
    rows.push(`Phone,${JSON.stringify(data.customer.phone)}`)
    rows.push(`Address,${JSON.stringify(data.customer.address)}`)
    rows.push(``)
    rows.push(`Total Billed,₹${data.summary.totalBilled}`)
    rows.push(`Total Paid,₹${data.summary.totalPaid}`)
    rows.push(`Pending Balance,₹${data.summary.pendingBalance}`)
    rows.push(``)

    // --- Transactions table ---
    rows.push([
      "Date", "Reference", "Type", "Description",
      "Debit (Order)", "Credit (Payment)", "Balance", "Deleted", "Delete Reason"
    ].join(","))

    for (const tx of data.transactions) {
      const date = new Date(tx.date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata"
      })
      const debit = tx.isDebit ? tx.amount : ""
      const credit = tx.isCredit ? tx.amount : ""
      rows.push([
        date,
        JSON.stringify(tx.reference),
        tx.type,
        JSON.stringify(tx.description),
        debit,
        credit,
        tx.balance,
        tx.deleted ? "Yes" : "No",
        JSON.stringify(tx.deleteReason || ""),
      ].join(","))
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `account-book-${slug}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={`transition-all duration-200 shadow-2xl border bg-background overflow-y-auto flex flex-col gap-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
          isFullscreen
            ? "!w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] !h-[95vh] !max-h-[95vh] p-6 rounded-2xl"
            : "!w-[94vw] !max-w-5xl sm:!max-w-5xl !max-h-[88vh] p-5 rounded-xl"
        }`}
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Customer Ledger & Account Book — {customerName}
            </DialogTitle>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-4 font-mono">
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" />
                {customerPhone}
              </div>
              <div className="flex items-center gap-1 font-sans">
                <MapPin className="h-3 w-3 text-primary" />
                {customerAddress}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 text-xs font-semibold gap-1.5"
              title={isFullscreen ? "Restore standard size" : "Maximize to full screen popup"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs font-semibold gap-1.5">
              <Printer className="h-3.5 w-3.5 text-primary" />
              Print Ledger
            </Button>
            {/* Download button with format picker popup */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDownloadMenu((v) => !v)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
                <span className="text-[10px] leading-none opacity-60">▾</span>
              </Button>
              {showDownloadMenu && (
                <>
                  {/* backdrop to close on outside click */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDownloadMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border bg-popover shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Choose format</p>
                    </div>
                    <button
                      onClick={exportAsJSON}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
                    >
                      <FileJson2 className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="flex flex-col items-start">
                        <span className="font-semibold">JSON</span>
                        <span className="text-[10px] text-muted-foreground">Full structured data</span>
                      </span>
                    </button>
                    <button
                      onClick={exportAsCSV}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-accent transition-colors border-t"
                    >
                      <Table2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="flex flex-col items-start">
                        <span className="font-semibold">CSV / Excel</span>
                        <span className="text-[10px] text-muted-foreground">Opens in spreadsheet</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>


        {/* Unpriced Notice Banner */}
        {unpricedCount > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>{unpricedCount} bill(s)</strong> are currently <strong>Unpriced (Price Pending)</strong>. Use the <strong>"Edit Rate"</strong> button next to any order to tag a rate in real time.
              </span>
            </div>
          </div>
        )}

        {/* Financial Summary KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-blue-500/5 border-blue-500/30">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Billed</div>
            <div className="text-lg font-extrabold text-blue-600 font-mono mt-0.5">₹{totalBilled.toLocaleString("en-IN")}</div>
          </Card>
          <Card className="p-3 bg-emerald-500/5 border-emerald-500/30">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Paid</div>
            <div className="text-lg font-extrabold text-emerald-600 font-mono mt-0.5">₹{totalPaid.toLocaleString("en-IN")}</div>
          </Card>
          <Card className={`p-3 ${pendingBalance > 0 ? "bg-destructive/10 border-destructive/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Balance</div>
            <div className={`text-lg font-extrabold font-mono mt-0.5 ${pendingBalance > 0 ? "text-destructive" : "text-emerald-600"}`}>
              ₹{pendingBalance.toLocaleString("en-IN")}
            </div>
          </Card>
        </div>

        {/* Transactions Table & Filter Bar */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Sequential Ledger & Statement</h4>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  filterType === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Sequential ({transactionsWithBalance.length})
              </button>
              <button
                onClick={() => setFilterType("orders")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  filterType === "orders" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Orders / Bills ({orders.length})
              </button>
              <button
                onClick={() => setFilterType("payments")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  filterType === "payments" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Receipts / Payments ({payments.length})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border rounded-xl bg-card">
            <table className="w-full text-xs font-sans">
              <thead className="bg-muted/60 border-b text-[11px]">
                <tr>
                  <th className="text-left px-3 py-2 font-bold uppercase">Date</th>
                  <th className="text-left px-3 py-2 font-bold uppercase">Ref</th>
                  <th className="text-left px-3 py-2 font-bold uppercase">Description & Rate</th>
                  <th className="text-right px-3 py-2 font-bold uppercase">Billed (Debit)</th>
                  <th className="text-right px-3 py-2 font-bold uppercase">Paid (Credit)</th>
                  <th className="text-right px-3 py-2 font-bold uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]">
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs font-sans">
                      No records match the selected filter.
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
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] border ${
                          tx.deleted
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold"
                            : "bg-secondary border-border/50"
                        }`}
                      >
                        {tx.reference}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-sans">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${tx.deleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {tx.description}
                        </span>
                        {tx.deleted && (
                          <div className="inline-flex items-center gap-1.5 ml-auto">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/30">
                              ⚠️ Excluded from balance
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRequestPermanentDelete(tx.id)}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground px-1.5 py-0.5 rounded border border-destructive/30 transition-colors"
                              title={store.isAdminUnlocked ? "Permanently remove from customer ledger" : "Admin required: Permanently remove from customer ledger"}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Delete Record</span>
                              {!store.isAdminUnlocked && <Lock className="h-2 w-2 ml-0.5 opacity-70" />}
                            </button>
                          </div>
                        )}
                        {tx.type === "order" && tx.order && (
                          editingRateOrderId === tx.order.id ? (
                            <div className="flex items-center gap-1 font-mono ml-auto">
                              <Input
                                type="number"
                                step="any"
                                className="h-6 w-20 text-[10px] p-1 font-bold"
                                value={tempRateInput}
                                onChange={(e) => setTempRateInput(e.target.value)}
                                placeholder="Rate"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && tempRateInput.trim() !== "") {
                                    handleSaveInlineRate(tx.order!, Number(tempRateInput))
                                  }
                                }}
                              />
                              <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => handleSaveInlineRate(tx.order!, Number(tempRateInput))}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[10px]" onClick={() => setEditingRateOrderId(null)}>
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRateOrderId(tx.order!.id)
                                setTempRateInput(String(tx.order!.rate || ""))
                              }}
                              className="text-[9px] font-semibold text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 transition-colors ml-auto"
                              title="Edit rate for this order"
                            >
                              ✏️ Edit Rate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                    <td className="text-right px-3 py-2 font-mono">
                      {!tx.isCredit ? "—" : tx.isUnpriced ? (
                        <span className="text-amber-600 font-bold font-sans text-[10px]">Unpriced</span>
                      ) : (
                        `₹${tx.amount.toLocaleString("en-IN")}`
                      )}
                    </td>
                    <td className="text-right px-3 py-2 font-mono">
                      {tx.isCredit ? (
                        "—"
                      ) : tx.deleted ? (
                        <div>
                          <del className="text-muted-foreground/60">₹{tx.amount.toLocaleString("en-IN")}</del>
                          <span className="text-[9px] text-rose-500 font-bold block font-sans">(Voided)</span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ₹{tx.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                    <td className={`text-right px-3 py-2 font-bold font-mono ${tx.balance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      ₹{tx.balance.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Rate Edit History Log (Isolated CRM Log) */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer Rate Edit History Log</h4>
            <span className="text-[10px] text-muted-foreground font-mono">({customerRateLogs.length} audit logs)</span>
          </div>
          {customerRateLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              No rate adjustments recorded for this customer yet. Use the <strong>"Edit Rate"</strong> button to update order rates.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {customerRateLogs.map((log) => (
                <div key={log.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{log.product}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      (₹{log.oldRate} → <strong className="text-emerald-600 dark:text-emerald-400">₹{log.newRate}</strong>)
                    </span>
                    <span className="text-[10px] text-muted-foreground">[{log.reason}]</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(log.editedAt).toLocaleDateString("en-IN")} {new Date(log.editedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {/* ── Admin PIN Modal for Permanent Deletion ── */}
      <Dialog open={adminPinModalOpen} onOpenChange={setAdminPinModalOpen}>
        <DialogContent className="max-w-xs p-5 gap-3">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
              <Lock className="h-4 w-4 text-amber-500" />
              Admin Access Required
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-[11px] text-muted-foreground">
              Enter the Admin PIN to permanently delete this payment record. This action cannot be undone.
            </p>
            <div className="grid gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Admin PIN</Label>
              <Input
                type="password"
                maxLength={8}
                className="h-8 text-center font-mono font-bold text-base tracking-widest"
                value={adminPinInput}
                onChange={(e) => { setAdminPinInput(e.target.value); setAdminPinError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") handleConfirmAdminPermanentDelete() }}
                placeholder="••••"
                autoFocus
              />
              {adminPinError && (
                <span className="text-[10px] text-destructive font-semibold">{adminPinError}</span>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setAdminPinModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleConfirmAdminPermanentDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
