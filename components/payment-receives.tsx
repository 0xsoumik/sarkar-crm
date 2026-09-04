"use client"

import { useState, useEffect, useMemo } from "react"
import type { Payment, DeleteLog } from "@/lib/types"
import { printHTML, generateReceiptHTML } from "@/lib/print-utils"
import { QuickAmountButtons } from "@/components/quick-amount-buttons"
import {
  IndianRupee,
  Plus,
  Printer,
  Trash2,
  Phone,
  MapPin,
  User,
  Clock,
  FileWarning,
  Search,
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

import { useStore } from "@/hooks/use-store"
import { getISTDateString, isTodayIST } from "@/lib/validation"

const PAYMENT_MODES = ["CASH", "NEFT", "CHEQUE", "UPI"] as const

interface PaymentReceivesProps {
  payments: Payment[]
  deleteLogs: DeleteLog[]
  onAddPayment: (payment: Omit<Payment, "id" | "receiptNo" | "createdAt">) => Payment
  onDeletePayment: (id: string, reason: string) => void
  onCustomerClick?: (phone: string) => void
  paymentRefs?: Record<string, HTMLDivElement | null>
  dateFilter?: string
  readOnly?: boolean
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
}

function isToday(value?: string | null) {
  return isTodayIST(value)
}

export function PaymentReceives({ payments, deleteLogs, onAddPayment, onDeletePayment, onCustomerClick, paymentRefs, dateFilter, readOnly = false }: PaymentReceivesProps) {
  const store = useStore()
  const [mounted, setMounted] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false)
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    amount: "",
    mode: "CASH" as Payment["mode"],
    note: "",
  })

  // Customer suggestions based on typed Name
  const nameSuggestions = useMemo(() => {
    if (!form.name || form.name.trim().length < 1) return []
    return store.getCustomersByNameQuery(form.name)
  }, [form.name, store])

  // Customer suggestions based on typed Phone
  const phoneSuggestions = useMemo(() => {
    if (!form.phone || form.phone.trim().length < 1) return []
    return store.getCustomersByPhonePrefix(form.phone)
  }, [form.phone, store])

  // Address suggestions based on typed Address
  const addressSuggestions = useMemo(() => {
    if (!form.address || form.address.trim().length < 1) return []
    return store.getSuggestedAddresses(form.address)
  }, [form.address, store])

  // Real-time outstanding dues for selected customer phone
  const customerDues = useMemo(() => {
    if (!form.phone || form.phone.length !== 10) return 0
    return store.getCustomerOutstandingDues(form.phone)
  }, [form.phone, store])

  const handleSelectCustomer = (customer: { phone: string; name: string; address: string }) => {
    setForm((prev) => ({
      ...prev,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    }))
    setShowNameSuggestions(false)
    setShowPhoneSuggestions(false)
  }

  // Filter payments for specified date or today, and sort newest first (top to bottom)
  // Exclude soft-deleted payments from this view entirely
  const todayPayments = (dateFilter
    ? payments.filter((p) => !p.deleted && (p.createdAt ? getISTDateString(p.createdAt) : "") === dateFilter)
    : payments.filter((p) => !p.deleted && isToday(p.createdAt)))
  const sortedPayments = [...todayPayments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  
  const filteredPayments = sortedPayments.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      `#${p.receiptNo}`.includes(q) ||
      p.mode.toLowerCase().includes(q) ||
      (p.note && p.note.toLowerCase().includes(q))
    )
  })

  const totalReceived = todayPayments.reduce((s, p) => s + p.amount, 0)
  const paymentDeleteLogs = deleteLogs.filter((l) => l.type === "payment")

  const handleAdd = () => {
    if (!form.name.trim() || !form.amount) return
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) {
      alert("Phone number must be exactly 10 digits")
      return
    }
    
    // Auto-capitalize first letter of name
    const capitalizedName = form.name.trim().charAt(0).toUpperCase() + form.name.trim().slice(1)
    
    const newPayment = onAddPayment({
      name: capitalizedName,
      phone: form.phone.trim(),
      address: form.address.trim(),
      amount: Number(form.amount),
      mode: form.mode,
      note: form.note.trim(),
    })
    // Always print receipt copy
    printHTML(generateReceiptHTML(newPayment))
    setForm({ name: "", phone: "", address: "", amount: "", mode: "CASH", note: "" })
    setAddOpen(false)
  }

  const handleDelete = () => {
    if (!deleteId || !deleteReason.trim()) return
    onDeletePayment(deleteId, deleteReason.trim())
    setDeleteId(null)
    setDeleteReason("")
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Payment Receives</h2>
          <p className="text-xs text-muted-foreground">
            Today: Rs. {totalReceived.toLocaleString("en-IN")} received ({todayPayments.length})
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {showSearch ? (
            <div className="flex items-center gap-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, mode..."
                className="h-7 text-xs w-36 sm:w-44"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-xs" onClick={() => { setSearchQuery(""); setShowSearch(false) }}>
                ✕
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSearch(true)}
              title="Search payments"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}

          {!readOnly && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 gap-1 text-xs font-semibold">
                  <Plus className="h-3 w-3" />
                  Add Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-5 gap-4">
                <DialogHeader className="pb-2 border-b">
                  <DialogTitle className="text-sm font-bold flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-emerald-600" />
                    Register Payment Received
                  </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3 text-xs">
                  {/* Payer Name with Live Autocomplete */}
                  <div className="grid gap-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Payer Name * (Auto-Suggests ID & Address)
                    </Label>
                    <div className="relative">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          className="h-8 text-xs font-medium"
                          value={form.name}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, name: e.target.value }))
                            setShowNameSuggestions(true)
                          }}
                          onFocus={() => setShowNameSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowNameSuggestions(false), 250)}
                          placeholder="Type customer name to auto-fill..."
                        />
                      </div>

                      {/* Name Suggestions Dropdown */}
                      {showNameSuggestions && nameSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto divide-y">
                          <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                            Matching Customers ({nameSuggestions.length})
                          </div>
                          {nameSuggestions.map((c: any) => {
                            const dues = store.getCustomerOutstandingDues(c.phone)
                            return (
                              <button
                                key={`name_sugg_${c.phone}`}
                                type="button"
                                onMouseDown={() => handleSelectCustomer(c)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/80 transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground truncate">{c.name}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                                    ID: {c.phone} {c.address ? `· ${c.address}` : ""}
                                  </div>
                                </div>
                                {dues > 0 ? (
                                  <span className="text-[10px] font-bold font-mono text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">
                                    Due: ₹{dues.toLocaleString("en-IN")}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                    Cleared
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer ID (Phone) with Live Autocomplete */}
                  <div className="grid gap-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Customer ID / Phone * (10 Digits)
                    </Label>
                    <div className="relative">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          type="tel"
                          className="h-8 text-xs font-mono font-medium"
                          value={form.phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                            setForm((f) => ({ ...f, phone: digits }))
                            setShowPhoneSuggestions(true)
                          }}
                          onFocus={() => setShowPhoneSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 250)}
                          placeholder="Type phone number to auto-fill..."
                          maxLength={10}
                        />
                      </div>

                      {/* Phone Suggestions Dropdown */}
                      {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto divide-y">
                          <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                            Matching Customer IDs ({phoneSuggestions.length})
                          </div>
                          {phoneSuggestions.map((c: any) => {
                            const dues = store.getCustomerOutstandingDues(c.phone)
                            return (
                              <button
                                key={`phone_sugg_${c.phone}`}
                                type="button"
                                onMouseDown={() => handleSelectCustomer(c)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/80 transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold font-mono text-primary truncate">{c.phone}</div>
                                  <div className="text-[11px] text-foreground font-semibold truncate">
                                    {c.name} {c.address ? `· ${c.address}` : ""}
                                  </div>
                                </div>
                                {dues > 0 ? (
                                  <span className="text-[10px] font-bold font-mono text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">
                                    Due: ₹{dues.toLocaleString("en-IN")}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                    Cleared
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Outstanding Dues Auto-Fill Card */}
                  {customerDues > 0 && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 p-2.5 flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Current Due Balance: </span>
                        <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                          ₹{customerDues.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, amount: String(customerDues) }))}
                        className="text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-md transition-all whitespace-nowrap"
                      >
                        Auto-Fill Due Amount
                      </button>
                    </div>
                  )}

                  {/* Address with Live Suggestions */}
                  <div className="grid gap-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Delivery Site / Address
                    </Label>
                    <div className="relative">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          className="h-8 text-xs font-medium"
                          value={form.address}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, address: e.target.value }))
                            setShowAddressSuggestions(true)
                          }}
                          onFocus={() => setShowAddressSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 250)}
                          placeholder="Address"
                        />
                      </div>

                      {showAddressSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-md z-50 max-h-[140px] overflow-y-auto">
                          {addressSuggestions.map((addr: string) => (
                            <button
                              key={addr}
                              type="button"
                              onMouseDown={() => {
                                setForm((f) => ({ ...f, address: addr }))
                                setShowAddressSuggestions(false)
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted border-b last:border-b-0"
                            >
                              {addr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount (Rs.) */}
                  <div className="grid gap-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Amount Received (Rs.) *
                    </Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          type="number"
                          className="h-8 text-xs font-mono font-bold"
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
                            ? "border-accent bg-accent/10 text-accent"
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
                    placeholder="e.g. Advance for sand order"
                  />
                </div>
                <Button onClick={handleAdd} disabled={!form.name.trim() || !form.amount} className="mt-1">
                  Register & Print Receipt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Payment list with fixed max height scroll */}
      {filteredPayments.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-4 py-6 text-center text-xs text-muted-foreground">
          {searchQuery ? "No payments match your search" : "No payments received yet today"}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {filteredPayments.map((p) => (
            <div key={p.id} ref={(el) => { if (el && paymentRefs) paymentRefs[p.id] = el }} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                    Receipt #{p.receiptNo}
                  </span>
                  <button
                    onClick={() => onCustomerClick?.(p.phone)}
                    className="text-xs font-semibold text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                    title="View customer profile"
                  >
                    {p.name}
                  </button>
                  {p.phone && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Phone className="h-2.5 w-2.5" />
                      {p.phone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-accent">Rs. {p.amount.toLocaleString("en-IN")}</span>
                  <span>via {p.mode}</span>
                  {p.address && <span>| {p.address}</span>}
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
                  onClick={() => printHTML(generateReceiptHTML(p))}
                  title="Reprint receipt"
                >
                  <Printer className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
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

      {/* Delete logs for payments */}
      {paymentDeleteLogs.length > 0 && (
        <div className="mt-1">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-destructive">
            <FileWarning className="h-3 w-3" />
            Delete Log
          </div>
          <div className="flex flex-col gap-0.5">
            {paymentDeleteLogs.map((log) => (
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
