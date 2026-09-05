"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/hooks/use-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users, Phone, MapPin, IndianRupee, Plus, FileText,
  TrendingUp, AlertCircle, Search, ArrowUpRight, ArrowDownRight,
  ChevronRight, CreditCard, Package, Calendar, BarChart3,
  AlertTriangle, CheckCircle2, Clock, User, Maximize2,
} from "lucide-react"
import { CustomerAccountBook } from "@/components/customer-account-book"
import { CustomerProfileModal } from "@/components/customer-profile-modal"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import type { Order, Payment, CustomerProfile } from "@/lib/types"

interface CRMProps {
  orders: Order[]
  payments: Payment[]
  customers: Map<string, CustomerProfile>
  onAddOrder?: (order: any) => void
  onAddPayment?: (payment: any) => void
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void
  vans?: any[]
}

type SortKey = "recent" | "dues" | "payments" | "orders"

// Micro sparkline data builder for customer payment history
function paymentSparkline(payments?: Payment[]): { v: number }[] {
  if (!payments || !payments.length) return Array(8).fill({ v: 0 })
  const sorted = [...payments].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
  const max = Math.max(...sorted.map(p => Number(p.amount) || 0), 1)
  return sorted.slice(-8).map(p => ({ v: Math.round(((Number(p.amount) || 0) / max) * 100) }))
}

