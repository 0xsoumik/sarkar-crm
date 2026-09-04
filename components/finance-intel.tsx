"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BankAccountsManager } from "@/components/bank-accounts-manager"
import { AlertCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import type { Payment, PaymentOut, BankAccount } from "@/lib/types"
import { getISTDateString } from "@/lib/validation"

interface FinanceIntelProps {
  payments: Payment[]
  paymentsOut: PaymentOut[]
}

type PeriodType = "today" | "week" | "month" | "custom"

export function FinanceIntel({ payments, paymentsOut }: FinanceIntelProps) {
  const [period, setPeriod] = useState<PeriodType>("today")
  const [startDate, setStartDate] = useState<string>(getISTDateString())
  const [endDate, setEndDate] = useState<string>(getISTDateString())
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [editingBalance, setEditingBalance] = useState(false)

  // Calculate period dates
  const getDateRange = () => {
    const today = new Date()
    let start: Date
    let end = new Date(today)

    switch (period) {
      case "today":
        start = new Date(today)
        break
      case "week":
        start = new Date(today)
        start.setDate(today.getDate() - today.getDay())
        break
      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case "custom":
        start = new Date(startDate)
        end = new Date(endDate)
        break
    }

    return {
      start: getISTDateString(start),
      end: getISTDateString(end),
      startDate: start,
      endDate: end,
    }
  }

  const dateRange = getDateRange()

  // Filter transactions by period in IST
  const filteredPayments = payments.filter((p) => {
    const date = p.createdAt ? getISTDateString(p.createdAt) : ""
    return date >= dateRange.start && date <= dateRange.end
  })

  const filteredPaymentsOut = paymentsOut.filter((po) => {
    const date = po.createdAt ? getISTDateString(po.createdAt) : ""
    return date >= dateRange.start && date <= dateRange.end
  })

  // Calculate totals
  const totalIncome = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalExpense = filteredPaymentsOut.reduce((sum, p) => sum + p.amount, 0)
  const netCashFlow = totalIncome - totalExpense
  const projectedBalance = openingBalance + netCashFlow

  // Group by payment mode
  const paymentsByMode: Record<string, number> = {}
  filteredPayments.forEach((p) => {
    paymentsByMode[p.mode] = (paymentsByMode[p.mode] || 0) + p.amount
  })

  const expenseByMode: Record<string, number> = {}
  filteredPaymentsOut.forEach((p) => {
    expenseByMode[p.mode] = (expenseByMode[p.mode] || 0) + p.amount
  })

  const formatPeriodDisplay = () => {
    const start = dateRange.startDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const end = dateRange.endDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    return `${start} to ${end}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Period Selector */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Financial Period</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["today", "week", "month", "custom"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
              className="text-xs"
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}
        <div className="mt-3 text-xs text-muted-foreground font-medium">
          Period: {formatPeriodDisplay()}
        </div>
      </Card>

      {/* Opening Balance */}
      <Card className="p-4 border-amber-200 bg-amber-50/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Opening Balance (Bank)</div>
            <div className="text-2xl font-bold text-amber-700">₹{openingBalance.toLocaleString("en-IN")}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingBalance(!editingBalance)}
          >
            {editingBalance ? "Done" : "Edit"}
          </Button>
        </div>
        {editingBalance && (
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              placeholder="Enter opening balance"
            />
          </div>
        )}
      </Card>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-green-50/30 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Money In</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            +₹{totalIncome.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {filteredPayments.length} transactions
          </div>
        </Card>

        <Card className="p-4 bg-red-50/30 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Money Out</span>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            -₹{totalExpense.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {filteredPaymentsOut.length} transactions
          </div>
        </Card>
      </div>

      {/* Net Cash Flow */}
      <Card className={`p-4 ${netCashFlow >= 0 ? "bg-green-50/30 border-green-200" : "bg-red-50/30 border-red-200"}`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Net Cash Flow</div>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netCashFlow >= 0 ? "+" : "−"}₹{Math.abs(netCashFlow).toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Projected Balance</div>
            <div className={`text-2xl font-bold ${projectedBalance >= 50000 ? "text-green-600" : "text-red-600"}`}>
              ₹{projectedBalance.toLocaleString("en-IN")}
            </div>
            {projectedBalance < 50000 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                Low balance warning
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Payment Mode Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Money In by Mode */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Money In - By Mode</h3>
          <div className="space-y-2">
            {Object.entries(paymentsByMode).length === 0 ? (
              <div className="text-xs text-muted-foreground">No transactions</div>
            ) : (
              Object.entries(paymentsByMode).map(([mode, amount]) => (
                <div key={mode} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-xs text-muted-foreground">{mode}</span>
                  <span className="text-xs font-semibold text-green-600">
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Money Out by Mode */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Money Out - By Mode</h3>
          <div className="space-y-2">
            {Object.entries(expenseByMode).length === 0 ? (
              <div className="text-xs text-muted-foreground">No transactions</div>
            ) : (
              Object.entries(expenseByMode).map(([mode, amount]) => (
                <div key={mode} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-xs text-muted-foreground">{mode}</span>
                  <span className="text-xs font-semibold text-red-600">
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bank Accounts Manager */}
      <BankAccountsManager
        accounts={bankAccounts}
        onAddAccount={(account) => {
          const newAccount: BankAccount = {
            ...account,
            id: `bank_${Date.now()}`,
            createdAt: new Date().toISOString(),
          }
          setBankAccounts([...bankAccounts, newAccount])
        }}
        onUpdateBalance={(accountId, newBalance) => {
          setBankAccounts(
            bankAccounts.map((acc) =>
              acc.id === accountId ? { ...acc, balance: newBalance } : acc
            )
          )
        }}
        onDeleteAccount={(accountId) => {
          setBankAccounts(bankAccounts.filter((acc) => acc.id !== accountId))
        }}
      />
    </div>
  )
}
