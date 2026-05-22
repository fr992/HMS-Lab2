import { HOSPITAL_FULL_NAME, HOSPITAL_LOGO_PATH, HOSPITAL_NAME } from "@/config/branding";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function money(value, currency = "EUR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number(value) || 0);
}

const PRINT_WINDOW_FEATURES = "width=960,height=720,left=80,top=80";

export function openPdfWindow(title = "Preparing PDF") {
  const win = window.open("", "_blank", PRINT_WINDOW_FEATURES);
  if (!win) return null;

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; background: #f8fafc; }
      .message { min-height: 100vh; display: grid; place-items: center; padding: 32px; text-align: center; }
      .card { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 28px; box-shadow: 0 16px 35px rgba(15, 23, 42, .08); }
      h1 { margin: 0; font-size: 20px; }
      p { margin: 10px 0 0; color: #64748b; font-size: 14px; }
    </style>
  </head>
  <body>
    <main class="message">
      <section class="card">
        <h1>${escapeHtml(title)}</h1>
        <p>Preparing printable PDF view...</p>
      </section>
    </main>
  </body>
</html>`);
  win.document.close();
  win.focus();
  return win;
}

export function showPdfError(targetWindow, message) {
  if (!targetWindow) return false;
  targetWindow.document.open();
  targetWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>PDF unavailable</title>
    <style>
      body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; background: #fff1f2; }
      .message { min-height: 100vh; display: grid; place-items: center; padding: 32px; text-align: center; }
      .card { border: 1px solid #fecdd3; border-radius: 10px; background: #fff; padding: 28px; max-width: 520px; }
      h1 { margin: 0; color: #9f1239; font-size: 20px; }
      p { margin: 10px 0 0; color: #881337; font-size: 14px; }
    </style>
  </head>
  <body>
    <main class="message">
      <section class="card">
        <h1>PDF unavailable</h1>
        <p>${escapeHtml(message || "Unable to prepare this PDF.")}</p>
      </section>
    </main>
  </body>
</html>`);
  targetWindow.document.close();
  targetWindow.focus();
  return true;
}

