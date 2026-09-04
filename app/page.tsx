"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useStore } from "@/hooks/use-store"
import type { FilterTab, CustomerProfile, AppTab } from "@/lib/types"
import { getISTDateString, isTodayIST } from "@/lib/validation"
import { StatsBar } from "@/components/stats-bar"
import { VanRegistry } from "@/components/van-registry"
import { OrderCard } from "@/components/order-card"
import { AddOrderModal } from "@/components/add-order-modal"
import { PaymentReceives } from "@/components/payment-receives"
import { PaymentsOut } from "@/components/payments-out"
import { CustomerProfileModal } from "@/components/customer-profile-modal"
import { ActivityLogViewer } from "@/components/activity-log-viewer"
import { RateIntelligence } from "@/components/rate-intelligence"
import { InventoryBased } from "@/components/inventory-based"
import { CRMPanel } from "@/components/crm-panel"
import { FinanceIntel } from "@/components/finance-intel"
import { LiveMap } from "@/components/live-map"
import { DailySheetHistory } from "@/components/daily-sheet-history"
import { SKUManager } from "@/components/sku-manager"
import {
  Package,
  Filter,
  FileWarning,
  Calendar,
  BarChart3,
  Truck,
  Users,
  Wallet,
  Settings2,
  History,
  Tag,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowDown,
  ArrowUp,
  Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

function isToday(value?: string | null) {
  return isTodayIST(value)
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "delivered", label: "Delivered" },
]

