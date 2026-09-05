export interface Van {
  id: string
  name: string
  driver: string
  plate: string
  color?: string
  enabled: boolean
  capacity?: number
  capacityUnit?: string
}

export interface Trip {
  id: string
  slipNo: number
  vanId: string
  quantity: number
  date: string
  note: string
  ratePerUnit?: number
}

export interface DeleteLog {
  id: string
  type: "order" | "trip" | "bill" | "payment" | "payment_out"
  referenceId: string
  label: string // human readable: "Order #o1 - Shamal Biswas" etc.
  deletedAt: string // ISO string with seconds
  reason: string
}

export interface Payment {
  id: string
  receiptNo: number // sequential #1, #2...
  name: string
  phone: string // customer ID
  address: string
  amount: number
  mode: "NEFT" | "CASH" | "CHEQUE" | "UPI"
  note: string
  createdAt: string // ISO with seconds
  linkedOrderId?: string // auto-linked if same phone+date
  deleted?: boolean
  deletedAt?: string
  deleteReason?: string
}

export interface PaymentOut {
  id: string
  voucherNo: number // sequential #1, #2...
  truckNo: string // truck/supplier identifier
  amount: number
  mode: "NEFT" | "CASH" | "CHEQUE" | "UPI"
  note: string
  createdAt: string // ISO with seconds
  supplierName?: string
}

export interface OrderItem {
  product: string
  unit: string
  qty: number
  rate?: number
  billNo?: string
  vanIds?: string[]
}

export interface Order {
  id: string
  orderNo: number // sequential order number for today
  name: string
  phone: string
  address: string
  // locked after creation (tamper-proof)
  product: string
  originalProduct: string // snapshot at creation, never changes
  billNo: string
  originalBillNo: string // snapshot at creation, never changes
  unit: string
  originalUnit: string // snapshot at creation, never changes
  totalQty: number
  originalTotalQty: number // snapshot at creation, never changes
  rate?: number // rate per unit (auto-fetched from SKU lookup)
  vanIds: string[]
  workerIds: string[]
  quality: "ok" | "issue" | "pending"
  qualityNote: string
  status: "pending" | "delivered"
  priority: number // 0=normal, higher=more urgent (for reordering)
  deleted: boolean // soft delete with cross-out
  deletedAt?: string
  deleteReason?: string
  trips: Trip[]
  payments: Payment[] // co-synced payments for today
  createdAt: string
  isUnpriced?: boolean
  // Multi-product support: when an order has multiple items,
  // they are stored here. Single-item orders keep legacy fields only.
  items?: OrderItem[]
}

export interface Worker {
  id: string
  name: string
  role: string
}

export interface ActivityLog {
  id: string
  action: "create_order" | "update_order" | "delete_order" | "add_trip" | "delete_trip" | "add_payment" | "delete_payment" | "add_payment_out" | "delete_payment_out" | "reorder_priority" | "quality_update" | "status_update"
  orderId?: string
  paymentId?: string
  paymentOutId?: string
  tripId?: string
  referenceId?: string // for jumping to the item
  label: string // human readable: "Created Order #5 - Upananda Roy" etc.
  timestamp: string // ISO string with seconds
  details?: Record<string, any> // additional context
}

export interface Customer {
  phone: string
  name: string
  address: string
  productHistory?: string[] // list of products ordered before
  lastOrderDate?: string
}

export interface CustomerProfile {
  customer: Customer
  totalOrders: number
  totalAmount: number
  totalDelivered: number
  unpricedOrdersCount?: number
  lastOrderDate: string | null
  orders: Order[]
  payments: Payment[]
}

export interface SKUItem {
  id: string
  skuCode?: string      // e.g. "DAL-PPC-50KG"
  product: string
  unit: string
  rate: number
  category?: string
  firm?: string
}

export interface RateEntry {
  id: string
  sku: string
  product: string
  unit: string
  standardRate: number
  customRate?: number
  category: string
  firm: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  sku: string
  product: string
  quantity: number
  unit: string
  lastRestocked?: string
  minStock?: number
}

export interface FinancialRecord {
  customerId: string
  customerName: string
  advance?: number
  paymentsDone: number
  billsPending: number
  lastTransaction?: string
}

export interface BankAccount {
  id: string
  bankName: string
  accountType: "savings" | "current" | "business"
  accountNumber: string
  ifsc: string
  balance: number
  logo?: string
  createdAt: string
}

export interface CustomerTransaction {
  id: string
  customerId: string
  type: "order" | "payment" | "advance" | "adjustment"
  orderId?: string
  amount: number
  balance: number // running balance
  description: string
  date: string
  createdAt: string
}

export interface LayoutPreference {
  sectionOrder: string[]
  collapsedSections: Record<string, boolean>
  lastUpdated: string
}

export type AppTab = "daily-sheet" | "rate-intelligence" | "inventory" | "crm" | "srm" | "finance-intel" | "sku-manager"
export type FilterTab = "all" | "pending" | "delivered"
export type BillMode = "full" | "summary"

export interface RateEditLog {
  id: string
  customerPhone: string
  orderId: string
  product: string
  oldRate: number
  newRate: number
  editedAt: string
  reason?: string
}

