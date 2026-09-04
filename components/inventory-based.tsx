"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Package, AlertTriangle, ChevronDown, Plus, Minus } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface InventoryItem {
  id: string
  sku: string
  product: string
  unit: string
  quantity: number
  minStock: number
  category: string
  subcategory?: string
  variant?: string
  grade?: string
}

// Comprehensive inventory database
const INITIAL_INVENTORY: InventoryItem[] = [
  // CEMENT - Dalmia
  { id: "1", sku: "DAL-PPC-50KG", product: "Dalmia PPC Cement", unit: "bags", quantity: 450, minStock: 200, category: "Cement", subcategory: "Dalmia", variant: "PPC", grade: "Portland Pozzolana" },
  { id: "2", sku: "DAL-DSP-50KG", product: "Dalmia DSP Cement", unit: "bags", quantity: 320, minStock: 150, category: "Cement", subcategory: "Dalmia", variant: "DSP", grade: "Premium PPC" },
  { id: "3", sku: "DAL-SUP-50KG", product: "Dalmia Supreme", unit: "bags", quantity: 280, minStock: 150, category: "Cement", subcategory: "Dalmia", variant: "Supreme", grade: "PPC Blend" },
  { id: "4", sku: "DAL-OPC53-50KG", product: "Dalmia OPC 53", unit: "bags", quantity: 190, minStock: 100, category: "Cement", subcategory: "Dalmia", variant: "OPC 53", grade: "High Strength" },

  // CEMENT - Ambuja
  { id: "5", sku: "AMB-PPC-50KG", product: "Ambuja PPC Cement", unit: "bags", quantity: 280, minStock: 200, category: "Cement", subcategory: "Ambuja", variant: "PPC", grade: "Pozzolana" },
  { id: "6", sku: "AMB-OPC53-50KG", product: "Ambuja OPC 53", unit: "bags", quantity: 150, minStock: 100, category: "Cement", subcategory: "Ambuja", variant: "OPC 53", grade: "High Strength" },
  { id: "7", sku: "AMB-ROOF-50KG", product: "Ambuja Roof Special", unit: "bags", quantity: 120, minStock: 80, category: "Cement", subcategory: "Ambuja", variant: "Roof", grade: "Slabs/Terraces" },
  { id: "8", sku: "AMB-KAWACH-50KG", product: "Ambuja Kawach", unit: "bags", quantity: 95, minStock: 60, category: "Cement", subcategory: "Ambuja", variant: "Kawach", grade: "Anti-corrosion" },

  // STEEL - TMT Rebars (Shyam Steel)
  { id: "9", sku: "SHY-TMT-6MM-FE500D", product: "Shyam TMT 6mm", unit: "rods", quantity: 320, minStock: 150, category: "Steel - TMT", subcategory: "Shyam Steel", variant: "6mm", grade: "Fe 500D" },
  { id: "10", sku: "SHY-TMT-8MM-FE500D", product: "Shyam TMT 8mm", unit: "rods", quantity: 240, minStock: 120, category: "Steel - TMT", subcategory: "Shyam Steel", variant: "8mm", grade: "Fe 500D" },
  { id: "11", sku: "SHY-TMT-10MM-FE500D", product: "Shyam TMT 10mm", unit: "rods", quantity: 180, minStock: 80, category: "Steel - TMT", subcategory: "Shyam Steel", variant: "10mm", grade: "Fe 500D" },
  { id: "12", sku: "SHY-TMT-12MM-FE500D", product: "Shyam TMT 12mm", unit: "rods", quantity: 120, minStock: 60, category: "Steel - TMT", subcategory: "Shyam Steel", variant: "12mm", grade: "Fe 500D" },
  { id: "13", sku: "SHY-TMT-16MM-FE500D", product: "Shyam TMT 16mm", unit: "rods", quantity: 85, minStock: 50, category: "Steel - TMT", subcategory: "Shyam Steel", variant: "16mm", grade: "Fe 500D" },

  // STEEL - Nails
  { id: "14", sku: "SHY-NAIL-RH-2IN-1KG", product: "Shyam Nails 2 inch", unit: "packs", quantity: 240, minStock: 100, category: "Steel - Hardware", subcategory: "Nails", variant: "2in", grade: "Mild Steel" },
  { id: "15", sku: "SHY-NAIL-RH-25IN-1KG", product: "Shyam Nails 2.5 inch", unit: "packs", quantity: 180, minStock: 80, category: "Steel - Hardware", subcategory: "Nails", variant: "2.5in", grade: "Mild Steel" },

  // CHEMICALS - Waterproofing
  { id: "16", sku: "STR-CEMMIX-5L", product: "Sturdflex CemMix 5L", unit: "bottles", quantity: 85, minStock: 40, category: "Chemicals", subcategory: "Waterproofing", variant: "5L", grade: "Integral Admixture" },
  { id: "17", sku: "STR-CEMMIX-10L", product: "Sturdflex CemMix 10L", unit: "bottles", quantity: 45, minStock: 20, category: "Chemicals", subcategory: "Waterproofing", variant: "10L", grade: "Integral Admixture" },
  { id: "18", sku: "STR-CEMMIXGOLD-5L", product: "Sturdflex CemMix Gold 5L", unit: "bottles", quantity: 35, minStock: 20, category: "Chemicals", subcategory: "Waterproofing", variant: "5L Gold", grade: "Premium" },

  // AGGREGATES - Sand
  { id: "19", sku: "SAND-RIVER-M3", product: "River Sand", unit: "m³", quantity: 2400, minStock: 800, category: "Aggregates", subcategory: "Sand", variant: "River", grade: "Natural" },
  { id: "20", sku: "SAND-WHITE-M3", product: "White Sand", unit: "m³", quantity: 1200, minStock: 400, category: "Aggregates", subcategory: "Sand", variant: "White", grade: "Fine Silica" },

  // AGGREGATES - Stone Chips
  { id: "21", sku: "CHIP-58-TON", product: "5/8 Stone Chip", unit: "tons", quantity: 1800, minStock: 600, category: "Aggregates", subcategory: "Stone Chips", variant: "5/8", grade: "RCC Mix" },
  { id: "22", sku: "CHIP-12-TON", product: "1/2 Stone Chip", unit: "tons", quantity: 1500, minStock: 500, category: "Aggregates", subcategory: "Stone Chips", variant: "1/2", grade: "Plaster Mix" },

  // BRICKS & BLOCKS
  { id: "23", sku: "BRICK-RED-1000", product: "Red Clay Bricks", unit: "pieces", quantity: 35000, minStock: 10000, category: "Bricks & Blocks", subcategory: "Clay Bricks", variant: "Red", grade: "Standard Grade" },

  // HARDWARE
  { id: "24", sku: "PLS-POLY-6X4-200GSM", product: "Polythene Sheet 6x4m", unit: "sheets", quantity: 240, minStock: 100, category: "Hardware", subcategory: "Sheets", variant: "200GSM", grade: "HDPE/LDPE" },
  { id: "25", sku: "SIEVES-4MM", product: "Wire Mesh Sieve 4mm", unit: "pieces", quantity: 45, minStock: 20, category: "Hardware", subcategory: "Sieves", variant: "4mm", grade: "Wire Mesh" },
]

