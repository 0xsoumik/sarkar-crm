"use client"

import { useState, useMemo } from "react"
import type { Van, OrderItem } from "@/lib/types"
import { Plus, Trash2, Truck, IndianRupee, Tag, AlertCircle, Layers } from "lucide-react"
import { useStore } from "@/hooks/use-store"
import { capitalizeName, formatPhone } from "@/lib/validation"
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

interface AddOrderModalProps {
  vans: Van[]
  onAdd: (order: {
    name: string
    phone: string
    address: string
    product: string
    billNo: string
    unit: string
    totalQty: number
    vanIds: string[]
    rate?: number
    items?: OrderItem[]
  }) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface OrderItemRow {
  id: string
  product: string
  billNo: string
  unit: string
  totalQty: number
  rate: string | number
  vanIds: string[]
}

export function AddOrderModal({ vans, onAdd, open: externalOpen, onOpenChange: externalOnOpenChange }: AddOrderModalProps) {
  const store = useStore()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = (val: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(val)
    setInternalOpen(val)
  }

  // Customer header info
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  })

  // Multiple item rows
  const [items, setItems] = useState<OrderItemRow[]>([
    { id: "item_1", product: "", billNo: "", unit: "bags", totalQty: 0, rate: "", vanIds: [] },
  ])

  const [activeSuggestionItemId, setActiveSuggestionItemId] = useState<string | null>(null)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false)
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [recentProducts, setRecentProducts] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem("recent_products")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Customer suggestions based on typed Name
  const nameSuggestions = useMemo(() => {
    if (!customer.name || customer.name.trim().length < 1) return []
    return store.getCustomersByNameQuery(customer.name)
  }, [customer.name, store])

  // Customer suggestions based on typed Phone
  const phoneSuggestions = useMemo(() => {
    if (!customer.phone || customer.phone.trim().length < 1) return []
    return store.getCustomersByPhonePrefix(customer.phone)
  }, [customer.phone, store])

  // Get address suggestions based on prefix
  const addressSuggestions = useMemo(() => {
    return store.getSuggestedAddresses(customer.address)
  }, [customer.address, store])

  const handleCustomerSelect = (c: any) => {
    setCustomer({
      phone: c.phone,
      name: c.name,
      address: c.address,
    })
    setShowNameSuggestions(false)
    setShowPhoneSuggestions(false)
  }

  const handlePhoneSelect = (c: any) => {
    handleCustomerSelect(c)
  }

  const handleAddressSelect = (address: string) => {
    setCustomer(prev => ({ ...prev, address }))
    setShowAddressSuggestions(false)
  }

  const addItemRow = () => {
    const lastBillNo = items[items.length - 1]?.billNo || ""
    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        product: "",
        billNo: lastBillNo,
        unit: "bags",
        totalQty: 0,
        rate: "",
        vanIds: [],
      },
    ])
  }

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const updateItem = (id: string, updates: Partial<OrderItemRow>) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)))
  }

  const toggleItemVan = (itemId: string, vanId: string) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item
        const exists = item.vanIds.includes(vanId)
        return {
          ...item,
          vanIds: exists ? item.vanIds.filter(id => id !== vanId) : [...item.vanIds, vanId],
        }
      })
    )
  }

  const handleSelectProductSku = (itemId: string, sku: any) => {
    const fetchedRate = store.getRateBySKU(sku.product) || sku.rate || ""
    updateItem(itemId, {
      product: sku.product,
      unit: sku.unit || "bags",
      rate: fetchedRate > 0 ? fetchedRate : "",
    })
    setActiveSuggestionItemId(null)
  }

  const handleProductInputChange = (itemId: string, val: string) => {
    const fetchedRate = store.getRateBySKU(val)
    updateItem(itemId, {
      product: val,
      ...(fetchedRate > 0 ? { rate: fetchedRate } : {}),
    })
    setActiveSuggestionItemId(itemId)
  }

  // Summary computations
  const totalEstimatedAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const r = Number(item.rate)
      const q = Number(item.totalQty)
      if (!isNaN(r) && r > 0 && !isNaN(q) && q > 0) {
        return sum + r * q
      }
      return sum
    }, 0)
  }, [items])

  const unpricedItemsCount = useMemo(() => {
    return items.filter(item => !item.rate || isNaN(Number(item.rate)) || Number(item.rate) <= 0).length
  }, [items])

  const handleAddAll = () => {
    if (!customer.name.trim() || !customer.address.trim()) return
    const validItems = items.filter(item => item.product.trim() !== "")
    if (validItems.length === 0) return

    const capitalizedName = capitalizeName(customer.name)

    // Save newly used products to recent list
    const usedProducts = validItems.map(i => i.product.trim())
    const updated = Array.from(new Set([...usedProducts, ...recentProducts])).slice(0, 15)
    setRecentProducts(updated)
    try {
      localStorage.setItem("recent_products", JSON.stringify(updated))
    } catch {}

    // Update recent products list and SKU rates
    validItems.forEach(item => {
      const numericRate =
        item.rate !== "" && !isNaN(Number(item.rate)) && Number(item.rate) > 0 ? Number(item.rate) : undefined
      if (numericRate !== undefined) {
        store.updateSKURate(item.product, numericRate)
      }
    })

    // Map into OrderItem format
    const orderItems: OrderItem[] = validItems.map(item => {
      const numericRate =
        item.rate !== "" && !isNaN(Number(item.rate)) && Number(item.rate) > 0 ? Number(item.rate) : undefined
      return {
        product: item.product.trim(),
        unit: item.unit.trim() || "bags",
        qty: Number(item.totalQty) || 0,
        rate: numericRate,
        billNo: item.billNo.trim(),
        vanIds: item.vanIds,
      }
    })

    // Combine all assigned vans across items without duplicates
    const combinedVanIds = Array.from(new Set(orderItems.flatMap(i => i.vanIds || [])))

    // Primary item info
    const primaryItem = orderItems[0]

    // Create a SINGLE order containing all items and their features
    onAdd({
      name: capitalizedName,
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      product: primaryItem.product,
      billNo: primaryItem.billNo || "",
      unit: primaryItem.unit,
      totalQty: primaryItem.qty,
      vanIds: combinedVanIds.length > 0 ? combinedVanIds : (primaryItem.vanIds || []),
      rate: primaryItem.rate,
      items: orderItems,
    })

    // Reset and close
    setCustomer({ name: "", phone: "", address: "" })
    setItems([{ id: "item_1", product: "", billNo: "", unit: "bags", totalQty: 0, rate: "", vanIds: [] }])
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8 text-xs font-semibold px-3 shadow-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>Add New Order</span>
          <kbd className="hidden sm:inline-block font-mono text-[9px] bg-primary-foreground/20 px-1 py-0.2 rounded border border-primary-foreground/30">
            Space
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-5 gap-4">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Create Dispatch Entry / Multi-Item Bill
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 normal-case">
              {items.length} Item(s) in Order
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-xs">
          {/* Customer Details Box */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Customer Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Phone / Customer ID */}
              <div className="grid gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Phone / ID *
                </Label>
                <div className="relative">
                  <Input
                    type="tel"
                    className="h-8 text-xs font-mono"
                    value={customer.phone}
                    onChange={e => {
                      const val = formatPhone(e.target.value)
                      setCustomer(f => {
                        const match = val.length >= 6 ? store.getCustomerByPhone(val) : null
                        return {
                          ...f,
                          phone: val,
                          name: match ? match.name : f.name,
                          address: match ? match.address : f.address,
                        }
                      })
                      setShowPhoneSuggestions(true)
                    }}
                    maxLength={10}
                    onFocus={() => setShowPhoneSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
                    placeholder="10-digit phone"
                  />
                  {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-md z-50">
                      {phoneSuggestions.map((c, idx) => (
                        <button
                          key={`phone_sugg_${c.phone || c.name || idx}`}
                          type="button"
                          onMouseDown={() => handlePhoneSelect(c)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
                        >
                          <div className="font-semibold font-mono text-primary">{c.phone}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {c.name} - {c.address}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Name */}
              <div className="grid gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer Name *
                </Label>
                <div className="relative">
                  <Input
                    className="h-8 text-xs font-medium"
                    value={customer.name}
                    onChange={e => {
                      setCustomer(f => ({ ...f, name: e.target.value }))
                      setShowNameSuggestions(true)
                    }}
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                    placeholder="e.g. Shamal Biswas"
                  />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-md z-50 max-h-[160px] overflow-y-auto">
                      {nameSuggestions.map((c, idx) => (
                        <button
                          key={`name_sugg_${c.phone || c.name || idx}`}
                          type="button"
                          onMouseDown={() => handleCustomerSelect(c)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted border-b last:border-b-0"
                        >
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {c.phone} {c.address ? `· ${c.address}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Site / Address */}
              <div className="grid gap-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Delivery Site / Address *
                </Label>
                <div className="relative">
                  <Input
                    className="h-8 text-xs font-medium"
                    value={customer.address}
                    onChange={e => {
                      setCustomer(f => ({ ...f, address: e.target.value }))
                      setShowAddressSuggestions(true)
                    }}
                    onFocus={() => setShowAddressSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                    placeholder="e.g. Parbatipur"
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-md z-50 max-h-[140px] overflow-y-auto">
                      {addressSuggestions.map(addr => (
                        <button
                          key={addr}
                          type="button"
                          onMouseDown={() => handleAddressSelect(addr)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted border-b last:border-b-0"
                        >
                          {addr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Materials / Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Order Materials & Quantities ({items.length})
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItemRow}
                className="h-7 text-[11px] font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                Add Another Item
              </Button>
            </div>

            {/* Item Rows */}
            <div className="space-y-2.5">
              {items.map((item, index) => {
                const isItemUnpriced = item.rate === "" || Number(item.rate) <= 0 || isNaN(Number(item.rate))
                const lower = item.product.toLowerCase()
                const suggestions = store.skuList
                  .filter(s => s.product.toLowerCase().includes(lower))
                  .slice(0, 8)

                const itemTotal =
                  !isItemUnpriced && item.totalQty > 0 ? Number(item.rate) * Number(item.totalQty) : 0

                return (
                  <div key={item.id} className="rounded-xl border bg-card p-3 shadow-xs space-y-2.5 relative">
                    {/* Item row header */}
                    <div className="flex items-center justify-between pb-1.5 border-b">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Item #{index + 1} {item.product ? `— ${item.product}` : ""}
                        </span>
                        {itemTotal > 0 && (
                          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            ₹{itemTotal.toLocaleString("en-IN")}
                          </span>
                        )}
                        {isItemUnpriced && item.product && (
                          <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                            Price Pending
                          </span>
                        )}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Product & Rate & Bill No Grid */}
                    <div className="grid grid-cols-12 gap-2">
                      {/* Product Material with Suggestions */}
                      <div className="col-span-12 sm:col-span-5 grid gap-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Product Material *
                        </Label>
                        <div className="relative">
                          <Input
                            className="h-8 text-xs font-medium"
                            value={item.product}
                            onChange={e => handleProductInputChange(item.id, e.target.value)}
                            onFocus={() => setActiveSuggestionItemId(item.id)}
                            onBlur={() => setTimeout(() => setActiveSuggestionItemId(null), 200)}
                            placeholder="e.g. 5/8 Stone, Sand, Cement"
                          />
                          {activeSuggestionItemId === item.id && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-50 max-h-[160px] overflow-y-auto divide-y">
                              {suggestions.map(sku => (
                                <button
                                  key={sku.id}
                                  type="button"
                                  onMouseDown={() => handleSelectProductSku(item.id, sku)}
                                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted flex items-center justify-between"
                                >
                                  <div>
                                    <div className="font-semibold text-foreground">{sku.product}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      Unit: {sku.unit} · {sku.category || "General"}
                                    </div>
                                  </div>
                                  {sku.rate > 0 ? (
                                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                      ₹{sku.rate}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1 rounded">
                                      Unpriced
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rate / Unit */}
                      <div className="col-span-6 sm:col-span-3 grid gap-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Rate / Unit (₹)
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          className={`h-8 text-xs font-mono font-bold ${
                            isItemUnpriced ? "border-amber-500/50 bg-amber-500/5 text-amber-600" : "text-foreground"
                          }`}
                          value={item.rate}
                          onChange={e => updateItem(item.id, { rate: e.target.value })}
                          placeholder="Auto / Blank"
                        />
                      </div>

                      {/* Bill No */}
                      <div className="col-span-6 sm:col-span-4 grid gap-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Bill No.
                        </Label>
                        <Input
                          className="h-8 text-xs font-mono uppercase"
                          value={item.billNo}
                          onChange={e => updateItem(item.id, { billNo: e.target.value })}
                          placeholder="B-XXXX"
                        />
                      </div>
                    </div>

                    {/* Qty, Unit, and Delivery Vans */}
                    <div className="grid grid-cols-12 gap-2 pt-1 border-t">
                      <div className="col-span-6 sm:col-span-3 grid gap-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Total Qty</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs font-mono"
                          value={item.totalQty || ""}
                          onChange={e => updateItem(item.id, { totalQty: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2 grid gap-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Unit</Label>
                        <Input
                          className="h-8 text-xs font-medium"
                          value={item.unit}
                          onChange={e => updateItem(item.id, { unit: e.target.value })}
                          placeholder="bags"
                        />
                      </div>

                      {/* Delivery Vans */}
                      <div className="col-span-12 sm:col-span-7 grid gap-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Assign Van(s)
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {vans
                            .filter(v => v.enabled)
                            .map(van => {
                              const isSelected = item.vanIds.includes(van.id)
                              return (
                                <button
                                  key={van.id}
                                  type="button"
                                  onClick={() => toggleItemVan(item.id, van.id)}
                                  className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-all ${
                                    isSelected ? "font-bold shadow-xs" : "text-muted-foreground bg-card"
                                  }`}
                                  style={
                                    isSelected
                                      ? { color: van.color, borderColor: van.color, backgroundColor: `${van.color}15` }
                                      : {}
                                  }
                                >
                                  <Truck className="h-3 w-3 shrink-0" />
                                  {van.name.split(" ")[0]}
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add More Items Button */}
            <button
              type="button"
              onClick={addItemRow}
              className="w-full py-2 border border-dashed rounded-xl text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Another Material / Order to this Customer</span>
            </button>
          </div>

          {/* Bottom Summary & Actions */}
          <div className="rounded-xl border bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Total Items: </span>
                <span className="font-bold text-foreground">{items.length}</span>
              </div>
              {totalEstimatedAmount > 0 && (
                <div>
                  <span className="text-muted-foreground">Est. Total: </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{totalEstimatedAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {unpricedItemsCount > 0 && (
                <div className="text-[11px] text-amber-600 font-sans">
                  ({unpricedItemsCount} unpriced)
                </div>
              )}
            </div>

            <Button
              onClick={handleAddAll}
              size="sm"
              className="h-8 text-xs font-bold uppercase tracking-wider shadow-xs px-4"
              disabled={!customer.name.trim() || !customer.address.trim() || !items.some(i => i.product.trim() !== "")}
            >
              {items.length > 1 ? `Create All (${items.length} Orders)` : "Create Order / Bill"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

