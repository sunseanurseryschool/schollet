"use client";

import type { ReceiptData } from "@/app/api/fees/receipt/[receiptNo]/route";
import { formatINR } from "@/lib/format";
import { ArrowLeftIcon, PrinterIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PrintReceiptView({ receipt }: { receipt: ReceiptData }) {
  const router = useRouter();

  return (
    <>
      {/*
        Print styles: hide the dashboard sidebar, outer header, and all .no-print
        elements when the user triggers window.print() or Ctrl+P.
        Animations MUST NOT affect print output — all motion styles are screen-only.
      */}
      <style>{`
        @media print {
          [data-sidebar="sidebar"],
          [data-sidebar="sidebar-wrapper"],
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            background: white !important;
          }
          /* Strip all framer-motion transforms and transitions for print */
          * {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            opacity: 1 !important;
            filter: none !important;
          }
          .receipt-watermark {
            display: block !important;
          }
          @page {
            size: A4;
            margin: 16mm;
          }
        }
        .receipt-watermark {
          display: none;
        }
      `}</style>

      {/* Action bar — hidden when printing */}
      <header className="no-print flex h-14 items-center gap-4 border-b bg-surface/80 backdrop-blur-sm px-4 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/dashboard/fees/collect");
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Fee Receipt</h1>
        <div className="ml-auto">
          <motion.button
            type="button"
            onClick={() => window.print()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#1E293B] to-[#0F172A] px-4 py-1.5 text-sm font-medium text-white hover:from-[#334155] hover:to-[#1E293B] transition-all shadow-sm"
          >
            <PrinterIcon className="h-4 w-4" />
            Print Receipt
          </motion.button>
        </div>
      </header>

      {/* Receipt content — max-w-2xl for screen, full-width when printing */}
      <div className="p-6 bg-surface-secondary min-h-screen print:p-0 print:bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-2xl mx-auto bg-surface rounded-xl border shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none print:bg-white relative"
        >
          {/* Watermark — visible on print only */}
          <div
            className="receipt-watermark absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontSize: "6rem",
                fontWeight: 800,
                color: "rgba(37,99,235,0.04)",
                transform: "rotate(-30deg)",
                letterSpacing: "0.08em",
                userSelect: "none",
              }}
            >
              SCHOLLET
            </span>
          </div>

          {/* School header */}
          <div className="relative bg-gradient-to-br from-[#1E3A5F] via-[#1E40AF] to-[#2563EB] px-8 py-7 text-white text-center overflow-hidden">
            {/* Decorative dots pattern */}
            <div
              className="no-print absolute inset-0 opacity-10"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="relative"
            >
              <h1 className="text-2xl font-bold tracking-widest">SCHOLLET</h1>
              <p className="text-sm text-blue-200 mt-1">
                School Finance Management System
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-medium text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Official Fee Receipt
              </div>
            </motion.div>
          </div>

          {/* Receipt number + date bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="flex items-center justify-between px-8 py-4 border-b bg-surface-secondary print:bg-[#F8FAFC]"
          >
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wide font-medium">
                Receipt No.
              </p>
              <p className="text-lg font-bold font-mono text-text-primary mt-0.5">
                {receipt.receipt_no}
              </p>
            </div>
            <div className="no-print h-8 w-px bg-border-light" />
            <div className="text-right">
              <p className="text-xs text-text-secondary uppercase tracking-wide font-medium">
                Date
              </p>
              <p className="text-sm font-semibold text-text-primary mt-0.5">
                {formatDate(receipt.payment_date)}
              </p>
            </div>
          </motion.div>

          <div className="px-8 py-6 space-y-6 relative">

            {/* Student details */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="h-px flex-1 bg-border-light" />
                Student Details
                <span className="h-px flex-1 bg-border-light" />
              </h2>
              <div className="bg-surface-secondary print:bg-[#F8FAFC] rounded-lg border px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <LabelValue label="Name" value={receipt.student.name} />
                <LabelValue
                  label="Admission No"
                  value={receipt.student.admission_no}
                />
                <LabelValue
                  label="Grade"
                  value={`Grade ${receipt.student.grade}`}
                />
                <LabelValue label="Section" value={receipt.student.section} />
              </div>
            </motion.section>

            {/* Fee breakdown */}
            {receipt.fee_heads.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4 }}
              >
                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <span className="h-px flex-1 bg-border-light" />
                  Fee Breakdown
                  <span className="h-px flex-1 bg-border-light" />
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border-light">
                      <th className="text-left pb-2 pt-1 text-text-secondary font-semibold uppercase text-xs tracking-wide">
                        Fee Head
                      </th>
                      <th className="text-right pb-2 pt-1 text-text-secondary font-semibold uppercase text-xs tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.fee_heads.map((head, idx) => (
                      <tr
                        key={head.name}
                        className={`border-b border-border-light ${idx % 2 === 0 ? "" : "bg-surface-secondary print:bg-[#FAFAFA]"}`}
                      >
                        <td className="py-2.5 text-text-primary">{head.name}</td>
                        <td className="py-2.5 text-right font-mono text-text-primary">
                          {formatINR(head.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#CBD5E1]">
                      <td className="pt-2.5 pb-1 font-bold text-text-primary">
                        Total Fee
                      </td>
                      <td className="pt-2.5 pb-1 text-right font-bold font-mono text-text-primary">
                        {formatINR(receipt.total_fee)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </motion.section>
            )}

            {/* Payment details */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.39, duration: 0.4 }}
            >
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="h-px flex-1 bg-border-light" />
                Payment Details
                <span className="h-px flex-1 bg-border-light" />
              </h2>
              <div className="rounded-lg border overflow-hidden divide-y text-sm">
                <PaymentRow
                  label="Total Fee"
                  value={formatINR(receipt.total_fee)}
                />
                {receipt.discount_amount > 0 && (
                  <PaymentRow
                    label={
                      receipt.discount_reason
                        ? `Discount (${receipt.discount_reason})`
                        : "Discount"
                    }
                    value={`- ${formatINR(receipt.discount_amount)}`}
                    valueClass="text-amber-700 font-semibold"
                  />
                )}
                <PaymentRow
                  label="Amount Paid"
                  value={formatINR(receipt.paid_amount)}
                  highlight
                />
                <PaymentRow
                  label="Balance Remaining"
                  value={formatINR(Math.max(0, receipt.balance_remaining))}
                  valueClass={
                    receipt.balance_remaining <= 0
                      ? "font-bold text-green-700"
                      : "font-bold text-red-700"
                  }
                />
              </div>
            </motion.section>

            {/* Payment mode + received by */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46, duration: 0.4 }}
              className="bg-surface-secondary print:bg-[#F8FAFC] rounded-lg border px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm"
            >
              <LabelValue label="Paid via" value={receipt.account_name} />
              {receipt.received_by_name && (
                <LabelValue
                  label="Received By"
                  value={receipt.received_by_name}
                />
              )}
            </motion.section>

          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.35 }}
            className="border-t px-8 py-5 bg-gradient-to-r from-surface-secondary to-[#EFF6FF] dark:to-[#1e3a5f] print:from-[#F8FAFC] print:to-[#EFF6FF] text-center"
          >
            {receipt.balance_remaining <= 0 && (
              <div className="no-print mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckCircle2Icon className="h-3.5 w-3.5" />
                All fees cleared for this academic year
              </div>
            )}
            {/* Print-visible cleared notice */}
            {receipt.balance_remaining <= 0 && (
              <p className="receipt-watermark hidden text-xs font-semibold text-green-700 mb-1">
                All fees cleared for this academic year.
              </p>
            )}
            <p className="text-xs text-text-tertiary">
              This is a computer-generated receipt and does not require a
              signature.
            </p>
            <p className="mt-1 text-xs text-text-tertiary/60">
              Schollet &mdash; School Finance Management System
            </p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Micro components ─────────────────────────────────────────────────────────

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-tertiary uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  highlight,
  valueClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 ${
        highlight ? "bg-blue-50" : ""
      }`}
    >
      <span
        className={
          highlight ? "font-semibold text-blue-900 dark:text-blue-200" : "text-text-secondary"
        }
      >
        {label}
      </span>
      <span
        className={`font-mono ${
          valueClass ?? (highlight ? "font-bold text-blue-900 dark:text-blue-200" : "text-text-primary")
        }`}
      >
        {value}
      </span>
    </div>
  );
}
