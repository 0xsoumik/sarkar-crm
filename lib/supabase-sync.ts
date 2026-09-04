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
    const { error } = await supabase
      .from("sarkar_state")
      .upsert({
        key,
        data: value,
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
