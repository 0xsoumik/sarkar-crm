import type { Order, Van, Trip, Payment, PaymentOut } from "./types"

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
}

export function generateBillHTML(order: Order, vans: Van[], showTrips: boolean): string {
  const assignedVans = vans.filter((v) => order.vanIds.includes(v.id))
  const delivered = order.trips.reduce((s, t) => s + t.quantity, 0)
  const remaining = order.originalTotalQty > 0 ? order.originalTotalQty - delivered : 0

  let tripsSection = ""
  if (showTrips && order.trips.length > 0) {
    let cumulative = 0
    const rows = order.trips
      .map((t) => {
        cumulative += t.quantity
        const van = vans.find((v) => v.id === t.vanId)
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;color:#c0392b">#${t.slipNo}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${fmtDateTime(t.date)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${van?.name || "Unknown"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${t.quantity} ${order.originalUnit}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${cumulative} ${order.originalUnit}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${t.note || "-"}</td>
        </tr>`
      })
      .join("")

    tripsSection = `
      <h3 style="margin-top:20px;margin-bottom:8px;font-size:14px">Trip Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:6px 10px;text-align:left">Slip #</th>
            <th style="padding:6px 10px;text-align:left">Date & Time</th>
            <th style="padding:6px 10px;text-align:left">Van</th>
            <th style="padding:6px 10px;text-align:right">Qty</th>
            <th style="padding:6px 10px;text-align:right">Cumulative</th>
            <th style="padding:6px 10px;text-align:left">Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:10px;font-size:13px">
        <strong>Delivered:</strong> ${delivered} ${order.originalUnit} &nbsp;|&nbsp;
        <strong>Remaining:</strong> ${remaining} ${order.originalUnit}
      </div>
    `
  }

  const vanStamps = assignedVans
    .map(
      (v) =>
        `<div style="display:inline-block;border:2px solid ${v.color};border-radius:8px;padding:6px 12px;margin:4px;font-size:12px">
          <strong style="color:${v.color}">${v.name}</strong><br/>
          <span>${v.driver} | ${v.plate}</span>
        </div>`
    )
    .join("")

  // Use ORIGINAL locked values for bill
  return `<!DOCTYPE html><html><head><title>Bill - ${order.originalBillNo || "N/A"}</title>
    <style>body{font-family:system-ui,sans-serif;padding:30px;max-width:700px;margin:0 auto}
    @media print{body{padding:10px}}</style></head><body>
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px">
      <h1 style="margin:0;font-size:22px">DELIVERY BILL</h1>
      <p style="margin:4px 0;font-size:13px;color:#666">Bill No: <strong>${order.originalBillNo || "N/A"}</strong> &nbsp;|&nbsp; Date: ${fmtDateTime(new Date().toISOString())}</p>
    </div>
    <table style="width:100%;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:4px 0;width:120px;color:#666">Customer</td><td><strong>${order.name}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#666">Phone (ID)</td><td>${order.phone || "N/A"}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Address</td><td>${order.address}</td></tr>
      ${order.items && order.items.length > 1 ? `
      <tr><td style="padding:8px 0;color:#666;vertical-align:top">Products</td><td>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:4px 8px;text-align:left">#</th>
              <th style="padding:4px 8px;text-align:left">Item / Product</th>
              <th style="padding:4px 8px;text-align:right">Qty</th>
              <th style="padding:4px 8px;text-align:right">Rate</th>
              <th style="padding:4px 8px;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((it, idx) => `
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:4px 8px;color:#888">${idx + 1}</td>
                <td style="padding:4px 8px;font-weight:bold">${it.product}${it.billNo ? ` (${it.billNo})` : ""}</td>
                <td style="padding:4px 8px;text-align:right">${it.qty} ${it.unit}</td>
                <td style="padding:4px 8px;text-align:right">${it.rate ? `₹${it.rate}` : "-"}</td>
                <td style="padding:4px 8px;text-align:right;font-weight:bold">${it.rate ? `₹${((it.rate || 0) * (it.qty || 0)).toLocaleString("en-IN")}` : "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </td></tr>
      ` : `
      <tr><td style="padding:4px 0;color:#666">Product</td><td><strong>${order.originalProduct}</strong></td></tr>
      ${order.originalTotalQty > 0 ? `<tr><td style="padding:4px 0;color:#666">Total Qty</td><td><strong>${order.originalTotalQty} ${order.originalUnit}</strong></td></tr>` : ""}
      `}
    </table>
    ${vanStamps ? `<div style="margin:16px 0"><strong style="font-size:13px">Assigned Van(s):</strong><br/>${vanStamps}</div>` : ""}
    ${tripsSection}
    <div style="margin-top:30px;border-top:1px solid #ccc;padding-top:12px;font-size:12px;color:#888;text-align:center">
      Generated on ${fmtDateTime(new Date().toISOString())} | This is a computer-generated bill.
    </div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
}

export function generateTripSlipHTML(order: Order, trip: Trip, vans: Van[]): string {
  const van = vans.find((v) => v.id === trip.vanId)
  const totalDelivered = order.trips.reduce((s, t) => s + t.quantity, 0)

  return `<!DOCTYPE html><html><head><title>Slip #${trip.slipNo} | ${order.originalBillNo || "N/A"}</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px;max-width:400px;margin:0 auto}
    @media print{body{padding:8px}}</style></head><body>
    <div style="text-align:center;border-bottom:2px dashed #333;padding-bottom:8px;margin-bottom:12px">
      <h2 style="margin:0;font-size:18px">DELIVERY SLIP</h2>
      <div style="margin-top:4px;display:flex;justify-content:center;gap:12px;font-size:13px">
        <span style="font-weight:bold;color:#c0392b">Slip #${trip.slipNo}</span>
        <span>|</span>
        <span>Bill: <strong>${order.originalBillNo || "N/A"}</strong></span>
      </div>
      <p style="margin:2px 0;font-size:11px;color:#666">Registered: ${fmtDateTime(trip.date)}</p>
    </div>
    <table style="width:100%;font-size:13px;margin-bottom:12px">
      <tr><td style="padding:3px 0;color:#666;width:80px">Customer</td><td><strong>${order.name}</strong></td></tr>
      <tr><td style="padding:3px 0;color:#666">Phone</td><td>${order.phone || "N/A"}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Address</td><td>${order.address}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Bill No</td><td><strong>${order.originalBillNo || "N/A"}</strong></td></tr>
    </table>
    <div style="background:#f5f5f5;border-radius:8px;padding:12px;margin-bottom:12px">
      <div style="font-size:15px;font-weight:bold">${trip.quantity} ${order.originalUnit} of ${order.originalProduct}</div>
      ${order.originalTotalQty > 0 ? `<div style="font-size:12px;color:#666;margin-top:4px">Progress: ${totalDelivered}/${order.originalTotalQty} ${order.originalUnit} total</div>` : ""}
    </div>
    ${trip.note ? `<div style="font-size:12px;background:#fffbe6;border-radius:6px;padding:8px;margin-bottom:12px"><strong>Note:</strong> ${trip.note}</div>` : ""}
    ${van ? `<div style="border:2px solid ${van.color};border-radius:8px;padding:8px 12px;font-size:12px">
      <strong style="color:${van.color}">${van.name}</strong><br/>
      ${van.driver} | ${van.plate}
    </div>` : ""}
    <div style="margin-top:16px;border-top:1px dashed #ccc;padding-top:8px;font-size:11px;color:#888;text-align:center">
      Slip #${trip.slipNo} | Bill: ${order.originalBillNo || "N/A"} | ${fmtDateTime(trip.date)}
    </div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
}

export function generateReceiptHTML(payment: Payment): string {
  return `<!DOCTYPE html><html><head><title>Receipt #${payment.receiptNo}</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px;max-width:400px;margin:0 auto}
    @media print{body{padding:8px}}</style></head><body>
    <div style="text-align:center;border-bottom:2px solid #27ae60;padding-bottom:10px;margin-bottom:16px">
      <h2 style="margin:0;font-size:20px;color:#27ae60">PAYMENT RECEIPT</h2>
      <p style="margin:4px 0;font-size:14px;font-weight:bold">Receipt #${payment.receiptNo}</p>
      <p style="margin:2px 0;font-size:11px;color:#666">${fmtDateTime(payment.createdAt)}</p>
    </div>
    <table style="width:100%;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:4px 0;color:#666;width:100px">Payer</td><td><strong>${payment.name}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#666">Phone (ID)</td><td>${payment.phone || "N/A"}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Address</td><td>${payment.address || "N/A"}</td></tr>
    </table>
    <div style="background:#f0fdf4;border:2px solid #27ae60;border-radius:10px;padding:16px;text-align:center;margin-bottom:16px">
      <div style="font-size:12px;color:#666;margin-bottom:4px">Amount Received</div>
      <div style="font-size:28px;font-weight:bold;color:#27ae60">Rs. ${payment.amount.toLocaleString("en-IN")}</div>
      <div style="font-size:13px;margin-top:6px;color:#333">Mode: <strong>${payment.mode}</strong></div>
    </div>
    ${payment.note ? `<div style="font-size:12px;background:#fffbe6;border-radius:6px;padding:8px;margin-bottom:12px"><strong>Note:</strong> ${payment.note}</div>` : ""}
    <div style="margin-top:20px;border-top:1px solid #ccc;padding-top:10px;font-size:11px;color:#888;text-align:center">
      Receipt #${payment.receiptNo} | ${fmtDateTime(payment.createdAt)}<br/>
      Customer Copy - Please keep this receipt for your records.
    </div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
}

export function generateVoucherHTML(payment: PaymentOut): string {
  return `<!DOCTYPE html><html><head><title>Voucher #${payment.voucherNo}</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px;max-width:400px;margin:0 auto}
    @media print{body{padding:8px}}</style></head><body>
    <div style="text-align:center;border-bottom:2px solid #e74c3c;padding-bottom:10px;margin-bottom:16px">
      <h2 style="margin:0;font-size:20px;color:#e74c3c">PAYMENT VOUCHER</h2>
      <p style="margin:4px 0;font-size:14px;font-weight:bold">Voucher #${payment.voucherNo}</p>
      <p style="margin:2px 0;font-size:11px;color:#666">${fmtDateTime(payment.createdAt)}</p>
    </div>
    <table style="width:100%;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:4px 0;color:#666;width:100px">Truck No.</td><td><strong>${payment.truckNo}</strong></td></tr>
    </table>
    <div style="background:#fef2f2;border:2px solid #e74c3c;border-radius:10px;padding:16px;text-align:center;margin-bottom:16px">
      <div style="font-size:12px;color:#666;margin-bottom:4px">Amount Paid</div>
      <div style="font-size:28px;font-weight:bold;color:#e74c3c">Rs. ${payment.amount.toLocaleString("en-IN")}</div>
      <div style="font-size:13px;margin-top:6px;color:#333">Mode: <strong>${payment.mode}</strong></div>
    </div>
    ${payment.note ? `<div style="font-size:12px;background:#fffbe6;border-radius:6px;padding:8px;margin-bottom:12px"><strong>Note:</strong> ${payment.note}</div>` : ""}
    <div style="margin-top:20px;border-top:1px solid #ccc;padding-top:10px;font-size:11px;color:#888;text-align:center">
      Voucher #${payment.voucherNo} | ${fmtDateTime(payment.createdAt)}<br/>
      Office Copy - Payment to Supplier
    </div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
}

export function generateCustomerLedgerHTML(
  customer: { name: string; phone: string; address: string },
  transactions: Array<{
    date: string
    reference: string
    description: string
    amount: number
    isCredit: boolean
    isUnpriced?: boolean
    deleted?: boolean
    deleteReason?: string
    balance: number
  }>,
  summary: {
    totalBilled: number
    totalPaid: number
    pendingBalance: number
  }
): string {
  const rows = transactions
    .map((tx) => {
      const isDel = !!tx.deleted
      const debitStr = tx.isCredit
        ? tx.isUnpriced
          ? `<span style="color:#d97706;font-size:11px">Unpriced</span>`
          : `₹${tx.amount.toLocaleString("en-IN")}`
        : "—"

      const creditStr = !tx.isCredit
        ? isDel
          ? `<del style="color:#94a3b8">₹${tx.amount.toLocaleString("en-IN")}</del><br/><span style="color:#e11d48;font-size:10px;font-weight:bold">(Voided)</span>`
          : `<span style="color:#16a34a;font-weight:bold">₹${tx.amount.toLocaleString("en-IN")}</span>`
        : "—"

      const descHtml = isDel
        ? `<div style="text-decoration:line-through;color:#64748b">${tx.description}</div>
           <div style="color:#e11d48;font-size:11px;font-weight:bold;margin-top:2px">⚠️ DELETED: ${tx.deleteReason || "Payment Cancelled"}</div>`
        : `<div>${tx.description}</div>`

      return `<tr style="${isDel ? "background:#fff1f2;" : ""}">
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:11px;white-space:nowrap">${fmtDateTime(tx.date)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:11px;font-weight:bold;${isDel ? "color:#e11d48;" : ""}">${tx.reference}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px">${descHtml}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;text-align:right;font-weight:bold">${debitStr}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;text-align:right">${creditStr}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;text-align:right;font-weight:bold;color:${tx.balance > 0 ? "#e11d48" : "#16a34a"}">₹${tx.balance.toLocaleString("en-IN")}</td>
      </tr>`
    })
    .join("")

  return `<!DOCTYPE html><html><head><title>Account Book - ${customer.name}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:850px;margin:0 auto;color:#1e293b}
      @media print{body{padding:10px;max-width:100%}}
      table{width:100%;border-collapse:collapse}
      th{padding:8px 10px;text-align:left;background:#f1f5f9;font-size:11px;text-transform:uppercase;border-bottom:2px solid #cbd5e1}
    </style></head><body>
    <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:0.5px">SARKAR BUILDERS</h1>
        <p style="margin:2px 0 0;font-size:12px;color:#64748b">Customer Statement of Account & Ledger</p>
      </div>
      <div style="text-align:right;font-size:11px;color:#64748b">
        Generated on: <strong>${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN")}</strong>
      </div>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;text-transform:uppercase;font-weight:bold;color:#64748b">Customer Details</div>
        <div style="font-size:16px;font-weight:bold;color:#0f172a;margin-top:2px">${customer.name}</div>
        <div style="font-size:12px;font-family:monospace;color:#475569;margin-top:2px">Phone / ID: ${customer.phone}</div>
        ${customer.address ? `<div style="font-size:12px;color:#475569">Site: ${customer.address}</div>` : ""}
      </div>
      <div style="display:flex;gap:20px;text-align:right">
        <div>
          <div style="font-size:10px;text-transform:uppercase;font-weight:bold;color:#64748b">Total Billed</div>
          <div style="font-size:16px;font-family:monospace;font-weight:bold;margin-top:2px">₹${summary.totalBilled.toLocaleString("en-IN")}</div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;font-weight:bold;color:#16a34a">Total Paid</div>
          <div style="font-size:16px;font-family:monospace;font-weight:bold;color:#16a34a;margin-top:2px">₹${summary.totalPaid.toLocaleString("en-IN")}</div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;font-weight:bold;color:#e11d48">Net Outstanding</div>
          <div style="font-size:18px;font-family:monospace;font-weight:900;color:#e11d48;margin-top:2px">₹${summary.pendingBalance.toLocaleString("en-IN")}</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Reference</th>
          <th>Description</th>
          <th style="text-align:right">Billed (Debit)</th>
          <th style="text-align:right">Paid (Credit)</th>
          <th style="text-align:right">Balance Due</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #cbd5e1;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between">
      <span>* Deleted receipts are logged for audit compliance and excluded from the net balance.</span>
      <span>Sarkar Builders Suite • Official Statement</span>
    </div>

    <script>window.onload=function(){window.print()}</script>
  </body></html>`
}

export function printHTML(html: string) {
  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
