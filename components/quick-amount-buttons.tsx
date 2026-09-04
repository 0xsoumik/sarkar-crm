"use client"

export const QUICK_AMOUNTS = [1000, 5000, 10000, 20000, 50000]

interface QuickAmountButtonsProps {
  onSelect: (amount: number) => void
}

export function QuickAmountButtons({ onSelect }: QuickAmountButtonsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_AMOUNTS.map((amount) => (
        <button
          key={amount}
          onClick={() => onSelect(amount)}
          className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded font-medium text-muted-foreground transition-colors"
          title={`Quick fill: ₹${amount.toLocaleString("en-IN")}`}
        >
          ₹{(amount / 1000).toFixed(0)}k
        </button>
      ))}
    </div>
  )
}
