"use client"

import { useState, useMemo, useEffect } from "react"
import { useStore } from "@/hooks/use-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RateMarketPanel } from "@/components/rate-market-panel"
import {
  Activity,
  Search,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts"

// Full SKU Database
const SKU_DATABASE = [
  { id: "dal-ppc", sku: "DAL-PPC-50KG", product: "Dalmia PPC Cement", unit: "50kg bag", category: "Cement", firm: "Dalmia", standardRate: 380, grades: "Portland Pozzolana", change: 3.8 },
  { id: "dal-dsp", sku: "DAL-DSP-50KG", product: "Dalmia DSP Cement", unit: "50kg bag", category: "Cement", firm: "Dalmia", standardRate: 420, grades: "Premium PPC", change: 1.2 },
  { id: "dal-sup", sku: "DAL-SUP-50KG", product: "Dalmia Supreme Cement", unit: "50kg bag", category: "Cement", firm: "Dalmia", standardRate: 410, grades: "PPC Blend", change: -0.8 },
  { id: "dal-opc53", sku: "DAL-OPC53-50KG", product: "Dalmia OPC 53 Grade", unit: "50kg bag", category: "Cement", firm: "Dalmia", standardRate: 450, grades: "Ordinary Portland", change: 2.1 },
  { id: "amb-ppc", sku: "AMB-PPC-50KG", product: "Ambuja PPC Cement", unit: "50kg bag", category: "Cement", firm: "Ambuja", standardRate: 370, grades: "Pozzolana", change: -1.4 },
  { id: "amb-opc", sku: "AMB-OPC53-50KG", product: "Ambuja OPC 53 Grade", unit: "50kg bag", category: "Cement", firm: "Ambuja", standardRate: 410, grades: "High Strength", change: 0.5 },
  { id: "amb-roof", sku: "AMB-ROOF-50KG", product: "Ambuja Roof Special", unit: "50kg bag", category: "Cement", firm: "Ambuja", standardRate: 395, grades: "Roof/Terraces", change: 1.8 },
  { id: "amb-kawach", sku: "AMB-KAWACH-50KG", product: "Ambuja Kawach", unit: "50kg bag", category: "Cement", firm: "Ambuja", standardRate: 440, grades: "Anti-corrosion", change: 2.5 },
  { id: "shy-tmt-6", sku: "SHY-TMT-6MM", product: "Shyam TMT 6mm", unit: "rod (12m)", category: "Steel TMT", firm: "Shyam Steel", standardRate: 450, grades: "Fe 500D", variant: "6mm", change: 4.2 },
  { id: "shy-tmt-8", sku: "SHY-TMT-8MM", product: "Shyam TMT 8mm", unit: "rod (12m)", category: "Steel TMT", firm: "Shyam Steel", standardRate: 650, grades: "Fe 500D", variant: "8mm", change: 3.1 },
  { id: "shy-tmt-10", sku: "SHY-TMT-10MM", product: "Shyam TMT 10mm", unit: "rod (12m)", category: "Steel TMT", firm: "Shyam Steel", standardRate: 900, grades: "Fe 500D", variant: "10mm", change: -0.5 },
  { id: "shy-tmt-12", sku: "SHY-TMT-12MM", product: "Shyam TMT 12mm", unit: "rod (12m)", category: "Steel TMT", firm: "Shyam Steel", standardRate: 1200, grades: "Fe 500D", variant: "12mm", change: 1.9 },
  { id: "shy-tmt-16", sku: "SHY-TMT-16MM", product: "Shyam TMT 16mm", unit: "rod (12m)", category: "Steel TMT", firm: "Shyam Steel", standardRate: 1650, grades: "Fe 500D", variant: "16mm", change: 2.8 },
  { id: "shy-nail-2", sku: "SHY-NAIL-2IN", product: "Round Head Nails 2\"", unit: "1kg pack", category: "Hardware", firm: "Shyam Steel", standardRate: 120, grades: "2 inch", change: 0.0 },
  { id: "shy-nail-25", sku: "SHY-NAIL-25IN", product: "Round Head Nails 2.5\"", unit: "1kg pack", category: "Hardware", firm: "Shyam Steel", standardRate: 135, grades: "2.5 inch", change: 1.0 },
  { id: "str-cemmix", sku: "STR-CEMMIX-5L", product: "Sturdflex CemMix 5L", unit: "5L bottle", category: "Waterproofing", firm: "Sturdflex", standardRate: 850, grades: "Integral", change: 0.5 },
  { id: "str-cemmix-10", sku: "STR-CEMMIX-10L", product: "Sturdflex CemMix 10L", unit: "10L bottle", category: "Waterproofing", firm: "Sturdflex", standardRate: 1500, grades: "Integral", change: 0.0 },
  { id: "str-cemmix-gold", sku: "STR-GOLD-5L", product: "Sturdflex CemMix Gold", unit: "5L bottle", category: "Waterproofing", firm: "Sturdflex", standardRate: 1100, grades: "Premium", change: 2.0 },
  { id: "sand-river", sku: "SAND-RIVER-M3", product: "River Sand", unit: "m³", category: "Aggregates", firm: "Bulk Materials", standardRate: 1200, grades: "Natural", change: 5.4 },
  { id: "sand-white", sku: "SAND-WHITE-M3", product: "White Sand", unit: "m³", category: "Aggregates", firm: "Bulk Materials", standardRate: 1800, grades: "Fine White", change: 1.1 },
  { id: "chip-58", sku: "CHIP-58-TON", product: "5/8 Stone Chip", unit: "ton", category: "Aggregates", firm: "Bulk Materials", standardRate: 1800, grades: "RCC Mix", change: 3.2 },
  { id: "chip-12", sku: "CHIP-12-TON", product: "1/2 Stone Chip", unit: "ton", category: "Aggregates", firm: "Bulk Materials", standardRate: 1900, grades: "Plaster Mix", change: -1.2 },
  { id: "brick-red", sku: "BRICK-RED-1K", product: "Red Clay Bricks", unit: "per 1000", category: "Bricks", firm: "Bulk Materials", standardRate: 3500, grades: "Standard", change: 2.8 },
]

interface RateEntry {
  sku: string
  product: string
  standardRate: number
  customRate?: number
  firm: string
  category: string
  grades: string
  variant?: string
  unit: string
  change: number
}

// Generate small sparkline data for each row
function generateSparkline(rate: number, change: number): { v: number }[] {
  const points: { v: number }[] = []
  let v = rate * 0.95
  for (let i = 0; i < 12; i++) {
    const trend = change / 100 * rate * (i / 12)
    v = v + trend * 0.5 + (Math.random() - 0.45) * rate * 0.01
    points.push({ v: Math.round(v) })
  }
  points.push({ v: rate })
  return points
}

const CATEGORY_TABS = ["ALL", "CEMENT", "STEEL TMT", "AGGREGATES", "WATERPROOFING", "BRICKS", "HARDWARE"]

const INDEX_TICKERS = [
  { label: "CEMENT IDX", value: "₹405", change: "+2.4%", up: true },
  { label: "TMT STEEL", value: "₹970", change: "+3.1%", up: true },
  { label: "SAND/AGGR", value: "₹1,675", change: "-0.8%", up: false },
  { label: "BRICKS/1K", value: "₹3,500", change: "+1.5%", up: true },
  { label: "WATERPR.", value: "₹1,150", change: "+0.5%", up: true },
  { label: "HARDWARE", value: "₹128", change: "+1.0%", up: true },
]

function matchCategory(itemCat: string, tabCat: string): boolean {
  if (!tabCat || tabCat === "ALL") return true
  const itemNorm = (itemCat || "").toUpperCase()
  const tabNorm = tabCat.toUpperCase()
  if (itemNorm === tabNorm) return true
  if (tabNorm === "CEMENT" && itemNorm.includes("CEMENT")) return true
  if (tabNorm === "STEEL TMT" && (itemNorm.includes("STEEL") || itemNorm.includes("TMT"))) return true
  if (tabNorm === "AGGREGATES" && (itemNorm.includes("AGGREGATE") || itemNorm.includes("SAND") || itemNorm.includes("STONE") || itemNorm.includes("CHIP"))) return true
  if (tabNorm === "WATERPROOFING" && (itemNorm.includes("WATERPROOF") || itemNorm.includes("CHEM"))) return true
  if (tabNorm === "BRICKS" && (itemNorm.includes("BRICK") || itemNorm.includes("BLOCK"))) return true
  if (tabNorm === "HARDWARE" && (itemNorm.includes("HARDWARE") || itemNorm.includes("NAIL"))) return true
  return false
}

export function RateIntelligence() {
  const store = useStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customRateInput, setCustomRateInput] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<RateEntry | null>(null)
  const [isLightMode, setIsLightMode] = useState<boolean>(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sarkar_rate_light_mode")
      if (saved !== null) {
        setIsLightMode(saved === "true")
      }
    } catch {}
  }, [])

  const handleToggleLightMode = () => {
    setIsLightMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem("sarkar_rate_light_mode", String(next))
      } catch {}
      return next
    })
  }

  // Derive rates directly from store.skuList so that order creation rates,
  // SKU Manager edits, or direct Rate Intelligence terminal edits are always live and in sync.
  const rates = useMemo<RateEntry[]>(() => {
    if (store.skuList && store.skuList.length > 0) {
      return store.skuList.map((item) => {
        const itemCode = (item.skuCode || "").toLowerCase().trim()
        const itemProd = item.product.toLowerCase().trim()

        const base = SKU_DATABASE.find(b =>
          b.sku.toLowerCase().trim() === itemCode ||
          b.product.toLowerCase().trim() === itemProd ||
          b.product.toLowerCase().includes(itemProd) ||
          itemProd.includes(b.product.toLowerCase())
        )

        const standardRate = base ? base.standardRate : item.rate
        const effectiveRate = item.rate > 0 ? item.rate : standardRate
        const hasCustom = effectiveRate !== standardRate

        let change = base ? base.change : 0
        if (standardRate > 0 && effectiveRate !== standardRate) {
          change = Number((((effectiveRate - standardRate) / standardRate) * 100).toFixed(1))
        }

        return {
          sku: item.skuCode || (base ? base.sku : `SKU-${item.id.slice(-4)}`),
          product: item.product,
          standardRate,
          customRate: hasCustom ? effectiveRate : undefined,
          firm: item.firm || (base ? base.firm : "Direct"),
          category: item.category || (base ? base.category : "General"),
          grades: base?.grades || "Standard Quality",
          variant: base?.variant,
          unit: item.unit || (base ? base.unit : "units"),
          change,
        }
      })
    }

    return SKU_DATABASE.map(item => ({
      sku: item.sku,
      product: item.product,
      standardRate: item.standardRate,
      firm: item.firm,
      category: item.category,
      grades: item.grades,
      variant: item.variant,
      unit: item.unit,
      change: item.change,
    }))
  }, [store.skuList])

  const indexTickers = useMemo(() => {
    const calcCat = (catName: string, fallbackVal: number, fallbackChg: number) => {
      const catItems = rates.filter(r => matchCategory(r.category, catName))
      if (catItems.length === 0) return { val: fallbackVal, chg: fallbackChg }
      const avgRate = Math.round(catItems.reduce((sum, r) => sum + (r.customRate ?? r.standardRate), 0) / catItems.length)
      const avgChg = Number((catItems.reduce((sum, r) => sum + r.change, 0) / catItems.length).toFixed(1))
      return { val: avgRate, chg: avgChg }
    }

    const cement = calcCat("CEMENT", 405, 2.4)
    const steel = calcCat("STEEL TMT", 970, 3.1)
    const aggr = calcCat("AGGREGATES", 1675, -0.8)
    const bricks = calcCat("BRICKS", 3500, 1.5)
    const waterpr = calcCat("WATERPROOFING", 1150, 0.5)
    const hw = calcCat("HARDWARE", 128, 1.0)

    return [
      { label: "CEMENT IDX", value: `₹${cement.val.toLocaleString("en-IN")}`, change: `${cement.chg >= 0 ? "+" : ""}${cement.chg}%`, up: cement.chg >= 0 },
      { label: "TMT STEEL", value: `₹${steel.val.toLocaleString("en-IN")}`, change: `${steel.chg >= 0 ? "+" : ""}${steel.chg}%`, up: steel.chg >= 0 },
      { label: "SAND/AGGR", value: `₹${aggr.val.toLocaleString("en-IN")}`, change: `${aggr.chg >= 0 ? "+" : ""}${aggr.chg}%`, up: aggr.chg >= 0 },
      { label: "BRICKS/1K", value: `₹${bricks.val.toLocaleString("en-IN")}`, change: `${bricks.chg >= 0 ? "+" : ""}${bricks.chg}%`, up: bricks.chg >= 0 },
      { label: "WATERPR.", value: `₹${waterpr.val.toLocaleString("en-IN")}`, change: `${waterpr.chg >= 0 ? "+" : ""}${waterpr.chg}%`, up: waterpr.chg >= 0 },
      { label: "HARDWARE", value: `₹${hw.val.toLocaleString("en-IN")}`, change: `${hw.chg >= 0 ? "+" : ""}${hw.chg}%`, up: hw.chg >= 0 },
    ]
  }, [rates])

  const filteredRates = useMemo(() => rates.filter(rate => {
    const matchesSearch = !searchTerm ||
      rate.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.firm.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = matchCategory(rate.category, selectedCategory)
    return matchesSearch && matchesCategory
  }), [rates, searchTerm, selectedCategory])

  const handleSetCustomRate = (sku: string, customRate: number) => {
    const match = rates.find(r => r.sku === sku)
    if (match) {
      store.updateSKURate(match.product, customRate)
    } else {
      store.updateSKURate(sku, customRate)
    }
    setEditingId(null)
    setCustomRateInput("")
  }

  const handleResetRate = (sku: string) => {
    const match = rates.find(r => r.sku === sku)
    if (match) {
      store.updateSKURate(match.product, match.standardRate)
    }
  }

  const customRatesCount = rates.filter(r => r.customRate).length
  const gainers = rates.filter(r => r.change > 0).length
  const losers = rates.filter(r => r.change < 0).length

  return (
    <div className={`flex flex-col gap-0 h-full rounded-xl overflow-hidden border shadow-2xl transition-colors duration-200 ${
      isLightMode
        ? "bg-slate-50 text-slate-900 border-slate-200"
        : "bg-[#05080f] text-zinc-100 border-zinc-800 font-mono"
    }`}>

      {/* ── TOP BAR: Identity + Status + Theme Toggle ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b transition-colors ${
        isLightMode ? "border-slate-200 bg-white" : "border-zinc-800/80 bg-[#090d14]"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-6 w-6 items-center justify-center rounded border ${
            isLightMode ? "bg-emerald-50 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40"
          }`}>
            <Activity className={`h-3.5 w-3.5 ${isLightMode ? "text-emerald-600" : "text-emerald-500"}`} />
          </div>
          <span className={`text-[11px] font-extrabold tracking-[0.15em] uppercase ${
            isLightMode ? "text-slate-800 font-sans" : "text-zinc-200 font-mono"
          }`}>
            Sarkar Commodity Rate Terminal
          </span>
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
            isLightMode
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className={`flex items-center gap-1 font-semibold ${isLightMode ? "text-emerald-700 font-sans" : "text-emerald-400"}`}>
            <TrendingUp className="h-3 w-3" />{gainers} GAINERS
          </span>
          <span className={`flex items-center gap-1 font-semibold ${isLightMode ? "text-rose-700 font-sans" : "text-rose-400"}`}>
            <TrendingDown className="h-3 w-3" />{losers} LOSERS
          </span>
          {customRatesCount > 0 && (
            <span className={`flex items-center gap-1 font-semibold ${isLightMode ? "text-cyan-700 font-sans" : "text-cyan-400"}`}>
              <ShieldCheck className="h-3 w-3" />{customRatesCount} CUSTOM
            </span>
          )}

          {/* Theme switcher button */}
          <button
            onClick={handleToggleLightMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all border ${
              isLightMode
                ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:text-slate-900 shadow-2xs font-sans"
                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white font-mono"
            }`}
            title="Toggle Light/Dark Theme"
          >
            {isLightMode ? (
              <>
                <Moon className="h-3 w-3 text-slate-700" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-3 w-3 text-amber-400" />
                <span>Light Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── LIVE INDEX TICKER STRIP ── */}
      <div className={`flex items-stretch border-b divide-x transition-colors ${
        isLightMode
          ? "border-slate-200 bg-slate-100/90 divide-slate-200"
          : "border-zinc-800/60 bg-[#07090f] divide-zinc-800/60"
      }`}>
        {indexTickers.map((t, i) => (
          <div key={i} className="flex-1 px-3 py-2 min-w-0">
            <div className={`text-[9px] uppercase tracking-widest truncate font-semibold ${
              isLightMode ? "text-slate-500 font-sans" : "text-zinc-500 font-mono"
            }`}>
              {t.label}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xs font-black font-mono ${
                isLightMode ? "text-slate-900" : "text-white"
              }`}>
                {t.value}
              </span>
              <span className={`text-[10px] font-bold font-mono ${
                t.up
                  ? (isLightMode ? "text-emerald-600" : "text-emerald-400")
                  : (isLightMode ? "text-rose-600" : "text-rose-400")
              }`}>
                {t.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className={`flex items-center gap-3 px-3 py-2 border-b transition-colors ${
        isLightMode
          ? "border-slate-200 bg-white"
          : "border-zinc-800/60 bg-[#090d14]"
      }`}>
        <div className="flex items-center gap-0.5 overflow-x-auto py-0.5">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? (isLightMode ? "bg-emerald-600 text-white shadow-xs font-extrabold" : "bg-emerald-500 text-black shadow-sm")
                  : (isLightMode ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800")
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="ml-auto relative w-52 shrink-0">
          <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 ${
            isLightMode ? "text-slate-400" : "text-zinc-500"
          }`} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU, material, firm..."
            className={`w-full h-7 rounded text-[11px] pl-7 pr-2 focus:outline-none transition-colors ${
              isLightMode
                ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white"
                : "bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50"
            }`}
          />
        </div>
      </div>

      {/* ── RATE TABLE ── */}
      <div className={`flex-1 overflow-y-auto transition-colors ${isLightMode ? "bg-white" : "bg-[#05080f]"}`}>
        <table className="w-full text-[11px] border-collapse">
          <thead className={`sticky top-0 z-10 ${
            isLightMode ? "bg-slate-100 border-b border-slate-200 shadow-xs" : "bg-[#090d14]"
          }`}>
            <tr className={`text-[9px] uppercase tracking-widest border-b ${
              isLightMode ? "text-slate-600 border-slate-200 font-sans" : "text-zinc-500 border-zinc-800"
            }`}>
              <th className="text-left px-3 py-2 font-bold w-[130px]">SKU CODE</th>
              <th className="text-left px-3 py-2 font-bold">MATERIAL</th>
              <th className="text-left px-3 py-2 font-bold w-[80px]">FIRM</th>
              <th className="text-right px-3 py-2 font-bold w-[90px]">BENCHMARK</th>
              <th className="text-right px-3 py-2 font-bold w-[120px]">EFFECTIVE RATE</th>
              <th className="text-right px-3 py-2 font-bold w-[70px]">CHNG%</th>
              <th className="text-center px-3 py-2 font-bold w-[80px]">TREND</th>
              <th className="text-center px-3 py-2 font-bold w-[75px]">CHART</th>
            </tr>
          </thead>
          <tbody className={isLightMode ? "divide-y divide-slate-100" : ""}>
            {filteredRates.map((item, idx) => {
              const activeRate = item.customRate ?? item.standardRate
              const isUp = item.change >= 0
              const sparkData = generateSparkline(item.standardRate, item.change)
              const isEditing = editingId === item.sku
              return (
                <tr
                  key={item.sku}
                  className={`border-b transition-colors ${
                    isLightMode
                      ? `${idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"} border-slate-200/70 hover:bg-emerald-50/40`
                      : `${idx % 2 === 0 ? "bg-[#07090f]" : "bg-[#05080f]"} border-zinc-800/50 hover:bg-zinc-800/30`
                  }`}
                >
                  {/* SKU */}
                  <td className="px-3 py-1.5 font-mono">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isLightMode
                        ? "text-slate-700 bg-slate-100 border-slate-300"
                        : "text-zinc-400 bg-zinc-800 border-zinc-700"
                    }`}>
                      {item.sku}
                    </span>
                  </td>
                  {/* Material */}
                  <td className="px-3 py-1.5 font-sans">
                    <div className={`font-bold text-[11px] ${
                      isLightMode ? "text-slate-900" : "text-zinc-100"
                    }`}>
                      {item.product}
                    </div>
                    <div className={`text-[10px] ${
                      isLightMode ? "text-slate-500" : "text-zinc-500"
                    }`}>
                      {item.grades}{item.variant ? ` · ${item.variant}` : ""}
                    </div>
                  </td>
                  {/* Firm */}
                  <td className={`px-3 py-1.5 text-[10px] font-sans whitespace-nowrap ${
                    isLightMode ? "text-slate-600 font-medium" : "text-zinc-400"
                  }`}>
                    {item.firm}
                  </td>
                  {/* Benchmark */}
                  <td className={`text-right px-3 py-1.5 font-mono ${
                    isLightMode ? "text-slate-500 font-medium" : "text-zinc-500"
                  }`}>
                    ₹{item.standardRate.toLocaleString("en-IN")}
                  </td>
                  {/* Effective Rate */}
                  <td className="text-right px-3 py-1.5 font-mono">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          className={`w-20 h-6 border rounded text-right font-mono text-[11px] px-1 focus:outline-none ${
                            isLightMode
                              ? "bg-white border-emerald-500 text-emerald-700 shadow-xs"
                              : "bg-zinc-800 border-emerald-500/50 text-emerald-300"
                          }`}
                          value={customRateInput}
                          onChange={(e) => setCustomRateInput(e.target.value)}
                          placeholder={String(item.standardRate)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = Number(customRateInput)
                              if (val > 0) handleSetCustomRate(item.sku, val)
                            }
                            if (e.key === "Escape") { setEditingId(null); setCustomRateInput("") }
                          }}
                        />
                        <button
                          onClick={() => { const val = Number(customRateInput); if (val > 0) handleSetCustomRate(item.sku, val) }}
                          className="text-[9px] px-1.5 py-0.5 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-500 shadow-xs"
                        >SET</button>
                        <button
                          onClick={() => { setEditingId(null); setCustomRateInput("") }}
                          className={`text-[9px] px-1 py-0.5 ${
                            isLightMode ? "text-slate-400 hover:text-slate-700" : "text-zinc-400 hover:text-white"
                          }`}
                        >✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5 group">
                        <span className={`font-extrabold text-[12px] font-mono ${
                          item.customRate
                            ? (isLightMode ? "text-cyan-700" : "text-cyan-400")
                            : (isLightMode ? "text-slate-900" : "text-white")
                        }`}>
                          ₹{activeRate.toLocaleString("en-IN")}
                        </span>
                        {item.customRate ? (
                          <button
                            onClick={() => handleResetRate(item.sku)}
                            className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ${
                              isLightMode ? "text-slate-400 hover:text-rose-600" : "text-zinc-500 hover:text-rose-400"
                            }`}
                            title="Reset to benchmark"
                          >RST</button>
                        ) : (
                          <button
                            onClick={() => { setEditingId(item.sku); setCustomRateInput(String(item.standardRate)) }}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                              isLightMode ? "text-slate-400 hover:text-emerald-600" : "text-zinc-600 hover:text-emerald-400"
                            }`}
                            title="Edit rate"
                          ><Edit2 className="h-2.5 w-2.5" /></button>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Change % */}
                  <td className="text-right px-3 py-1.5 font-mono">
                    <span className={`inline-flex items-center gap-0.5 font-bold ${
                      isUp
                        ? (isLightMode ? "text-emerald-600" : "text-emerald-400")
                        : (isLightMode ? "text-rose-600" : "text-rose-400")
                    }`}>
                      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {isUp ? "+" : ""}{item.change.toFixed(1)}%
                    </span>
                  </td>
                  {/* Sparkline */}
                  <td className="px-3 py-1.5">
                    <div className="h-7 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                          <defs>
                            <linearGradient id={`sg-${item.sku}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isUp ? (isLightMode ? "#059669" : "#10b981") : (isLightMode ? "#e11d48" : "#ef4444")} stopOpacity={isLightMode ? 0.3 : 0.4} />
                              <stop offset="95%" stopColor={isUp ? (isLightMode ? "#059669" : "#10b981") : (isLightMode ? "#e11d48" : "#ef4444")} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke={isUp ? (isLightMode ? "#059669" : "#10b981") : (isLightMode ? "#e11d48" : "#ef4444")}
                            strokeWidth={1.5}
                            fill={`url(#sg-${item.sku})`}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                  {/* Terminal Button */}
                  <td className="text-center px-3 py-1.5">
                    <button
                      onClick={() => setSelectedProduct(item)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                        isLightMode
                          ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 shadow-2xs"
                          : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400"
                      }`}
                    >
                      <BarChart2 className="h-2.5 w-2.5" />
                      CHART
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredRates.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-16 ${
            isLightMode ? "text-slate-400 font-sans" : "text-zinc-600"
          }`}>
            <Search className="h-8 w-8 mb-3 opacity-60" />
            <p className="text-xs">No instruments match your search</p>
          </div>
        )}
      </div>

      {/* ── FOOTER STATUS BAR ── */}
      <div className={`flex items-center justify-between px-4 py-1.5 border-t text-[9px] transition-colors ${
        isLightMode
          ? "border-slate-200 bg-slate-100 text-slate-500 font-sans font-medium"
          : "border-zinc-800 bg-[#090d14] text-zinc-600 font-mono"
      }`}>
        <span>SARKAR OPERATIONS © 2025 · COMMODITY RATE TERMINAL v2.0</span>
        <span>{filteredRates.length} INSTRUMENTS · FEED: REALTIME</span>
      </div>

      {/* ── Terminal Chart Modal ── */}
      {selectedProduct && (
        <RateMarketPanel
          product={selectedProduct.product}
          sku={selectedProduct.sku}
          standardRate={selectedProduct.standardRate}
          customRate={selectedProduct.customRate}
          firm={selectedProduct.firm}
          category={selectedProduct.category}
          grades={selectedProduct.grades}
          variant={selectedProduct.variant}
          unit={selectedProduct.unit}
          isLightMode={isLightMode}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
