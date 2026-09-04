// Capitalize first letter of name/string
export function capitalizeName(name: string): string {
  if (!name) return ""
  return name.trim().charAt(0).toUpperCase() + name.trim().slice(1)
}

// Format and validate phone number - only 10 digits
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(0, 10)
  return digits
}

// Validate phone is 10 digits
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 10
}

// Format phone for display
export function displayPhone(phone: string): string {
  const digits = formatPhone(phone)
  if (digits.length !== 10) return phone
  return `${digits.slice(0, 5)} ${digits.slice(5)}`
}

/**
 * Returns the date string in YYYY-MM-DD format for a given date in Indian Standard Time (Asia/Kolkata, UTC+5:30).
 * If no date is passed, returns today's date in IST.
 */
export function getISTDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/**
 * Checks if a given timestamp/date is today in IST.
 */
export function isTodayIST(date: Date | string | null | undefined): boolean {
  if (!date) return false
  return getISTDateString(date) === getISTDateString(new Date())
}
