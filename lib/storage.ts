/**
 * Persistent Storage System
 * Safely handles localStorage in browser environment
 * Recovers from corrupted data with fallback strategies
 */

const STORAGE_KEYS = {
  ORDERS: "sarkar_orders",
  PAYMENTS: "sarkar_payments",
  PAYMENTS_OUT: "sarkar_payments_out",
  VANS: "sarkar_vans",
  ACTIVITY_LOGS: "sarkar_activity_logs",
  DELETE_LOGS: "sarkar_delete_logs",
  LAYOUT_PREFERENCES: "sarkar_layout_prefs",
  BANK_ACCOUNTS: "sarkar_bank_accounts",
  CUSTOMER_BOOKS: "sarkar_customer_books",
} as const

/**
 * Get item from localStorage with error handling
 */
export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback
    const item = window.localStorage?.getItem(key)
    if (!item) return fallback
    const parsed = JSON.parse(item)
    return parsed || fallback
  } catch (error) {
    console.error(`[Storage] Error reading ${key}:`, error)
    return fallback
  }
}

/**
 * Set item in localStorage with error handling
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    if (typeof window === "undefined") return false
    window.localStorage?.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[Storage] Error writing ${key}:`, error)
    return false
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(key: string): boolean {
  try {
    if (typeof window === "undefined") return false
    window.localStorage?.removeItem(key)
    return true
  } catch (error) {
    console.error(`[Storage] Error removing ${key}:`, error)
    return false
  }
}

/**
 * Clear all application data from localStorage
 */
export function clearAllStorage(): void {
  try {
    if (typeof window === "undefined") return
    Object.values(STORAGE_KEYS).forEach((key) => {
      window.localStorage?.removeItem(key)
    })
  } catch (error) {
    console.error("[Storage] Error clearing all storage:", error)
  }
}

/**
 * Export all critical data as JSON backup
 */
export function exportAllData<T extends Record<string, any>>(data: T): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Import data from JSON backup
 */
export function importDataFromJSON<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error("[Storage] Error importing data:", error)
    return null
  }
}

export { STORAGE_KEYS }