function printDocument(title, body, targetWindow) {
  const win = targetWindow || openPdfWindow(title);
  if (!win) return false;

  win.document.open();
  win.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; background: #f8fafc; }
      .page { width: min(920px, 100%); margin: 0 auto; padding: 32px; background: #fff; }
      .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; }
      .brand-row { display: flex; align-items: center; gap: 12px; }
      .brand-logo { width: 42px; height: 42px; object-fit: contain; border-radius: 8px; }
      .brand { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
      h1 { margin: 6px 0 0; font-size: 28px; line-height: 1.1; }
      h2 { margin: 28px 0 10px; font-size: 16px; }
      .muted { color: #64748b; font-size: 13px; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px; }
      .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
      .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; }
      .value { margin-top: 5px; font-size: 14px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
      th { background: #f1f5f9; color: #475569; font-size: 11px; text-align: left; text-transform: uppercase; letter-spacing: .06em; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: top; }
      .right { text-align: right; }
      .totals { margin-left: auto; margin-top: 18px; width: min(340px, 100%); }
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
      .grand { font-size: 18px; font-weight: 800; border-bottom: 0; }
      .result { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 12px; }
      .pre { white-space: pre-wrap; line-height: 1.5; }
      @media print {
        body { background: #fff; }
        .page { width: 100%; padding: 0; }
      }
    </style>
  </head>
  <body><main class="page">${body}</main></body>
</html>`);
  win.document.close();
  win.focus();
  window.setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
  return true;
}

export function printInvoicePdf(invoice, targetWindow) {
  if (!invoice) return false;
  const currency = invoice.currency || "EUR";
  const rows = (invoice.items ?? [])
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.description || "-")}</td>
        <td>${escapeHtml(item.sourceType || "-")}${item.sourceId ? ` #${escapeHtml(item.sourceId)}` : ""}</td>
        <td class="right">${escapeHtml(item.quantity ?? 1)}</td>
        <td class="right">${money(item.unitPrice, currency)}</td>
        <td class="right"><strong>${money(item.totalPrice ?? Number(item.quantity || 1) * Number(item.unitPrice || 0), currency)}</strong></td>
      </tr>`
    )
    .join("");

  return printDocument(
    `Invoice ${invoice.invoiceNumber || invoice.id}`,
    `<style>
      .invoice-hero { display: grid; grid-template-columns: 1fr 15rem; gap: 28px; align-items: start; padding-bottom: 24px; border-bottom: 1px solid #dbe4ee; }
      .invoice-title { margin-top: 18px; font-size: 34px; letter-spacing: .01em; }
      .invoice-number { margin-top: 8px; color: #334155; font-size: 14px; }
      .status-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #f8fafc; }
      .status-pill { display: inline-flex; border-radius: 999px; background: #e0f2fe; color: #075985; padding: 6px 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
      .invoice-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; margin-top: 22px; }
      .invoice-panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; }
      .invoice-panel h2 { margin: 0 0 12px; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: .08em; }
      .invoice-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .items-table th { padding: 12px 10px; background: #0f172a; color: #fff; }
      .items-table td { padding: 12px 10px; }
      .items-table tbody tr:nth-child(even) { background: #f8fafc; }
      .totals-card { margin-left: auto; margin-top: 22px; width: min(360px, 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; background: #f8fafc; }
      .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid #e2e8f0; color: #475569; }
      .total-row strong { color: #0f172a; }
      .grand { margin-top: 4px; border-bottom: 0; color: #0f172a; font-size: 20px; font-weight: 900; }
      .footer-note { margin-top: 34px; border-top: 1px solid #e2e8f0; padding-top: 14px; color: #64748b; font-size: 12px; line-height: 1.5; }
      @media print {
        .invoice-hero { grid-template-columns: 1fr 13rem; }
      }
    </style>
    <div class="invoice-hero">
      <div>
        <div class="brand-row">
          <img class="brand-logo" src="${HOSPITAL_LOGO_PATH}" alt="" />
          <div class="brand">${escapeHtml(HOSPITAL_FULL_NAME)}</div>
        </div>
        <h1 class="invoice-title">Invoice</h1>
        <p class="invoice-number">${escapeHtml(invoice.invoiceNumber || `#${invoice.id}`)}</p>
      </div>
      <div class="status-card">
        <div class="label">Status</div>
        <div class="value"><span class="status-pill">${escapeHtml(invoice.status || "-")}</span></div>
        <p class="muted">Generated ${formatDateTime(new Date())}</p>
      </div>
    </div>
    <section class="invoice-grid">
      <div class="invoice-panel">
        <h2>Bill To</h2>
        <div class="value">${escapeHtml(invoice.patientName || "-")}</div>
        <p class="muted">${escapeHtml(invoice.patientNumber || "Patient profile")}</p>
      </div>
      <div class="invoice-panel">
        <h2>Invoice Details</h2>
        <div class="invoice-meta">
          <div><div class="label">Issued</div><div class="value">${formatDateTime(invoice.issuedAt)}</div></div>
          <div><div class="label">Due</div><div class="value">${formatDateTime(invoice.dueAt)}</div></div>
          <div><div class="label">Encounter</div><div class="value">${escapeHtml(invoice.encounterNumber || "-")}</div></div>
          <div><div class="label">Currency</div><div class="value">${escapeHtml(currency)}</div></div>
        </div>
      </div>
    </section>
    <h2>Line Items</h2>
    <table class="items-table">
      <thead><tr><th>Description</th><th>Source</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5">No line items.</td></tr>`}</tbody>
    </table>
    <section class="totals-card">
      <div class="total-row"><span>Subtotal</span><strong>${money(invoice.subtotalAmount, currency)}</strong></div>
      <div class="total-row"><span>Discount</span><strong>${money(invoice.discountAmount, currency)}</strong></div>
      <div class="total-row"><span>Tax</span><strong>${money(invoice.taxAmount, currency)}</strong></div>
      <div class="total-row grand"><span>Total</span><span>${money(invoice.totalAmount, currency)}</span></div>
    </section>
    <p class="footer-note">Thank you for choosing ${escapeHtml(HOSPITAL_NAME)}. Please reference this invoice number when contacting billing.</p>`,
    targetWindow
  );
}

export function printInvoiceSummaryPdf(invoices, targetWindow) {
  const rows = invoices
    .map(
      (invoice) => `<tr>
        <td>${escapeHtml(invoice.invoiceNumber || invoice.id)}</td>
        <td>${escapeHtml(invoice.patientName || "-")}</td>
        <td>${escapeHtml(invoice.status || "-")}</td>
        <td>${formatDateTime(invoice.dueAt)}</td>
        <td class="right">${money(invoice.totalAmount, invoice.currency)}</td>
      </tr>`
    )
    .join("");

  return printDocument(
    "Selected invoices",
    `<div class="header">
      <div>
        <div class="brand-row">
          <img class="brand-logo" src="${HOSPITAL_LOGO_PATH}" alt="" />
          <div class="brand">${escapeHtml(HOSPITAL_FULL_NAME)}</div>
        </div>
        <h1>Selected Invoices</h1>
        <p class="muted">${invoices.length} invoice${invoices.length === 1 ? "" : "s"} selected</p>
      </div>
    </div>
    <table>
      <thead><tr><th>Invoice</th><th>Patient</th><th>Status</th><th>Due</th><th class="right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    targetWindow
  );
}

export function printLabResultPdf(result, request, targetWindow) {
  if (!result) return false;
  return printDocument(
    `Lab result ${result.id}`,
    `<div class="header">
      <div>
        <div class="brand-row">
          <img class="brand-logo" src="${HOSPITAL_LOGO_PATH}" alt="" />
          <div class="brand">${escapeHtml(HOSPITAL_NAME)} Laboratory</div>
        </div>
        <h1>${escapeHtml(result.testName || "Lab Result")}</h1>
        <p class="muted">${escapeHtml(result.testCode || "")}</p>
      </div>
      <div class="box">
        <div class="label">Published</div>
        <div class="value">${formatDateTime(result.verifiedAt)}</div>
      </div>
    </div>
    <section class="grid">
      <div class="box"><div class="label">Patient</div><div class="value">${escapeHtml(request?.patientName || "-")}</div></div>
      <div class="box"><div class="label">Request</div><div class="value">${escapeHtml(result.requestNumber || request?.requestNumber || "-")}</div></div>
      <div class="box"><div class="label">Result ID</div><div class="value">#${escapeHtml(result.id)}</div></div>
      <div class="box"><div class="label">Verified By</div><div class="value">${escapeHtml(result.verifiedByUserName || "-")}</div></div>
    </section>
    <section class="result">
      <div class="label">Result value</div>
      <p class="pre">${escapeHtml(result.resultData || "-")}</p>
    </section>
    <section class="grid">
      <div class="box"><div class="label">Reference Range</div><div class="value">${escapeHtml(result.referenceRange || "-")}</div></div>
      <div class="box"><div class="label">Interpretation</div><div class="value">${escapeHtml(result.interpretation || "-")}</div></div>
      <div class="box"><div class="label">Created</div><div class="value">${formatDateTime(result.createdAt)}</div></div>
      <div class="box"><div class="label">Updated</div><div class="value">${formatDateTime(result.updatedAt)}</div></div>
    </section>`,
    targetWindow
  );
}

export function printLabRequestSummaryPdf(requests, targetWindow) {
  const rows = requests
    .map(
      (request) => `<tr>
        <td>${escapeHtml(request.requestNumber || request.id)}</td>
        <td>${escapeHtml(request.patientName || "-")}</td>
        <td>${escapeHtml(request.requestedByDoctorName || "-")}</td>
        <td>${escapeHtml(request.priority || "-")}</td>
        <td>${escapeHtml(request.status || "-")}</td>
        <td>${formatDateTime(request.requestedAt)}</td>
      </tr>`
    )
    .join("");

  return printDocument(
    "Selected lab requests",
    `<div class="header">
      <div>
        <div class="brand-row">
          <img class="brand-logo" src="${HOSPITAL_LOGO_PATH}" alt="" />
          <div class="brand">${escapeHtml(HOSPITAL_NAME)} Laboratory</div>
        </div>
        <h1>Selected Lab Requests</h1>
        <p class="muted">${requests.length} request${requests.length === 1 ? "" : "s"} selected</p>
      </div>
    </div>
    <table>
      <thead><tr><th>Request</th><th>Patient</th><th>Doctor</th><th>Priority</th><th>Status</th><th>Requested</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    targetWindow
  );
}
