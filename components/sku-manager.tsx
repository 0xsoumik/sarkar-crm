"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/hooks/use-store"
import type { SKUItem } from "@/lib/types"
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface SKUManagerProps {
  isAdmin?: boolean
  onUnlockAdmin?: () => void
}

export function SKUManager({ isAdmin = false, onUnlockAdmin }: SKUManagerProps) {
  const store = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  
  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testResults, setTestResults] = useState<{
    total: number
    valid: number
    missingRates: SKUItem[]
    missingCodes: SKUItem[]
    missingFirms: SKUItem[]
    duplicateCodes: string[]
  } | null>(null)

  const [editingItem, setEditingItem] = useState<SKUItem | null>(null)
  const [form, setForm] = useState<{
    skuCode: string
    product: string
    category: string
    firm: string
    unit: string
    rate: number | string
  }>({
    skuCode: "",
    product: "",
    category: "Cement",
    firm: "",
    unit: "bags",
    rate: "",
  })

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>()
    store.skuList.forEach((s) => {
      if (s.category) cats.add(s.category)
    })
    return ["all", ...Array.from(cats)]
  }, [store.skuList])

  // Filtered SKUs
  const filteredSKUs = useMemo(() => {
    return store.skuList.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.skuCode && item.skuCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.firm && item.firm.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCat = categoryFilter === "all" || item.category === categoryFilter
      return matchesSearch && matchesCat
    })
  }, [store.skuList, searchQuery, categoryFilter])

  // Run Test Function (bottom left small button)
  const runSKUTest = () => {
    const total = store.skuList.length
    const missingRates: SKUItem[] = []
    const missingCodes: SKUItem[] = []
    const missingFirms: SKUItem[] = []
    const codeCounts: Record<string, number> = {}

    store.skuList.forEach((item) => {
      if (!item.rate || Number(item.rate) <= 0) {
        missingRates.push(item)
      }
      if (!item.skuCode || item.skuCode.trim() === "") {
        missingCodes.push(item)
      } else {
        const normalizedCode = item.skuCode.trim().toUpperCase()
        codeCounts[normalizedCode] = (codeCounts[normalizedCode] || 0) + 1
      }
      if (!item.firm || item.firm.trim() === "") {
        missingFirms.push(item)
      }
    })

    const duplicateCodes = Object.keys(codeCounts).filter((c) => codeCounts[c] > 1)
    const valid = total - (missingRates.length + missingCodes.length + duplicateCodes.length)

    setTestResults({
      total,
      valid: Math.max(0, valid),
      missingRates,
      missingCodes,
      missingFirms,
      duplicateCodes,
    })
    setTestModalOpen(true)
  }

  const handleOpenEdit = (item: SKUItem) => {
    setEditingItem(item)
    setForm({
      skuCode: item.skuCode || "",
      product: item.product || "",
      category: item.category || "General",
      firm: item.firm || "",
      unit: item.unit || "bags",
      rate: item.rate !== undefined ? item.rate : "",
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (!editingItem) return
    if (!form.product.trim()) return

    const numericRate = Number(form.rate) || 0
    store.updateSKU(editingItem.id, {
      skuCode: form.skuCode.trim().toUpperCase(),
      product: form.product.trim(),
      category: form.category.trim(),
      firm: form.firm.trim(),
      unit: form.unit.trim(),
      rate: numericRate,
    })

    setEditModalOpen(false)
    setEditingItem(null)
  }

  const handleOpenAdd = () => {
    setForm({
      skuCode: "",
      product: "",
      category: "Cement",
      firm: "",
      unit: "bags",
      rate: "",
    })
    setAddModalOpen(true)
  }

  const handleSaveAdd = () => {
    if (!form.product.trim()) return
    const numericRate = Number(form.rate) || 0
    store.addSKU({
      skuCode: form.skuCode.trim().toUpperCase() || `SKU-${Date.now().toString().slice(-4)}`,
      product: form.product.trim(),
      category: form.category.trim() || "General",
      firm: form.firm.trim() || "Direct",
      unit: form.unit.trim() || "units",
      rate: numericRate,
    })
    setAddModalOpen(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 p-4">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-foreground">SKU & Material Master</h2>
              <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                {store.skuList.length} SKUs
              </Badge>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" /> Admin Access Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border">
                  <ShieldAlert className="h-3 w-3" /> Read-Only Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Master catalog for SKU codes, product materials, firm brands, categories & standard rates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button size="sm" onClick={handleOpenAdd} className="h-8 gap-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add New SKU
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onUnlockAdmin}
              className="h-8 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Unlock Admin to Edit
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card/60 border rounded-lg p-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU Code, Material, Firm, or Category..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Horizontal Category Selector */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SKU Table Container */}
      <div className="flex-1 overflow-y-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <tr>
              <th className="px-4 py-2.5">SKU Code</th>
              <th className="px-4 py-2.5">Material / Product</th>
              <th className="px-4 py-2.5">Firm / Brand</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Unit</th>
              <th className="px-4 py-2.5 text-right">Standard Rate</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSKUs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  No SKUs found matching your search.
                </td>
              </tr>
            ) : (
              filteredSKUs.map((item) => (
                <tr key={item.id} className="hover:bg-muted/40 transition-colors group">
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">
                    {item.skuCode || <span className="text-muted-foreground/60 italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {item.product}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {item.firm || "General"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <Layers className="h-3 w-3" />
                      {item.category || "General"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono">
                    {item.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {item.rate ? `₹${item.rate}` : <span className="text-amber-500 text-[10px]">Pending</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(item)}
                          className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                          title="Edit SKU"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete SKU "${item.product}"?`)) {
                              store.deleteSKU(item.id)
                            }
                          }}
                          className="h-6 w-6 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          title="Delete SKU"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">Locked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Bar with the requested test button bottom left */}
      <div className="flex items-center justify-between pt-1 border-t text-xs">
        <div className="flex items-center gap-2">
          {/* Requested very small bottom-left test button */}
          <Button
            size="sm"
            variant="outline"
            onClick={runSKUTest}
            className="h-6 px-2 text-[10px] font-mono gap-1 text-muted-foreground hover:text-foreground border-dashed"
            title="Validate SKU catalog consistency, rates and duplicates"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            test
          </Button>
          <span className="text-[10px] text-muted-foreground">
            Click 'test' to verify catalog integrity, rate consistency & code uniqueness.
          </span>
        </div>

        <div className="text-[11px] text-muted-foreground font-mono">
          Showing {filteredSKUs.length} of {store.skuList.length} items
        </div>
      </div>

      {/* Edit SKU Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md p-5 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" /> Edit SKU Specification
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-xs">
            <div className="grid gap-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">SKU Code *</Label>
              <Input
                value={form.skuCode}
                onChange={(e) => setForm((f) => ({ ...f, skuCode: e.target.value }))}
                placeholder="e.g. DAL-PPC-50KG"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Product Material Name *</Label>
              <Input
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                placeholder="e.g. Dalmia PPC Cement"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Firm / Brand</Label>
                <Input
                  value={form.firm}
                  onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))}
                  placeholder="e.g. Dalmia / Shyam Steel"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Cement / Steel / Aggregates"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. bags / tons / pcs"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Standard Rate (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="0.00"
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} className="h-8 text-xs font-bold uppercase">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add SKU Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md p-5 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add New Master SKU
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-xs">
            <div className="grid gap-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">SKU Code *</Label>
              <Input
                value={form.skuCode}
                onChange={(e) => setForm((f) => ({ ...f, skuCode: e.target.value }))}
                placeholder="e.g. AMB-KAWACH-50KG"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Product Material Name *</Label>
              <Input
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                placeholder="e.g. Ambuja Kawach Cement"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Firm / Brand</Label>
                <Input
                  value={form.firm}
                  onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))}
                  placeholder="e.g. Ambuja"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Cement"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. bags"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Standard Rate (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="0.00"
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAddModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAdd} className="h-8 text-xs font-bold uppercase">
              Create SKU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Results Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md p-5 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /> SKU Master Catalog Audit
            </DialogTitle>
          </DialogHeader>

          {testResults && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-card p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Total SKUs</div>
                  <div className="text-lg font-mono font-extrabold text-foreground">{testResults.total}</div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">100% Valid</div>
                  <div className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{testResults.valid}</div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-center">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Issues</div>
                  <div className="text-lg font-mono font-extrabold text-amber-600 dark:text-amber-400">
                    {testResults.missingRates.length + testResults.missingCodes.length + testResults.duplicateCodes.length}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Rate Consistency:
                  </span>
                  <span className="font-mono font-semibold">
                    {testResults.missingRates.length === 0 ? "All rates defined" : `${testResults.missingRates.length} unpriced`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> SKU Code Integrity:
                  </span>
                  <span className="font-mono font-semibold">
                    {testResults.missingCodes.length === 0 ? "All codes assigned" : `${testResults.missingCodes.length} missing`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Duplicate Check:
                  </span>
                  <span className="font-mono font-semibold">
                    {testResults.duplicateCodes.length === 0 ? "Zero duplicates" : `${testResults.duplicateCodes.length} duplicate codes`}
                  </span>
                </div>
              </div>

              {testResults.missingRates.length > 0 && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[11px]">
                  <div className="font-semibold text-amber-600 flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> Unpriced SKUs:
                  </div>
                  <div className="space-y-0.5 text-muted-foreground font-mono text-[10px]">
                    {testResults.missingRates.map((s) => (
                      <div key={s.id}>• {s.product} ({s.skuCode || "No code"})</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" onClick={() => setTestModalOpen(false)} className="h-8 text-xs font-bold uppercase w-full">
              Close Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
