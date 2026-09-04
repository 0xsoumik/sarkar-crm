import { supabase, isSupabaseConfigured } from "./supabase"

export async function fetchCloudState(): Promise<Record<string, any> | null> {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from("sarkar_state")
      .select("key, data")
    if (error) {
      console.warn("[CloudSync] Failed to fetch cloud state:", error.message)
      return null
    }
    if (!data || data.length === 0) return {}
    const map: Record<string, any> = {}
    for (const row of data) {
      map[row.key] = row.data
    }
    return map
  } catch (e) {
    console.warn("[CloudSync] Error fetching cloud state:", e)
    return null
  }
}

export async function saveCloudStateKey(key: string, value: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    let payloadToSave = value

    // CRITICAL DATA PROTECTION: If saving sarkar_builders_data, merge with cloud to prevent overwrites
    if (key === "sarkar_builders_data" && value && Array.isArray(value.orders)) {
      try {
        const { data: existingRow } = await supabase
          .from("sarkar_state")
          .select("data")
          .eq("key", "sarkar_builders_data")
          .maybeSingle()

        if (existingRow?.data?.orders && Array.isArray(existingRow.data.orders)) {
          const existingOrders = existingRow.data.orders
          // Merge by ID: existing cloud orders are never lost
          const orderMap = new Map<string, any>()
          for (const o of existingOrders) {
            if (o && o.id) orderMap.set(o.id, o)
          }
          for (const o of value.orders) {
            if (o && o.id) {
              const prev = orderMap.get(o.id)
              orderMap.set(o.id, prev ? { ...prev, ...o } : o)
            }
          }
          payloadToSave = {
            ...value,
            orders: Array.from(orderMap.values()),
          }

          // Also merge payments
          if (existingRow.data.payments && Array.isArray(existingRow.data.payments)) {
            const payMap = new Map<string, any>()
            for (const p of existingRow.data.payments) {
              if (p && p.id) payMap.set(p.id, p)
            }
            for (const p of (value.payments || [])) {
              if (p && p.id) {
                const prev = payMap.get(p.id)
                payMap.set(p.id, prev ? { ...prev, ...p } : p)
              }
            }
            payloadToSave.payments = Array.from(payMap.values())
          }
        }
      } catch (mergeErr) {
        console.warn("[CloudSync] Non-blocking merge error:", mergeErr)
      }
    }

    const { error } = await supabase
      .from("sarkar_state")
      .upsert({
        key,
        data: payloadToSave,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" })
    if (error) {
      console.warn(`[CloudSync] Failed to save key ${key}:`, error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn(`[CloudSync] Error saving key ${key}:`, e)
    return false
  }
}

export function subscribeToCloudChanges(onUpdate: (key: string, data: any) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {}
  try {
    const channel = supabase
      .channel("sarkar_state_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sarkar_state" },
        (payload: any) => {
          if (payload.new && payload.new.key) {
            onUpdate(payload.new.key, payload.new.data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } catch (e) {
    console.warn("[CloudSync] Failed to subscribe to realtime:", e)
    return () => {}
  }
}
