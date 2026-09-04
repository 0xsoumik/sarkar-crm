"use client"

import { useState, useCallback, useEffect } from "react"
import type { Order, OrderItem, Van, Worker, Trip, Payment, PaymentOut, DeleteLog, ActivityLog, Customer, SKUItem } from "@/lib/types"
import { getISTDateString } from "@/lib/validation"

// Helper: capitalize names and addresses properly
function capitalizeProper(text: string): string {
  if (!text) return ""
  return text
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

// Counters will be loaded from localStorage on first mount
let nextSlipNo = 1
let nextReceiptNo = 1
let nextVoucherNo = 1
let nextOrderNo = 1

// Sample customer database
const CUSTOMERS_DB: Customer[] = [
  { phone: "9876543210", name: "Shamal Biswas", address: "Parbatipur" },
  { phone: "9876543211", name: "Sabyasachi Majumdar", address: "Old Gopalpur" },
  { phone: "9876543212", name: "Bijay Roy (Mistri)", address: "Baninagar" },
  { phone: "9876543213", name: "Biman Sarkar", address: "2no. Pritinagar" },
  { phone: "9876543214", name: "Upananda Roy", address: "2no. Pritinagar" },
  { phone: "9876543215", name: "Sadananda Biswas", address: "Dashara" },
]

// Comprehensive SKU/Rate chart matching inventory & materials catalog
const SKU_DB: SKUItem[] = [
  // CEMENT - Dalmia
  { id: "sku_dal_ppc", skuCode: "DAL-PPC-50KG", product: "Dalmia PPC Cement", unit: "bags", rate: 380, category: "Cement", firm: "Dalmia" },
  { id: "sku_dal_dsp", skuCode: "DAL-DSP-50KG", product: "Dalmia DSP Cement", unit: "bags", rate: 420, category: "Cement", firm: "Dalmia" },
  { id: "sku_dal_sup", skuCode: "DAL-SUP-50KG", product: "Dalmia Supreme", unit: "bags", rate: 410, category: "Cement", firm: "Dalmia" },
  { id: "sku_dal_opc53", skuCode: "DAL-OPC53-50KG", product: "Dalmia OPC 53", unit: "bags", rate: 450, category: "Cement", firm: "Dalmia" },

  // CEMENT - Ambuja
  { id: "sku_amb_ppc", skuCode: "AMB-PPC-50KG", product: "Ambuja PPC Cement", unit: "bags", rate: 370, category: "Cement", firm: "Ambuja" },
  { id: "sku_amb_opc53", skuCode: "AMB-OPC53-50KG", product: "Ambuja OPC 53", unit: "bags", rate: 410, category: "Cement", firm: "Ambuja" },
  { id: "sku_amb_roof", skuCode: "AMB-ROOF-50KG", product: "Ambuja Roof Special", unit: "bags", rate: 395, category: "Cement", firm: "Ambuja" },
  { id: "sku_amb_kawach", skuCode: "AMB-KAWACH-50KG", product: "Ambuja Kawach", unit: "bags", rate: 440, category: "Cement", firm: "Ambuja" },

  // STEEL - TMT Rebars
  { id: "sku_shy_tmt_6", skuCode: "SHY-TMT-6MM-FE500D", product: "Shyam TMT 6mm", unit: "rods", rate: 450, category: "Steel - TMT", firm: "Shyam Steel" },
  { id: "sku_shy_tmt_8", skuCode: "SHY-TMT-8MM-FE500D", product: "Shyam TMT 8mm", unit: "rods", rate: 650, category: "Steel - TMT", firm: "Shyam Steel" },
  { id: "sku_shy_tmt_10", skuCode: "SHY-TMT-10MM-FE500D", product: "Shyam TMT 10mm", unit: "rods", rate: 900, category: "Steel - TMT", firm: "Shyam Steel" },
  { id: "sku_shy_tmt_12", skuCode: "SHY-TMT-12MM-FE500D", product: "Shyam TMT 12mm", unit: "rods", rate: 1200, category: "Steel - TMT", firm: "Shyam Steel" },
  { id: "sku_shy_tmt_16", skuCode: "SHY-TMT-16MM-FE500D", product: "Shyam TMT 16mm", unit: "rods", rate: 1650, category: "Steel - TMT", firm: "Shyam Steel" },

  // STEEL - Hardware / Nails
  { id: "sku_shy_nail_2", skuCode: "SHY-NAIL-RH-2IN-1KG", product: "Shyam Nails 2 inch", unit: "packs", rate: 120, category: "Steel - Hardware", firm: "Shyam Steel" },
  { id: "sku_shy_nail_25", skuCode: "SHY-NAIL-RH-25IN-1KG", product: "Shyam Nails 2.5 inch", unit: "packs", rate: 135, category: "Steel - Hardware", firm: "Shyam Steel" },

  // CHEMICALS - Waterproofing
  { id: "sku_str_cemmix_5", skuCode: "STR-CEMMIX-5L", product: "Sturdflex CemMix 5L", unit: "bottles", rate: 850, category: "Chemicals", firm: "Sturdflex" },
  { id: "sku_str_cemmix_10", skuCode: "STR-CEMMIX-10L", product: "Sturdflex CemMix 10L", unit: "bottles", rate: 1500, category: "Chemicals", firm: "Sturdflex" },
  { id: "sku_str_cemmix_gold", skuCode: "STR-CEMMIXGOLD-5L", product: "Sturdflex CemMix Gold 5L", unit: "bottles", rate: 1100, category: "Chemicals", firm: "Sturdflex" },

  // AGGREGATES - Sand & Stone Chips
  { id: "sku_sand_river", skuCode: "SAND-RIVER-M3", product: "River Sand", unit: "m³", rate: 1200, category: "Aggregates", firm: "Bulk Materials" },
  { id: "sku_sand_white", skuCode: "SAND-WHITE-M3", product: "White Sand", unit: "m³", rate: 1800, category: "Aggregates", firm: "Bulk Materials" },
  { id: "sku_chip_58", skuCode: "CHIP-58-TON", product: "5/8 Stone Chip", unit: "tons", rate: 1800, category: "Aggregates", firm: "Bulk Materials" },
  { id: "sku_chip_12", skuCode: "CHIP-12-TON", product: "1/2 Stone Chip", unit: "tons", rate: 1900, category: "Aggregates", firm: "Bulk Materials" },
  { id: "sku_sand_bag", skuCode: "SAND-BAG", product: "Sand", unit: "bags", rate: 150, category: "Aggregates", firm: "Bulk Materials" },
  { id: "sku_stone_bag", skuCode: "STONE-58-BAG", product: "5/8 Stone", unit: "bags", rate: 200, category: "Aggregates", firm: "Bulk Materials" },

  // BRICKS & BLOCKS
  { id: "sku_brick_red_1000", skuCode: "BRICK-RED-1000", product: "Red Clay Bricks", unit: "pieces", rate: 5, category: "Bricks & Blocks", firm: "Clay Works" },
  { id: "sku_brick_gen", skuCode: "BRICK-GEN", product: "Bricks", unit: "pcs", rate: 5, category: "Bricks & Blocks", firm: "Clay Works" },
  { id: "sku_brick_500", skuCode: "BRICK-500", product: "Bricks 500 pcs", unit: "pcs", rate: 5, category: "Bricks & Blocks", firm: "Clay Works" },

  // HARDWARE
  { id: "sku_poly_sheet", skuCode: "PLS-POLY-6X4-200GSM", product: "Polythene Sheet 6x4m", unit: "sheets", rate: 250, category: "Hardware", firm: "General" },
  { id: "sku_sieve_4mm", skuCode: "SIEVES-4MM", product: "Wire Mesh Sieve 4mm", unit: "pieces", rate: 180, category: "Hardware", firm: "General" },
]

const INITIAL_VANS: Van[] = [
  { id: "v1", name: "Ashok Van", driver: "Ashok", plate: "WB-01-1234", color: "#e67e22", enabled: true },
  { id: "v2", name: "Bappa Van", driver: "Bappa", plate: "WB-01-2345", color: "#2ecc71", enabled: true },
  { id: "v3", name: "Sankar Van", driver: "Sankar", plate: "WB-01-3456", color: "#3498db", enabled: true },
  { id: "v4", name: "Kata Van", driver: "Kata", plate: "WB-01-4567", color: "#e74c3c", enabled: true },
]

const INITIAL_WORKERS: Worker[] = [
  { id: "w1", name: "Ashok", role: "Driver" },
  { id: "w2", name: "Bappa", role: "Driver" },
  { id: "w3", name: "Sankar", role: "Driver" },
  { id: "w4", name: "Kata", role: "Driver" },
]

function makeOrder(partial: Partial<Order> & { name: string; address: string; product: string }, orderNo: number): Order {
  const sku = SKU_DB.find(s => s.product.toLowerCase() === partial.product?.toLowerCase())
  const hasExplicitRate = partial.rate !== undefined && partial.rate !== null && partial.rate > 0
  const derivedRate = hasExplicitRate ? partial.rate : (partial.rate === 0 ? undefined : sku?.rate)
  const isUnpriced = derivedRate === undefined || derivedRate === null || derivedRate === 0

  return {
    id: partial.id || `o${Date.now()}`,
    orderNo,
    name: capitalizeProper(partial.name),
    phone: partial.phone || "",
    address: capitalizeProper(partial.address),
    product: partial.product,
    originalProduct: partial.product,
    billNo: partial.billNo || "",
    originalBillNo: partial.billNo || "",
    unit: partial.unit || "bags",
    originalUnit: partial.unit || "bags",
    totalQty: partial.totalQty || 0,
    originalTotalQty: partial.totalQty || 0,
    rate: derivedRate,
    isUnpriced,
    vanIds: partial.vanIds || [],
    workerIds: [],
    quality: "pending",
    qualityNote: "",
    status: "pending",
    priority: 0,
    deleted: false,
    trips: partial.trips || [],
    payments: [],
    createdAt: partial.createdAt || new Date().toISOString(),
    items: partial.items,
  }
}

const INITIAL_ORDERS: Order[] = [
  makeOrder({ id: "o1", name: "Shamal Biswas", address: "Parbatipur", product: "Bricks", billNo: "B-1382", unit: "pcs", vanIds: ["v3", "v4"] }, 1),
  makeOrder({ id: "o2", name: "Sabyasachi Majumdar", address: "Old Gopalpur", product: "5/8 Stone", vanIds: ["v1", "v2"] }, 2),
  makeOrder({ id: "o3", name: "Bijay Roy (Mistri)", address: "Baninagar", product: "5/8 Stone", vanIds: ["v3", "v4"] }, 3),
  makeOrder({ id: "o4", name: "Biman Sarkar", address: "2no. Pritinagar", product: "Bricks 500 pcs", billNo: "B-1381", unit: "pcs", totalQty: 500, vanIds: ["v1", "v2"] }, 4),
  makeOrder({
    id: "o5", name: "Upananda Roy", address: "2no. Pritinagar", product: "Sand", unit: "bags", totalQty: 80, vanIds: ["v1", "v2"],
    trips: [{ id: "t1", slipNo: 1, vanId: "v3", quantity: 20, date: new Date().toISOString(), note: "First trip" }],
  }, 5),
  makeOrder({ id: "o6", name: "Sadananda Biswas", address: "Dashara", product: "5/8 Stone", billNo: "B-1387", vanIds: ["v3", "v4"] }, 6),
]

export function useStore() {
  // Initialize with empty state - will be hydrated from localStorage
  const [orders, setOrders] = useState<Order[]>([])
  const [vans, setVans] = useState<Van[]>([])
  const [workers] = useState<Worker[]>(INITIAL_WORKERS)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsOut, setPaymentsOut] = useState<PaymentOut[]>([])
  const [deleteLogs, setDeleteLogs] = useState<DeleteLog[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [rateEditLogs, setRateEditLogs] = useState<any[]>([])
  const [skuList, setSkuList] = useState<SKUItem[]>(SKU_DB)
  const [counters, setCounters] = useState({ nextOrderNo: 1, nextReceiptNo: 1, nextVoucherNo: 1, nextSlipNo: 1 })
  const [hydrated, setHydrated] = useState(false)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)

  // Load from localStorage on mount - only run once
  useEffect(() => {
    console.log("[v0] Hydrating from localStorage...")
    const savedData = localStorage.getItem("sarkar_builders_data")
    const savedCounters = localStorage.getItem("sarkar_builders_counters")
    const savedRateLogs = localStorage.getItem("sarkar_builders_rate_edit_logs")
    const savedSKUs = localStorage.getItem("sarkar_builders_skus")

    if (savedRateLogs) {
      try { setRateEditLogs(JSON.parse(savedRateLogs)) } catch (e) {}
    }
    if (savedSKUs) {
      try {
        const parsedSKUs = JSON.parse(savedSKUs)
        if (Array.isArray(parsedSKUs)) {
          setSkuList(parsedSKUs)
        } else {
          setSkuList(SKU_DB)
        }
      } catch (e) {
        setSkuList(SKU_DB)
      }
    } else {
      setSkuList(SKU_DB)
      try {
        localStorage.setItem("sarkar_builders_skus", JSON.stringify(SKU_DB))
      } catch (e) {}
    }
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        const rawOrders = Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS
        const loadedOrders: Order[] = rawOrders.map((o: any, idx: number) => ({
          id: o.id || `o${idx + 1}`,
          orderNo: (typeof o.orderNo === "number" && o.orderNo > 0) ? o.orderNo : (Number(o.orderNo) > 0 ? Number(o.orderNo) : idx + 1),
          name: o.name || "Customer",
          phone: o.phone || "",
          address: o.address || "",
          product: o.product || "Material",
          originalProduct: o.originalProduct || o.product || "Material",
          billNo: o.billNo || "",
          originalBillNo: o.originalBillNo || o.billNo || "",
          unit: o.unit || "bags",
          originalUnit: o.originalUnit || o.unit || "bags",
          totalQty: typeof o.totalQty === "number" ? o.totalQty : 0,
          originalTotalQty: typeof o.originalTotalQty === "number" ? o.originalTotalQty : (typeof o.totalQty === "number" ? o.totalQty : 0),
          rate: typeof o.rate === "number" ? o.rate : undefined,
          isUnpriced: typeof o.rate !== "number" || o.rate === 0 || Boolean(o.isUnpriced),
          vanIds: Array.isArray(o.vanIds) ? o.vanIds : [],
          priority: typeof o.priority === "number" ? o.priority : 0,
          deleted: Boolean(o.deleted),
          trips: Array.isArray(o.trips) ? o.trips : [],
          payments: Array.isArray(o.payments) ? o.payments : [],
          createdAt: o.createdAt || new Date().toISOString(),
          items: Array.isArray(o.items) ? o.items : undefined,
        }))

        const rawPayments = Array.isArray(parsed.payments) ? parsed.payments : []
        const loadedPayments: Payment[] = rawPayments.map((p: any, idx: number) => ({
          id: p.id || `p${idx + 1}`,
          receiptNo: typeof p.receiptNo === "number" ? p.receiptNo : idx + 1,
          name: p.name || "Customer",
          phone: p.phone || "",
          address: p.address || "",
          amount: typeof p.amount === "number" ? p.amount : (Number(p.amount) || 0),
          mode: p.mode || "CASH",
          note: p.note || "",
          createdAt: p.createdAt || new Date().toISOString(),
          deleted: Boolean(p.deleted),
          deletedAt: p.deletedAt,
          deleteReason: p.deleteReason,
        }))

        const rawPaymentsOut = Array.isArray(parsed.paymentsOut) ? parsed.paymentsOut : []
        const loadedPaymentsOut: PaymentOut[] = rawPaymentsOut.map((po: any, idx: number) => ({
          id: po.id || `po${idx + 1}`,
          voucherNo: typeof po.voucherNo === "number" ? po.voucherNo : idx + 1,
          supplierName: po.supplierName || "Supplier",
          truckNo: po.truckNo || "",
          material: po.material || "",
          amount: typeof po.amount === "number" ? po.amount : (Number(po.amount) || 0),
          mode: po.mode || "CASH",
          note: po.note || "",
          createdAt: po.createdAt || new Date().toISOString(),
        }))

        const loadedVans = Array.isArray(parsed.vans) && parsed.vans.length > 0 ? parsed.vans : INITIAL_VANS
        const loadedDeleteLogs = Array.isArray(parsed.deleteLogs) ? parsed.deleteLogs : []
        const loadedActivityLogs = Array.isArray(parsed.activityLogs) ? parsed.activityLogs : []

        setOrders(loadedOrders)
        setVans(loadedVans)
        setPayments(loadedPayments)
        setPaymentsOut(loadedPaymentsOut)
        setDeleteLogs(loadedDeleteLogs)
        setActivityLogs(loadedActivityLogs)

        const maxOrderNo = loadedOrders.reduce((max: number, order: Order) => Math.max(max, order.orderNo || 0), 0)
        const maxReceiptNo = loadedPayments.reduce((max: number, payment: Payment) => Math.max(max, payment.receiptNo || 0), 0)
        const maxVoucherNo = loadedPaymentsOut.reduce((max: number, payment: PaymentOut) => Math.max(max, payment.voucherNo || 0), 0)
        const maxSlipNo = loadedOrders.reduce((max: number, order: Order) => Math.max(max, ...(order.trips || []).map((trip) => trip.slipNo || 0)), 0)

        // Daily counter reset: if last order was NOT today in IST, reset order/receipt/voucher counters to 1
        const todayStr = getISTDateString()
        const lastOrderDate = loadedOrders.length > 0
          ? getISTDateString(loadedOrders[loadedOrders.length - 1].createdAt)
          : null
        const lastPaymentDate = loadedPayments.length > 0
          ? getISTDateString(loadedPayments[loadedPayments.length - 1].createdAt)
          : null
        const lastVoucherDate = loadedPaymentsOut.length > 0
          ? getISTDateString(loadedPaymentsOut[loadedPaymentsOut.length - 1].createdAt)
          : null

        const normalizedCounters = {
          nextOrderNo: lastOrderDate !== todayStr ? 1 : Math.max(maxOrderNo + 1, 1),
          nextReceiptNo: lastPaymentDate !== todayStr ? 1 : Math.max(maxReceiptNo + 1, 1),
          nextVoucherNo: lastVoucherDate !== todayStr ? 1 : Math.max(maxVoucherNo + 1, 1),
          nextSlipNo: Math.max(maxSlipNo + 1, 1),
        }
        setCounters(normalizedCounters)
        nextOrderNo = normalizedCounters.nextOrderNo
        nextReceiptNo = normalizedCounters.nextReceiptNo
        nextVoucherNo = normalizedCounters.nextVoucherNo
        nextSlipNo = normalizedCounters.nextSlipNo
      } catch (e) {
        console.error("[v0] Failed to load saved data:", e)
        setOrders(INITIAL_ORDERS)
        setVans(INITIAL_VANS)
      }
    } else {
      setOrders(INITIAL_ORDERS)
      setVans(INITIAL_VANS)
    }

    // Counters are rebuilt from persisted records above, so stale legacy values cannot reappear.
    void savedCounters
    setHydrated(true)
  }, [])

  // Save to localStorage whenever data changes (but only after hydration)
  useEffect(() => {
    if (!hydrated) return
    const dataToSave = {
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      orders,
      vans,
      payments,
      paymentsOut,
      deleteLogs,
      activityLogs,
    }
    console.log("[v0] Saving data to localStorage:", { ordersCount: orders.length, paymentsCount: payments.length, paymentsOutCount: paymentsOut.length })
    try {
      localStorage.setItem("sarkar_builders_data", JSON.stringify(dataToSave))
    } catch (e) {
      console.error("[v0] Failed to save data:", e)
    }
  }, [orders, vans, payments, paymentsOut, deleteLogs, activityLogs, hydrated])

  // Save counters whenever they change - always keep them in sync
  useEffect(() => {
    if (!hydrated) return
    console.log("[v0] Saving counters to localStorage:", counters)
    try {
      localStorage.setItem("sarkar_builders_counters", JSON.stringify(counters))
      // Also update module-level counters to keep them in sync
      nextOrderNo = counters.nextOrderNo
      nextReceiptNo = counters.nextReceiptNo
      nextVoucherNo = counters.nextVoucherNo
      nextSlipNo = counters.nextSlipNo
    } catch (e) {
      console.error("[v0] Failed to save counters:", e)
    }
  }, [counters, hydrated])

  // ---------- Activity Logging ----------
  const logActivity = useCallback((action: ActivityLog["action"], label: string, orderId?: string, details?: Record<string, any>) => {
    const log: ActivityLog = {
      id: `al${Date.now()}`,
      action,
      orderId,
      label,
      timestamp: new Date().toISOString(),
      details,
    }
    setActivityLogs((prev) => [log, ...prev])
  }, [])

  // ---------- Orders ----------
  const updateOrder = useCallback((id: string, updates: Partial<Order>) => {
    // Prevent tampering with locked fields
    const safeUpdates = { ...updates }
    delete safeUpdates.originalProduct
    delete safeUpdates.originalBillNo
    delete safeUpdates.originalUnit
    delete safeUpdates.originalTotalQty
    setOrders((prev) => prev.map((o) => {
      if (o.id !== id) return o
      const newRate = safeUpdates.rate !== undefined ? (safeUpdates.rate > 0 ? safeUpdates.rate : undefined) : o.rate
      const isUnpriced = newRate === undefined || newRate === 0
      return { 
        ...o, 
        ...safeUpdates,
        rate: newRate,
        isUnpriced,
      }
    }))
  }, [])

  const addOrder = useCallback((order: {
    name: string; phone: string; address: string
    // Legacy single-item fields (used when items array is absent)
    product: string; billNo: string; unit: string; totalQty: number; vanIds: string[]; rate?: number
    // Multi-item support
    items?: OrderItem[]
  }) => {
    const currentMaxOrderNo = orders.reduce((max, existing) => Math.max(max, existing.orderNo || 0), 0)
    const newOrderNo = Math.max(currentMaxOrderNo + 1, counters.nextOrderNo)

    // Determine primary fields from items[0] when multi-item, else use flat fields
    const primaryItem = order.items && order.items.length > 0 ? order.items[0] : null
    const primaryProduct = primaryItem ? primaryItem.product : order.product
    const primaryUnit = primaryItem ? primaryItem.unit : order.unit
    const primaryBillNo = primaryItem ? (primaryItem.billNo || "") : order.billNo
    const primaryQty = primaryItem ? primaryItem.qty : order.totalQty
    const primaryVanIds = (primaryItem?.vanIds && primaryItem.vanIds.length > 0) ? primaryItem.vanIds : order.vanIds

    // Rate: for single item use that item's rate, for multi use first item's rate (card shows per-item rates)
    const sku = SKU_DB.find(s => s.product.toLowerCase() === primaryProduct.toLowerCase())
    const primaryRate = primaryItem?.rate !== undefined && primaryItem.rate > 0
      ? primaryItem.rate
      : (order.rate !== undefined && order.rate > 0 ? order.rate : sku?.rate)
    const isUnpriced = !primaryRate || primaryRate === 0

    // Build the items snapshot for multi-product orders
    const resolvedItems: OrderItem[] | undefined = order.items && order.items.length > 1
      ? order.items.map(item => ({
          product: item.product,
          unit: item.unit,
          qty: item.qty,
          billNo: item.billNo || "",
          vanIds: item.vanIds || primaryVanIds,
          rate: item.rate,
        }))
      : undefined

    const newOrder = makeOrder({
      ...order,
      product: primaryProduct,
      billNo: primaryBillNo,
      unit: primaryUnit,
      totalQty: primaryQty,
      vanIds: primaryVanIds,
      rate: primaryRate,
      isUnpriced,
      id: `o${Date.now()}`,
      items: resolvedItems,
    }, newOrderNo)

    setOrders((prev) => [...prev, newOrder])
    setCounters((prev) => ({ ...prev, nextOrderNo: newOrderNo + 1 }))

    const productSummary = resolvedItems
      ? resolvedItems.map(i => i.product).join(", ")
      : primaryProduct
    logActivity("create_order", `Created Order #${newOrderNo} - ${order.name}`, newOrder.id, {
      phone: order.phone, product: productSummary,
      totalQty: primaryQty, rate: primaryRate, isUnpriced, itemCount: resolvedItems?.length ?? 1,
    })
  }, [orders, counters, logActivity])

  const softDeleteOrder = useCallback((id: string, reason: string) => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === id)
    setOrders((prev) => prev.map((o) =>
      o.id === id ? { ...o, deleted: true, deletedAt: now, deleteReason: reason } : o
    ))
    setDeleteLogs((prev) => [...prev, {
      id: `dl${Date.now()}`,
      type: "order",
      referenceId: id,
      label: `Order #${order?.orderNo} - ${order?.name}`,
      deletedAt: now,
      reason,
    }])
    logActivity("delete_order", `Deleted Order #${order?.orderNo} - ${order?.name}`, id)
  }, [orders, logActivity])

  // ---------- Trips ----------
  const addTrip = useCallback((orderId: string, trip: Omit<Trip, "id" | "slipNo">) => {
    const currentMaxSlipNo = orders.reduce(
      (max, order) => Math.max(max, ...order.trips.map((existingTrip) => existingTrip.slipNo || 0)),
      0,
    )
    const slipNo = Math.max(currentMaxSlipNo + 1, counters.nextSlipNo)
    const newTrip: Trip = { ...trip, id: `t${Date.now()}`, slipNo, date: new Date().toISOString() }
    
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        const updatedTrips = [...o.trips, newTrip]
        const totalDelivered = updatedTrips.reduce((sum, t) => sum + t.quantity, 0)
        const shouldAutoComplete = o.originalTotalQty > 0 && totalDelivered >= o.originalTotalQty
        logActivity("add_trip", `Added trip slip #${slipNo} to Order #${o.orderNo}`, orderId, { slipNo, quantity: trip.quantity })
        return { 
          ...o, 
          trips: updatedTrips,
          status: shouldAutoComplete ? "delivered" : o.status
        }
      })
    )
    
    setCounters((prev) => ({ ...prev, nextSlipNo: slipNo + 1 }))
    
    return newTrip
  }, [counters, logActivity])

  const deleteTrip = useCallback((orderId: string, tripId: string, reason: string) => {
    const now = new Date().toISOString()
    setOrders((prev) => prev.map((o) => {
      if (o.id === orderId) {
        const trip = o.trips.find(t => t.id === tripId)
        logActivity("delete_trip", `Deleted trip slip #${trip?.slipNo} from Order #${o.orderNo} - ${reason}`, orderId, { tripId, reason })
        return { ...o, trips: o.trips.filter((t) => t.id !== tripId) }
      }
      return o
    }))
  }, [logActivity])

  // ---------- Payments ----------
  const addPayment = useCallback((payment: Omit<Payment, "id" | "receiptNo" | "createdAt">) => {
    const now = new Date().toISOString()
    const currentMaxReceiptNo = payments.reduce((max, existing) => Math.max(max, existing.receiptNo || 0), 0)
    const receiptNo = Math.max(currentMaxReceiptNo + 1, counters.nextReceiptNo)
    const newPayment: Payment = { ...payment, id: `p${Date.now()}`, receiptNo, createdAt: now }
    
    setPayments((prev) => [...prev, newPayment])
    setCounters((prev) => ({ ...prev, nextReceiptNo: receiptNo + 1 }))
    logActivity("add_payment", `Received Payment Receipt #${receiptNo} from ${payment.name} (Rs. ${payment.amount})`, undefined, { receiptNo, amount: payment.amount, paymentId: newPayment.id })
    
    return newPayment
  }, [counters, logActivity])

  const deletePayment = useCallback((paymentId: string, reason: string) => {
    const now = new Date().toISOString()
    const payment = payments.find(p => p.id === paymentId)
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, deleted: true, deletedAt: now, deleteReason: reason } : p)))
    // Also mark deleted in orders
    setOrders((prev) => prev.map((o) => ({
      ...o,
      payments: (o.payments || []).map((p) => (p.id === paymentId ? { ...p, deleted: true, deletedAt: now, deleteReason: reason } : p)),
    })))
    setDeleteLogs((prev) => [...prev, {
      id: `dl${Date.now()}`,
      type: "payment",
      referenceId: paymentId,
      label: `Payment Receipt #${payment?.receiptNo} from ${payment?.name}`,
      deletedAt: now,
      reason,
    }])
    logActivity("delete_payment", `Deleted Payment Receipt #${payment?.receiptNo} from ${payment?.name} - ${reason}`, undefined, { paymentId, amount: payment?.amount, reason })
  }, [payments, logActivity])

  const permanentDeletePayment = useCallback((paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId)
    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    setOrders((prev) => prev.map((o) => ({
      ...o,
      payments: (o.payments || []).filter((p) => p.id !== paymentId),
    })))
    logActivity("delete_payment", `Permanently removed Payment Receipt #${payment?.receiptNo || paymentId} from system`, undefined, { paymentId })
  }, [payments, logActivity])

  // ---------- Payments Out (to suppliers) ----------
  const addPaymentOut = useCallback((payment: Omit<PaymentOut, "id" | "voucherNo" | "createdAt">) => {
    const now = new Date().toISOString()
    const currentMaxVoucherNo = paymentsOut.reduce((max, existing) => Math.max(max, existing.voucherNo || 0), 0)
    const voucherNo = Math.max(currentMaxVoucherNo + 1, counters.nextVoucherNo)
    const newPayment: PaymentOut = { ...payment, id: `po${Date.now()}`, voucherNo, createdAt: now }
    
    setPaymentsOut((prev) => [...prev, newPayment])
    setCounters((prev) => ({ ...prev, nextVoucherNo: voucherNo + 1 }))
    logActivity("add_payment_out", `Supplier Payment Voucher #${voucherNo} to ${payment.truckNo} (Rs. ${payment.amount})`, undefined, { voucherNo, amount: payment.amount, paymentOutId: newPayment.id })
    
    return newPayment
  }, [counters, logActivity])

  const deletePaymentOut = useCallback((paymentId: string, reason: string) => {
    const now = new Date().toISOString()
    const payment = paymentsOut.find(p => p.id === paymentId)
    setPaymentsOut((prev) => prev.filter((p) => p.id !== paymentId))
    setDeleteLogs((prev) => [...prev, {
      id: `dl${Date.now()}`,
      type: "payment_out",
      referenceId: paymentId,
      label: `Payment Voucher #${payment?.voucherNo} to ${payment?.truckNo}`,
      deletedAt: now,
      reason,
    }])
    logActivity("delete_payment_out", `Deleted Payment Voucher #${payment?.voucherNo} to ${payment?.truckNo} - ${reason}`, undefined, { paymentOutId: paymentId, amount: payment?.amount, reason })
  }, [paymentsOut, logActivity])

  // ---------- Vans ----------
  const addVan = useCallback((van: Omit<Van, "id" | "enabled">) => {
    const newVan: Van = { ...van, id: `v${Date.now()}`, enabled: true }
    setVans((prev) => [...prev, newVan])
  }, [])

  const toggleVan = useCallback((id: string) => {
    setVans((prev) => prev.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v)))
  }, [])

  const deleteVan = useCallback((id: string) => {
    setVans((prev) => prev.filter((v) => v.id !== id))
    // Unlink the van from any active orders
    setOrders((prev) => prev.map((o) => ({
      ...o,
      vanIds: o.vanIds.filter((vid) => vid !== id),
    })))
    logActivity("delete_order", `Removed van ${id} from fleet`, undefined, { vanId: id })
  }, [logActivity])

  // ---------- Helpers ----------
  const getDeliveredQty = useCallback((order: Order) => {
    return order.trips.reduce((sum, t) => sum + t.quantity, 0)
  }, [])

  const getVanById = useCallback(
    (id: string) => vans.find((v) => v.id === id),
    [vans]
  )

  // Aggregate all unique customers from static DB, orders, and payments
  const getAllCustomers = useCallback((): Customer[] => {
    const map = new Map<string, Customer>()
    CUSTOMERS_DB.forEach(c => {
      if (c.phone) map.set(c.phone, { phone: c.phone, name: c.name, address: c.address })
    })
    orders.forEach(o => {
      if (o.phone && !o.deleted) {
        map.set(o.phone, {
          phone: o.phone,
          name: o.name || "Customer",
          address: o.address || "",
        })
      }
    })
    payments.forEach(p => {
      if (p.phone) {
        const existing = map.get(p.phone)
        map.set(p.phone, {
          phone: p.phone,
          name: p.name || existing?.name || "Customer",
          address: p.address || existing?.address || "",
        })
      }
    })
    return Array.from(map.values())
  }, [orders, payments])

  const getCustomerByPhone = useCallback((phone: string) => {
    if (!phone) return null
    const all = getAllCustomers()
    return all.find(c => c.phone === phone) || null
  }, [getAllCustomers])

  const getCustomersByPhonePrefix = useCallback((prefix: string): Customer[] => {
    if (!prefix || !prefix.trim()) return []
    const digits = prefix.replace(/\D/g, "").trim()
    if (!digits) return []
    const all = getAllCustomers()
    return all.filter(c => c.phone.includes(digits)).slice(0, 10)
  }, [getAllCustomers])

  const getCustomersByNameQuery = useCallback((nameQuery: string): Customer[] => {
    if (!nameQuery || !nameQuery.trim()) return []
    const lower = nameQuery.toLowerCase().trim()
    const all = getAllCustomers()
    return all.filter(c => c.name.toLowerCase().includes(lower)).slice(0, 10)
  }, [getAllCustomers])

  const getCustomerOutstandingDues = useCallback((phone: string): number => {
    if (!phone) return 0
    const customerOrders = orders.filter(o => o.phone === phone && !o.deleted)
    const customerPayments = payments.filter(p => p.phone === phone && !p.deleted)
    const billed = customerOrders.reduce((sum, o) => {
      if (o.items && o.items.length > 1) {
        return sum + o.items.reduce((itemSum, item) => itemSum + ((item.rate || 0) * (item.qty || 0)), 0)
      }
      const isUnpriced = !o.rate || o.rate === 0 || o.isUnpriced
      return sum + (isUnpriced ? 0 : (o.rate || 0) * (o.totalQty || 0))
    }, 0)
    const paid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    return Math.max(0, billed - paid)
  }, [orders, payments])

  const getSuggestedAddresses = useCallback((input: string) => {
    if (!input) return []
    const lower = input.toLowerCase()
    const all = getAllCustomers()
    return [...new Set(all.map(c => c.address).filter(a => a && a.toLowerCase().includes(lower)))].slice(0, 8)
  }, [getAllCustomers])

  const getCustomersByNamePrefix = useCallback((prefix: string) => {
    return getCustomersByNameQuery(prefix)
  }, [getCustomersByNameQuery])

  const getRateBySKU = useCallback((product: string) => {
    // Check live skuList first (reflects Rate Intelligence edits)
    const liveMatch = skuList.find(s => s.product.toLowerCase() === product.toLowerCase())
    if (liveMatch?.rate) return liveMatch.rate
    return SKU_DB.find(s => s.product === product)?.rate || 0
  }, [skuList])

  // Advanced customer search with priority: phone > phone+name > firstName+address+phone > firstName+address > fullName+address
  const searchCustomer = useCallback((query: string) => {
    if (!query.trim()) return null
    
    const queryLower = query.toLowerCase().trim()
    const parts = queryLower.split(/\s+/)
    const phonePattern = /^\d{10}$/
    const isPhone = phonePattern.test(queryLower)

    // Priority 1: Phone number match
    if (isPhone) {
      const customer = CUSTOMERS_DB.find(c => c.phone === queryLower)
      if (customer) return customer
    }

    // Priority 2: Phone + Full name match
    if (isPhone && parts.length > 1) {
      const phone = queryLower
      const nameQuery = parts.slice(1).join(" ")
      const customer = CUSTOMERS_DB.find(c => c.phone === phone && c.name.toLowerCase().includes(nameQuery))
      if (customer) return customer
    }

    // Priority 3: First name + Address + Phone
    if (parts.length >= 3) {
      const firstName = parts[0]
      const address = parts.slice(1, -1).join(" ")
      const phone = parts[parts.length - 1]
      const customer = CUSTOMERS_DB.find(c => 
        c.name.toLowerCase().startsWith(firstName) && 
        c.address.toLowerCase().includes(address) &&
        c.phone.includes(phone)
      )
      if (customer) return customer
    }

    // Priority 4: First name + Address
    if (parts.length >= 2) {
      const firstName = parts[0]
      const address = parts.slice(1).join(" ")
      const customer = CUSTOMERS_DB.find(c => 
        c.name.toLowerCase().startsWith(firstName) && 
        c.address.toLowerCase().includes(address)
      )
      if (customer) return customer
    }

    // Priority 5: Full name + Address
    const fullNameMatch = CUSTOMERS_DB.find(c => 
      c.name.toLowerCase().includes(queryLower)
    )
    if (fullNameMatch) return fullNameMatch

    return null
  }, [])

  // Get customer profile with all related data
  const getCustomerProfile = useCallback((phone: string) => {
    const customer = getCustomerByPhone(phone)
    if (!customer) return null

    const customerOrders = orders.filter(o => o.phone === phone && !o.deleted)
    const customerPayments = payments.filter(p => p.phone === phone)
    
    const totalAmount = customerPayments.filter(p => !p.deleted).reduce((sum, p) => sum + p.amount, 0)
    const totalDelivered = customerOrders.reduce((sum, o) => sum + o.trips.reduce((s, t) => s + t.quantity, 0), 0)
    const unpricedOrdersCount = customerOrders.filter(o => !o.rate || o.rate === 0 || o.isUnpriced).length
    const lastOrderDate = customerOrders.length > 0 ? customerOrders[customerOrders.length - 1].createdAt : null

    return {
      customer,
      totalOrders: customerOrders.length,
      totalAmount,
      totalDelivered,
      unpricedOrdersCount,
      lastOrderDate,
      orders: customerOrders,
      payments: customerPayments,
    }
  }, [getCustomerByPhone, orders, payments])

  // Reorder orders by priority (higher = more urgent)
  const reorderByPriority = useCallback((orderId: string, direction: "up" | "down") => {
    setOrders((prev) => {
      const idx = prev.findIndex(o => o.id === orderId)
      if (idx === -1) return prev
      const newOrders = [...prev]
      const order = newOrders[idx]
      
      if (direction === "up" && idx > 0) {
        // Swap with previous and increment priority
        const newPriority = (newOrders[idx - 1].priority || 0) + 1
        newOrders[idx] = { ...order, priority: newPriority }
        newOrders.splice(idx, 1)
        newOrders.splice(idx - 1, 0, newOrders[idx])
      } else if (direction === "down" && idx < newOrders.length - 1) {
        // Swap with next and decrement priority
        const newPriority = Math.max(0, (newOrders[idx + 1].priority || 0) - 1)
        newOrders[idx] = { ...order, priority: newPriority }
        newOrders.splice(idx, 1)
        newOrders.splice(idx + 1, 0, newOrders[idx])
      }
      logActivity("reorder_priority", `Reordered Order #${order.orderNo} - ${order.name}`, orderId)
      return newOrders
    })
  }, [logActivity])

  const updateSKURate = useCallback((productOrSku: string, newRate: number) => {
    if (!productOrSku || newRate < 0) return
    const target = productOrSku.trim().toLowerCase()
    setSkuList(prev => {
      let idx = prev.findIndex(s =>
        s.product.toLowerCase().trim() === target ||
        (s.skuCode && s.skuCode.toLowerCase().trim() === target) ||
        s.id.toLowerCase() === target
      )
      if (idx === -1) {
        idx = prev.findIndex(s =>
          s.product.toLowerCase().includes(target) ||
          target.includes(s.product.toLowerCase())
        )
      }
      let updated: SKUItem[]
      if (idx !== -1) {
        updated = prev.map((s, i) => i === idx ? { ...s, rate: newRate } : s)
      } else {
        updated = [...prev, {
          id: `sku_${Date.now()}`,
          skuCode: `SKU-${Date.now().toString().slice(-4)}`,
          product: productOrSku.trim(),
          unit: "units",
          rate: newRate,
          category: "General",
          firm: "Direct",
        }]
      }
      localStorage.setItem("sarkar_builders_skus", JSON.stringify(updated))
      return updated
    })
  }, [])

  const logRateEdit = useCallback((customerPhone: string, orderId: string, product: string, oldRate: number, newRate: number, reason?: string) => {
    const newEntry = {
      id: `re_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      customerPhone,
      orderId,
      product,
      oldRate,
      newRate,
      editedAt: new Date().toISOString(),
      reason: reason || "Manual rate edit from CRM",
    }
    setRateEditLogs(prev => {
      const updated = [newEntry, ...prev]
      localStorage.setItem("sarkar_builders_rate_edit_logs", JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeDeleteLog = useCallback((id: string) => {
    setDeleteLogs((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const clearAllDeleteLogs = useCallback(() => {
    setDeleteLogs([])
  }, [])

  // ---------- Admin Access ----------
  const ADMIN_PIN = "1234"
  const unlockAdmin = useCallback((pin: string): boolean => {
    if (pin === ADMIN_PIN) {
      setIsAdminUnlocked(true)
      return true
    }
    return false
  }, [])

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false)
  }, [])

  // ---------- SKU CRUD ----------
  const addSKU = useCallback((sku: Omit<SKUItem, "id">) => {
    setSkuList(prev => {
      const newItem: SKUItem = { ...sku, id: `sku_${Date.now()}` }
      const updated = [...prev, newItem]
      localStorage.setItem("sarkar_builders_skus", JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateSKU = useCallback((id: string, fields: Partial<SKUItem>) => {
    setSkuList(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...fields } : s)
      localStorage.setItem("sarkar_builders_skus", JSON.stringify(updated))
      return updated
    })
  }, [])

  const deleteSKU = useCallback((id: string) => {
    setSkuList(prev => {
      const updated = prev.filter(s => s.id !== id)
      localStorage.setItem("sarkar_builders_skus", JSON.stringify(updated))
      return updated
    })
  }, [])

  // ---------- Order Rate Edit ----------
  const updateOrderRate = useCallback((orderId: string, newRate: number, reason?: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    const oldRate = order.rate || 0
    const isUnpriced = newRate <= 0
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rate: newRate > 0 ? newRate : undefined, isUnpriced } : o))
    // Log the rate edit
    logRateEdit(order.phone, orderId, order.product, oldRate, newRate, reason || "Rate edited from order card")
    // Bidirectional sync with SKU
    if (newRate > 0) updateSKURate(order.product, newRate)
  }, [orders, logRateEdit, updateSKURate])

  return {
    orders,
    vans,
    workers,
    payments,
    paymentsOut,
    deleteLogs,
    activityLogs,
    rateEditLogs,
    skuList,
    isAdminUnlocked,
    unlockAdmin,
    lockAdmin,
    updateSKURate,
    updateSKU,
    addSKU,
    deleteSKU,
    logRateEdit,
    removeDeleteLog,
    clearAllDeleteLogs,
    updateOrder,
    updateOrderRate,
    addOrder,
    softDeleteOrder,
    addTrip,
    deleteTrip,
    addPayment,
    deletePayment,
    permanentDeletePayment,
    addPaymentOut,
    deletePaymentOut,
    addVan,
    toggleVan,
    deleteVan,
    getDeliveredQty,
    getVanById,
    getCustomerByPhone,
    getAllCustomers,
    getCustomersByPhonePrefix,
    getCustomersByNameQuery,
    getCustomerOutstandingDues,
    getSuggestedAddresses,
    getCustomersByNamePrefix,
    getRateBySKU,
    reorderByPriority,
    logActivity,
    searchCustomer,
    getCustomerProfile,
  }
}

