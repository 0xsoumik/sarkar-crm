"use client"

import { useState, useEffect } from "react"
import type { PaymentOut, DeleteLog } from "@/lib/types"
import { printHTML, generateVoucherHTML } from "@/lib/print-utils"
import { QuickAmountButtons } from "@/components/quick-amount-buttons"
import { capitalizeName, formatPhone, getISTDateString, isTodayIST } from "@/lib/validation"
import {
  IndianRupee,
  Plus,
  Printer,
  Trash2,
  Truck,
  Clock,
  FileWarning,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const PAYMENT_MODES = ["CASH", "NEFT", "CHEQUE", "UPI"] as const

interface PaymentsOutProps {
  paymentsOut: PaymentOut[]
  deleteLogs: DeleteLog[]
  onAddPaymentOut: (payment: Omit<PaymentOut, "id" | "voucherNo" | "createdAt">) => PaymentOut
  onDeletePaymentOut: (id: string, reason: string) => void
  paymentOutRefs?: Record<string, HTMLDivElement | null>
  dateFilter?: string
  readOnly?: boolean
}

function formatTime(iso?: string | null) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  } catch {
    return ""
  }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    return `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
  } catch {
    return ""
  }
}

function isToday(value?: string | null) {
  return isTodayIST(value)
}

export function PaymentsOut({ paymentsOut = [], deleteLogs = [], onAddPaymentOut, onDeletePaymentOut, paymentOutRefs, dateFilter, readOnly = false }: PaymentsOutProps) {
  const [mounted, setMounted] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [form, setForm] = useState({
    truckNo: "",
    amount: "",
    mode: "CASH" as PaymentOut["mode"],
    note: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const safePaymentsOut = Array.isArray(paymentsOut) ? paymentsOut : []
  const safeDeleteLogs = Array.isArray(deleteLogs) ? deleteLogs : []

  const todayPaymentsOut = dateFilter
    ? safePaymentsOut.filter((p) => p && (p.createdAt ? getISTDateString(p.createdAt) : "") === dateFilter)
    : safePaymentsOut.filter((p) => p && isToday(p.createdAt))
  const sortedPaymentsOut = [...todayPaymentsOut].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  const totalPaid = todayPaymentsOut.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const paymentOutDeleteLogs = safeDeleteLogs.filter((l) => l && l.type === "payment_out")

  const handleAdd = () => {
    if (!form.truckNo.trim() || !form.amount) return
    const newPayment = onAddPaymentOut({
      truckNo: capitalizeName(form.truckNo),
      amount: Number(form.amount),
      mode: form.mode,
      note: form.note.trim(),
    })
    // Always print voucher copy
    printHTML(generateVoucherHTML(newPayment))
    setForm({ truckNo: "", amount: "", mode: "CASH", note: "" })
    setAddOpen(false)
  }

  const handleDelete = () => {
    if (!deleteId || !deleteReason.trim()) return
    onDeletePaymentOut(deleteId, deleteReason.trim())
    setDeleteId(null)
    setDeleteReason("")
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Payments Out</h2>
          <p className="text-xs text-muted-foreground">
            Total Paid: Rs. {totalPaid.toLocaleString("en-IN")} ({todayPaymentsOut.length})
          </p>
        </div>
        {!readOnly && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold">
                <Plus className="h-3 w-3" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register Payment to Supplier</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div>
                  <Label className="text-xs">Truck No.</Label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={form.truckNo}
                      onChange={(e) => setForm((f) => ({ ...f, truckNo: e.target.value }))}
                      placeholder="e.g. WB-01-1234"
                    />
                  </div>
                </div>
              <div>
                <Label className="text-xs">Amount (Rs.)</Label>
                <div className="flex flex-col gap-2">
                  <div className="mt-1 flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <QuickAmountButtons onSelect={(amount) => setForm((f) => ({ ...f, amount: String(amount) }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Mode of Payment</Label>
                <div className="mt-1 flex gap-1.5">
                  {PAYMENT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mode }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.mode === mode
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Note (optional)</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Sand delivery payment"
                />
              </div>
              <Button onClick={handleAdd} disabled={!form.truckNo.trim() || !form.amount} className="mt-1 bg-destructive hover:bg-destructive/90">
                Register & Print Voucher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Payment list */}
      {sortedPaymentsOut.length === 0 ? (
        <div className="rounded-lg border border-dashed border-destructive/30 bg-card px-4 py-6 text-center text-xs text-muted-foreground">
          No payments made to suppliers yet today
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {sortedPaymentsOut.map((p) => (
            <div key={p.id} ref={(el) => { if (el && paymentOutRefs) paymentOutRefs[p.id] = el }} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                    Voucher #{p.voucherNo}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Truck className="h-3 w-3" />
                    {p.truckNo}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-destructive">Rs. {p.amount.toLocaleString("en-IN")}</span>
                  <span>via {p.mode}</span>
                  {p.note && <span>| {p.note}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {mounted ? formatTime(p.createdAt) : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => printHTML(generateVoucherHTML(p))}
                  title="Reprint voucher"
                >
                  <Printer className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => { setDeleteId(p.id); setDeleteReason("") }}
                  title="Delete payment"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete logs for payments out */}
      {paymentOutDeleteLogs.length > 0 && (
        <div className="mt-1">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-destructive">
            <FileWarning className="h-3 w-3" />
            Delete Log
          </div>
          <div className="flex flex-col gap-0.5">
            {paymentOutDeleteLogs.map((log) => (
              <div key={log.id} className="rounded bg-destructive/5 px-2 py-1 text-[10px] text-destructive">
                {log.label} - {log.reason} ({mounted ? formatDateTime(log.deletedAt) : ""})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete payment modal */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              This payment will be removed and logged with a timestamp and reason.
            </p>
            <div>
              <Label className="text-xs">Reason for deletion (required)</Label>
              <Input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Wrong amount, Duplicate entry"
              />
            </div>
            <Button variant="destructive" onClick={handleDelete} disabled={!deleteReason.trim()}>
              Delete & Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