export function CRMPanel({ orders = [], payments = [], customers, onAddOrder, onAddPayment, onUpdateOrder, vans = [] }: CRMProps) {
  const store = useStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [showAddOrderModal, setShowAddOrderModal] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showAccountBook, setShowAccountBook] = useState(false)
  const [showFullProfileModal, setShowFullProfileModal] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>("recent")
  const [filterByDues, setFilterByDues] = useState(false)
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", product: "", billNo: "", unit: "bags", totalQty: 0, rate: "" as string | number, vanIds: [] as string[] })
  const [paymentForm, setPaymentForm] = useState({ name: "", phone: "", address: "", amount: "", mode: "CASH" as "CASH" | "NEFT" | "CHEQUE" | "UPI", note: "" })

  // ── Build customer map ──
  const customerMap = useMemo(() => {
    const map = new Map<string, {
      phone: string; name: string; address: string
      totalOrders: number; totalPaid: number; totalBilled: number; pendingAmount: number
      unpricedCount: number; lastOrderDate: string | null
      orders: Order[]; payments: Payment[]
    }>()

    orders.forEach(order => {
      if (!order.deleted && order.phone) {
        if (!map.has(order.phone)) {
          map.set(order.phone, {
            phone: order.phone, name: order.name, address: order.address,
            totalOrders: 0, totalPaid: 0, totalBilled: 0, pendingAmount: 0, unpricedCount: 0,
            lastOrderDate: null, orders: [], payments: [],
          })
        }
        const c = map.get(order.phone)!
        c.totalOrders++
        c.orders.push(order)
        let orderAmt = 0
        let isUnpriced = false
        if (order.items && order.items.length > 1) {
          isUnpriced = order.items.some(i => !i.rate || i.rate === 0)
          orderAmt = order.items.reduce((s, i) => s + ((i.rate || 0) * (i.qty || 0)), 0)
        } else {
          isUnpriced = !order.rate || order.rate === 0 || Boolean(order.isUnpriced)
          orderAmt = isUnpriced ? 0 : (order.rate || 0) * (order.totalQty || 0)
        }
        if (isUnpriced) c.unpricedCount++
        c.totalBilled += orderAmt
        if (!c.lastOrderDate || new Date(order.createdAt) > new Date(c.lastOrderDate)) c.lastOrderDate = order.createdAt
      }
    })

    payments.forEach(payment => {
      if (!payment.phone) return
      if (!map.has(payment.phone)) {
        map.set(payment.phone, {
          phone: payment.phone, name: payment.name, address: payment.address,
          totalOrders: 0, totalPaid: 0, totalBilled: 0, pendingAmount: 0, unpricedCount: 0,
          lastOrderDate: null, orders: [], payments: [],
        })
      }
      const c = map.get(payment.phone)!
      if (!payment.deleted) {
        c.totalPaid += payment.amount
      }
      c.payments.push(payment)
    })

    // Compute net outstanding due accurately
    map.forEach(c => {
      c.pendingAmount = Math.max(0, c.totalBilled - c.totalPaid)
    })

    return map
  }, [orders, payments])

  const customerList = useMemo(() => {
    return Array.from(customerMap.values()).sort((a, b) => {
      switch (sortBy) {
        case "dues": return b.pendingAmount - a.pendingAmount
        case "payments": return b.totalPaid - a.totalPaid
        case "orders": return b.totalOrders - a.totalOrders
        default: return new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime()
      }
    })
  }, [customerMap, sortBy])

  const filteredCustomers = useMemo(() => customerList.filter(c => {
    const q = searchTerm.toLowerCase()
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q)
    const matchesDues = !filterByDues || c.pendingAmount > 0 || c.unpricedCount > 0
    return matchesSearch && matchesDues
  }), [customerList, searchTerm, filterByDues])

  const selectedData = selectedCustomer ? customerMap.get(selectedCustomer) : (customerList[0] || null)

  // ── Portfolio KPIs (top-level) ──
  const totalClients = customerList.length
  const withDues = customerList.filter(c => c.pendingAmount > 0).length
  const totalOutstanding = customerList.reduce((s, c) => s + c.pendingAmount, 0)
  const totalCollected = customerList.reduce((s, c) => s + c.totalPaid, 0)
  const totalBills = orders.filter(o => !o.deleted).length
  const unpricedBills = orders.filter(o => !o.deleted && (!o.rate || o.rate === 0 || o.isUnpriced)).length

  // ── Monthly summary for portfolio chart ──
  const portfolioChart = useMemo(() => {
    const months: Record<string, { orders: number; paid: number }> = {}
    orders.filter(o => !o.deleted).forEach(o => {
      try {
        const d = new Date(o.createdAt || Date.now())
        const m = !isNaN(d.getTime()) ? d.toLocaleString("en-IN", { month: "short" }) : "Recent"
        if (!months[m]) months[m] = { orders: 0, paid: 0 }
        months[m].orders++
      } catch {
        if (!months["Recent"]) months["Recent"] = { orders: 0, paid: 0 }
        months["Recent"].orders++
      }
    })
    payments.forEach(p => {
      try {
        const d = new Date(p.createdAt || Date.now())
        const m = !isNaN(d.getTime()) ? d.toLocaleString("en-IN", { month: "short" }) : "Recent"
        if (!months[m]) months[m] = { orders: 0, paid: 0 }
        months[m].paid += (Number(p.amount) || 0)
      } catch {
        if (!months["Recent"]) months["Recent"] = { orders: 0, paid: 0 }
        months["Recent"].paid += (Number(p.amount) || 0)
      }
    })
    return Object.entries(months).slice(-6).map(([month, d]) => ({ month, ...d }))
  }, [orders, payments])

  return (
    <div className="flex flex-col h-full min-h-0 gap-0 font-sans text-xs">

      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between pb-3 border-b mb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold tracking-tight text-foreground leading-none">Customer Relationship Management</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{totalClients} accounts · {withDues} with outstanding balance</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFilterByDues(!filterByDues)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all ${
              filterByDues
                ? "bg-destructive/10 border-destructive/40 text-destructive"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <AlertCircle className="h-3 w-3" />
            Overdue Only ({withDues})
          </button>
        </div>
      </div>

      {/* ── KPI SUMMARY STRIP ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3 shrink-0">
        {[
          { label: "TOTAL ACCOUNTS", value: totalClients, icon: Users, color: "text-primary" },
          { label: "TOTAL BILLS", value: totalBills, icon: Package, color: "text-indigo-500" },
          { label: "OUTSTANDING", value: `₹${(totalOutstanding / 1000).toFixed(0)}K`, icon: AlertCircle, color: "text-rose-500" },
          { label: "COLLECTED", value: `₹${(totalCollected / 1000).toFixed(0)}K`, icon: CreditCard, color: "text-emerald-500" },
          { label: "UNPRICED BILLS", value: unpricedBills, icon: AlertTriangle, color: "text-amber-500" },
          { label: "WITH DUES", value: withDues, icon: Clock, color: "text-orange-500" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg border bg-card p-2.5 flex items-start gap-2">
            <kpi.icon className={`h-4 w-4 mt-0.5 shrink-0 ${kpi.color}`} />
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground truncate">{kpi.label}</div>
              <div className="text-sm font-extrabold text-foreground font-mono leading-tight mt-0.5">{String(kpi.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PORTFOLIO CHART (compact) + SEARCH ── */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3 shrink-0">
        {/* Bar chart */}
        <div className="sm:col-span-3 rounded-lg border bg-card p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> Order Activity (Last 6 Months)
          </div>
          {portfolioChart.length > 0 ? (
            <div className="h-[70px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portfolioChart} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 8 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded border border-border bg-card p-2 text-[10px] shadow-md">
                          <div className="font-bold text-foreground">{d.month}</div>
                          <div className="text-muted-foreground">{d.orders} orders</div>
                          <div className="text-emerald-500">₹{d.paid.toLocaleString("en-IN")} paid</div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="orders" radius={[2, 2, 0, 0]}>
                    {portfolioChart.map((_, i) => (
                      <Cell key={i} fill={`hsl(var(--primary))`} opacity={0.7 + (i / portfolioChart.length) * 0.3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[70px] flex items-center justify-center text-muted-foreground text-[10px]">No data yet</div>
          )}
        </div>

        {/* Search & Sort */}
        <div className="sm:col-span-2 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs pl-9 bg-card"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["recent", "dues", "payments", "orders"] as SortKey[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide border transition-all ${
                  sortBy === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="rounded-lg border bg-card p-2.5 flex items-center justify-between gap-2 mt-auto">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Net Exposure</div>
            <div className="text-sm font-black font-mono text-rose-500">
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID: DIRECTORY + PROFILE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0 overflow-hidden">

        {/* Customer Directory */}
        <div className="lg:col-span-2 flex flex-col border rounded-xl bg-card overflow-hidden shadow-xs min-h-[520px]">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b bg-muted/40 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              ACCOUNTS DIRECTORY ({filteredCustomers.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-7 w-7 mb-2 opacity-40" />
                <p className="text-xs">No accounts found</p>
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const isSelected = selectedData?.phone === customer.phone
                const ratio = customer.totalPaid > 0 && (customer.totalPaid + customer.pendingAmount) > 0
                  ? (customer.totalPaid / (customer.totalPaid + customer.pendingAmount)) * 100
                  : 0
                return (
                  <button
                    key={customer.phone || customer.name}
                    onClick={() => setSelectedCustomer(customer.phone)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-card border-border hover:bg-muted/50 hover:border-border"
                    }`}
                  >
                    {/* Avatar Logo */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs mt-0.5 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {(customer.name || "C").charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-foreground text-xs truncate" title={customer.name}>
                          {customer.name}
                        </span>
                        {customer.pendingAmount > 0 ? (
                          <span className="text-[10px] font-bold font-mono text-rose-500 shrink-0 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            ₹{(customer.pendingAmount / 1000).toFixed(1)}K
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground font-mono truncate mb-1.5">
                        {customer.phone} {customer.address ? `· ${customer.address}` : ""}
                      </div>

                      {/* Collection progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground font-semibold shrink-0">{ratio.toFixed(0)}%</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">{customer.totalOrders} order(s)</span>
                        {customer.unpricedCount > 0 && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />{customer.unpricedCount} unpriced
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 mt-2 transition-colors ${isSelected ? "text-primary font-bold" : "text-muted-foreground/40"}`} />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Customer Profile Panel */}
        <div className="lg:col-span-3 flex flex-col border rounded-xl bg-card overflow-hidden shadow-xs min-h-[520px]">
          {selectedData ? (
            <>
              {/* Profile Header */}
              <div className="px-5 py-4 border-b bg-muted/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-base font-black shrink-0 shadow-xs">
                      {(selectedData.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold text-foreground truncate" title={selectedData.name}>
                        {selectedData.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 shrink-0">
                          <Phone className="h-3 w-3 text-primary" />{selectedData.phone}
                        </span>
                        {selectedData.address && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={selectedData.address}>
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{selectedData.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowFullProfileModal(true)}
                      className="h-8 text-xs font-semibold gap-1.5"
                      title="Open full profile in popup"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Expand Profile
                    </Button>
                    {selectedData.lastOrderDate && (
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {(() => {
                          try {
                            const d = new Date(selectedData.lastOrderDate)
                            return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString("en-IN")
                          } catch {
                            return "Recent"
                          }
                        })()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Unpriced Alert */}
                {selectedData.unpricedCount > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span><strong>{selectedData.unpricedCount} bill(s)</strong> are unpriced — revenue recognition pending.</span>
                    </div>
                    <button
                      onClick={() => setShowAccountBook(true)}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded hover:bg-amber-500/15 transition-all whitespace-nowrap"
                    >
                      Tag Prices →
                    </button>
                  </div>
                )}

                {/* Financial KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total Orders</div>
                    <div className="text-xl font-black text-foreground font-mono mt-0.5">{selectedData.totalOrders}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">All time</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Collected</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      ₹{(selectedData.totalPaid / 1000).toFixed(1)}K
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{selectedData.payments.length} payment(s)</div>
                  </div>
                  <div className={`rounded-lg border p-2.5 ${selectedData.pendingAmount > 0 ? "border-rose-500/20 bg-rose-500/8" : "border-border bg-muted/30"}`}>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedData.pendingAmount > 0 ? "text-rose-500" : "text-muted-foreground"}`}>Outstanding</div>
                    <div className={`text-xl font-black font-mono mt-0.5 ${selectedData.pendingAmount > 0 ? "text-rose-500" : "text-foreground"}`}>
                      ₹{(selectedData.pendingAmount / 1000).toFixed(1)}K
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {selectedData.pendingAmount > 0 ? "Due balance" : "Fully cleared"}
                    </div>
                  </div>
                </div>

                {/* Payment History Sparkline */}
                {selectedData.payments.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" />Payment History
                    </div>
                    <div className="h-[50px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={paymentSparkline(selectedData.payments)} margin={{ top: 2, right: 0, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="pmtGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#pmtGrad)" dot={false} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              return <div className="text-[10px] bg-card border border-border rounded px-2 py-1 shadow">₹ Volume: {payload[0].value}%</div>
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="h-8 text-xs font-bold gap-1.5 shadow-xs" onClick={() => setShowAccountBook(true)}>
                    <FileText className="h-3.5 w-3.5" />Account Book
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5"
                    onClick={() => {
                      setOrderForm({ name: selectedData.name, phone: selectedData.phone, address: selectedData.address, product: "", billNo: "", unit: "bags", totalQty: 0, rate: "", vanIds: [] })
                      setShowAddOrderModal(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />New Bill
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5"
                    onClick={() => {
                      setPaymentForm({ name: selectedData.name, phone: selectedData.phone, address: selectedData.address, amount: "", mode: "CASH", note: "" })
                      setShowAddPaymentModal(true)
                    }}
                  >
                    <IndianRupee className="h-3.5 w-3.5" />Record Payment
                  </Button>
                </div>

                {/* Recent Orders List */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Package className="h-3 w-3" />Recent Bills & Orders ({selectedData.orders.length})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedData.orders.slice().reverse().map(order => {
                      const isUnpriced = !order.rate || order.rate === 0 || order.isUnpriced
                      return (
                        <div key={order.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono font-bold bg-secondary px-1 py-0.5 rounded shrink-0 text-muted-foreground">#{order.orderNo}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground truncate text-[11px]">{order.product}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {order.totalQty} {order.unit} · {(() => {
                                  try {
                                    const d = new Date(order.createdAt)
                                    return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString("en-IN")
                                  } catch {
                                    return "Recent"
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                          {isUnpriced ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                Unpriced
                              </span>
                              {onUpdateOrder && (
                                <button
                                  className="text-[10px] font-bold text-primary border border-primary/30 bg-primary/8 px-1.5 py-0.5 rounded hover:bg-primary/15 transition-all"
                                  onClick={() => {
                                    const r = prompt(`Enter price per unit for Order #${order.orderNo}:`)
                                    if (r && !isNaN(Number(r)) && Number(r) > 0) onUpdateOrder(order.id, { rate: Number(r) })
                                  }}
                                >+ Rate</button>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px] shrink-0">
                              ₹{order.rate}/{order.unit}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Account Book Modal */}
              {showAccountBook && (
                <CustomerAccountBook
                  customerName={selectedData.name}
                  customerPhone={selectedData.phone}
                  customerAddress={selectedData.address}
                  orders={selectedData.orders}
                  payments={selectedData.payments}
                  onClose={() => setShowAccountBook(false)}
                  onUpdateOrder={onUpdateOrder}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <User className="h-6 w-6 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">No account selected</p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose a customer from the directory to view their profile</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Order / New Bill Modal ── */}
      <Dialog open={showAddOrderModal} onOpenChange={setShowAddOrderModal}>
        <DialogContent className="max-w-md p-5 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <span>New Bill — {orderForm.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{orderForm.phone}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <div className="relative">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Product Material *</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={orderForm.product}
                onChange={e => {
                  const val = e.target.value
                  const fetchedRate = store.getRateBySKU(val)
                  setOrderForm(f => ({
                    ...f,
                    product: val,
                    rate: fetchedRate > 0 ? fetchedRate : f.rate,
                  }))
                }}
                placeholder="Search SKU or type product name..."
              />
              {/* Product Material Suggestions */}
              {orderForm.product.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-md max-h-36 overflow-y-auto p-1 divide-y">
                  {store.skuList
                    .filter((s: any) => s.product.toLowerCase().includes(orderForm.product.toLowerCase()))
                    .slice(0, 8)
                    .map((sku: any) => (
                      <button
                        key={sku.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-muted text-xs flex items-center justify-between"
                        onClick={() => {
                          const fetchedRate = store.getRateBySKU(sku.product) || sku.rate
                          setOrderForm(f => ({
                            ...f,
                            product: sku.product,
                            unit: sku.unit || "bags",
                            rate: fetchedRate > 0 ? fetchedRate : "",
                          }))
                        }}
                      >
                        <span className="font-semibold text-foreground">{sku.product}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">₹{sku.rate}/{sku.unit}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Rate / Unit (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  className="h-8 text-xs font-mono mt-1"
                  value={orderForm.rate}
                  onChange={e => setOrderForm(f => ({ ...f, rate: e.target.value }))}
                  placeholder="Auto / Blank"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Bill No</Label>
                <Input className="h-8 text-xs font-mono mt-1" value={orderForm.billNo} onChange={e => setOrderForm(f => ({ ...f, billNo: e.target.value }))} placeholder="B-XXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Total Qty</Label>
                <Input type="number" className="h-8 text-xs font-mono mt-1" value={orderForm.totalQty || ""} onChange={e => setOrderForm(f => ({ ...f, totalQty: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Unit</Label>
                <Input className="h-8 text-xs mt-1" value={orderForm.unit} onChange={e => setOrderForm(f => ({ ...f, unit: e.target.value }))} placeholder="bags" />
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs font-bold uppercase mt-1"
              disabled={!orderForm.product.trim()}
              onClick={() => {
                if (orderForm.product.trim() && onAddOrder) {
                  const r = orderForm.rate !== "" && !isNaN(Number(orderForm.rate)) && Number(orderForm.rate) > 0 ? Number(orderForm.rate) : undefined
                  if (r !== undefined) {
                    store.updateSKURate(orderForm.product, r)
                  }
                  onAddOrder({ ...orderForm, rate: r })
                  setShowAddOrderModal(false)
                  setOrderForm({ name: "", phone: "", address: "", product: "", billNo: "", unit: "bags", totalQty: 0, rate: "", vanIds: [] })
                }
              }}
            >
              Create Bill & Sync Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Payment Modal ── */}
      <Dialog open={showAddPaymentModal} onOpenChange={setShowAddPaymentModal}>
        <DialogContent className="max-w-sm p-5 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold">Record Payment — {paymentForm.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Amount (₹) *</Label>
              <Input type="number" className="h-8 text-xs font-mono font-bold mt-1" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payment Mode</Label>
              <select className="w-full h-8 rounded-md border bg-card px-2 text-xs font-semibold mt-1" value={paymentForm.mode} onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value as any }))}>
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT / NetBanking</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Note (optional)</Label>
              <Input className="h-8 text-xs mt-1" value={paymentForm.note} onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} placeholder="Transaction ID / reference" />
            </div>
            <Button size="sm" className="h-8 text-xs font-bold uppercase" disabled={!paymentForm.amount || Number(paymentForm.amount) <= 0}
              onClick={() => {
                if (paymentForm.amount && onAddPayment) {
                  onAddPayment({ ...paymentForm, amount: Number(paymentForm.amount) })
                  setShowAddPaymentModal(false)
                }
              }}>
              Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Profile Modal */}
      {showFullProfileModal && selectedCustomer && (
        <CustomerProfileModal
          profile={(() => {
            const d = customerMap.get(selectedCustomer)
            if (!d) return null
            const activePayments = d.payments.filter(p => !p.deleted)
            const totalBilled = d.orders.reduce((sum, o) => {
              const isUnpriced = !o.rate || o.rate === 0 || o.isUnpriced
              return sum + (isUnpriced ? 0 : (o.rate || 0) * (o.totalQty || 0))
            }, 0)
            return {
              customer: { phone: d.phone, name: d.name, address: d.address },
              totalOrders: d.totalOrders,
              totalAmount: totalBilled,
              totalDelivered: d.orders.reduce((sum, o) => sum + o.trips.reduce((s, t) => s + t.quantity, 0), 0),
              unpricedOrdersCount: d.unpricedCount,
              lastOrderDate: d.lastOrderDate,
              orders: d.orders,
              payments: d.payments,
            }
          })()}
          open={showFullProfileModal}
          onOpenChange={setShowFullProfileModal}
        />
      )}
    </div>
  )
}
