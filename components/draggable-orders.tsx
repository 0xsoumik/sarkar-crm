"use client"

import { useState } from "react"
import { useStore } from "@/hooks/use-store"
import type { Order, Van } from "@/lib/types"
import { OrderCard } from "./order-card"
import { GripVertical } from "lucide-react"

interface DraggableOrdersProps {
  orders: Order[]
  vans: Van[]
  onCustomerClick?: (phone: string) => void
}

export function DraggableOrders({ orders, vans, onCustomerClick }: DraggableOrdersProps) {
  const store = useStore()
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (orderId: string) => {
    setDraggedOrder(orderId)
  }

  const handleDragOver = (index: number) => {
    setDragOverIndex(index)
  }

  const handleDrop = (dropIndex: number) => {
    if (!draggedOrder) return

    const draggedIdx = orders.findIndex(o => o.id === draggedOrder)
    if (draggedIdx === -1 || draggedIdx === dropIndex) {
      setDraggedOrder(null)
      setDragOverIndex(null)
      return
    }

    // Reorder by updating priorities
    const reorderedOrders = [...orders]
    const draggedItem = reorderedOrders[draggedIdx]
    reorderedOrders.splice(draggedIdx, 1)
    reorderedOrders.splice(dropIndex, 0, draggedItem)

    // Update priorities based on new order
    reorderedOrders.forEach((order, idx) => {
      store.updateOrder(order.id, { priority: reorderedOrders.length - idx })
    })

    setDraggedOrder(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-2">
      {orders.map((order, index) => (
        <div
          key={order.id}
          draggable
          onDragStart={() => handleDragStart(order.id)}
          onDragOver={() => handleDragOver(index)}
          onDragLeave={() => setDragOverIndex(null)}
          onDrop={() => handleDrop(index)}
          className={`relative transition-all ${
            draggedOrder === order.id ? "opacity-40" : ""
          } ${
            dragOverIndex === index && draggedOrder !== order.id
              ? "border-t-2 border-primary scale-98"
              : ""
          }`}
        >
          {/* Drag indicator on hover */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity group cursor-grab active:cursor-grabbing" style={{ width: '20px' }}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="pl-6">
            <OrderCard
              order={order}
              vans={vans}
              onUpdate={store.updateOrder}
              onSoftDelete={store.softDeleteOrder}
              onAddTrip={store.addTrip}
              onDeleteTrip={store.deleteTrip}
              onCustomerClick={onCustomerClick}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
