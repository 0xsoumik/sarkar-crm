"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Lock, Unlock, Plus, Trash2, Eye, EyeOff, Building, CreditCard } from "lucide-react"
import type { BankAccount } from "@/lib/types"

interface BankAccountsManagerProps {
  accounts: BankAccount[]
  onAddAccount: (account: Omit<BankAccount, "id" | "createdAt">) => void
  onUpdateBalance: (accountId: string, newBalance: number) => void
  onDeleteAccount: (accountId: string) => void
}

const BANK_LOGOS: Record<string, string> = {
  "HDFC": "🏦",
  "ICICI": "🏦",
  "SBI": "🏦",
  "AXIS": "🏦",
  "KOTAK": "🏦",
  "YES": "🏦",
  "INDUSIND": "🏦",
}

export function BankAccountsManager({ accounts, onAddAccount, onUpdateBalance, onDeleteAccount }: BankAccountsManagerProps) {
  const [locked, setLocked] = useState(true)
  const [password, setPassword] = useState("")
  const [passwordAttempt, setPasswordAttempt] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(new Set())
  const [newAccount, setNewAccount] = useState<{
    bankName: string
    accountType: "savings" | "current" | "business"
    accountNumber: string
    ifsc: string
    balance: number
  }>({
    bankName: "",
    accountType: "savings",
    accountNumber: "",
    ifsc: "",
    balance: 0,
  })

  const handlePasswordSubmit = () => {
    if (passwordAttempt === password || (!password && passwordAttempt === "admin")) {
      setLocked(false)
      setPasswordAttempt("")
    } else {
      alert("Incorrect password")
      setPasswordAttempt("")
    }
  }

  const toggleAccountVisibility = (accountId: string) => {
    const newSet = new Set(visibleAccounts)
    if (newSet.has(accountId)) {
      newSet.delete(accountId)
    } else {
      newSet.add(accountId)
    }
    setVisibleAccounts(newSet)
  }

  const maskAccountNumber = (accountNumber: string) => {
    const last4 = accountNumber.slice(-4)
    return `****${last4}`
  }

  if (locked) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4">
          <Lock className="h-8 w-8 text-destructive" />
          <h3 className="text-sm font-semibold">Bank Accounts - Locked</h3>
          <p className="text-xs text-muted-foreground text-center">Enter password to view and manage bank accounts</p>
          <div className="w-full flex flex-col gap-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={passwordAttempt}
              onChange={(e) => setPasswordAttempt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <Button onClick={handlePasswordSubmit} size="sm">
              Unlock
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  return (
    <div className="space-y-4">
      {/* Header with lock and summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Unlock className="h-4 w-4 text-green-600" />
            Bank Accounts (Unlocked)
          </h3>
          <p className="text-xs text-muted-foreground">Total Balance: ₹{totalBalance.toLocaleString("en-IN")}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setLocked(true)
            setPassword("")
            setPasswordAttempt("")
          }}
          variant="outline"
        >
          <Lock className="h-3 w-3 mr-1" />
          Lock
        </Button>
      </div>

      {/* Accounts Grid */}
      <div className="grid gap-3">
        {accounts.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-center">
            <Building className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No bank accounts added yet</p>
          </div>
        ) : (
          accounts.map((account) => {
            const isVisible = visibleAccounts.has(account.id)
            const bankLogo = BANK_LOGOS[account.bankName.toUpperCase()] || "🏦"

            return (
              <Card key={account.id} className="p-4 bg-card hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{bankLogo}</div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{account.bankName}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {account.accountType === "savings" ? "Savings" : account.accountType === "current" ? "Current" : "Business"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onDeleteAccount(account.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Account Details */}
                <div className="space-y-2 mb-3 rounded bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Account No:</span>
                    <code className="text-xs font-mono">{isVisible ? account.accountNumber : maskAccountNumber(account.accountNumber)}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 ml-auto"
                      onClick={() => toggleAccountVisibility(account.id)}
                    >
                      {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">IFSC:</span>
                    <code className="text-xs font-mono">{account.ifsc}</code>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Balance:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-600">₹{account.balance.toLocaleString("en-IN")}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          const newBalance = prompt("Enter new balance:", String(account.balance))
                          if (newBalance && !isNaN(Number(newBalance))) {
                            onUpdateBalance(account.id, Number(newBalance))
                          }
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Add Account Button */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <Button
          size="sm"
          className="w-full"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Bank Account
        </Button>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bank Account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input
                value={newAccount.bankName}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, bankName: e.target.value }))}
                placeholder="e.g., HDFC, ICICI, SBI"
              />
            </div>
            <div>
              <Label className="text-xs">Account Type</Label>
              <div className="flex gap-2 mt-1">
                {(["savings", "current", "business"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewAccount((prev) => ({ ...prev, accountType: type }))}
                    className={`flex-1 rounded border px-3 py-2 text-xs font-medium transition-all ${
                      newAccount.accountType === type
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input
                value={newAccount.accountNumber}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="Enter account number"
              />
            </div>
            <div>
              <Label className="text-xs">IFSC Code</Label>
              <Input
                value={newAccount.ifsc}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, ifsc: e.target.value }))}
                placeholder="e.g., HDFC0000001"
              />
            </div>
            <div>
              <Label className="text-xs">Opening Balance (₹)</Label>
              <Input
                type="number"
                value={newAccount.balance || ""}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, balance: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <Button
              onClick={() => {
                if (newAccount.bankName && newAccount.accountNumber && newAccount.ifsc) {
                  onAddAccount(newAccount)
                  setNewAccount({
                    bankName: "",
                    accountType: "savings",
                    accountNumber: "",
                    ifsc: "",
                    balance: 0,
                  })
                  setShowAddDialog(false)
                }
              }}
              disabled={!newAccount.bankName || !newAccount.accountNumber || !newAccount.ifsc}
            >
              Add Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
