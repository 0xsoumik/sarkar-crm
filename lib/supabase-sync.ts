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
    if (key === "sarkar_builders_data" && value && (Array.isArray(value.orders) || Array.isArray(value.payments))) {
      try {
        const { data: existingRow } = await supabase
          .from("sarkar_state")
          .select("data")
          .eq("key", "sarkar_builders_data")
          .maybeSingle()

        if (existingRow?.data) {
          const cloud = existingRow.data

          // 1. Merge Orders by ID
          const orderMap = new Map<string, any>()
          if (Array.isArray(cloud.orders)) {
            for (const o of cloud.orders) {
              if (o && o.id) orderMap.set(o.id, o)
            }
          }
          if (Array.isArray(value.orders)) {
            for (const o of value.orders) {
              if (o && o.id) {
                const prev = orderMap.get(o.id)
                orderMap.set(o.id, prev ? { ...prev, ...o } : o)
              }
            }
          }

          // 2. Merge Payments by ID
          const payMap = new Map<string, any>()
          if (Array.isArray(cloud.payments)) {
            for (const p of cloud.payments) {
              if (p && p.id) payMap.set(p.id, p)
            }
          }
          if (Array.isArray(value.payments)) {
            for (const p of value.payments) {
              if (p && p.id) {
                const prev = payMap.get(p.id)
                payMap.set(p.id, prev ? { ...prev, ...p } : p)
              }
            }
          }

          // 3. Merge Payments Out by ID
          const poMap = new Map<string, any>()
          if (Array.isArray(cloud.paymentsOut)) {
            for (const po of cloud.paymentsOut) {
              if (po && po.id) poMap.set(po.id, po)
            }
          }
          if (Array.isArray(value.paymentsOut)) {
            for (const po of value.paymentsOut) {
              if (po && po.id) {
                const prev = poMap.get(po.id)
                poMap.set(po.id, prev ? { ...prev, ...po } : po)
              }
            }
          }

          // 4. Merge Delete Logs by ID
          const dlMap = new Map<string, any>()
          if (Array.isArray(cloud.deleteLogs)) {
            for (const dl of cloud.deleteLogs) {
              if (dl && dl.id) dlMap.set(dl.id, dl)
            }
          }
          if (Array.isArray(value.deleteLogs)) {
            for (const dl of value.deleteLogs) {
              if (dl && dl.id) {
                const prev = dlMap.get(dl.id)
                dlMap.set(dl.id, prev ? { ...prev, ...dl } : dl)
              }
            }
          }

          // 5. Merge Activity Logs by ID (keep newest first, up to 500 logs)
          const alMap = new Map<string, any>()
          if (Array.isArray(cloud.activityLogs)) {
            for (const al of cloud.activityLogs) {
              if (al && al.id) alMap.set(al.id, al)
            }
          }
          if (Array.isArray(value.activityLogs)) {
            for (const al of value.activityLogs) {
              if (al && al.id) {
                const prev = alMap.get(al.id)
                alMap.set(al.id, prev ? { ...prev, ...al } : al)
              }
            }
          }
          const mergedActivityLogs = Array.from(alMap.values())
            .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
            .slice(0, 500)

          // 6. Merge Vans (preserve capacities and names)
          const vanMap = new Map<string, any>()
          if (Array.isArray(cloud.vans)) {
            for (const v of cloud.vans) {
              if (v && v.id) vanMap.set(v.id, v)
            }
          }
          if (Array.isArray(value.vans)) {
            for (const v of value.vans) {
              if (v && v.id) {
                const prev = vanMap.get(v.id)
                vanMap.set(v.id, prev ? { ...prev, ...v } : v)
              }
            }
          }

          payloadToSave = {
            ...cloud,
            ...value,
            orders: Array.from(orderMap.values()),
            payments: Array.from(payMap.values()),
            paymentsOut: Array.from(poMap.values()),
            deleteLogs: Array.from(dlMap.values()),
            activityLogs: mergedActivityLogs,
            vans: Array.from(vanMap.values()),
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