export default function Page() {
  const store = useStore()
  const [mounted, setMounted] = useState(false)
  const [activeAppTab, setActiveAppTab] = useState<AppTab>("daily-sheet")
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("all")
  const [showVans, setShowVans] = useState(false)
  const [showDeleteLogs, setShowDeleteLogs] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<CustomerProfile | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [addOrderOpen, setAddOrderOpen] = useState(false)
  const todayStr = useMemo(() => getISTDateString(), [])
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString())
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminPinInput, setAdminPinInput] = useState("")
  const [adminPinError, setAdminPinError] = useState("")

  const orderRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const paymentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const paymentOutRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orderSortDirection, setOrderSortDirection] = useState<"newest" | "oldest">("newest")

  useEffect(() => {
    setMounted(true)
    try {
      const savedSidebar = localStorage.getItem("sarkar_sidebar_open")
      if (savedSidebar !== null) {
        setSidebarOpen(savedSidebar === "true")
      }
      const savedFleet = localStorage.getItem("sarkar_show_fleet")
      if (savedFleet !== null) {
        setShowVans(savedFleet === "true")
      }
      const savedSort = localStorage.getItem("sarkar_order_sort_direction")
      if (savedSort === "newest" || savedSort === "oldest") {
        setOrderSortDirection(savedSort)
      }
    } catch {}
  }, [])

  const handleSetOrderSort = (direction: "newest" | "oldest") => {
    setOrderSortDirection(direction)
    try {
      localStorage.setItem("sarkar_order_sort_direction", direction)
    } catch {}
  }

  const handleToggleOrderSort = () => {
    const next = orderSortDirection === "newest" ? "oldest" : "newest"
    handleSetOrderSort(next)
  }

  const handleToggleVans = (val?: boolean) => {
    setShowVans((prev) => {
      const next = typeof val === "boolean" ? val : !prev
      try {
        localStorage.setItem("sarkar_show_fleet", String(next))
      } catch {}
      return next
    })
  }

  const handleToggleSidebar = (open?: boolean) => {
    setSidebarOpen((prev) => {
      const next = typeof open === "boolean" ? open : !prev
      try {
        localStorage.setItem("sarkar_sidebar_open", String(next))
      } catch {}
      return next
    })
  }

  // Listen for Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        handleToggleSidebar()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Compute all available dates with data
  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    dates.add(todayStr)
    store.orders.forEach(o => {
      if (o.createdAt) dates.add(getISTDateString(o.createdAt))
    })
    store.payments.forEach(p => {
      if (p.createdAt) dates.add(getISTDateString(p.createdAt))
    })
    store.paymentsOut.forEach(po => {
      if (po.createdAt) dates.add(getISTDateString(po.createdAt))
    })
    return Array.from(dates).sort().reverse()
  }, [store.orders, store.payments, store.paymentsOut, todayStr])

  const isCurrentDay = selectedDate === todayStr
  const canEditCurrentSheet = isCurrentDay || store.isAdminUnlocked

  const handlePrevDate = () => {
    const parts = selectedDate.split("-").map(Number)
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    d.setUTCDate(d.getUTCDate() - 1)
    setSelectedDate(d.toISOString().split("T")[0])
  }

  const handleNextDate = () => {
    const parts = selectedDate.split("-").map(Number)
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    d.setUTCDate(d.getUTCDate() + 1)
    const nextDateStr = d.toISOString().split("T")[0]
    if (nextDateStr <= todayStr) {
      setSelectedDate(nextDateStr)
    }
  }

  const handleAdminUnlock = () => {
    if (store.unlockAdmin(adminPinInput.trim())) {
      setAdminModalOpen(false)
      setAdminPinInput("")
      setAdminPinError("")
    } else {
      setAdminPinError("Invalid PIN. Default PIN is 1234.")
    }
  }

  // Listen for Spacebar shortcut to open Add Order Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeElement = document.activeElement
        const tagName = activeElement?.tagName.toUpperCase()
        const isEditable = activeElement?.getAttribute("contenteditable") === "true"
        
        if (tagName !== "INPUT" && tagName !== "TEXTAREA" && tagName !== "SELECT" && !isEditable) {
          e.preventDefault()
          if (canEditCurrentSheet) {
            setAddOrderOpen(true)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canEditCurrentSheet])

  // Show loading until store is ready
  if (!mounted || !store.orders) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground animate-pulse">
            <Package className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">Loading Sarkar Builders...</p>
        </div>
      </main>
    )
  }

  const handleCustomerClick = (phone: string) => {
    const profile = store.getCustomerProfile(phone)
    if (profile) {
      setSelectedCustomerProfile(profile)
      setProfileOpen(true)
    }
  }

  const handleActivityNavigate = (type: string, id: string) => {
    setTimeout(() => {
      if (type === "order" && orderRefs.current[id]) {
        orderRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
      } else if (type === "payment" && paymentRefs.current[id]) {
        paymentRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
      } else if (type === "payment_out" && paymentOutRefs.current[id]) {
        paymentOutRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 100)
  }

  const filteredOrders = store.orders.filter((o) => {
    const orderDate = o.createdAt ? getISTDateString(o.createdAt) : ""
    if (orderDate !== selectedDate) return false
    if (activeFilterTab === "pending") return o.status === "pending" && !o.deleted
    if (activeFilterTab === "delivered") return o.status === "delivered" && !o.deleted
    return !o.deleted
  })

  // Sort: non-deleted first, then by orderNo (sequential day sheet number), fallback createdAt
  const dir = orderSortDirection === "newest" ? -1 : 1
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    // 1. Non-deleted before deleted
    if (a.deleted !== b.deleted) return a.deleted ? 1 : -1

    // 2. Primary: orderNo — always valid after hydration re-assignment
    const numA = Number(a.orderNo) || 0
    const numB = Number(b.orderNo) || 0
    if (numA !== numB) return dir * (numA - numB)

    // 3. Tiebreak: createdAt in same direction
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (tA !== tB) return dir * (tA - tB)

    // 4. Final: id (numeric collation)
    return dir * a.id.localeCompare(b.id, undefined, { numeric: true })
  })

  return (
    <main className="h-screen max-h-screen overflow-hidden flex flex-col bg-background font-sans">
      {/* Header */}
      <header className="shrink-0 z-40 border-b bg-card/85 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between max-w-full gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-foreground">Sarkar Operations CRM</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  store.isCloudSynced
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${store.isCloudSynced ? "bg-sky-500" : "bg-emerald-500"}`} />
                  {store.isCloudSynced ? "Live Cloud Sync (Supabase)" : "Live Local Sync"}
                </span>
                {store.isAdminUnlocked ? (
                  <button
                    onClick={() => store.lockAdmin()}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
                    title="Click to lock administrative access"
                  >
                    <Unlock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    Admin Access Active (Click to Lock)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAdminPinInput("")
                      setAdminPinError("")
                      setAdminModalOpen(true)
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border hover:bg-muted/80 hover:text-foreground transition-all"
                    title="Unlock administrative access"
                  >
                    <Lock className="h-3 w-3" />
                    Admin Access
                  </button>
                )}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Unified Order Management, Dispatch & Customer Ledger System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canEditCurrentSheet ? (
              <AddOrderModal vans={store.vans} onAdd={store.addOrder} open={addOrderOpen} onOpenChange={setAddOrderOpen} />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdminModalOpen(true)}
                className="h-8 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
              >
                <Lock className="h-3.5 w-3.5" />
                Unlock Admin to Add to {selectedDate}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area with sidebar */}
      <div className="flex flex-1 h-[calc(100vh-57px)] max-h-[calc(100vh-57px)] overflow-hidden relative">
        {/* Floating edge tab to open sidebar when tucked in */}
        {!sidebarOpen && (
          <button
            onClick={() => handleToggleSidebar(true)}
            className="absolute left-0 top-3 z-30 flex items-center justify-center bg-card hover:bg-accent border border-l-0 rounded-r-lg h-9 w-7 shadow-md text-muted-foreground hover:text-foreground transition-all group"
            title="Expand Sidebar (Ctrl+B)"
          >
            <PanelLeftOpen className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Left Sidebar - Categorized Workspace Navigation (Fixed Height Always & Tucked In) */}
        <aside
          className={`h-full max-h-full border-r bg-sidebar flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 select-none ${
            sidebarOpen ? "w-56 opacity-100" : "w-0 border-r-0 opacity-0 pointer-events-none overflow-hidden"
          }`}
        >
          {/* Inner Sidebar Header with Collapse Button */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-sidebar-border/50 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Workspace</span>
            <button
              onClick={() => handleToggleSidebar(false)}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Tuck In Sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 p-3 space-y-4 overflow-y-auto">
            {/* Section 1: Operations */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Operations</p>
              {[
                { id: "daily-sheet", label: "Daily Dispatch Sheet", icon: Package, badge: store.orders.filter(o => !o.deleted && (o.createdAt ? getISTDateString(o.createdAt) : "") === selectedDate).length },
                { id: "sku-manager", label: "SKU Master", icon: Tag, badge: store.skuList.length },
              ].map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveAppTab(id as AppTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeAppTab === id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      activeAppTab === id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Section 2: Commerce & Customers */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Commerce & CRM</p>
              {[
                { id: "crm", label: "Customer CRM", icon: Users },
                { id: "rate-intelligence", label: "Rate Intelligence", icon: BarChart3 },
                { id: "inventory", label: "Inventory Stock", icon: Truck },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveAppTab(id as AppTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeAppTab === id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Section 3: Finance & SRM */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Finance & SRM</p>
              {[
                { id: "finance-intel", label: "Finance Intelligence", icon: Wallet },
                { id: "srm", label: "Supplier SRM", icon: Settings2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveAppTab(id as AppTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeAppTab === id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Footer with Admin Controls */}
          <div className="border-t p-2.5 bg-muted/30 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-muted-foreground">Sarkar Suite v3.0</span>
              </div>
              {store.isAdminUnlocked ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => store.lockAdmin()}
                  className="h-6 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 gap-1 font-mono font-bold"
                  title="Lock Admin Mode"
                >
                  <Unlock className="h-3 w-3" /> Lock
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdminPinInput("")
                    setAdminPinError("")
                    setAdminModalOpen(true)
                  }}
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1 font-mono"
                  title="Unlock Admin Mode (PIN: 1234)"
                >
                  <Lock className="h-3 w-3" /> Admin
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 h-full max-h-full overflow-y-auto bg-background/50 flex flex-col">
          {activeAppTab === "daily-sheet" && (
            <div className="mx-auto max-w-7xl w-full px-5 py-6 space-y-5">
              {/* Stats Bar synced with selectedDate */}
              <div>
                <StatsBar orders={store.orders} dateFilter={selectedDate} />
              </div>

              {/* Daily Sheet Layout */}
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* Left column: Vans + Orders */}
                <div className="flex-1">
                  {/* Section toggle */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant={showVans ? "default" : "outline"}
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleToggleVans(!showVans)}
                      title={showVans ? "Hide Fleet Vehicles" : "Show Fleet Vehicles"}
                    >
                      <Truck className="h-3 w-3" />
                      Fleet
                    </Button>
                    <Button
                      size="sm"
                      variant={showDeleteLogs ? "default" : "outline"}
                      className="h-7 gap-1 text-xs"
                      onClick={() => setShowDeleteLogs(!showDeleteLogs)}
                    >
                      <FileWarning className="h-3 w-3" />
                      Delete Logs ({store.deleteLogs.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={showHistory ? "default" : "outline"}
                      className="h-7 gap-1 text-xs"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="h-3 w-3" />
                      History
                    </Button>
                  </div>

                  {/* Van Registry */}
                  {showVans && (
                    <div className="mb-4">
                      <VanRegistry vans={store.vans} orders={store.orders} onAddVan={store.addVan} onToggleVan={store.toggleVan} onDeleteVan={store.deleteVan} />
                    </div>
                  )}

                  {/* Delete Logs */}
                  {showDeleteLogs && store.deleteLogs.length > 0 && (
                    <div className="mb-4 rounded-xl border border-destructive/30 bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="flex items-center gap-1 text-xs font-semibold text-destructive">
                          <FileWarning className="h-3.5 w-3.5" />
                          All Delete Logs ({store.deleteLogs.length})
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                          onClick={() => store.clearAllDeleteLogs()}
                        >
                          Clear All Logs
                        </Button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {store.deleteLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between rounded bg-destructive/5 px-2 py-1.5 text-[11px]">
                            <div>
                              <span className="font-medium text-destructive">[{log.type.toUpperCase()}]</span>{" "}
                              <span className="text-foreground">{log.label}</span>{" "}
                              <span className="text-muted-foreground">- {log.reason}</span>{" "}
                              <span className="text-[10px] text-muted-foreground">
                                {mounted ? `(${new Date(log.deletedAt).toLocaleDateString("en-IN")} ${new Date(log.deletedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })})` : ""}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => store.removeDeleteLog(log.id)}
                              title="Delete this log permanently"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily Sheet History */}
                  {showHistory && (
                    <div className="mb-4 rounded-xl border bg-card p-4">
                      <DailySheetHistory orders={store.orders} payments={store.payments} paymentsOut={store.paymentsOut} />
                    </div>
                  )}

                  {/* Interactive Date Navigator with Calendar Picker & Day-by-Day Toggle */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 bg-card p-2.5 rounded-xl border shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-muted/70 p-0.5 rounded-lg border">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-muted"
                          onClick={handlePrevDate}
                          title="Previous Day (1 day back)"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        {/* Interactive Date Picker Display */}
                        <label className="relative flex items-center gap-1.5 px-2 text-xs font-bold text-foreground font-mono cursor-pointer hover:bg-card/80 py-1 rounded transition-colors" title="Click to pick a specific date from calendar">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>{mounted ? new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : selectedDate}</span>
                          {isCurrentDay ? (
                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-sans uppercase font-bold">
                              Today
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-sans uppercase font-bold">
                              Past Day
                            </span>
                          )}
                          <input
                            type="date"
                            value={selectedDate}
                            max={todayStr}
                            onChange={(e) => {
                              if (e.target.value) setSelectedDate(e.target.value)
                            }}
                            className="sr-only"
                          />
                        </label>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-muted"
                          onClick={handleNextDate}
                          title="Next Day (1 day forward)"
                          disabled={selectedDate >= todayStr}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Direct Calendar Picker input for quick jumping */}
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={selectedDate}
                          max={todayStr}
                          onChange={(e) => {
                            if (e.target.value) setSelectedDate(e.target.value)
                          }}
                          className="h-7 text-xs bg-muted/50 border rounded px-2 font-mono text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                          title="Pick date from calendar"
                        />
                      </div>

                      {!isCurrentDay && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => setSelectedDate(todayStr)}
                        >
                          Jump to Today
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isCurrentDay && !store.isAdminUnlocked && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          <Lock className="h-3 w-3" />
                          <span>Past date (Read-Only)</span>
                          <button
                            onClick={() => setAdminModalOpen(true)}
                            className="font-bold underline ml-1 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer"
                          >
                            Unlock Admin
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          {TABS.map((tab) => (
                            <Button
                              key={tab.key}
                              size="sm"
                              variant={activeFilterTab === tab.key ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => setActiveFilterTab(tab.key)}
                            >
                              <Filter className="h-3 w-3 mr-1" />
                              {tab.label}
                            </Button>
                          ))}
                        </div>

                        {/* Clear 2-button Segmented Control for Newest vs Oldest */}
                        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSetOrderSort("newest")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              orderSortDirection === "newest"
                                ? "bg-background text-primary shadow-xs border border-border/40 font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Sort orders Newest first (latest orders on top)"
                          >
                            <ArrowDown className="h-3 w-3 text-primary" />
                            <span>Newest</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetOrderSort("oldest")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              orderSortDirection === "oldest"
                                ? "bg-background text-primary shadow-xs border border-border/40 font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Sort orders Oldest first (Order #1 on top)"
                          >
                            <ArrowUp className="h-3 w-3 text-primary" />
                            <span>Oldest</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Orders List */}
                  <div className="space-y-2">
                    {sortedOrders.length === 0 ? (
                      <div className="rounded border border-dashed p-6 text-center bg-card/40">
                        <p className="text-sm text-muted-foreground">No orders recorded for {selectedDate}</p>
                      </div>
                    ) : (
                      sortedOrders.map((order) => (
                        <div key={order.id} ref={(el) => { if (el) orderRefs.current[order.id] = el }} className="group">
                          <OrderCard
                            order={order}
                            vans={store.vans}
                            onUpdate={store.updateOrder}
                            onSoftDelete={store.softDeleteOrder}
                            onAddTrip={store.addTrip}
                            onDeleteTrip={store.deleteTrip}
                            onCustomerClick={handleCustomerClick}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right column: Payment Receives + Payments Out + Map + Activity Log */}
                <div className="w-full lg:w-[380px]">
                  <div className="flex flex-col gap-4 lg:sticky lg:top-20 max-h-[calc(100vh-120px)] overflow-y-auto">
                    <div className="rounded-xl border bg-card p-4">
                      <PaymentReceives
                        payments={store.payments}
                        deleteLogs={store.deleteLogs}
                        onAddPayment={store.addPayment}
                        onDeletePayment={store.deletePayment}
                        onCustomerClick={handleCustomerClick}
                        paymentRefs={paymentRefs.current}
                        dateFilter={selectedDate}
                        readOnly={!canEditCurrentSheet}
                      />
                    </div>
                    <div className="rounded-xl border border-destructive/20 bg-card p-4">
                      <PaymentsOut
                        paymentsOut={store.paymentsOut}
                        deleteLogs={store.deleteLogs}
                        onAddPaymentOut={store.addPaymentOut}
                        onDeletePaymentOut={store.deletePaymentOut}
                        paymentOutRefs={paymentOutRefs.current}
                        dateFilter={selectedDate}
                        readOnly={!canEditCurrentSheet}
                      />
                    </div>
                    
                    {/* Live Map */}
                    <div className="rounded-xl border bg-card p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Live Satellite Map
                      </h3>
                      {mounted && <LiveMap orders={store.orders} />}
                    </div>

                    {/* Activity Log (Real-time, cumulative) */}
                    {mounted && (
                      <div className="rounded-xl border bg-card p-4">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">Activity Log (Real-time)</h3>
                        <ActivityLogViewer
                          logs={store.activityLogs.slice(0, 20)}
                          payments={store.payments.filter((payment) => isToday(payment.createdAt))}
                          paymentsOut={store.paymentsOut.filter((payment) => isToday(payment.createdAt))}
                          orders={store.orders}
                          onNavigate={handleActivityNavigate}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAppTab === "sku-manager" && (
            <div className="p-2 sm:p-3 compact-workspace max-w-full">
              <SKUManager isAdmin={store.isAdminUnlocked} onUnlockAdmin={() => setAdminModalOpen(true)} />
            </div>
          )}

          {activeAppTab === "rate-intelligence" && (
            <div className="p-3 sm:p-4 compact-workspace max-w-full">
              <RateIntelligence />
            </div>
          )}

          {activeAppTab === "inventory" && (
            <div className="p-3 sm:p-4 compact-workspace max-w-full">
              <InventoryBased />
            </div>
          )}

          {activeAppTab === "crm" && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
              <CRMPanel 
                orders={store.orders} 
                payments={store.payments} 
                customers={new Map()}
                onAddOrder={store.addOrder}
                onAddPayment={store.addPayment}
                onUpdateOrder={store.updateOrder}
                vans={store.vans}
              />
            </div>
          )}

          {activeAppTab === "srm" && (
            <div className="p-3 sm:p-4 compact-workspace max-w-full">
              <div className="rounded-lg border border-dashed p-8 text-center bg-card">
                <Settings2 className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-xs font-semibold text-foreground mb-1">SRM - Supplier Relationship Management</h3>
                <p className="text-[11px] text-muted-foreground">Manage suppliers, purchase terms, and vendor performance</p>
              </div>
            </div>
          )}

          {activeAppTab === "finance-intel" && (
            <div className="p-3 sm:p-4 compact-workspace max-w-full">
              <FinanceIntel payments={store.payments} paymentsOut={store.paymentsOut} />
            </div>
          )}
        </div>
      </div>

      {/* Customer Profile Modal */}
      <CustomerProfileModal
        profile={selectedCustomerProfile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* Admin PIN Unlock Modal */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="max-w-xs p-5 gap-3">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
              <Lock className="h-4 w-4 text-amber-500" />
              Administrative Access
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-[11px] text-muted-foreground">
              Enter your administrative PIN to unlock editing on past daily sheets, master SKU rates, and protected registers.
            </p>
            <div className="grid gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Admin PIN</Label>
              <Input
                type="password"
                maxLength={8}
                className="h-8 text-center font-mono font-bold text-base tracking-widest"
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value)
                  setAdminPinError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdminUnlock()
                }}
                placeholder="••••"
                autoFocus
              />
              {adminPinError && (
                <span className="text-[10px] text-destructive font-semibold">{adminPinError}</span>
              )}
            </div>
            <DialogFooter className="pt-2 border-t flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdminModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs font-bold uppercase" onClick={handleAdminUnlock}>
                Unlock Access
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