export function InventoryBased() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Cement": true,
    "Steel - TMT": true,
    "Aggregates": true,
  })

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all")

  // Extract all distinct categories
  const allCategories = ["all", ...Array.from(new Set(inventory.map(i => i.category)))]

  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
      item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategoryTab === "all" || item.category === selectedCategoryTab
    return matchesSearch && matchesCategory
  })

  // Group by category, then subcategory
  const categoryGroups = Array.from(
    new Map(
      filteredInventory.map(item => [item.category, filteredInventory.filter(i => i.category === item.category)])
    ).entries()
  ).sort((a, b) => a[0].localeCompare(b[0]))

  const handleUpdateQuantity = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ))
  }

  const handleSetQuantity = (id: string, newQty: number) => {
    setInventory(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, newQty) } : item
    ))
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.minStock)
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-3.5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Inventory Stock & Material Warehousing
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time stock monitoring with SKU breakdown & minimum thresholds</p>
        </div>
      </div>

      {/* Horizontal SKU Category Labels */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
        {allCategories.map((cat) => {
          const count = cat === "all" ? inventory.length : inventory.filter(i => i.category === cat).length
          const isSelected = selectedCategoryTab === cat
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryTab(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-card text-muted-foreground border"
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Stock Units</div>
          <div className="text-lg font-extrabold font-mono text-foreground">{totalItems.toLocaleString('en-IN')}</div>
        </Card>
        <Card className={`p-3 ${lowStockItems.length > 0 ? "bg-destructive/5 border-destructive/20" : ""}`}>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-bold">
            <AlertTriangle className="h-3 w-3" />
            Low Stock Alerts
          </div>
          <div className={`text-lg font-extrabold font-mono ${lowStockItems.length > 0 ? "text-destructive" : "text-foreground"}`}>
            {lowStockItems.length}
          </div>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by product, SKU, category or variant..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-8 text-xs bg-card"
      />

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowStockItems.length} item(s) below minimum stock level
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[11px]">
            {lowStockItems.map(item => (
              <div key={item.id} className="text-destructive">
                <span className="font-medium">{item.product}:</span> {item.quantity} {item.unit} (min: {item.minStock})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory by Category */}
      <div className="space-y-3">
        {categoryGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-xs text-muted-foreground">No inventory items found</p>
          </div>
        ) : (
          categoryGroups.map(([category, categoryItems]) => {
            // Group by subcategory
            const subcategoryGroups = Array.from(
              new Map(
                categoryItems.map(item => [item.subcategory || "Other", categoryItems.filter(i => (i.subcategory || "Other") === (item.subcategory || "Other"))])
              ).entries()
            )

            const isLowStockCategory = categoryItems.some(item => item.quantity <= item.minStock)

            return (
              <div key={category} className={`border rounded-lg overflow-hidden shadow-xs ${isLowStockCategory ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}>
                {/* Category Header */}
                <Collapsible defaultOpen={expandedCategories[category] !== false}>
                  <CollapsibleTrigger className="w-full px-3 py-1.5 hover:bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px] h-5 px-2">{category}</Badge>
                      <span className="text-[11px] text-muted-foreground font-medium">{categoryItems.length} items</span>
                      {isLowStockCategory && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t divide-y">
                      {subcategoryGroups.map(([subcategory, subcategoryItems]) => (
                        <div key={`${category}-${subcategory}`}>
                          {/* Subcategory Header */}
                          {subcategoryGroups.length > 1 && (
                            <div className="px-3 py-1 bg-muted/40 border-t">
                              <span className="text-[11px] font-bold text-foreground">{subcategory}</span>
                            </div>
                          )}

                          {/* Subcategory Items - Compact Single Line */}
                          <div className="divide-y bg-card">
                            {subcategoryItems.map((item) => {
                              const isLowStock = item.quantity <= item.minStock

                              return (
                                <div key={item.id} className={`px-3 py-1.5 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs ${isLowStock ? "bg-destructive/10" : ""}`}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0 py-0 h-4">{item.sku}</Badge>
                                    <span className="font-semibold text-foreground truncate text-[11px]">{item.product}</span>
                                    {item.variant && (
                                      <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded font-medium shrink-0">{item.variant}</span>
                                    )}
                                    {isLowStock && (
                                      <span className="text-[10px] text-destructive font-bold bg-destructive/10 px-1.5 py-0.2 rounded shrink-0">Low Stock</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <span className={`text-xs font-bold ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                                        {item.quantity} {item.unit}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground ml-1.5">(min: {item.minStock})</span>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-1 items-center">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0 text-xs"
                                        onClick={() => handleUpdateQuantity(item.id, -10)}
                                        title="-10"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0 text-xs"
                                        onClick={() => handleUpdateQuantity(item.id, 10)}
                                        title="+10"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
