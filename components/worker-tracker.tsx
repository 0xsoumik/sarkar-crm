"use client"

import type { Order, Worker } from "@/lib/types"
import { User } from "lucide-react"

interface WorkerTrackerProps {
  workers: Worker[]
  orders: Order[]
}

export function WorkerTracker({ workers, orders }: WorkerTrackerProps) {
  const activeOrders = orders.filter((o) => o.status === "pending")

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Live Worker Tracker</h2>
        <p className="text-xs text-muted-foreground">Who is working on what</p>
      </div>
      <div className="grid grid-cols-2 gap-0 divide-x md:grid-cols-4">
        {workers.map((worker) => {
          const assignedOrders = activeOrders.filter((o) => o.workerIds.includes(worker.id))
          const isActive = assignedOrders.length > 0

          return (
            <div key={worker.id} className="flex flex-col items-center gap-2 p-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                {isActive && (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-card bg-accent" />
                )}
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-foreground">{worker.name}</div>
                <div className="text-[10px] text-muted-foreground">{worker.role}</div>
              </div>
              {assignedOrders.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {assignedOrders.map((o) => (
                    <span key={o.id} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {o.name.split(" ")[0]}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground">Idle</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
