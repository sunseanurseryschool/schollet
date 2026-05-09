/**
 * Formats a number as Indian Rupees with ₹ symbol and Indian comma grouping.
 * Examples: 1500 → "₹1,500.00", 100000 → "₹1,00,000.00", 2500000 → "₹25,00,000.00"
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
