"use client"

import React from "react"
import { StoreContext, useStoreInternal } from "@/hooks/use-store"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useStoreInternal()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
