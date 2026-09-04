"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Van, Order } from "@/lib/types"
import { Truck, Plus, Power, Package, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface VanRegistryProps {
  vans: Van[]
  orders: Order[]
  onAddVan: (van: Omit<Van, "id" | "enabled">) => void
  onToggleVan: (id: string) => void
  onDeleteVan: (id: string) => void
}

interface ContextMenu {
  vanId: string
  vanName: string
  x: number
  y: number
}

const VAN_COLORS = ["#e67e22", "#2ecc71", "#3498db", "#e74c3c", "#9b59b6", "#1abc9c", "#f1c40f", "#34495e"]

export function VanRegistry({ vans, orders, onAddVan, onToggleVan, onDeleteVan }: VanRegistryProps) {
  const pendingOrders = orders.filter((o) => o.status === "pending")
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("sarkar_builders_vans_dialog_open") === "true"
  })
  const [form, setForm] = useState({ name: "", driver: "", plate: "", color: VAN_COLORS[0] })
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    localStorage.setItem("sarkar_builders_vans_dialog_open", String(nextOpen))
  }

  const handleAdd = () => {
    if (!form.name.trim() || !form.driver.trim()) return
    onAddVan(form)
    setForm({ name: "", driver: "", plate: "", color: VAN_COLORS[0] })
    setOpen(false)
  }

  // Right-click handler on van card
  const handleContextMenu = useCallback((e: React.MouseEvent, van: Van) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ vanId: van.id, vanName: van.name, x: e.clientX, y: e.clientY })
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

  const handleDeleteConfirm = (vanId: string) => {
    onDeleteVan(vanId)
    setConfirmDeleteId(null)
    setContextMenu(null)
  }

  const vanToDelete = confirmDeleteId ? vans.find(v => v.id === confirmDeleteId) : null
  const vanToDeleteOrders = confirmDeleteId
    ? pendingOrders.filter(o => o.vanIds.includes(confirmDeleteId)).length
    : 0

  return (
    <>
      <div className="rounded-xl border bg-card/80 backdrop-blur-sm shadow-xs transition-all">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Active Van Fleet</h2>
              <p className="text-[11px] text-muted-foreground">
                {vans.filter(v => v.enabled).length} active drivers · {pendingOrders.length} pending dispatches
                <span className="ml-2 text-muted-foreground/60">· Right-click any van to manage</span>
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs font-medium shadow-xs">
                <Plus className="h-3.5 w-3.5" />
                Register Van
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Register Fleet Vehicle</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3.5 pt-2">
                <div>
                  <Label className="text-xs font-medium">Van / Vehicle Name</Label>
                  <Input
                    placeholder="e.g. Ashok Van"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Driver Name</Label>
                  <Input
                    placeholder="e.g. Ashok"
                    value={form.driver}
                    onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Plate Number</Label>
                  <Input
                    placeholder="e.g. WB-01-5678"
                    value={form.plate}
                    onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Color Badge Tag</Label>
                  <div className="mt-1.5 flex gap-2">
                    {VAN_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: form.color === c ? "var(--foreground)" : "transparent",
                          transform: form.color === c ? "scale(1.15)" : "scale(1)",
                        }}
                        onClick={() => setForm((f) => ({ ...f, color: c }))}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleAdd} className="mt-2 w-full font-medium">
                  Register Van
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {vans.map((van) => {
            const vanOrders = pendingOrders.filter((o) => o.vanIds.includes(van.id))
            const isActive = vanOrders.length > 0

            return (
              <div
                key={van.id}
                className={`rounded-xl border p-3 transition-all duration-200 select-none ${
                  van.enabled
                    ? "bg-card border-border/80 hover:border-primary/40 hover:shadow-xs cursor-context-menu"
                    : "bg-muted/40 opacity-50 border-dashed cursor-context-menu"
                }`}
                onContextMenu={(e) => handleContextMenu(e, van)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: van.color }}
                      />
                      {isActive && van.enabled && (
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                          style={{ backgroundColor: van.color }}
                        />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-semibold text-foreground">{van.name}</span>
                      <span className="truncate text-[10px] font-medium text-muted-foreground">{van.driver} · {van.plate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      vanOrders.length > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {vanOrders.length} {vanOrders.length === 1 ? "order" : "orders"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); onToggleVan(van.id) }}
                      title={van.enabled ? "Disable Van" : "Enable Van"}
                    >
                      <Power className={`h-3 w-3 ${van.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                </div>
                {vanOrders.length > 0 && van.enabled && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t pt-2">
                    {vanOrders.map((o) => (
                      <span
                        key={o.id}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground border border-border/40"
                      >
                        <Package className="h-2.5 w-2.5 text-primary" />
                        <span className="truncate max-w-[110px]">{o.name.split(" ")[0]} - {o.product}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right-Click Context Menu ── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[180px] rounded-lg border border-border bg-card shadow-xl py-1 text-xs animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Context menu header */}
          <div className="px-3 py-1.5 border-b mb-1">
            <div className="font-bold text-foreground text-[11px] truncate">{contextMenu.vanName}</div>
            <div className="text-[10px] text-muted-foreground">Fleet Vehicle</div>
          </div>

          {/* Toggle Enable/Disable */}
          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
            onClick={() => { onToggleVan(contextMenu.vanId); setContextMenu(null) }}
          >
            <Power className="h-3.5 w-3.5 text-muted-foreground" />
            {vans.find(v => v.id === contextMenu.vanId)?.enabled ? "Disable Van" : "Enable Van"}
          </button>

          {/* Separator */}
          <div className="border-t my-1" />

          {/* Delete */}
          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors font-semibold"
            onClick={() => { setConfirmDeleteId(contextMenu.vanId); setContextMenu(null) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Van from Fleet
          </button>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDeleteId && vanToDelete && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delete Fleet Vehicle</h3>
                  <p className="text-[11px] text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setConfirmDeleteId(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: vanToDelete.color }}
                />
                <span className="font-bold text-foreground">{vanToDelete.name}</span>
              </div>
              <div className="text-muted-foreground">
                Driver: <span className="font-medium text-foreground">{vanToDelete.driver}</span> · Plate: <span className="font-mono font-medium text-foreground">{vanToDelete.plate}</span>
              </div>
              {vanToDeleteOrders > 0 && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠ {vanToDeleteOrders} active order(s) will be unassigned from this van
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 h-8 text-xs font-bold"
                onClick={() => handleDeleteConfirm(confirmDeleteId)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
