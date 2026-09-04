"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, Activity, DollarSign, Layers, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from "lucide-react"

interface RateMarketPanelProps {
  product: string
  sku: string
  standardRate: number
  customRate?: number
  firm: string
  category: string
  grades: string
  variant?: string
  unit: string
  isLightMode?: boolean
  onClose: () => void
}

type TimeFrame = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y"

export function RateMarketPanel({
  product,
  sku,
  standardRate,
  customRate,
  firm,
  category,
  grades,
  variant,
  unit,
  isLightMode = false,
  onClose,
}: RateMarketPanelProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>("6M")
  const [chartType, setChartType] = useState<"area" | "line">("area")
  const [showMA, setShowMA] = useState(true)

  const currentRate = customRate || standardRate

  // Generate realistic OHLC / Commodity financial market data
  const marketData = useMemo(() => {
    const base = standardRate
    const count = timeframe === "1D" ? 24 : timeframe === "1W" ? 7 : timeframe === "1M" ? 30 : timeframe === "3M" ? 90 : 180
    const points = []
    
    let price = base * 0.92
    const now = new Date()

    for (let i = count; i >= 0; i--) {
      const d = new Date(now)
      if (timeframe === "1D") d.setHours(d.getHours() - i)
      else d.setDate(d.getDate() - i)

      const noise = (Math.random() - 0.48) * (base * 0.03)
      price = Math.max(base * 0.75, Math.min(base * 1.3, price + noise))
      
      const open = Math.round(price)
      const high = Math.round(open + Math.random() * (base * 0.02))
      const low = Math.round(open - Math.random() * (base * 0.02))
      const close = i === 0 ? currentRate : Math.round(low + Math.random() * (high - low))
      const volume = Math.round(500 + Math.random() * 2500)

      const dateLabel = timeframe === "1D" 
        ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
        : d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })

      points.push({
        date: dateLabel,
        open,
        high,
        low,
        close,
        price: close,
        volume,
        ma20: 0,
        ma50: 0,
      })
    }

    // Calculate moving averages (MA20 and MA50)
    for (let i = 0; i < points.length; i++) {
      const window20 = points.slice(Math.max(0, i - 19), i + 1)
      const window50 = points.slice(Math.max(0, i - 49), i + 1)
      points[i].ma20 = Math.round(window20.reduce((s, p) => s + p.close, 0) / window20.length)
      points[i].ma50 = Math.round(window50.reduce((s, p) => s + p.close, 0) / window50.length)
    }

    return points
  }, [standardRate, currentRate, timeframe])

  const latest = marketData[marketData.length - 1] || { close: currentRate, open: currentRate, high: currentRate, low: currentRate, volume: 1000 }
  const prev = marketData[0] || latest
  const priceChange = currentRate - prev.close
  const percentChange = ((priceChange / (prev.close || 1)) * 100).toFixed(2)
  const isPositive = priceChange >= 0

  const periodHigh = Math.max(...marketData.map(d => d.high))
  const periodLow = Math.min(...marketData.map(d => d.low))
  const avgVolume = Math.round(marketData.reduce((s, d) => s + d.volume, 0) / marketData.length)

  // Order Book / Level 2 Market Depth simulation
  const bidAskDepth = useMemo(() => {
    return [
      { bidQty: 450, bidPrice: currentRate - 1, askPrice: currentRate + 1, askQty: 300 },
      { bidQty: 800, bidPrice: currentRate - 2, askPrice: currentRate + 2, askQty: 620 },
      { bidQty: 1200, bidPrice: currentRate - 3, askPrice: currentRate + 3, askQty: 1100 },
      { bidQty: 1500, bidPrice: currentRate - 5, askPrice: currentRate + 5, askQty: 1450 },
    ]
  }, [currentRate])

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0 shadow-2xl transition-colors ${
        isLightMode
          ? "border-slate-200 bg-white text-slate-900 font-sans"
          : "border-zinc-800 bg-[#090d16] text-zinc-100 font-mono"
      }`}>
        {/* Terminal Header Bar */}
        <div className={`flex items-center justify-between border-b px-4 py-3 transition-colors ${
          isLightMode ? "border-slate-200 bg-slate-50" : "border-zinc-800 bg-[#0d1322]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded border ${
              isLightMode
                ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            } font-bold`}>
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-extrabold tracking-wider ${
                  isLightMode ? "text-slate-900" : "text-white"
                }`}>{product}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                  isLightMode
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                }`}>{sku}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                  isLightMode
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}>SPOT / INR</span>
              </div>
              <p className={`text-[11px] mt-0.5 ${
                isLightMode ? "text-slate-500 font-medium" : "text-zinc-400 font-sans"
              }`}>{firm} • {category} • {grades} {variant ? `(${variant})` : ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className={`text-xl font-black font-mono flex items-center justify-end gap-1 ${
                isLightMode ? "text-slate-900" : "text-white"
              }`}>
                ₹{currentRate.toLocaleString("en-IN")}
                <span className={`text-[11px] font-normal ${
                  isLightMode ? "text-slate-500" : "text-zinc-400"
                }`}>/{unit}</span>
              </div>
              <div className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {isPositive ? "+" : ""}₹{priceChange.toFixed(1)} ({isPositive ? "+" : ""}{percentChange}%)
              </div>
            </div>
          </div>
        </div>

        {/* Financial Ticker Metrics */}
        <div className={`grid grid-cols-2 sm:grid-cols-5 gap-px border-b text-[11px] transition-colors ${
          isLightMode ? "bg-slate-200 border-slate-200" : "bg-zinc-800/80 border-zinc-800"
        }`}>
          <div className={`p-2.5 ${isLightMode ? "bg-white" : "bg-[#0b101c]"}`}>
            <span className={`text-[10px] uppercase tracking-wider block ${
              isLightMode ? "text-slate-500" : "text-zinc-400"
            }`}>24H High</span>
            <span className="text-xs font-bold text-emerald-500 font-mono">₹{periodHigh.toLocaleString("en-IN")}</span>
          </div>
          <div className={`p-2.5 ${isLightMode ? "bg-white" : "bg-[#0b101c]"}`}>
            <span className={`text-[10px] uppercase tracking-wider block ${
              isLightMode ? "text-slate-500" : "text-zinc-400"
            }`}>24H Low</span>
            <span className="text-xs font-bold text-rose-500 font-mono">₹{periodLow.toLocaleString("en-IN")}</span>
          </div>
          <div className={`p-2.5 ${isLightMode ? "bg-white" : "bg-[#0b101c]"}`}>
            <span className={`text-[10px] uppercase tracking-wider block ${
              isLightMode ? "text-slate-500" : "text-zinc-400"
            }`}>Avg Vol</span>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">{avgVolume.toLocaleString("en-IN")} {unit}</span>
          </div>
          <div className={`p-2.5 ${isLightMode ? "bg-white" : "bg-[#0b101c]"}`}>
            <span className={`text-[10px] uppercase tracking-wider block ${
              isLightMode ? "text-slate-500" : "text-zinc-400"
            }`}>Standard Reference</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">₹{standardRate.toLocaleString("en-IN")}</span>
          </div>
          <div className={`p-2.5 col-span-2 sm:col-span-1 ${isLightMode ? "bg-white" : "bg-[#0b101c]"}`}>
            <span className={`text-[10px] uppercase tracking-wider block ${
              isLightMode ? "text-slate-500" : "text-zinc-400"
            }`}>Rate Variance</span>
            <span className={`text-xs font-bold font-mono ${
              isLightMode ? "text-slate-900" : "text-white"
            }`}>
              {customRate ? (
                <span className="text-cyan-600 dark:text-cyan-400">Custom (₹{customRate})</span>
              ) : (
                <span className={isLightMode ? "text-slate-500" : "text-zinc-400"}>Standard Bench</span>
              )}
            </span>
          </div>
        </div>

        {/* Controls & Timeframe Toolbar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b text-xs transition-colors ${
          isLightMode ? "bg-slate-50 border-slate-200" : "bg-[#0d1322] border-zinc-800"
        }`}>
          <div className="flex items-center gap-1">
            {(["1D", "1W", "1M", "3M", "6M", "1Y"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all ${
                  timeframe === tf
                    ? "bg-emerald-600 text-white shadow-xs"
                    : isLightMode
                    ? "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 font-sans text-xs">
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                showMA
                  ? isLightMode ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                  : isLightMode ? "border-slate-300 text-slate-600" : "border-zinc-700 text-zinc-400"
              }`}
            >
              MA (20/50)
            </button>
            <button
              onClick={() => setChartType(chartType === "area" ? "line" : "area")}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                isLightMode ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {chartType === "area" ? "Area Gradient" : "Technical Line"}
            </button>
          </div>
        </div>

        {/* Main Commodity Trading Chart */}
        <div className={`p-4 transition-colors ${isLightMode ? "bg-white" : "bg-[#090d16]"}`}>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={marketData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLightMode ? "#059669" : "#10b981"} stopOpacity={isLightMode ? 0.3 : 0.4} />
                    <stop offset="95%" stopColor={isLightMode ? "#059669" : "#10b981"} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="priceGradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLightMode ? "#e11d48" : "#ef4444"} stopOpacity={isLightMode ? 0.3 : 0.4} />
                    <stop offset="95%" stopColor={isLightMode ? "#e11d48" : "#ef4444"} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "#e2e8f0" : "#1f293d"} vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis yAxisId="price" orientation="left" domain={["dataMin - 10", "dataMax + 10"]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis yAxisId="vol" orientation="right" hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded border border-zinc-700 bg-[#0d1322] p-2.5 text-[11px] font-mono shadow-xl space-y-1">
                        <div className="font-bold text-zinc-300 border-b border-zinc-700 pb-1">{data.date}</div>
                        <div className="text-emerald-400">Spot Rate: ₹{data.price}</div>
                        <div className="text-zinc-400">High: ₹{data.high} | Low: ₹{data.low}</div>
                        <div className="text-cyan-400">Volume: {data.volume} {unit}</div>
                        {showMA && (
                          <div className="text-[10px] text-zinc-400 border-t border-zinc-800 pt-1">
                            MA20: ₹{data.ma20} | MA50: ₹{data.ma50}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                <ReferenceLine yAxisId="price" y={standardRate} label={{ value: "BENCHMARK", fill: "#f59e0b", fontSize: 9 }} stroke="#f59e0b" strokeDasharray="4 4" />
                <Bar yAxisId="vol" dataKey="volume" fill="#334155" opacity={0.3} barSize={4} />
                {chartType === "area" ? (
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    stroke={isPositive ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={isPositive ? "url(#priceGradientGreen)" : "url(#priceGradientRed)"}
                  />
                ) : (
                  <Line yAxisId="price" type="monotone" dataKey="price" stroke={isPositive ? "#10b981" : "#ef4444"} strokeWidth={2} dot={false} />
                )}
                {showMA && <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="2 2" />}
                {showMA && <Line yAxisId="price" type="monotone" dataKey="ma50" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="2 2" />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Level 2 Order Depth & Market Quotes Table */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-px border-t text-[11px] p-3 transition-colors ${
          isLightMode ? "bg-slate-200 border-slate-200" : "bg-zinc-800/80 border-zinc-800"
        }`}>
          <div className={`p-2.5 rounded border ${
            isLightMode ? "bg-white border-slate-200 shadow-2xs" : "bg-[#0b101c] border-zinc-800"
          }`}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-between">
              <span>BUY BIDS (DEMAND)</span>
              <span className={`text-[9px] ${isLightMode ? "text-slate-400" : "text-zinc-500"}`}>LEVEL 2</span>
            </h4>
            <table className="w-full text-left font-mono text-[10px]">
              <thead className={`border-b ${
                isLightMode ? "text-slate-500 border-slate-200" : "text-zinc-500 border-zinc-800"
              }`}>
                <tr>
                  <th className="py-1">QTY ({unit})</th>
                  <th className="py-1 text-right">BID PRICE</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLightMode ? "divide-slate-100" : "divide-zinc-800/50"
              }`}>
                {bidAskDepth.map((b, i) => (
                  <tr key={i} className={isLightMode ? "hover:bg-emerald-50/60" : "hover:bg-emerald-500/5"}>
                    <td className={`py-1 ${isLightMode ? "text-slate-700" : "text-zinc-300"}`}>{b.bidQty}</td>
                    <td className="py-1 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{b.bidPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`p-2.5 rounded border ${
            isLightMode ? "bg-white border-slate-200 shadow-2xs" : "bg-[#0b101c] border-zinc-800"
          }`}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center justify-between">
              <span>SELL ASKS (SUPPLY)</span>
              <span className={`text-[9px] ${isLightMode ? "text-slate-400" : "text-zinc-500"}`}>LEVEL 2</span>
            </h4>
            <table className="w-full text-left font-mono text-[10px]">
              <thead className={`border-b ${
                isLightMode ? "text-slate-500 border-slate-200" : "text-zinc-500 border-zinc-800"
              }`}>
                <tr>
                  <th className="py-1">ASK PRICE</th>
                  <th className="py-1 text-right">QTY ({unit})</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLightMode ? "divide-slate-100" : "divide-zinc-800/50"
              }`}>
                {bidAskDepth.map((b, i) => (
                  <tr key={i} className={isLightMode ? "hover:bg-rose-50/60" : "hover:bg-rose-500/5"}>
                    <td className="py-1 font-bold text-rose-600 dark:text-rose-400">₹{b.askPrice}</td>
                    <td className={`py-1 text-right ${isLightMode ? "text-slate-700" : "text-zinc-300"}`}>{b.askQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Terminal Footer */}
        <div className={`flex items-center justify-between border-t px-4 py-2.5 text-xs font-sans transition-colors ${
          isLightMode ? "border-slate-200 bg-slate-50 text-slate-600" : "border-zinc-800 bg-[#0d1322] text-zinc-400"
        }`}>
          <div className={`text-[10px] font-mono ${isLightMode ? "text-slate-500" : "text-zinc-400"}`}>
            Sarkar Market Intelligence Terminal • Feed: LIVE REALTIME
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className={`h-7 text-xs font-bold font-sans ${
              isLightMode
                ? "bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300"
                : "bg-zinc-700 hover:bg-zinc-600 text-white"
            }`}
          >
            Close Terminal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
